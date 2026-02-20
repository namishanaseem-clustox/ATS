from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobActivityResponse
from app.services.job_service import job_service
from app.models.user import UserRole, User
from app.dependencies import RoleChecker
from app.routers.auth import get_current_active_user

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    return job_service.create_job(db=db, job=job)

@router.get("/", response_model=List[JobResponse])
def read_jobs(skip: int = 0, limit: int = 100, department_id: UUID = None, status: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if department_id:
        return job_service.get_jobs_by_department(db, department_id, skip=skip, limit=limit, status=status)
    # Filter Based on Role
    filter_by_owner_id = None
    filter_by_dept_id = None

    if current_user.role == UserRole.HIRING_MANAGER:
        # HM sees jobs in departments they own
        filter_by_owner_id = current_user.id
        # TODO: Also allow seeing jobs in departments they are a member of?
        # For now, matching existing pattern of 'owner' visibility.
        
    elif current_user.role == UserRole.INTERVIEWER:
        # Interviewer sees ONLY jobs for which they are assigned activities
        from app.models.scheduled_activity import ScheduledActivity
        assigned_job_ids = db.query(ScheduledActivity.job_id).join(ScheduledActivity.assignees).filter(
            User.id == current_user.id,
            ScheduledActivity.job_id.isnot(None)
        ).distinct().all()
        
        if not assigned_job_ids:
            return []
        
        # Extract job IDs from the result tuples
        job_ids = [job_id[0] for job_id in assigned_job_ids]
        
        # Get jobs that are in the assigned job IDs list
        jobs = job_service.get_jobs_by_ids(db, job_ids, skip=skip, limit=limit, status=status)
        
        # Redact salary for Interviewers
        for job in jobs:
            job.min_salary = None
            job.max_salary = None
            
        return jobs

    # We need to update job_service.get_jobs to support filter_by_dept_id if it doesn't already
    # checking service... it doesn't seem to have it in the call below.
    # We might need to filter manually here or update service.
    # Actually, job_service.get_jobs takes **kwargs or we can add it.
    
    # Let's try to pass it to service if we update service next, 
    # OR since we can't see service definition easily right now, let's use the list filtering if dataset is small?
    # Better: Update service to accept 'department_id' filter which it likely already has for 'get_jobs_by_department' logic?
    # 'read_jobs' has 'department_id' param already!
    
    if filter_by_dept_id:
        if department_id and department_id != filter_by_dept_id:
            return [] # Requesting dept they don't belong to
        department_id = filter_by_dept_id

    jobs = job_service.get_jobs(
        db, 
        skip=skip, 
        limit=limit, 
        status=status, 
        filter_by_owner_id=filter_by_owner_id,
        filter_by_department_id=department_id # passing the param already in signature
    )

    # Redact salary for Interviewers
    if current_user.role == UserRole.INTERVIEWER:
        for job in jobs:
            job.min_salary = None
            job.max_salary = None
            
    return jobs

@router.get("/department/{department_id}", response_model=List[JobResponse])
def read_jobs_by_department(department_id: UUID, skip: int = 0, limit: int = 100, status: str = None, db: Session = Depends(get_db)):
    return job_service.get_jobs_by_department(db, department_id, skip=skip, limit=limit, status=status)

@router.get("/{job_id}", response_model=JobResponse)
def read_job(job_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Allow fetching archived jobs by ID
    db_job = job_service.get_job(db, job_id=job_id, include_deleted=True)
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Redact salary for Interviewers
    if current_user.role == UserRole.INTERVIEWER:
        db_job.min_salary = None
        db_job.max_salary = None
        
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

@router.post("/{job_id}/pipeline/sync", response_model=JobResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def sync_pipeline_from_template(job_id: UUID, db: Session = Depends(get_db)):
    """Re-apply the job's linked pipeline template stages onto the job's pipeline_config."""
    from app.models.pipeline_template import PipelineTemplate
    from app.models.pipeline_stage import PipelineStage
    from app.models.candidate import JobApplication
    
    db_job = job_service.get_job(db, job_id=job_id)
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not db_job.pipeline_template_id:
        raise HTTPException(status_code=400, detail="Job has no linked pipeline template")
        
    template = db.query(PipelineTemplate).filter(PipelineTemplate.id == db_job.pipeline_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Pipeline template not found")
        
    # Get current (old) config map {id: name}
    old_config = db_job.pipeline_config or []
    old_stage_map = {stage.get("id"): stage.get("name") for stage in old_config}
    
    # Get new stages
    stages = db.query(PipelineStage).filter(PipelineStage.pipeline_template_id == template.id).order_by(PipelineStage.order).all()
    new_config = [{"id": str(s.id), "name": s.name, "color": s.color, "order": s.order} for s in stages]
    
    # Update job config
    updated_job = job_service.update_pipeline_config(db, job_id=job_id, config=new_config)
    
    # Migrate candidates
    # New map {name: id}
    new_stage_name_map = {s.name: str(s.id) for s in stages}
    default_stage_id = str(stages[0].id) if stages else "new"
    
    applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    for app in applications:
        current_stage_name = old_stage_map.get(app.current_stage)
        # Try to find stage with same name in new config
        if current_stage_name and current_stage_name in new_stage_name_map:
            new_stage_id = new_stage_name_map[current_stage_name]
            if new_stage_id != app.current_stage:
                app.current_stage = new_stage_id
        else:
            # Fallback: if current stage ID not in new config, move to default
            # Check if current stage ID is valid in new config (unlikely for sync unless ID persisted)
            # Actually for sync, if stage ID persists, we don't need to change. 
            # But if stage was deleted/re-added, ID changes.
            if app.current_stage not in [str(s.id) for s in stages]:
                app.current_stage = default_stage_id
                
    db.commit()
    return updated_job

@router.patch("/{job_id}/pipeline/template", response_model=JobResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def change_pipeline_template(job_id: UUID, body: dict, db: Session = Depends(get_db)):
    """Switch the job to a different pipeline template and sync its stages."""
    from app.models.pipeline_template import PipelineTemplate
    from app.models.pipeline_stage import PipelineStage
    from app.models.candidate import JobApplication
    
    template_id = body.get("pipeline_template_id")
    if not template_id:
        raise HTTPException(status_code=400, detail="pipeline_template_id is required")
        
    db_job = job_service.get_job(db, job_id=job_id)
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    template = db.query(PipelineTemplate).filter(PipelineTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Pipeline template not found")
        
    # Get current (old) config map {id: name}
    old_config = db_job.pipeline_config or []
    old_stage_map = {stage.get("id"): stage.get("name") for stage in old_config}
    
    # Get new stages
    stages = db.query(PipelineStage).filter(PipelineStage.pipeline_template_id == template.id).order_by(PipelineStage.order).all()
    new_config = [{"id": str(s.id), "name": s.name, "color": s.color, "order": s.order} for s in stages]
    
    # Update template link and config
    db_job.pipeline_template_id = template.id
    db_job.pipeline_config = new_config
    
    # Migrate candidates
    new_stage_name_map = {s.name: str(s.id) for s in stages}
    default_stage_id = str(stages[0].id) if stages else "new"
    
    applications = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    for app in applications:
        current_stage_name = old_stage_map.get(app.current_stage)
        
        # Try to map by name
        if current_stage_name and current_stage_name in new_stage_name_map:
            app.current_stage = new_stage_name_map[current_stage_name]
        else:
            # If no name match, move to first stage
            app.current_stage = default_stage_id

    db.commit()
    db.refresh(db_job)
    return db_job

from app.services.candidate_service import candidate_service
# We need a schema for this, ideally ApplicationResponse or similar, but for now let's reuse a generic list
# or create a temporary response model. The requirement says "return list of candidates".
# Let's use the JobApplicationResponse from schemas.candidate if possible, or just return the raw data for now.
# Actually, the service returns JobApplication objects with .candidate loaded.
from app.schemas.candidate import JobApplicationResponse

@router.get("/{job_id}/candidates", response_model=List[JobApplicationResponse])
def read_job_candidates(job_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Verify job exists first
    db_job = job_service.get_job(db, job_id=job_id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # For interviewers, check if they are assigned to any activities for this job
    if current_user.role == UserRole.INTERVIEWER:
        from app.models.scheduled_activity import ScheduledActivity
        assigned_activities = db.query(ScheduledActivity).join(ScheduledActivity.assignees).filter(
            ScheduledActivity.job_id == job_id,
            User.id == current_user.id
        ).all()
        
        if not assigned_activities:
            raise HTTPException(status_code=403, detail="Access denied: Not assigned to this job")
        
        # Get candidate IDs from assigned activities (as strings for consistent comparison)
        assigned_candidate_ids = set()
        for activity in assigned_activities:
            if activity.candidate_id:
                assigned_candidate_ids.add(str(activity.candidate_id))
        
        # Only return applications for candidates they're assigned to
        applications = candidate_service.get_candidates_by_job(db, job_id=job_id)
        filtered_applications = [app for app in applications if str(app.candidate.id) in assigned_candidate_ids]
        
        # Redact salary for Interviewers
        for app in filtered_applications:
            if app.candidate:
                app.candidate.current_salary = None
                app.candidate.expected_salary = None
                
        return filtered_applications
        
    applications = candidate_service.get_candidates_by_job(db, job_id=job_id)
    
    # Redact salary for Interviewers
    if current_user.role == UserRole.INTERVIEWER:
        for app in applications:
            if app.candidate:
                app.candidate.current_salary = None
                app.candidate.expected_salary = None
                
    return applications

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
