from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, inspect
from sqlalchemy.sql import func
from app.services.resume_parser import (
    extract_text_from_pdf, 
    extract_text_from_docx,  # Import the new DOCX function
    extract_resume_details_with_azure, 
    clean_json_string,
    convert_pdf_to_images,
    extract_resume_details_with_azure_vision,
    convert_docx_to_pdf  # Import the new DOCX to PDF conversion function
)
from app.database import get_db, Base, engine
import tempfile
import os
import traceback
from docx2pdf import convert
import uuid
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

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
            "progress": 0,
            "data": None,
            "error": None,
            "file_path": tmp_path,
            "file_extension": file_extension,
            "filename": file.filename,
            "file_size": file_size,
            "user_id": None,  # Can be populated from auth
            "use_vision": use_vision  # Store whether to use vision-based processing
        }
        
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

async def process_resume(task_id: str, db: Session):
    task = TASKS[task_id]
    tmp_path = task["file_path"]
    file_extension = task["file_extension"]
    use_vision = task.get("use_vision", True)
    converted_pdf_path = None  # Track converted PDF for cleanup
    
    try:
        # Update status to processing
        task["status"] = TaskStatus.PROCESSING
        
        # For DOC/DOCX files, convert to PDF first if using vision processing
        if file_extension in ['.doc', '.docx'] and use_vision:
            try:
                # Step 1: Convert DOCX to PDF for vision processing
                task["stage"] = "converting_docx_to_pdf"
                task["progress"] = 0
                
                print(f"Converting {file_extension} to PDF for comprehensive vision processing...")
                
                # Simulate conversion progress
                for i in range(1, 6):
                    time.sleep(0.2)
                    task["progress"] = i * 20
                
                # Convert DOCX to PDF
                converted_pdf_path = convert_docx_to_pdf(tmp_path)
                task["progress"] = 100
                
                # Update file extension and path for further processing
                file_extension = '.pdf'
                tmp_path = converted_pdf_path
                
                print(f"Successfully converted to PDF for comprehensive table extraction: {converted_pdf_path}")
                
            except Exception as e:
                print(f"DOCX to PDF conversion failed, falling back to text-based processing: {str(e)}")
                use_vision = False
        
        # Process using either vision-based or text-based approach
        processing_method = "text"  # Default to text in case of fallback
        
        if use_vision and file_extension == '.pdf':
            try:
                # Step 1: Convert PDF to images (ALL pages for complete table extraction)
                task["stage"] = "conversion_to_image_all_pages"
                task["progress"] = 0
                
                print("Converting ALL pages to images for comprehensive table extraction...")
                
                # Simulate extraction progress updates
                for i in range(1, 6):
                    time.sleep(0.4)  # Slightly longer for all pages
                    task["progress"] = i * 20
                
                # Convert PDF to images (all pages)
                images = convert_pdf_to_images(tmp_path)
                print(f"Converted all {len(images)} pages to images for complete table analysis")
                task["progress"] = 100
                
                # Step 2: Extract structured resume details (via Azure with vision - ALL pages)
                task["stage"] = "parsing_all_pages_with_vision"
                task["progress"] = 0
                
                print("Starting comprehensive vision-based parsing of all pages and table rows...")
                
                # Simulate parsing progress updates for longer processing
                for i in range(1, 11):
                    time.sleep(0.3)  # Longer processing time for all pages
                    task["progress"] = i * 10
                    
                extracted = extract_resume_details_with_azure_vision(images)
                parsed = clean_json_string(extracted)
                
                # Log the number of experience entries found
                experience_data = parsed.get('experience_data', [])
                print(f"Successfully extracted {len(experience_data)} experience entries from all table rows")
                
                task["progress"] = 100
                processing_method = "vision"
                
            except Exception as e:
                print(f"Comprehensive vision-based processing failed, falling back to text-based: {str(e)}")
                # Fall back to text-based processing
                use_vision = False
        
        # If vision processing failed, wasn't requested, or file is DOCX, use text-based processing
        if not use_vision:
            # Step 1: Extract text from file
            task["stage"] = "extraction"
            task["progress"] = 0
            
            # Simulate extraction progress updates
            for i in range(1, 6):
                time.sleep(0.3)  # Simulate work
                task["progress"] = i * 20
            
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
                
            task["progress"] = 100
            
            # Step 2: Extract structured resume details (via Azure)
            task["stage"] = "parsing"
            task["progress"] = 0
            
            # Simulate parsing progress updates
            for i in range(1, 9):
                time.sleep(0.2)  # Simulate work
                task["progress"] = i * 12
                
            extracted = extract_resume_details_with_azure(text)
            parsed = clean_json_string(extracted)
            task["progress"] = 100
            
            processing_method = "text"

        # Set completed status and store the parsed data
        task["stage"] = "completion"
        task["progress"] = 100
        task["status"] = TaskStatus.COMPLETED
        task["data"] = parsed
        
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











