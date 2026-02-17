from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime

class ScorecardField(BaseModel):
    criteria: str
    score: int # 1-5
    comment: Optional[str] = None

class FeedbackBase(BaseModel):
    activity_id: UUID
    candidate_id: UUID
    overall_score: int
    recommendation: str
    scorecard: List[ScorecardField] = []
    comments: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackUpdate(BaseModel):
    overall_score: Optional[int] = None
    recommendation: Optional[str] = None
    scorecard: Optional[List[ScorecardField]] = None
    comments: Optional[str] = None

class FeedbackResponse(FeedbackBase):
    id: UUID
    interviewer_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
