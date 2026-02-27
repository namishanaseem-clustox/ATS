from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.scheduled_activity import ScheduledActivity
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse
from app.services.calendar_sync import sync_event_to_google, delete_event_from_google

router = APIRouter(
    prefix="/activities",
    tags=["activities"],
    responses={404: {"description": "Not found"}},
)

from app.models.user import User, UserRole
from app.routers.auth import get_current_active_user

from datetime import datetime, timedelta
from sqlalchemy import or_, func
from app.models.scheduled_activity import ActivityStatus

@router.get("/all", response_model=List[ActivityResponse])
def get_all_activities(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get all activities. Interviewers see only their assigned activities; others see all."""
    cutoff_date = datetime.now() - timedelta(days=30)
    
    query = db.query(ScheduledActivity).options(
        joinedload(ScheduledActivity.candidate),
        joinedload(ScheduledActivity.job),
        joinedload(ScheduledActivity.assignees),
        joinedload(ScheduledActivity.creator)
    )
    
    if current_user.role in [UserRole.OWNER, UserRole.HR]:
        pass # Can see all activities
    elif current_user.role == UserRole.HIRING_MANAGER:
        from app.models.job import Job
        if current_user.department_id:
            query = query.outerjoin(Job, ScheduledActivity.job_id == Job.id)
            query = query.filter(
                or_(
                    ScheduledActivity.assignees.any(User.id == current_user.id),
                    ScheduledActivity.created_by == current_user.id,
                    Job.department_id == current_user.department_id
                )
            )
        else:
            query = query.filter(
                or_(
                    ScheduledActivity.assignees.any(User.id == current_user.id),
                    ScheduledActivity.created_by == current_user.id
                )
            )
    else:
        # INTERVIEWER or others
        query = query.filter(
            or_(
                ScheduledActivity.assignees.any(User.id == current_user.id),
                ScheduledActivity.created_by == current_user.id
            )
        )
    
    # Filter: Show all PENDING, or COMPLETED/CANCELLED within last 30 days
    query = query.filter(
        or_(
            ScheduledActivity.status == ActivityStatus.PENDING.value,
            func.coalesce(ScheduledActivity.updated_at, ScheduledActivity.created_at) >= cutoff_date
        )
    )
    
    return query.all()

@router.get("/my-interviews", response_model=List[ActivityResponse])
def get_my_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    cutoff_date = datetime.now() - timedelta(days=30)
    
    return db.query(ScheduledActivity).options(
        joinedload(ScheduledActivity.candidate),
        joinedload(ScheduledActivity.job),
        joinedload(ScheduledActivity.assignees),
        joinedload(ScheduledActivity.creator)
    ).join(ScheduledActivity.assignees).filter(
        User.id == current_user.id,
        or_(
            ScheduledActivity.status == ActivityStatus.PENDING.value,
            func.coalesce(ScheduledActivity.updated_at, ScheduledActivity.created_at) >= cutoff_date
        )
    ).all()

@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(activity: ActivityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    activity_data = activity.dict(exclude={"assignee_ids"})
    db_activity = ScheduledActivity(**activity_data)
    db_activity.created_by = current_user.id
    
    # Handle assignees
    if activity.assignee_ids:
        users = db.query(User).filter(User.id.in_(activity.assignee_ids)).all()
        db_activity.assignees = users
        
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    
    # Sync with Google Calendar if connected
    sync_event_to_google(db_activity, current_user, db)
    
    return db_activity

@router.get("/job/{job_id}", response_model=List[ActivityResponse])
def get_activities_by_job(job_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    opts = [
        joinedload(ScheduledActivity.candidate),
        joinedload(ScheduledActivity.job),
        joinedload(ScheduledActivity.assignees),
        joinedload(ScheduledActivity.creator),
    ]
    if current_user.role == UserRole.INTERVIEWER:
        # Notes are shared context — return all. For other types, only return assigned ones.
        notes = db.query(ScheduledActivity).options(*opts).filter(
            ScheduledActivity.job_id == job_id,
            ScheduledActivity.activity_type == "Note"
        ).all()
        assigned = db.query(ScheduledActivity).options(*opts).join(ScheduledActivity.assignees).filter(
            ScheduledActivity.job_id == job_id,
            ScheduledActivity.activity_type != "Note",
            User.id == current_user.id
        ).all()
        return notes + assigned

    return db.query(ScheduledActivity).options(*opts).filter(
        ScheduledActivity.job_id == job_id
    ).all()

@router.get("/candidate/{candidate_id}", response_model=List[ActivityResponse])
def get_activities_by_candidate(candidate_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    opts = [
        joinedload(ScheduledActivity.candidate),
        joinedload(ScheduledActivity.job),
        joinedload(ScheduledActivity.assignees),
        joinedload(ScheduledActivity.creator),
    ]
    if current_user.role == UserRole.INTERVIEWER:
        # Notes are shared context — return all. For other types, only return assigned ones.
        notes = db.query(ScheduledActivity).options(*opts).filter(
            ScheduledActivity.candidate_id == candidate_id,
            ScheduledActivity.activity_type == "Note"
        ).all()
        assigned = db.query(ScheduledActivity).options(*opts).join(ScheduledActivity.assignees).filter(
            ScheduledActivity.candidate_id == candidate_id,
            ScheduledActivity.activity_type != "Note",
            User.id == current_user.id
        ).all()
        return notes + assigned

    return db.query(ScheduledActivity).options(*opts).filter(
        ScheduledActivity.candidate_id == candidate_id
    ).all()

@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(activity_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_activity = db.query(ScheduledActivity).options(
        joinedload(ScheduledActivity.assignees),
        joinedload(ScheduledActivity.creator)
    ).filter(ScheduledActivity.id == activity_id).first()
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # For interviewers, check if they are assigned to this activity
    if current_user.role == UserRole.INTERVIEWER:
        if not any(assignee.id == current_user.id for assignee in db_activity.assignees):
            raise HTTPException(status_code=403, detail="Access denied: Not assigned to this activity")
    
    return db_activity

@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(activity_id: UUID, activity: ActivityUpdate, db: Session = Depends(get_db)):
    db_activity = db.query(ScheduledActivity).filter(ScheduledActivity.id == activity_id).first()
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = activity.dict(exclude_unset=True)
    assignee_ids = update_data.pop("assignee_ids", None)
    
    for key, value in update_data.items():
        setattr(db_activity, key, value)
    
    # Handle assignees update
    if assignee_ids is not None:
        users = db.query(User).filter(User.id.in_(assignee_ids)).all()
        db_activity.assignees = users
    
    db.commit()
    db.refresh(db_activity)
    
    # Update Google Calendar event
    # Need to fetch the creator to use their credentials to update the event they created
    creator = db.query(User).filter(User.id == db_activity.created_by).first()
    if creator:
        sync_event_to_google(db_activity, creator, db)
        
    return db_activity

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_activity = db.query(ScheduledActivity).filter(ScheduledActivity.id == activity_id).first()
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Interviewers can only delete notes they personally created
    if current_user.role == UserRole.INTERVIEWER:
        if db_activity.activity_type != "Note" or db_activity.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete notes you created")

    # Delete from Google Calendar if synced
    creator = db.query(User).filter(User.id == db_activity.created_by).first()
    if creator:
        delete_event_from_google(db_activity, creator, db)
        
    # Delete associated feedbacks to prevent NotNullViolation
    from app.models.feedback import Feedback
    db.query(Feedback).filter(Feedback.activity_id == db_activity.id).delete()

    db.delete(db_activity)
    db.commit()
