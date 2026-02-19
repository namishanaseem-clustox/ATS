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
    scorecard_template_id: Optional[UUID] = None
    activity_type: ActivityType = ActivityType.TASK
    title: str
    status: ActivityStatus = ActivityStatus.PENDING
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    participants: List[str] = [] # List of names/emails

class ActivityCreate(ActivityBase):
    assignee_ids: List[UUID] = []
    details: Optional[Dict[str, Any]] = None

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
    scorecard_template_id: Optional[UUID] = None
    assignee_ids: Optional[List[UUID]] = None
    details: Optional[Dict[str, Any]] = None

from app.schemas.candidate import CandidateBasicResponse
from app.schemas.job import JobResponse
from app.schemas.user import UserResponse
from app.schemas.scorecard import ScorecardTemplateResponse

class ActivityResponse(ActivityBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    
    # External sync fields
    external_id: Optional[str] = None
    external_provider: Optional[str] = None
    event_html_link: Optional[str] = None
    
    details: Optional[Dict[str, Any]] = None
    
    candidate: Optional[CandidateBasicResponse] = None
    job: Optional[JobResponse] = None
    assignees: List[UserResponse] = []
    scorecard_template: Optional[ScorecardTemplateResponse] = None

    class Config:
        from_attributes = True
