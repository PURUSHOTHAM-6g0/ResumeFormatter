import PyPDF2
import httpx
from app.config import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY
import json
import re
import tempfile
import os
import base64  # For encoding images
import fitz  # PyMuPDF
from PIL import Image
import io
from docx import Document  # For DOCX text extraction
import subprocess
import platform

def extract_text_from_pdf(file_path: str) -> str:
    """Legacy function to extract text from PDF - kept for backward compatibility"""
    with open(file_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""

        return text

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX files using python-docx"""
    try:
        doc = Document(file_path)
        text = ""
        
        # Extract text from paragraphs
        for para in doc.paragraphs:
            text += para.text + "\n"
        
        # Extract text from tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    text += cell.text + " "
                text += "\n"
        
        # Extract text from headers and footers
        for section in doc.sections:
            # Header
            if section.header:
                for para in section.header.paragraphs:
                    text += para.text + "\n"
            
            # Footer  
            if section.footer:
                for para in section.footer.paragraphs:
                    text += para.text + "\n"
        
        return text.strip()
        
    except Exception as e:
        print(f"Error extracting text from DOCX: {str(e)}")
        raise RuntimeError(f"Failed to extract text from DOCX file: {str(e)}")

def convert_docx_to_pdf(docx_path: str) -> str:
    """Convert DOCX file to PDF and return the PDF file path"""
    try:
        # Create a temporary PDF file
        pdf_path = docx_path.replace('.docx', '.pdf').replace('.doc', '.pdf')
        
        # Try different conversion methods based on the platform
        system = platform.system().lower()
        
        if system == "linux":
            # Use LibreOffice on Linux
            try:
                # Get the directory where the DOCX file is located
                docx_dir = os.path.dirname(docx_path)
                
                # Run LibreOffice headless conversion
                cmd = [
                    'libreoffice', '--headless', '--convert-to', 'pdf',
                    '--outdir', docx_dir, docx_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0:
                    print(f"Successfully converted DOCX to PDF using LibreOffice")
                    return pdf_path
                else:
                    print(f"LibreOffice conversion failed: {result.stderr}")
                    raise Exception("LibreOffice conversion failed")
                    
            except (subprocess.TimeoutExpired, FileNotFoundError) as e:
                print(f"LibreOffice not available or timeout: {str(e)}")
                raise Exception("LibreOffice conversion not available")
                
        elif system == "windows":
            # Use docx2pdf on Windows
            try:
                from docx2pdf import convert
                convert(docx_path, pdf_path)
                print(f"Successfully converted DOCX to PDF using docx2pdf")
                return pdf_path
            except ImportError:
                print("docx2pdf not available on Windows")
                raise Exception("docx2pdf not available")
                
        else:
            # Fallback: try python-docx with reportlab for cross-platform conversion
            try:
                from reportlab.pdfgen import canvas
                from reportlab.lib.pagesizes import letter
                from reportlab.lib.styles import getSampleStyleSheet
                from reportlab.platypus import SimpleDocTemplate, Paragraph
                
                # Extract text using existing function
                text = extract_text_from_docx(docx_path)
                
                # Create PDF
                doc = SimpleDocTemplate(pdf_path, pagesize=letter)
                styles = getSampleStyleSheet()
                story = []
                
                # Split text into paragraphs and add to PDF
                paragraphs = text.split('\n')
                for para_text in paragraphs:
                    if para_text.strip():
                        para = Paragraph(para_text, styles['Normal'])
                        story.append(para)
                
                doc.build(story)
                print(f"Successfully converted DOCX to PDF using reportlab")
                return pdf_path
                
            except ImportError:
                print("reportlab not available for PDF generation")
                raise Exception("No PDF conversion method available")
                
    except Exception as e:
        print(f"Error converting DOCX to PDF: {str(e)}")
        raise RuntimeError(f"Failed to convert DOCX to PDF: {str(e)}")

def convert_pdf_to_images(file_path: str, dpi: int = 300) -> list:
    """Convert PDF to a list of PIL Images using PyMuPDF (fitz)"""
    try:
        # Open the PDF
        pdf_document = fitz.open(file_path)
        images = []
        
        # Get number of pages
        page_count = len(pdf_document)
        print(f"PDF has {page_count} pages - converting all pages to images")
        
        # Convert each page to an image
        for page_num in range(page_count):
            page = pdf_document.load_page(page_num)
            
            # Set the rendering matrix for higher quality
            zoom = dpi / 72  # 72 is the default DPI for PDF
            matrix = fitz.Matrix(zoom, zoom)
            
            # Render page to a pixmap (image)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            
            # Convert pixmap to PIL Image
            img = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            images.append(img)
            
            print(f"Converted page {page_num + 1}/{page_count} to image: {img.width}x{img.height}")
        
        # Close the document
        pdf_document.close()
        
        print(f"Successfully converted all {page_count} pages to images")
        return images
    except Exception as e:
        print(f"Error converting PDF to images with PyMuPDF: {str(e)}")
        raise

def image_to_base64(image) -> str:
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return img_str

def extract_resume_details_with_azure(text: str) -> dict:
    """Legacy function that uses text-based extraction - kept for backward compatibility"""
    url = AZURE_OPENAI_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_KEY
    }

    system_prompt = (
        "You are an expert resume parser. Extract the following fields from the resume:\n"
        "- name\n"
        "- email\n"
        "- mobile\n"
        "- skills (group related skills together, and return as a list of objects with category as the key and related skills as the value. For example: [{ 'Programming Languages': ['Java', 'C++'] }, { 'Cloud': ['AWS', 'Docker'] }])\n"
        "- education (recently passed degree/institution)\n"
        "- professional_experience (Try to get the entire resume summary. Note that it should be in format 'professional_experience':['point1','point2',..])\n"
        "- certifications (as a list\check for certifications with images eg: microsoft certified Technology specialist)\n"
        "- experience_data (as a list of objects with each object containing the following keys: 'company', 'startDate', 'endDate', 'role', 'clientEngagement', 'program', and 'responsibilities' which is a list of bullet points describing duties)\n"
        "Return the data as valid JSON. If there is no data available for a section, try to infer it from the resume. If there is no data available for a section, try to infer it from the resume. If not possible, return 'Not available' for that section."
    )

    user_prompt = f"Resume Text:\n{text}"

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 6000
    }

    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=50.0)
        response.raise_for_status()
        try:
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as json_error:
            print("Raw response text:", response.text)  # This will show what Azure actually returned
            raise RuntimeError(f"Failed to parse JSON: {json_error}")
    except httpx.HTTPStatusError as e:
        print("Azure returned an HTTP error:", e.response.text)
        raise RuntimeError(f"Request failed with status {e.response.status_code}: {e.response.text}")

def extract_resume_details_with_azure_vision(images: list) -> dict:
    """Extract resume details using Azure OpenAI with vision capabilities"""
    url = AZURE_OPENAI_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_KEY
    }

    system_prompt = (
        "You are an expert resume parser. Extract the following fields from the resume:\n"
        "- name\n"
        "- email\n"
        "- mobile\n"
        "- skills (group related skills together, and return as a list of objects with category as the key and related skills as the value. For example: [{ 'Programming Languages': ['Java', 'C++'] }, { 'Cloud': ['AWS', 'Docker'] }])\n"
        "- education (recently passed degree/institution)\n"
        "- professional_experience (Try to get the entire resume summary. Note that it should be in format 'professional_experience':['point1','point2',..])\n"
        "- certifications (as a list\check for certifications with images eg: microsoft certified Technology specialist)\n"
        "- experience_data (as a list of objects with each object containing the following keys: 'company', 'startDate', 'endDate', 'role', 'clientEngagement', 'program', and 'responsibilities' which is a list of bullet points describing duties)\n\n"
        "CRITICAL INSTRUCTIONS FOR EXPERIENCE DATA EXTRACTION:\n"
        "- EXTRACT EVERY SINGLE ROW from ALL experience tables across ALL pages\n"
        "- Each table row represents a separate job/role and should be a separate object in the experience_data array\n"
        "- Do NOT skip any rows - process EVERY visible row in experience tables\n"
        "- If a company appears multiple times with different roles, create separate objects for EACH role\n"
        "- Look for tables with columns like: Role, Location, Domain, Duration, Key Projects\n"
        "- Parse ALL rows from top to bottom, including partially visible rows\n"
        "- For multi-page tables, ensure you capture continuation rows on subsequent pages\n"
        "- If you see only partial information in a row, still include it as a separate entry\n"
        "- Pay special attention to table borders and row separators to identify individual entries\n"
        "- Count the number of rows you process and ensure you capture ALL visible experience entries\n\n"
        "TABLE PARSING STRATEGY:\n"
        "1. Identify ALL tables containing work experience information\n"
        "2. Process each table row by row from top to bottom\n"
        "3. Extract data from each column for every row\n"
        "4. Create a separate experience_data object for each row\n"
        "5. Continue processing on subsequent pages if tables span multiple pages\n\n"
        "Return the data as valid JSON. If there is no data available for a section, try to infer it from the resume. If not possible, return 'Not available' for that section."
    )

    # Process ALL pages for complete coverage of 10-page resumes
    content = [{"type": "text", "text": "Parse this complete resume. This is a 10-page document. Pay special attention to extracting ALL experience data from ALL table rows across ALL pages. DO NOT miss any rows in experience tables:"}]
    
    # Process ALL pages (up to 10 for complete coverage)
    max_pages = min(10, len(images))
    print(f"Processing ALL {max_pages} pages out of {len(images)} total pages for comprehensive vision analysis")
    
    for i, image in enumerate(images[:max_pages]):
        base64_image = image_to_base64(image)
        content.append({
            "type": "image_url", 
            "image_url": {"url": f"data:image/png;base64,{base64_image}"}
        })
        print(f"Added page {i+1} to vision processing for complete table extraction")
        
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content}
        ],
        "temperature": 0.05,  # Very low temperature for maximum consistency
        "max_tokens": 12000   # Increased token limit significantly for longer responses
    }

    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=180.0)  # Increased timeout for all pages
        response.raise_for_status()
        try:
            data = response.json()
            extracted_content = data["choices"][0]["message"]["content"]
            print(f"Azure Vision API response length: {len(extracted_content)} characters")
            return extracted_content
        except Exception as json_error:
            print("Raw response text:", response.text)
            raise RuntimeError(f"Failed to parse JSON: {json_error}")
    except httpx.HTTPStatusError as e:
        print("Azure returned an HTTP error:", e.response.text)
        raise RuntimeError(f"Request failed with status {e.response.status_code}: {e.response.text}")

def clean_json_string(raw: str):
    # Remove triple backticks and language hint (```json)
    cleaned = re.sub(r"^```json\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)







# import PyPDF2
# import httpx
# import json
# import re
# import os
# from app.config import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY

# def extract_text_from_pdf(file_path: str) -> str:
#     """Extract text from PDF with multiple fallback methods"""
#     try:
#         # First try with PyPDF2
#         with open(file_path, "rb") as file:
#             reader = PyPDF2.PdfReader(file)
#             text = ""
#             for page_num in range(len(reader.pages)):
#                 page = reader.pages[page_num]
#                 text += page.extract_text() or ""
#             return text
#     except Exception as e:
#         print(f"PyPDF2 failed: {str(e)}")
        
#         # Try with pdfplumber as fallback
#         try:
#             import pdfplumber
#             text = ""
#             with pdfplumber.open(file_path) as pdf:
#                 for page in pdf.pages:
#                     page_text = page.extract_text()
#                     if page_text:
#                         text += page_text + "\n"
#             return text
#         except ImportError:
#             print("pdfplumber not available")
#         except Exception as e:
#             print(f"pdfplumber failed: {str(e)}")
        
#         # Try with pymupdf as another fallback
#         try:
#             import fitz  # pymupdf
#             doc = fitz.open(file_path)
#             text = ""
#             for page in doc:
#                 text += page.get_text()
#             doc.close()
#             return text
#         except ImportError:
#             print("pymupdf not available")
#         except Exception as e:
#             print(f"pymupdf failed: {str(e)}")
        
#         raise RuntimeError(f"All PDF extraction methods failed. Last error: {str(e)}")

# def extract_text_from_docx(file_path: str) -> str:
#     """Extract text directly from DOCX files"""
#     try:
#         from docx import Document
#         doc = Document(file_path)
#         text = []
        
#         # Extract text from paragraphs
#         for paragraph in doc.paragraphs:
#             if paragraph.text.strip():
#                 text.append(paragraph.text)
        
#         # Extract text from tables
#         for table in doc.tables:
#             for row in table.rows:
#                 for cell in row.cells:
#                     if cell.text.strip():
#                         text.append(cell.text)
        
#         return '\n'.join(text)
#     except ImportError:
#         raise RuntimeError("python-docx library not installed. Cannot process DOCX files directly.")
#     except Exception as e:
#         raise RuntimeError(f"Failed to extract text from DOCX: {str(e)}")

# def extract_text_from_doc(file_path: str) -> str:
#     """Extract text from DOC files using python-docx2txt"""
#     try:
#         import docx2txt
#         text = docx2txt.process(file_path)
#         return text if text else ""
#     except ImportError:
#         print("docx2txt not available for DOC files")
#         raise RuntimeError("docx2txt library not installed. Cannot process DOC files directly.")
#     except Exception as e:
#         print(f"docx2txt failed: {str(e)}")
#         raise RuntimeError(f"Failed to extract text from DOC: {str(e)}")

# def optimize_text(text: str) -> str:
#     """Optimize text to reduce size while preserving important information"""
#     if not text:
#         return ""
    
#     # Remove excessive whitespace
#     text = re.sub(r'\s+', ' ', text)
    
#     # Remove duplicate lines (often happens in PDFs)
#     lines = text.split('\n')
#     unique_lines = []
#     seen_lines = set()
    
#     for line in lines:
#         line = line.strip()
#         if line and line not in seen_lines:
#             unique_lines.append(line)
#             seen_lines.add(line)
    
#     return '\n'.join(unique_lines)

# def extract_resume_details_with_azure(text: str) -> dict:
#     """Process resume text with Azure OpenAI - returns both original format and reasoning/confidence"""
#     if not text or len(text.strip()) < 10:
#         raise RuntimeError("No meaningful text extracted from the document")
    
#     url = AZURE_OPENAI_ENDPOINT
#     headers = {
#         "Content-Type": "application/json",
#         "api-key": AZURE_OPENAI_KEY
#     }

#     # First call - Original format for frontend compatibility
#     original_system_prompt = (
#         "You are an expert resume parser. Extract the following fields from the resume:\n"
#         "- name\n"
#         "- email\n"
#         "- mobile\n"
#         "- skills (group related skills together, and return as a list of objects with category as the key and related skills as the value. For example: [{ 'Programming Languages': ['Java', 'C++'] }, { 'Cloud': ['AWS', 'Docker'] }])\n"
#         "- education (as a list of degrees/institutions)\n"
#         "- professional_experience ( Try to get the entire resume summary. Note that it should be in format 'professional_experience':['point1','point2',..])\n"
#         "- certifications (as a list)\n"
#         "- experience_data (as a list of objects with each object containing the following keys: 'company', 'startDate', 'endDate', 'role', 'clientEngagement', 'program', and 'responsibilities' which is a list of bullet points describing duties)\n"
#         "Return the data as valid JSON. If there is no data available for a section, try to infer it from the resume. If not possible, return 'Not available' for that section."
#     )

#     # Second call - Enhanced format with reasoning and confidence
#     enhanced_system_prompt = (
#         "You are an expert resume parser. For each field you extract, provide reasoning and confidence:\n"
#         "- name\n"
#         "- email\n"
#         "- mobile\n"
#         "- skills\n"
#         "- education\n"
#         "- professional_experience\n"
#         "- certifications\n"
#         "- experience_data\n\n"
        
#         "For EACH field, provide:\n"
#         "1. A 'reasoning' explaining HOW and WHY you identified this information\n"
#         "2. A 'confidence' score between 0.0 and 1.0\n\n"
        
#         "Return in this format:\n"
#         "{\n"
#         "  \"name\": {\n"
#         "    \"reasoning\": \"explanation\",\n"
#         "    \"confidence\": 0.95\n"
#         "  },\n"
#         "  \"email\": {\n"
#         "    \"reasoning\": \"explanation\",\n"
#         "    \"confidence\": 0.98\n"
#         "  }\n"
#         "  // ... for all fields\n"
#         "}"
#     )

#     # Optimize text to reduce size while preserving content
#     optimized_text = optimize_text(text)
#     print(f"Original text length: {len(text)}, Optimized text length: {len(optimized_text)}")
    
#     user_prompt = f"Resume Text:\n{optimized_text}"

#     # First API call - Original format
#     original_payload = {
#         "messages": [
#             {"role": "system", "content": original_system_prompt},
#             {"role": "user", "content": user_prompt}
#         ],
#         "temperature": 0.2,
#         "max_tokens": 4000
#     }

#     # Second API call - Reasoning and confidence
#     enhanced_payload = {
#         "messages": [
#             {"role": "system", "content": enhanced_system_prompt},
#             {"role": "user", "content": user_prompt}
#         ],
#         "temperature": 0.2,
#         "max_tokens": 4000
#     }

#     try:
#         # Create a client with increased timeout for large documents
#         with httpx.Client(timeout=180.0) as client:
#             # First call - Original data
#             print("Making first API call for original data extraction...")
#             response1 = client.post(url, headers=headers, json=original_payload)
#             response1.raise_for_status()
            
#             # Second call - Reasoning and confidence
#             print("Making second API call for reasoning and confidence...")
#             response2 = client.post(url, headers=headers, json=enhanced_payload)
#             response2.raise_for_status()
            
#         try:
#             # Parse original data
#             original_data = response1.json()
#             original_result = original_data["choices"][0]["message"]["content"]
            
#             # Parse reasoning and confidence data
#             enhanced_data = response2.json()
#             enhanced_result = enhanced_data["choices"][0]["message"]["content"]
            
#             print("Both Azure OpenAI calls completed successfully")
            
#             return {
#                 "original": original_result,
#                 "enhanced": enhanced_result
#             }
            
#         except Exception as json_error:
#             print("Raw response text:", response1.text if 'response1' in locals() else "No response1")
#             raise RuntimeError(f"Failed to parse JSON: {json_error}")
#     except httpx.HTTPStatusError as e:
#         print("Azure returned an HTTP error:", e.response.text)
#         raise RuntimeError(f"Request failed with status {e.response.status_code}: {e.response.text}")
#     except httpx.ReadTimeout:
#         raise RuntimeError("Request timed out. The document may be too large or complex.")
#     except Exception as e:
#         print(f"Unexpected error in Azure API call: {str(e)}")
#         raise RuntimeError(f"Failed to process with Azure API: {str(e)}")

# def clean_json_string(raw: str):
#     """Clean and parse JSON string from API response"""
#     if not raw:
#         raise ValueError("Empty response from API")
    
#     # Remove triple backticks and language hint (```json)
#     cleaned = re.sub(r"^```json\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    
#     try:
#         return json.loads(cleaned)
#     except json.JSONDecodeError as e:
#         print(f"Initial JSON parsing failed: {str(e)}")
        
#         # Try additional cleaning if initial parsing fails
#         cleaned = re.sub(r'[\n\r\t]', ' ', cleaned)
        
#         # Remove any non-JSON content before or after the JSON object
#         match = re.search(r'(\{.*\})', cleaned, re.DOTALL)
#         if match:
#             cleaned = match.group(1)
#             try:
#                 return json.loads(cleaned)
#             except json.JSONDecodeError:
#                 pass
        
#         # Last resort: try to fix common JSON issues
#         cleaned = re.sub(r',\s*}', '}', cleaned)  # Remove trailing commas
#         cleaned = re.sub(r',\s*]', ']', cleaned)  # Remove trailing commas in arrays
        
#         try:
#             return json.loads(cleaned)
#         except json.JSONDecodeError as final_error:
#             print(f"Final JSON parsing failed. Raw content: {raw[:500]}...")
#             raise ValueError(f"Could not parse JSON response: {str(final_error)}")

# def process_azure_response(azure_response: dict):
#     """Process the dual Azure response to separate original data and reasoning/confidence"""
#     try:
#         # Parse original data (for frontend)
#         original_data = clean_json_string(azure_response["original"])
        
#         # Parse enhanced data (reasoning and confidence)
#         try:
#             enhanced_data = clean_json_string(azure_response["enhanced"])
#         except Exception as e:
#             print(f"Failed to parse enhanced data: {str(e)}")
#             enhanced_data = {}
        
#         # Calculate overall confidence
#         confidence_scores = []
#         for field_name, field_info in enhanced_data.items():
#             if isinstance(field_info, dict) and "confidence" in field_info:
#                 confidence_scores.append(field_info["confidence"])
        
#         overall_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        
#         # Log confidence information
#         print("\n=== EXTRACTION ANALYSIS ===")
#         for field_name, field_info in enhanced_data.items():
#             if isinstance(field_info, dict):
#                 confidence = field_info.get("confidence", 0)
#                 reasoning = field_info.get("reasoning", "No reasoning provided")
#                 print(f"{field_name}: Confidence {confidence:.2f}")
#                 if confidence < 0.7:
#                     print(f"  ⚠️  LOW CONFIDENCE - {reasoning}")
        
#         print(f"Overall Confidence: {overall_confidence:.2f}")
#         print("===========================\n")
        
#         return {
#             "parsed_data": original_data,  # Original format for frontend
#             "analysis": {
#                 "reasoning_and_confidence": enhanced_data,
#                 "overall_confidence": overall_confidence,
#                 "field_count": len(confidence_scores)
#             }
#         }
        
#     except Exception as e:
#         print(f"Error processing Azure response: {str(e)}")
#         # Fallback to original data only
#         try:
#             original_data = clean_json_string(azure_response["original"])
#             return {
#                 "parsed_data": original_data,
#                 "analysis": {
#                     "reasoning_and_confidence": {},
#                     "overall_confidence": 0,
#                     "field_count": 0,
#                     "error": "Failed to extract reasoning and confidence"
#                 }
#             }
#         except:
#             raise ValueError("Failed to process any Azure response data")