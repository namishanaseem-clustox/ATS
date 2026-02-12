from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.scheduled_activity import ScheduledActivity
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse

router = APIRouter(
    prefix="/activities",
    tags=["activities"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(activity: ActivityCreate, db: Session = Depends(get_db)):
    db_activity = ScheduledActivity(**activity.dict())
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

@router.get("/job/{job_id}", response_model=List[ActivityResponse])
def get_activities_by_job(job_id: UUID, db: Session = Depends(get_db)):
    return db.query(ScheduledActivity).options(
        joinedload(ScheduledActivity.candidate),
        joinedload(ScheduledActivity.job)
    ).filter(ScheduledActivity.job_id == job_id).all()

@router.get("/candidate/{candidate_id}", response_model=List[ActivityResponse])
def get_activities_by_candidate(candidate_id: UUID, db: Session = Depends(get_db)):
    return db.query(ScheduledActivity).options(
        joinedload(ScheduledActivity.candidate),
        joinedload(ScheduledActivity.job)
    ).filter(ScheduledActivity.candidate_id == candidate_id).all()

@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(activity_id: UUID, db: Session = Depends(get_db)):
    db_activity = db.query(ScheduledActivity).filter(ScheduledActivity.id == activity_id).first()
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    return db_activity

@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(activity_id: UUID, activity: ActivityUpdate, db: Session = Depends(get_db)):
    db_activity = db.query(ScheduledActivity).filter(ScheduledActivity.id == activity_id).first()
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = activity.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_activity, key, value)
    
    db.commit()
    db.refresh(db_activity)
    return db_activity

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: UUID, db: Session = Depends(get_db)):
    db_activity = db.query(ScheduledActivity).filter(ScheduledActivity.id == activity_id).first()
    if db_activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    db.delete(db_activity)
    db.commit()
