from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, inspect
from sqlalchemy.sql import func
from app.services.resume_parser import (
    extract_text_from_pdf, 
    extract_text_from_docx,
    extract_resume_details_with_azure, 
    clean_json_string,
    convert_pdf_to_images,
    extract_resume_details_with_azure_vision,
    convert_docx_to_pdf
)
from app.database import get_db, Base, engine
import tempfile
import os
import traceback
import uuid
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
import asyncio

# Check if processing_method column exists in resume_history table
def column_exists(table_name, column_name):
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        return any(col['name'] == column_name for col in columns)
    except Exception:
        # Table doesn't exist yet or other error
        return False

# Flag to track if processing_method column exists
HAS_PROCESSING_METHOD_COLUMN = column_exists('resume_history', 'processing_method')

router = APIRouter()

# In-memory task storage (replace with Redis or DB in production)
TASKS = {}

class TaskStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# Database model for resume history
class ResumeHistory(Base):
    __tablename__ = "resume_history"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(String(255), nullable=True)  # Can be linked to user authentication
    resume_data = Column(JSON, nullable=False)
    file_size = Column(Integer, nullable=True)
    status = Column(String(50), default="completed")
    original_file_type = Column(String(10), nullable=True)
    
    # Only add this column to the model if it exists in the database
    if HAS_PROCESSING_METHOD_COLUMN:
        processing_method = Column(String(20), default="text")

# Pydantic model for response
class ResumeHistoryResponse(BaseModel):
    id: int
    filename: str
    processed_at: datetime
    file_size: Optional[int]
    status: str
    original_file_type: Optional[str]
    processing_method: Optional[str] = "text"

def update_task_progress(task_id: str, stage: str, progress: int):
    """Helper function to update task progress"""
    if task_id in TASKS:
        TASKS[task_id]["stage"] = stage
        TASKS[task_id]["progress"] = progress
        print(f"Task {task_id}: {stage} - {progress}%")

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    use_vision: bool = True  # New parameter to toggle between text and image processing
):
    try:
        # Generate a unique task ID
        task_id = str(uuid.uuid4())
        
        # Validate file type
        allowed_extensions = ['.pdf', '.doc', '.docx']
        allowed_mime_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        file_extension = f".{file.filename.split('.')[-1].lower()}"
        if file_extension not in allowed_extensions or file.content_type not in allowed_mime_types:
            raise HTTPException(status_code=400, detail="Only PDF, DOC, or DOCX files are supported.")

        # Create temporary file with appropriate suffix
        suffix = file_extension
        file_content = await file.read()
        file_size = len(file_content)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        # Initialize task status
        TASKS[task_id] = {
            "status": TaskStatus.PENDING,
            "stage": "upload",
            "progress": 10,  # Start at 10% after upload
            "data": None,
            "error": None,
            "file_path": tmp_path,
            "file_extension": file_extension,
            "filename": file.filename,
            "file_size": file_size,
            "user_id": None,  # Can be populated from auth
            "use_vision": use_vision  # Store whether to use vision-based processing
        }
        
        print(f"Created task {task_id} with initial progress 10%")
        
        # Start processing in background
        background_tasks.add_task(process_resume, task_id, db)
        
        # Return the task ID immediately
        return {"task_id": task_id, "status": "processing", "method": "vision" if use_vision else "text"}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error occurred: {str(e)}")

@router.get("/progress/{task_id}")
async def get_progress(task_id: str):
    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = TASKS[task_id]
    
    print(f"Progress check for task {task_id}: {task['stage']} - {task['progress']}%")
    
    # Clean up completed tasks after some time (optional)
    if task["status"] in [TaskStatus.COMPLETED, TaskStatus.FAILED] and "cleanup_time" not in task:
        task["cleanup_time"] = time.time() + 3600  # Clean up after 1 hour
    
    return {
        "status": task["status"],
        "stage": task["stage"],
        "progress": task["progress"],
        "data": task["data"] if task["status"] == TaskStatus.COMPLETED else None,
        "error": task["error"] if task["status"] == TaskStatus.FAILED else None
    }

@router.get("/history", response_model=List[ResumeHistoryResponse])
async def get_resume_history(db: Session = Depends(get_db), limit: int = 10, skip: int = 0):
    """Get the resume processing history"""
    # Optionally filter by user_id if authentication is implemented
    history = db.query(ResumeHistory).order_by(
        ResumeHistory.processed_at.desc()
    ).offset(skip).limit(limit).all()
    
    return history

