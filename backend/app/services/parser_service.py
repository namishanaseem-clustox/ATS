import os
import pymupdf  # Replaces fitz
from docx import Document
from io import BytesIO
from app.schemas.candidate import CandidateCreate
from typing import Optional
import json
from openai import OpenAI
import re

class ResumeParserService:
    def __init__(self):
        # We'll initialize the client lazily or check for key
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extracts text from a PDF file using PyMuPDF."""
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""

    def extract_text_from_docx(self, file_bytes: bytes) -> str:
        """Extracts text from a DOCX file using python-docx."""
        try:
            doc = Document(BytesIO(file_bytes))
            text = "\n".join([para.text for para in doc.paragraphs])
            return text
        except Exception as e:
            print(f"Error extracting text from DOCX: {e}")
            return ""

    def parse_with_llm(self, text: str) -> Optional[CandidateCreate]:
        """Parses extracted resume text using OpenAI GPT-4o-mini."""
        if not self.client:
            print("OpenAI API Key not found. Skipping LLM parsing.")
            return None

        system_prompt = """
        You are an expert HR assistant. Extract the following fields from this resume text into a structured JSON object.
        Ensure the output strictly follows this schema:
        {
            "first_name": "string",
            "last_name": "string",
            "email": "string",
            "phone": "string (optional)",
            "location": "string (optional)",
            "current_company": "string (optional)",
            "current_position": "string (optional)",
            "experience_years": float (total years as a number, e.g. 5.5),
            "skills": ["string", "string"],
            "education": [{"school": "string", "degree": "string", "year": "string"}],
            "experience_history": [{"title": "string", "company": "string", "dates": "string", "description": "string"}]
        }
        Do not include any markdown formatting (like ```json), just the raw JSON object.
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            content = response.choices[0].message.content
            parsed_data = json.loads(content)
            
            # Basic validation/cleanup can happen here if needed
            # For now, we trust the LLM's JSON mode but wrapping in try/except for safety
            
            return CandidateCreate(**parsed_data)

        except Exception as e:
            print(f"Error parsing with LLM: {e}")
            return None

parser_service = ResumeParserService()
