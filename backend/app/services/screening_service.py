import json
import os
from sqlalchemy.orm import Session
from app.models.candidate import Candidate, JobApplication
from app.models.job import Job
from app.services.parser_service import parser_service
from openai import OpenAI
from fastapi import HTTPException


class ScreeningService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def screen_candidate(self, db: Session, job_id: str, candidate_id: str):
        if not self.client:
            raise HTTPException(status_code=500, detail="OpenAI API Key not configured")

        # Fetch Data
        job = db.query(Job).filter(Job.id == job_id).first()
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        application = db.query(JobApplication).filter(
            JobApplication.job_id == job_id, 
            JobApplication.candidate_id == candidate_id
        ).first()

        if not job or not candidate or not application:
            raise HTTPException(status_code=404, detail="Job, Candidate, or Application not found")

        # Extract Text
        resume_text = ""
        if candidate.resume_file_path and os.path.exists(candidate.resume_file_path):
            try:
                # Basic extension check (naive)
                if candidate.resume_file_path.lower().endswith(".pdf"):
                    with open(candidate.resume_file_path, "rb") as f:
                        resume_text = parser_service.extract_text_from_pdf(f.read())
                elif candidate.resume_file_path.lower().endswith(".docx"):
                    with open(candidate.resume_file_path, "rb") as f:
                        resume_text = parser_service.extract_text_from_docx(f.read())
                else:
                    # Fallback or just skip
                    print(f"Unsupported file type for screening: {candidate.resume_file_path}")
            except Exception as e:
                print(f"Error reading resume file: {e}")

        # Construct Prompt
        # We use a structured prompt to get JSON output
        system_prompt = """
        You are an expert AI Recruiter. Evaluate the candidate for the given job description.
        Provide a JSON response with the following structure:
        {
            "match_score": integer (0-100),
            "key_strengths": [string],
            "missing_skills": [string],
            "reasoning": string (concise explanation of the score)
        }
        Be objective and strict.
        """

        user_content = f"""
        JOB TITLE: {job.title}
        JOB DESCRIPTION: {job.description or 'N/A'}
        REQUIRED SKILLS: {', '.join(job.skills) if job.skills else 'N/A'}

        CANDIDATE NAME: {candidate.first_name} {candidate.last_name}
        CANDIDATE SKILLS: {', '.join(candidate.skills) if candidate.skills else 'N/A'}
        CANDIDATE EXPERIENCE: {candidate.experience_years} years
        RESUME TEXT:
        {resume_text[:10000]} 
        """
        # Truncate resume text to avoid token limits if necessary, though 4o-mini has large context.

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            content = response.choices[0].message.content
            result = json.loads(content)
            
            # Save to DB
            application.ai_score = result.get("match_score")
            application.ai_analysis = result
            db.commit()
            db.refresh(application)
            
            return application

        except Exception as e:
            print(f"Screening failed: {e}")
            raise HTTPException(status_code=500, detail=f"AI Screening failed: {str(e)}")

screening_service = ScreeningService()