@router.get("/history/{resume_id}", response_model=dict)
async def get_resume_details(resume_id: int, db: Session = Depends(get_db)):
    """Get a specific resume from history by ID"""
    resume = db.query(ResumeHistory).filter(ResumeHistory.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Return full data including parsed resume content
    result = {
        "id": resume.id,
        "filename": resume.filename,
        "processed_at": resume.processed_at,
        "file_size": resume.file_size,
        "status": resume.status,
        "original_file_type": resume.original_file_type,
        "resume_data": resume.resume_data
    }
    
    # Only add processing_method if the column exists
    if HAS_PROCESSING_METHOD_COLUMN:
        result["processing_method"] = getattr(resume, "processing_method", "text")
    else:
        result["processing_method"] = "text"  # Default value
    
    return result

@router.delete("/history/{resume_id}")
async def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """Delete a resume from history"""
    resume = db.query(ResumeHistory).filter(ResumeHistory.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    db.delete(resume)
    db.commit()
    
    return {"message": "Resume deleted successfully"}

def process_resume_sync(task_id: str, db: Session):
    """Synchronous version of process_resume for background task"""
    task = TASKS[task_id]
    tmp_path = task["file_path"]
    file_extension = task["file_extension"]
    use_vision = task.get("use_vision", True)
    converted_pdf_path = None  # Track converted PDF for cleanup
    
    try:
        # Update status to processing
        task["status"] = TaskStatus.PROCESSING
        update_task_progress(task_id, "processing", 15)
        time.sleep(0.5)  # Small delay to ensure frontend sees the update
        
        # For DOC/DOCX files, convert to PDF first if using vision processing
        if file_extension in ['.doc', '.docx'] and use_vision:
            try:
                # Step 1: Convert DOCX to PDF for vision processing
                update_task_progress(task_id, "converting_docx_to_pdf", 20)
                time.sleep(0.5)
                
                print(f"Converting {file_extension} to PDF for comprehensive vision processing...")
                
                # Convert DOCX to PDF using Aspose.Words
                converted_pdf_path = convert_docx_to_pdf(tmp_path)
                update_task_progress(task_id, "converting_docx_to_pdf", 30)
                time.sleep(0.5)
                
                # Update file extension and path for further processing
                file_extension = '.pdf'
                tmp_path = converted_pdf_path
                
                print(f"Successfully converted to PDF for comprehensive table extraction: {converted_pdf_path}")
                
            except Exception as e:
                print(f"DOCX to PDF conversion failed, falling back to text-based processing: {str(e)}")
                use_vision = False
                update_task_progress(task_id, "extraction", 25)
                time.sleep(0.5)
        
        # Process using either vision-based or text-based approach
        processing_method = "text"  # Default to text in case of fallback
        
        if use_vision and file_extension == '.pdf':
            try:
                # Step 1: Convert PDF to images (ALL pages for complete table extraction)
                update_task_progress(task_id, "conversion_to_image_all_pages", 35)
                time.sleep(0.5)
                
                print("Converting ALL pages to images for comprehensive table extraction...")
                
                # Convert PDF to images (all pages)
                images = convert_pdf_to_images(tmp_path)
                print(f"Converted all {len(images)} pages to images for complete table analysis")
                update_task_progress(task_id, "conversion_to_image_all_pages", 50)
                time.sleep(0.5)
                
                # Step 2: Extract structured resume details (via Azure with vision - ALL pages)
                update_task_progress(task_id, "parsing_all_pages_with_vision", 55)
                time.sleep(0.5)
                
                print("Starting comprehensive vision-based parsing of all pages and table rows...")
                
                extracted = extract_resume_details_with_azure_vision(images)
                parsed = clean_json_string(extracted)
                
                # Log the number of experience entries found
                experience_data = parsed.get('experience_data', [])
                print(f"Successfully extracted {len(experience_data)} experience entries from all table rows")
                
                update_task_progress(task_id, "parsing_all_pages_with_vision", 85)
                time.sleep(0.5)
                processing_method = "vision"
                
            except Exception as e:
                print(f"Comprehensive vision-based processing failed, falling back to text-based: {str(e)}")
                # Fall back to text-based processing
                use_vision = False
                update_task_progress(task_id, "extraction", 50)
                time.sleep(0.5)
        
        # If vision processing failed, wasn't requested, or file is DOCX, use text-based processing
        if not use_vision:
            # Step 1: Extract text from file
            update_task_progress(task_id, "extraction", 55)
            time.sleep(0.5)
            
            # Extract text based on file type (use original file for text extraction)
            original_file_extension = task["file_extension"]
            original_file_path = task["file_path"]
            
            if original_file_extension == '.pdf':
                text = extract_text_from_pdf(original_file_path)
                print(f"Extracted {len(text)} characters from PDF")
            elif original_file_extension in ['.doc', '.docx']:
                # Use the new DOCX extraction function
                text = extract_text_from_docx(original_file_path)
                print(f"Extracted {len(text)} characters from DOCX")
            else:
                raise Exception(f"Unsupported file type: {original_file_extension}")
                
            update_task_progress(task_id, "extraction", 70)
            time.sleep(0.5)
            
            # Step 2: Extract structured resume details (via Azure)
            update_task_progress(task_id, "parsing", 75)
            time.sleep(0.5)
                
            extracted = extract_resume_details_with_azure(text)
            parsed = clean_json_string(extracted)
            update_task_progress(task_id, "parsing", 85)
            time.sleep(0.5)
            
            processing_method = "text"

        # Set completed status and store the parsed data
        update_task_progress(task_id, "completion", 95)
        time.sleep(0.5)
        
        task["status"] = TaskStatus.COMPLETED
        task["data"] = parsed
        update_task_progress(task_id, "completed", 100)
        
        # Log final results
        experience_data = parsed.get('experience_data', [])
        print(f"Final result: Successfully processed resume with {len(experience_data)} experience entries using {processing_method} method")
        
        # Create resume history object with basic fields
        resume_history = ResumeHistory(
            filename=task["filename"],
            resume_data=parsed,
            file_size=task["file_size"],
            original_file_type=task["file_extension"].lstrip('.'),  # Use original file extension
            user_id=task["user_id"]
        )
        
        # Only set processing_method if the column exists
        if HAS_PROCESSING_METHOD_COLUMN:
            resume_history.processing_method = processing_method
        
        db.add(resume_history)
        db.commit()
        db.refresh(resume_history)

    except Exception as e:
        traceback.print_exc()
        task["status"] = TaskStatus.FAILED
        task["error"] = str(e)
        update_task_progress(task_id, "failed", 0)
        
        # Save failed job to history too
        try:
            # Create resume history object with basic fields
            resume_history = ResumeHistory(
                filename=task["filename"],
                resume_data={},  # Empty as processing failed
                file_size=task["file_size"],
                original_file_type=task["file_extension"].lstrip('.'),
                user_id=task["user_id"],
                status="failed"
            )
            
            # Only set processing_method if the column exists
            if HAS_PROCESSING_METHOD_COLUMN:
                resume_history.processing_method = "vision" if use_vision else "text"
            
            db.add(resume_history)
            db.commit()
        except:
            pass
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(task["file_path"]):
                os.remove(task["file_path"])
            # Also clean up converted PDF if it was created
            if converted_pdf_path and os.path.exists(converted_pdf_path) and converted_pdf_path != task["file_path"]:
                os.remove(converted_pdf_path)
        except:
            pass

async def process_resume(task_id: str, db: Session):
    """Async wrapper for the synchronous processing function"""
    # Run the synchronous function in a thread pool to avoid blocking
    import concurrent.futures
    import threading
    
    def run_sync():
        process_resume_sync(task_id, db)
    
    # Run in a separate thread
    thread = threading.Thread(target=run_sync)
    thread.start()















# from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
# from sqlalchemy.orm import Session
# from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, inspect
# from sqlalchemy.sql import func
# from app.services.resume_parser import (
#     extract_text_from_pdf, 
#     extract_text_from_docx,  # Import the new DOCX function
#     extract_resume_details_with_azure, 
#     clean_json_string,
#     convert_pdf_to_images,
#     extract_resume_details_with_azure_vision,
#     convert_docx_to_pdf  # Import the new DOCX to PDF conversion function
# )
# from app.database import get_db, Base, engine
# import tempfile
# import os
# import traceback
# from docx2pdf import convert
# import uuid
# import time
# from typing import Dict, Any, List, Optional
# from datetime import datetime
# from pydantic import BaseModel

# # Check if processing_method column exists in resume_history table
# def column_exists(table_name, column_name):
#     try:
#         inspector = inspect(engine)
#         columns = inspector.get_columns(table_name)
#         return any(col['name'] == column_name for col in columns)
#     except Exception:
#         # Table doesn't exist yet or other error
#         return False

# # Flag to track if processing_method column exists
# HAS_PROCESSING_METHOD_COLUMN = column_exists('resume_history', 'processing_method')

# router = APIRouter()

# # In-memory task storage (replace with Redis or DB in production)
# TASKS = {}

# class TaskStatus:
#     PENDING = "pending"
#     PROCESSING = "processing"
#     COMPLETED = "completed"
#     FAILED = "failed"

# # Database model for resume history
# class ResumeHistory(Base):
#     __tablename__ = "resume_history"
    
#     id = Column(Integer, primary_key=True, index=True)
#     filename = Column(String(255), nullable=False)
#     processed_at = Column(DateTime(timezone=True), server_default=func.now())
#     user_id = Column(String(255), nullable=True)  # Can be linked to user authentication
#     resume_data = Column(JSON, nullable=False)
#     file_size = Column(Integer, nullable=True)
#     status = Column(String(50), default="completed")
#     original_file_type = Column(String(10), nullable=True)
    
#     # Only add this column to the model if it exists in the database
#     if HAS_PROCESSING_METHOD_COLUMN:
#         processing_method = Column(String(20), default="text")

# # Pydantic model for response
# class ResumeHistoryResponse(BaseModel):
#     id: int
#     filename: str
#     processed_at: datetime
#     file_size: Optional[int]
#     status: str
#     original_file_type: Optional[str]
#     processing_method: Optional[str] = "text"

# @router.post("/upload")
# async def upload_resume(
#     file: UploadFile = File(...),
#     background_tasks: BackgroundTasks = None,
#     db: Session = Depends(get_db),
#     use_vision: bool = True  # New parameter to toggle between text and image processing
# ):
#     try:
#         # Generate a unique task ID
#         task_id = str(uuid.uuid4())
        
#         # Validate file type
#         allowed_extensions = ['.pdf', '.doc', '.docx']
#         allowed_mime_types = [
#             'application/pdf',
#             'application/msword',
#             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
#         ]
#         file_extension = f".{file.filename.split('.')[-1].lower()}"
#         if file_extension not in allowed_extensions or file.content_type not in allowed_mime_types:
#             raise HTTPException(status_code=400, detail="Only PDF, DOC, or DOCX files are supported.")

#         # Create temporary file with appropriate suffix
#         suffix = file_extension
#         file_content = await file.read()
#         file_size = len(file_content)
        
#         with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
#             tmp.write(file_content)
#             tmp_path = tmp.name
        
#         # Initialize task status
#         TASKS[task_id] = {
#             "status": TaskStatus.PENDING,
#             "stage": "upload",
#             "progress": 0,
#             "data": None,
#             "error": None,
#             "file_path": tmp_path,
#             "file_extension": file_extension,
#             "filename": file.filename,
#             "file_size": file_size,
#             "user_id": None,  # Can be populated from auth
#             "use_vision": use_vision  # Store whether to use vision-based processing
#         }
        
#         # Start processing in background
#         background_tasks.add_task(process_resume, task_id, db)
        
#         # Return the task ID immediately
#         return {"task_id": task_id, "status": "processing", "method": "vision" if use_vision else "text"}

#     except HTTPException as http_exc:
#         raise http_exc
#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Unexpected error occurred: {str(e)}")

# @router.get("/progress/{task_id}")
# async def get_progress(task_id: str):
#     if task_id not in TASKS:
#         raise HTTPException(status_code=404, detail="Task not found")
    
#     task = TASKS[task_id]
    
#     # Clean up completed tasks after some time (optional)
#     if task["status"] in [TaskStatus.COMPLETED, TaskStatus.FAILED] and "cleanup_time" not in task:
#         task["cleanup_time"] = time.time() + 3600  # Clean up after 1 hour
    
#     return {
#         "status": task["status"],
#         "stage": task["stage"],
#         "progress": task["progress"],
#         "data": task["data"] if task["status"] == TaskStatus.COMPLETED else None,
#         "error": task["error"] if task["status"] == TaskStatus.FAILED else None
#     }

# @router.get("/history", response_model=List[ResumeHistoryResponse])
# async def get_resume_history(db: Session = Depends(get_db), limit: int = 10, skip: int = 0):
#     """Get the resume processing history"""
#     # Optionally filter by user_id if authentication is implemented
#     history = db.query(ResumeHistory).order_by(
#         ResumeHistory.processed_at.desc()
#     ).offset(skip).limit(limit).all()
    
#     return history

# @router.get("/history/{resume_id}", response_model=dict)
# async def get_resume_details(resume_id: int, db: Session = Depends(get_db)):
#     """Get a specific resume from history by ID"""
#     resume = db.query(ResumeHistory).filter(ResumeHistory.id == resume_id).first()
#     if not resume:
#         raise HTTPException(status_code=404, detail="Resume not found")
    
#     # Return full data including parsed resume content
#     result = {
#         "id": resume.id,
#         "filename": resume.filename,
#         "processed_at": resume.processed_at,
#         "file_size": resume.file_size,
#         "status": resume.status,
#         "original_file_type": resume.original_file_type,
#         "resume_data": resume.resume_data
#     }
    
#     # Only add processing_method if the column exists
#     if HAS_PROCESSING_METHOD_COLUMN:
#         result["processing_method"] = getattr(resume, "processing_method", "text")
#     else:
#         result["processing_method"] = "text"  # Default value
    
#     return result

# @router.delete("/history/{resume_id}")
# async def delete_resume(resume_id: int, db: Session = Depends(get_db)):
#     """Delete a resume from history"""
#     resume = db.query(ResumeHistory).filter(ResumeHistory.id == resume_id).first()
#     if not resume:
#         raise HTTPException(status_code=404, detail="Resume not found")
    
#     db.delete(resume)
#     db.commit()
    
#     return {"message": "Resume deleted successfully"}

# async def process_resume(task_id: str, db: Session):
#     task = TASKS[task_id]
#     tmp_path = task["file_path"]
#     file_extension = task["file_extension"]
#     use_vision = task.get("use_vision", True)
#     converted_pdf_path = None  # Track converted PDF for cleanup
    
#     try:
#         # Update status to processing
#         task["status"] = TaskStatus.PROCESSING
        
#         # For DOC/DOCX files, convert to PDF first if using vision processing
#         if file_extension in ['.doc', '.docx'] and use_vision:
#             try:
#                 # Step 1: Convert DOCX to PDF for vision processing
#                 task["stage"] = "converting_docx_to_pdf"
#                 task["progress"] = 0
                
#                 print(f"Converting {file_extension} to PDF for comprehensive vision processing...")
                
#                 # Simulate conversion progress
#                 for i in range(1, 6):
#                     time.sleep(0.2)
#                     task["progress"] = i * 20
                
#                 # Convert DOCX to PDF
#                 converted_pdf_path = convert_docx_to_pdf(tmp_path)
#                 task["progress"] = 100
                
#                 # Update file extension and path for further processing
#                 file_extension = '.pdf'
#                 tmp_path = converted_pdf_path
                
#                 print(f"Successfully converted to PDF for comprehensive table extraction: {converted_pdf_path}")
                
#             except Exception as e:
#                 print(f"DOCX to PDF conversion failed, falling back to text-based processing: {str(e)}")
#                 use_vision = False
        
#         # Process using either vision-based or text-based approach
#         processing_method = "text"  # Default to text in case of fallback
        
#         if use_vision and file_extension == '.pdf':
#             try:
#                 # Step 1: Convert PDF to images (ALL pages for complete table extraction)
#                 task["stage"] = "conversion_to_image_all_pages"
#                 task["progress"] = 0
                
#                 print("Converting ALL pages to images for comprehensive table extraction...")
                
#                 # Simulate extraction progress updates
#                 for i in range(1, 6):
#                     time.sleep(0.4)  # Slightly longer for all pages
#                     task["progress"] = i * 20
                
#                 # Convert PDF to images (all pages)
#                 images = convert_pdf_to_images(tmp_path)
#                 print(f"Converted all {len(images)} pages to images for complete table analysis")
#                 task["progress"] = 100
                
#                 # Step 2: Extract structured resume details (via Azure with vision - ALL pages)
#                 task["stage"] = "parsing_all_pages_with_vision"
#                 task["progress"] = 0
                
#                 print("Starting comprehensive vision-based parsing of all pages and table rows...")
                
#                 # Simulate parsing progress updates for longer processing
#                 for i in range(1, 11):
#                     time.sleep(0.3)  # Longer processing time for all pages
#                     task["progress"] = i * 10
                    
#                 extracted = extract_resume_details_with_azure_vision(images)
#                 parsed = clean_json_string(extracted)
                
#                 # Log the number of experience entries found
#                 experience_data = parsed.get('experience_data', [])
#                 print(f"Successfully extracted {len(experience_data)} experience entries from all table rows")
                
#                 task["progress"] = 100
#                 processing_method = "vision"
                
#             except Exception as e:
#                 print(f"Comprehensive vision-based processing failed, falling back to text-based: {str(e)}")
#                 # Fall back to text-based processing
#                 use_vision = False
        
#         # If vision processing failed, wasn't requested, or file is DOCX, use text-based processing
#         if not use_vision:
#             # Step 1: Extract text from file
#             task["stage"] = "extraction"
#             task["progress"] = 0
            
#             # Simulate extraction progress updates
#             for i in range(1, 6):
#                 time.sleep(0.3)  # Simulate work
#                 task["progress"] = i * 20
            
#             # Extract text based on file type (use original file for text extraction)
#             original_file_extension = task["file_extension"]
#             original_file_path = task["file_path"]
            
#             if original_file_extension == '.pdf':
#                 text = extract_text_from_pdf(original_file_path)
#                 print(f"Extracted {len(text)} characters from PDF")
#             elif original_file_extension in ['.doc', '.docx']:
#                 # Use the new DOCX extraction function
#                 text = extract_text_from_docx(original_file_path)
#                 print(f"Extracted {len(text)} characters from DOCX")
#             else:
#                 raise Exception(f"Unsupported file type: {original_file_extension}")
                
#             task["progress"] = 100
            
#             # Step 2: Extract structured resume details (via Azure)
#             task["stage"] = "parsing"
#             task["progress"] = 0
            
#             # Simulate parsing progress updates
#             for i in range(1, 9):
#                 time.sleep(0.2)  # Simulate work
#                 task["progress"] = i * 12
                
#             extracted = extract_resume_details_with_azure(text)
#             parsed = clean_json_string(extracted)
#             task["progress"] = 100
            
#             processing_method = "text"

#         # Set completed status and store the parsed data
#         task["stage"] = "completion"
#         task["progress"] = 100
#         task["status"] = TaskStatus.COMPLETED
#         task["data"] = parsed
        
#         # Log final results
#         experience_data = parsed.get('experience_data', [])
#         print(f"Final result: Successfully processed resume with {len(experience_data)} experience entries using {processing_method} method")
        
#         # Create resume history object with basic fields
#         resume_history = ResumeHistory(
#             filename=task["filename"],
#             resume_data=parsed,
#             file_size=task["file_size"],
#             original_file_type=task["file_extension"].lstrip('.'),  # Use original file extension
#             user_id=task["user_id"]
#         )
        
#         # Only set processing_method if the column exists
#         if HAS_PROCESSING_METHOD_COLUMN:
#             resume_history.processing_method = processing_method
        
#         db.add(resume_history)
#         db.commit()
#         db.refresh(resume_history)

#     except Exception as e:
#         traceback.print_exc()
#         task["status"] = TaskStatus.FAILED
#         task["error"] = str(e)
        
#         # Save failed job to history too
#         try:
#             # Create resume history object with basic fields
#             resume_history = ResumeHistory(
#                 filename=task["filename"],
#                 resume_data={},  # Empty as processing failed
#                 file_size=task["file_size"],
#                 original_file_type=task["file_extension"].lstrip('.'),
#                 user_id=task["user_id"],
#                 status="failed"
#             )
            
#             # Only set processing_method if the column exists
#             if HAS_PROCESSING_METHOD_COLUMN:
#                 resume_history.processing_method = "vision" if use_vision else "text"
            
#             db.add(resume_history)
#             db.commit()
#         except:
#             pass
#     finally:
#         # Clean up temporary files
#         try:
#             if os.path.exists(task["file_path"]):
#                 os.remove(task["file_path"])
#             # Also clean up converted PDF if it was created
#             if converted_pdf_path and os.path.exists(converted_pdf_path) and converted_pdf_path != task["file_path"]:
#                 os.remove(converted_pdf_path)
#         except:
#             pass