# from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query, Response
# from sqlalchemy.orm import Session
# from app.services.resume_parser import (
#     extract_text_from_pdf, 
#     extract_text_from_docx, 
#     extract_text_from_doc,
#     extract_resume_details_with_azure, 
#     process_azure_response
# )
# from app.database import get_db
# from auth.auth import get_current_user
# from app.models import User
# from utils.logger import logger
# import tempfile
# import os
# import traceback
# import time
# import json

# router = APIRouter()

# # For tracking background tasks
# processing_tasks = {}

# def extract_text_from_file(file_path: str, file_extension: str) -> str:
#     """Extract text from file based on extension with multiple fallback methods"""
#     text = ""
    
#     if file_extension == '.pdf':
#         text = extract_text_from_pdf(file_path)
#     elif file_extension == '.docx':
#         text = extract_text_from_docx(file_path)
#     elif file_extension == '.doc':
#         # For .doc files, try docx2txt first, then try treating as docx
#         try:
#             text = extract_text_from_doc(file_path)
#         except Exception as e:
#             print(f"DOC extraction failed, trying as DOCX: {str(e)}")
#             try:
#                 text = extract_text_from_docx(file_path)
#             except Exception as e2:
#                 raise RuntimeError(f"Failed to extract text from DOC file: {str(e2)}")
#     else:
#         raise RuntimeError(f"Unsupported file extension: {file_extension}")
    
#     if not text or len(text.strip()) < 10:
#         raise RuntimeError("No meaningful text could be extracted from the document")
    
#     return text

# async def process_resume_file(file_path: str, task_id: str, file_extension: str, username: str):
#     """Background task to process resume files"""
#     try:
#         logger.info(f"Starting background processing for task {task_id} by user {username}")
#         processing_tasks[task_id]["status"] = "extracting_text"
#         processing_tasks[task_id]["username"] = username
#         processing_tasks[task_id]["start_time"] = time.time()
        
#         # Extract text based on file type
#         text = extract_text_from_file(file_path, file_extension)
#         logger.info(f"Text extraction completed for task {task_id}. Extracted {len(text)} characters.")
        
#         processing_tasks[task_id]["status"] = "extracting_details"
        
#         # Extract structured resume details with reasoning and confidence
#         azure_response = extract_resume_details_with_azure(text)
#         processed_result = process_azure_response(azure_response)
        
#         # Calculate processing metrics
#         end_time = time.time()
#         processing_time = end_time - processing_tasks[task_id]["start_time"]
        
#         # Store result - keeping original format for frontend
#         processing_tasks[task_id] = {
#             "status": "completed",
#             "result": processed_result["parsed_data"],  # Original format for frontend
#             "analysis": processed_result["analysis"],   # Reasoning and confidence separately
#             "metadata": {
#                 "processing_time_seconds": processing_time,
#                 "text_length": len(text),
#                 "file_type": file_extension[1:]
#             },
#             "username": username
#         }
        
#         overall_confidence = processed_result["analysis"].get("overall_confidence", 0)
#         logger.info(f"Task {task_id} completed successfully. Overall confidence: {overall_confidence:.2f}")
        
#     except Exception as e:
#         processing_tasks[task_id] = {
#             "status": "failed",
#             "error": str(e),
#             "username": username
#         }
#         logger.error(f"Error in background processing task {task_id}: {str(e)}")
#         traceback.print_exc()
#     finally:
#         # Clean up temporary files
#         try:
#             if os.path.exists(file_path):
#                 os.remove(file_path)
#                 logger.info(f"Temporary file cleaned up for task {task_id}")
#         except Exception as e:
#             logger.error(f"Error cleaning up files for task {task_id}: {str(e)}")

# @router.post("/upload")
# async def upload_resume(
#     response: Response,
#     file: UploadFile = File(...), 
#     include_analysis: bool = Query(False, description="Include reasoning and confidence analysis in response"),
#     background_tasks: BackgroundTasks = None,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     try:
#         logger.info(f"Resume upload by user: {current_user.username}, file: {file.filename}")
        
#         # Validate file type
#         allowed_extensions = ['.pdf', '.doc', '.docx']
        
#         # Check if filename exists
#         if not file.filename:
#             raise HTTPException(status_code=400, detail="Filename is missing")
            
#         file_extension = f".{file.filename.split('.')[-1].lower()}"
#         if file_extension not in allowed_extensions:
#             raise HTTPException(status_code=400, detail="Only PDF, DOC, or DOCX files are supported.")

#         # Create a directory for temporary files if it doesn't exist
#         temp_dir = os.path.join(tempfile.gettempdir(), "resume_parser")
#         os.makedirs(temp_dir, exist_ok=True)
        
#         # Create temporary file with appropriate suffix
#         tmp_path = os.path.join(temp_dir, f"upload_{current_user.username}_{os.urandom(8).hex()}{file_extension}")
        
