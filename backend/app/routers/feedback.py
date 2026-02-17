from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.feedback import Feedback
from app.models.scheduled_activity import ScheduledActivity, ActivityStatus
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackUpdate
from app.routers.auth import get_current_active_user

router = APIRouter(
    prefix="/feedbacks",
    tags=["feedbacks"],
)

@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Verify activity exists and user is assigned?
    activity = db.query(ScheduledActivity).options(joinedload(ScheduledActivity.assignees)).filter(ScheduledActivity.id == feedback.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check if user is an assignee
    is_assigned = any(u.id == current_user.id for u in activity.assignees)
    # Owners and HR can also submit feedback on behalf of? For now, restrict to assigned or higher roles
    if not is_assigned and current_user.role not in ["owner", "hr"]:
        raise HTTPException(status_code=403, detail="Not assigned to this activity")

    # Check if feedback already exists
    existing = db.query(Feedback).filter(Feedback.activity_id == feedback.activity_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this activity")

    db_feedback = Feedback(
        **feedback.dict(),
        interviewer_id=current_user.id
    )
    
    # Auto-complete the activity
    activity.status = ActivityStatus.COMPLETED
    
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@router.get("/candidate/{candidate_id}", response_model=List[FeedbackResponse])
def get_candidate_feedbacks(candidate_id: UUID, db: Session = Depends(get_db)):
    # Permission check or rely on generic role-based filters in candidates?
    return db.query(Feedback).filter(Feedback.candidate_id == candidate_id).all()

@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback(feedback_id: UUID, db: Session = Depends(get_db)):
    db_feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not db_feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return db_feedback
