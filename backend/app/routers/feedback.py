from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exc
from typing import List
from uuid import UUID
import logging

from app.database import get_db
from app.models.feedback import Feedback
from app.models.scheduled_activity import ScheduledActivity, ActivityStatus
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackUpdate
from app.routers.auth import get_current_active_user

logger = logging.getLogger(__name__)

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

    # Check if feedback already exists for this activity
    existing = db.query(Feedback).filter(Feedback.activity_id == feedback.activity_id).first()
    
    try:
        if existing:
            # Update existing feedback
            logger.info(f"Updating existing feedback for activity {feedback.activity_id}")
            existing.overall_score = feedback.overall_score
            existing.recommendation = feedback.recommendation
            # Convert scorecard objects to dict for JSON storage
            existing.scorecard = [item.model_dump() if hasattr(item, 'model_dump') else item.dict() if hasattr(item, 'dict') else item for item in feedback.scorecard]
            existing.comments = feedback.comments
            existing.interviewer_id = current_user.id  # Update who submitted it
            
            db_feedback = existing
        else:
            # Create new feedback
            logger.info(f"Creating new feedback for activity {feedback.activity_id}")
            feedback_data = feedback.model_dump()
            # Convert scorecard objects to dict for JSON storage
            feedback_data['scorecard'] = [item.model_dump() if hasattr(item, 'model_dump') else item.dict() if hasattr(item, 'dict') else item for item in feedback.scorecard]
            db_feedback = Feedback(
                **feedback_data,
                interviewer_id=current_user.id
            )
            db.add(db_feedback)
        
        # Auto-complete the activity
        activity.status = ActivityStatus.COMPLETED
        
        db.commit()
        db.refresh(db_feedback)
        logger.info(f"Feedback saved successfully: {db_feedback.id}")
        return db_feedback
    except exc.IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique" in str(e).lower() and "activity_id" in str(e).lower():
            raise HTTPException(status_code=400, detail="Feedback already exists for this activity")
        raise HTTPException(status_code=400, detail="Database constraint violation")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error creating feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")

@router.get("/candidate/{candidate_id}", response_model=List[FeedbackResponse])
def get_candidate_feedbacks(candidate_id: UUID, db: Session = Depends(get_db)):
    # Permission check or rely on generic role-based filters in candidates?
    feedbacks = db.query(Feedback).options(
        joinedload(Feedback.interviewer),
        joinedload(Feedback.activity)
    ).filter(Feedback.candidate_id == candidate_id).all()
    return feedbacks

@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback(feedback_id: UUID, db: Session = Depends(get_db)):
    db_feedback = db.query(Feedback).options(
        joinedload(Feedback.interviewer),
        joinedload(Feedback.activity)
    ).filter(Feedback.id == feedback_id).first()
    if not db_feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return db_feedback
