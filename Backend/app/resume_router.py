from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.services.resume_parser import extract_text_from_pdf,extract_resume_details_with_azure,clean_json_string
from app.database import get_db
import tempfile
import os
import traceback
from docx2pdf import convert

router = APIRouter()

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    try:
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
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Convert DOC/DOCX to PDF if necessary
        pdf_path = tmp_path
        if file_extension in ['.doc', '.docx']:
            pdf_path = tmp_path.replace(file_extension, '.pdf')
            try:
                convert(tmp_path, pdf_path)  # Convert DOC/DOCX to PDF
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to convert DOC/DOCX to PDF: {str(e)}")

        # Step 1: Extract text from PDF
        try:
            text = extract_text_from_pdf(pdf_path)
            print(text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

        # Step 2: Extract structured resume details (via Azure)
        try:
            extracted = extract_resume_details_with_azure(text)
            parsed = clean_json_string(extracted)
            print(parsed)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

        # ✅ Return parsed JSON
        return parsed

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error occurred: {str(e)}")
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            if pdf_path != tmp_path and os.path.exists(pdf_path):
                os.remove(pdf_path)
        except:
            pass