#         # Save uploaded file to temporary location
#         with open(tmp_path, "wb") as tmp_file:
#             # Read in chunks to handle large files
#             chunk_size = 1024 * 1024  # 1MB chunks
#             file_content = await file.read(chunk_size)
#             while file_content:
#                 tmp_file.write(file_content)
#                 file_content = await file.read(chunk_size)

#         # Check file size to determine processing method
#         file_size = os.path.getsize(tmp_path)
#         logger.info(f"File size: {file_size / (1024*1024):.2f} MB")
        
#         # For files larger than 2MB, use background processing
#         if file_size > 2 * 1024 * 1024:  # 2MB
#             task_id = f"task_{current_user.username}_{os.urandom(8).hex()}"
#             processing_tasks[task_id] = {
#                 "status": "processing",
#                 "username": current_user.username,
#                 "file_name": file.filename,
#                 "file_size": file_size
#             }
            
#             logger.info(f"Starting background task {task_id} for large file")
#             # Start background task
#             background_tasks.add_task(
#                 process_resume_file, tmp_path, task_id, file_extension, current_user.username
#             )
            
#             # Store task_id in header for frontend to access analysis later
#             response.headers["X-Task-ID"] = task_id
            
#             return {
#                 "status": "processing",
#                 "message": "Large file detected. Processing started in background.",
#                 "task_id": task_id
#             }
        
#         # For smaller files, process immediately
#         try:
#             start_time = time.time()
#             text = extract_text_from_file(tmp_path, file_extension)
#             logger.info(f"Text extraction completed. Extracted {len(text)} characters.")
            
#             azure_response = extract_resume_details_with_azure(text)
#             processed_result = process_azure_response(azure_response)
            
#             # Calculate processing metrics
#             processing_time = time.time() - start_time
#             overall_confidence = processed_result["analysis"].get("overall_confidence", 0)
            
#             logger.info(f"Processing completed in {processing_time:.2f} seconds. Overall confidence: {overall_confidence:.2f}")
            
#             # Store analysis in response header as JSON
#             analysis_json = json.dumps({
#                 "analysis": processed_result["analysis"],
#                 "metadata": {
#                     "processing_time_seconds": processing_time,
#                     "text_length": len(text),
#                     "file_type": file_extension[1:]
#                 }
#             })
#             response.headers["X-Resume-Analysis"] = analysis_json
            
#             # Option 1: Return original format for frontend compatibility
#             if not include_analysis:
#                 return processed_result["parsed_data"]
            
#             # Option 2: Return both data and analysis if requested
#             else:
#                 return {
#                     "data": processed_result["parsed_data"],
#                     "analysis": processed_result["analysis"],
#                     "metadata": {
#                         "processing_time_seconds": processing_time,
#                         "text_length": len(text),
#                         "file_type": file_extension[1:]
#                     }
#                 }
            
#         except Exception as e:
#             logger.error(f"Error parsing resume: {str(e)}")
#             raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")
#         finally:
#             # Clean up temporary files
#             try:
#                 if os.path.exists(tmp_path):
#                     os.remove(tmp_path)
#             except:
#                 pass

#     except HTTPException as http_exc:
#         raise http_exc
#     except Exception as e:
#         logger.error(f"Unexpected error in upload_resume: {str(e)}")
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Unexpected error occurred: {str(e)}")

# @router.get("/task/{task_id}")
# async def get_task_status(
#     task_id: str,
#     include_analysis: bool = Query(False, description="Include reasoning and confidence analysis in response"),
#     current_user: User = Depends(get_current_user)
# ):
#     """Check the status of a background processing task"""
#     if task_id not in processing_tasks:
#         raise HTTPException(status_code=404, detail="Task not found")
    
#     task_info = processing_tasks[task_id]
    
#     # Ensure user can only access their own tasks
#     if task_info.get("username") != current_user.username:
#         logger.warning(f"User {current_user.username} attempted to access task belonging to {task_info.get('username')}")
#         raise HTTPException(status_code=403, detail="Access denied to this task")
    
#     if task_info["status"] == "completed":
#         logger.info(f"Returning completed task result for {task_id}")
        
#         # Option 1: Return original format for frontend compatibility
#         if not include_analysis:
#             result = task_info["result"]  # Original format for frontend
#             processing_tasks.pop(task_id, None)
#             return result
        
#         # Option 2: Return both data and analysis if requested
#         else:
#             result = {
#                 "data": task_info["result"],
#                 "analysis": task_info.get("analysis", {}),
#                 "metadata": task_info.get("metadata", {})
#             }
#             processing_tasks.pop(task_id, None)
#             return result
            
#     elif task_info["status"] == "failed":
#         error = task_info["error"]
#         processing_tasks.pop(task_id, None)
#         raise HTTPException(status_code=500, detail=f"Processing failed: {error}")
#     else:
#         status_messages = {
#             "processing": "Your document is being processed",
#             "extracting_text": "Extracting text from document",
#             "extracting_details": "Extracting resume details with AI analysis"
#         }
        
#         message = status_messages.get(task_info["status"], "Processing your document")
#         return {"status": task_info["status"], "message": message}