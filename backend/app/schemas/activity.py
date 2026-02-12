from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID
from enum import Enum

class ActivityType(str, Enum):
    TASK = "Task"
    MEETING = "Meeting"
    INTERVIEW = "Interview"
    CALL = "Call"
    NOTE = "Note"

class ActivityStatus(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class ActivityBase(BaseModel):
    job_id: Optional[UUID] = None
    candidate_id: Optional[UUID] = None
    activity_type: ActivityType = ActivityType.TASK
    title: str
    status: ActivityStatus = ActivityStatus.PENDING
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    participants: List[str] = [] # List of names/emails

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    activity_type: Optional[ActivityType] = None
    status: Optional[ActivityStatus] = None
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    participants: Optional[List[str]] = None
    candidate_id: Optional[UUID] = None
    job_id: Optional[UUID] = None

from app.schemas.candidate import CandidateBasicResponse
from app.schemas.job import JobResponse

class ActivityResponse(ActivityBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    
    candidate: Optional[CandidateBasicResponse] = None
    job: Optional[JobResponse] = None

    class Config:
        from_attributes = True
