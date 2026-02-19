from typing import List, Optional, Any
from pydantic import BaseModel, Field, UUID4, validator
from datetime import datetime
from app.models.job import JobStatus, EmploymentType

class JobBase(BaseModel):
    title: str
    department_id: UUID4
    location: str
    employment_type: str = Field(..., description="Full-time, Part-time, etc.")
    
    headcount: int = Field(default=1, ge=1)
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    experience_range: Optional[str] = None
    
    skills: List[str] = []
    description: Optional[str] = None
    
    hiring_manager_id: Optional[UUID4] = None
    recruiter_id: Optional[UUID4] = None
    deadline: Optional[datetime] = None
    
    pipeline_config: Optional[List[dict]] = None

    @validator('max_salary')
    def check_salary_range(cls, v, values):
        min_salary = values.get('min_salary')
        if min_salary is not None and v is not None and v < min_salary:
            raise ValueError('max_salary must be greater than or equal to min_salary')
        return v

class JobCreate(JobBase):
    status: Optional[str] = "Draft"

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department_id: Optional[UUID4] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    
    headcount: Optional[int] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    experience_range: Optional[str] = None
    
    skills: Optional[List[str]] = None
    description: Optional[str] = None
    
    hiring_manager_id: Optional[UUID4] = None
    recruiter_id: Optional[UUID4] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None
    pipeline_config: Optional[List[dict]] = None

    @validator('max_salary')
    def check_salary_range(cls, v, values):
        min_salary = values.get('min_salary')
        if min_salary is not None and v is not None and v < min_salary:
            raise ValueError('max_salary must be greater than or equal to min_salary')
        return v

class DepartmentSummary(BaseModel):
    id: UUID4
    name: str
    class Config:
        from_attributes = True

class JobActivityResponse(BaseModel):
    id: UUID4
    job_id: UUID4
    user_id: Optional[UUID4]
    action_type: str
    details: Optional[Any]
    timestamp: datetime
    
    class Config:
        from_attributes = True

class JobResponse(JobBase):
    id: UUID4
    job_code: str
    status: str
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime]
    scorecard_template_id: Optional[UUID4] = None
    
    department: Optional[DepartmentSummary] = None
    activities: List[JobActivityResponse] = []

    class Config:
        from_attributes = True
