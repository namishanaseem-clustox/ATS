from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobActivityResponse
from app.services.job_service import job_service
from app.models.user import UserRole
from app.dependencies import RoleChecker

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    return job_service.create_job(db=db, job=job)

@router.get("/", response_model=List[JobResponse])
def read_jobs(skip: int = 0, limit: int = 100, department_id: UUID = None, status: str = None, db: Session = Depends(get_db)):
    if department_id:
        return job_service.get_jobs_by_department(db, department_id, skip=skip, limit=limit, status=status)
    return job_service.get_jobs(db, skip=skip, limit=limit, status=status)

@router.get("/department/{department_id}", response_model=List[JobResponse])
def read_jobs_by_department(department_id: UUID, skip: int = 0, limit: int = 100, status: str = None, db: Session = Depends(get_db)):
    return job_service.get_jobs_by_department(db, department_id, skip=skip, limit=limit, status=status)

@router.get("/{job_id}", response_model=JobResponse)
def read_job(job_id: UUID, db: Session = Depends(get_db)):
    # Allow fetching archived jobs by ID
    db_job = job_service.get_job(db, job_id=job_id, include_deleted=True)
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job

@router.put("/{job_id}", response_model=JobResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def update_job(job_id: UUID, job: JobUpdate, db: Session = Depends(get_db)):
    db_job = job_service.update_job(db, job_id=job_id, job_update=job)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job

@router.delete("/{job_id}", response_model=JobResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER]))])
def delete_job(job_id: UUID, db: Session = Depends(get_db)):
    db_job = job_service.delete_job(db, job_id=job_id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job

@router.delete("/{job_id}/permanent", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER]))])
def permanently_delete_job(job_id: UUID, db: Session = Depends(get_db)):
    try:
        result = job_service.permanently_delete_job(db, job_id=job_id)
        if not result:
            raise HTTPException(status_code=404, detail="Job not found")
        # Return nothing on success (204)
        return
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{job_id}/clone", response_model=JobResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def clone_job(job_id: UUID, db: Session = Depends(get_db)):
    db_job = job_service.clone_job(db, job_id=job_id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job

@router.put("/{job_id}/pipeline", response_model=JobResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def update_pipeline_config(job_id: UUID, config: List[dict], db: Session = Depends(get_db)):
    db_job = job_service.update_pipeline_config(db, job_id=job_id, config=config)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job

from app.services.candidate_service import candidate_service
# We need a schema for this, ideally ApplicationResponse or similar, but for now let's reuse a generic list
# or create a temporary response model. The requirement says "return list of candidates".
# Let's use the JobApplicationResponse from schemas.candidate if possible, or just return the raw data for now.
# Actually, the service returns JobApplication objects with .candidate loaded.
from app.schemas.candidate import JobApplicationResponse

@router.get("/{job_id}/candidates", response_model=List[JobApplicationResponse])
def read_job_candidates(job_id: UUID, db: Session = Depends(get_db)):
    # Verify job exists first
    db_job = job_service.get_job(db, job_id=job_id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return candidate_service.get_candidates_by_job(db, job_id=job_id)

@router.put("/{job_id}/candidates/{candidate_id}/stage")
def update_candidate_stage(job_id: UUID, candidate_id: UUID, stage_data: dict, db: Session = Depends(get_db)):
    # stage_data expected to be {"stage": "New Stage Name"}
    stage = stage_data.get("stage")
    if not stage:
        raise HTTPException(status_code=400, detail="Stage is required")
        
    application = candidate_service.update_application_stage(db, job_id, candidate_id, stage)
    if not application:
        raise HTTPException(status_code=404, detail="Application/Job not found")
        
    return {"message": "Stage updated successfully", "application_id": str(application.id), "current_stage": application.current_stage}

from app.schemas.candidate import ApplicationScoreCreate, JobApplicationResponse

@router.put("/{job_id}/candidates/{candidate_id}/score", response_model=JobApplicationResponse)
def score_candidate(job_id: UUID, candidate_id: UUID, score_data: ApplicationScoreCreate, db: Session = Depends(get_db)):
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Received score data: {score_data.dict()}")
    
    application = candidate_service.update_application_score(db, job_id, candidate_id, score_data.dict())
    if not application:
        raise HTTPException(status_code=404, detail="Application/Job not found")
    return application

from app.services.screening_service import screening_service

@router.post("/{job_id}/candidates/{candidate_id}/screen", response_model=JobApplicationResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def screen_candidate_ai(job_id: UUID, candidate_id: UUID, db: Session = Depends(get_db)):
    """
    Trigger AI screening for a candidate application.
    Uses OpenAI to analyze candidate fit against job description.
    """
    application = screening_service.screen_candidate(db, str(job_id), str(candidate_id))
    return application
