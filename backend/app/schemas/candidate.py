from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

# --- Shared Base Models ---

class EducationItem(BaseModel):
    degree: Optional[str] = None
    school: Optional[str] = None
    year: Optional[str] = None

class ExperienceItem(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    dates: Optional[str] = None
    description: Optional[str] = None

# --- Candidate Schemas ---

class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_position: Optional[str] = None
    experience_years: float = 0.0
    
    nationality: Optional[str] = None
    notice_period: Optional[int] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    
    skills: List[str] = []
    education: List[EducationItem] = []
    experience_history: List[ExperienceItem] = []
    social_links: Dict[str, str] = {}

class CandidateCreate(CandidateBase):
    resume_file_path: Optional[str] = None
    # Optional job_id to link immediately upon creation
    job_id: Optional[UUID] = None 

class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_position: Optional[str] = None
    experience_years: Optional[float] = None
    
    nationality: Optional[str] = None
    notice_period: Optional[int] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    
    skills: Optional[List[str]] = None
    education: Optional[List[EducationItem]] = None
    experience_history: Optional[List[ExperienceItem]] = None
    social_links: Optional[Dict[str, str]] = None

class CandidateResponse(CandidateBase):
    id: UUID
    resume_file_path: Optional[str] = None
    parsed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    applications: List['JobApplicationResponse'] = []

    class Config:
        from_attributes = True


# Simplified candidate response without applications (to prevent circular reference)
class CandidateBasicResponse(CandidateBase):
    id: UUID
    resume_file_path: Optional[str] = None
    parsed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Job Application Schemas ---
# Defined after CandidateResponse to allow forward reference

class JobApplicationBase(BaseModel):
    job_id: UUID
    current_stage: Optional[str] = "New"
    application_status: Optional[str] = "New"

class JobApplicationCreate(JobApplicationBase):
    pass

from app.schemas.job import JobResponse

class ApplicationScoreCreate(BaseModel):
    technical_score: int
    communication_score: int
    culture_fit_score: int
    problem_solving_score: int
    leadership_score: int
    recommendation: str

class JobApplicationResponse(JobApplicationBase):
    id: UUID
    candidate_id: UUID
    applied_at: datetime
    job_title: Optional[str] = None
    
    score_details: Optional[Dict[str, int]] = None
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    
    # AI Screening
    ai_score: Optional[float] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    
    # Include nested candidate data for frontend (without applications to prevent circular ref)
    candidate: Optional[CandidateBasicResponse] = None
    job: Optional[JobResponse] = None

    class Config:
        from_attributes = True

# Update forward reference
CandidateResponse.model_rebuild()
