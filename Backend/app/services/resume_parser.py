from fastapi import APIRouter
import PyPDF2
import httpx
from app.config import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY
import json
import re

router = APIRouter()

def extract_text_from_pdf(file_path: str) -> str:
    with open(file_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text

def extract_resume_details_with_azure(text: str) -> dict:
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
    "- education (as a list of degrees/institutions)\n"
    "- professional_experience ( Try to get the entire resume summary. Note that it should be in format 'professional_experience':['point1','point2',..])\n"
    "- certifications (as a list)\n"
    "- experience_data (as a list of objects with each object containing the following keys: 'company', 'startDate', 'endDate', 'role', 'clientEngagement', 'program', and 'responsibilities' which is a list of bullet points describing duties)\n"
    "Return the data as valid JSON. If there is no data available for a section, try to infer it from the resume. If not possible, return 'Not available' for that section."
)




    user_prompt = f"Resume Text:\n{text}"

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 3000
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
    
def clean_json_string(raw: str):
    # Remove triple backticks and language hint (```json)
    cleaned = re.sub(r"^```json\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)