from sqlalchemy.orm import Session, joinedload
from app.models.job import Job, JobActivity, JobStatus
from app.schemas.job import JobCreate, JobUpdate
from uuid import UUID
from datetime import datetime
import random
import string

class JobService:
    def _generate_job_code(self, db: Session, title: str) -> str:
        # Simple generation strategy: JOB-{Random4}-{Year}
        # Ideally check for uniqueness
        while True:
            random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            year = datetime.now().year
            code = f"JOB-{year}-{random_suffix}"
            existing = db.query(Job).filter(Job.job_code == code).first()
            if not existing:
                return code

    def log_activity(self, db: Session, job_id: UUID, action_type: str, details: dict = None, user_id: UUID = None):
        activity = JobActivity(
            job_id=job_id,
            action_type=action_type,
            details=details,
            user_id=user_id
        )
        db.add(activity)
        db.commit()

    def get_job(self, db: Session, job_id: UUID, include_deleted: bool = False):
        query = db.query(Job).options(joinedload(Job.department)).filter(Job.id == job_id)
        if not include_deleted:
            query = query.filter(Job.is_deleted == False)
        return query.first()

    def get_jobs(self, db: Session, skip: int = 0, limit: int = 100, status: str = None, filter_by_owner_id: UUID = None, filter_by_department_id: UUID = None):
        if status == JobStatus.ARCHIVED.value:
            query = db.query(Job).options(joinedload(Job.department)).filter(Job.is_deleted == True)
        else:
            query = db.query(Job).options(joinedload(Job.department)).filter(Job.is_deleted == False)

        if status and status != JobStatus.ARCHIVED.value:
            query = query.filter(Job.status == status)

        if filter_by_owner_id:
            # Import Department to avoid circular import if needed, or rely on relationship
            from app.models.department import Department
            query = query.join(Department).filter(Department.owner_id == filter_by_owner_id)
            
        if filter_by_department_id:
             # Filter by department directly on Job table
             query = query.filter(Job.department_id == filter_by_department_id)

        # Handle auto-repair for archived jobs if needed (simplified from original for brevity, but keeping logic)
        # Original logic had separate blocks for ARCHIVED vs normal. 
        # I combined them but query building is slightly different.
        # Let's preserve original structure but inject filter.

        if status == JobStatus.ARCHIVED.value:
             # Re-apply filters to the archived query if they were applied above?
             # Actually, my query construction above handled 'status' and 'is_deleted'. 
             # But 'if status == ARCHIVED' block below re-does fetch?
             # Ah, the original code had a return inside the 'if status == ARCHIVED' block.
             # So I need to apply my filters inside that block too or restructure.
             
             # Let's restructure to apply filters to 'query' then execute.
             # The original code's 'auto-repair' logic needs 'jobs' list.
             
             jobs = query.offset(skip).limit(limit).all()
             
             # Auto-repair logic
             dirty = False
             for job in jobs:
                 if job.status != JobStatus.ARCHIVED.value:
                     job.status = JobStatus.ARCHIVED.value
                     db.add(job)
                     dirty = True
             if dirty:
                 db.commit()
             return jobs
        else:
            return query.offset(skip).limit(limit).all()
        
    def get_jobs_by_ids(self, db: Session, job_ids: list[UUID], skip: int = 0, limit: int = 100, status: str = None):
        query = db.query(Job).options(joinedload(Job.department)).filter(Job.id.in_(job_ids), Job.is_deleted == False)
        
        if status:
            query = query.filter(Job.status == status)
            
        return query.offset(skip).limit(limit).all()

    def get_jobs_by_department(self, db: Session, department_id: UUID, skip: int = 0, limit: int = 100, status: str = None):
        if status == JobStatus.ARCHIVED.value:
             query = db.query(Job).options(joinedload(Job.department)).filter(Job.department_id == department_id, Job.is_deleted == True)
             jobs = query.offset(skip).limit(limit).all()
             
             # Auto-repair for department-specific fetch too
             dirty = False
             for job in jobs:
                 if job.status != JobStatus.ARCHIVED.value:
                     job.status = JobStatus.ARCHIVED.value
                     db.add(job)
                     dirty = True
                     
             if dirty:
                 db.commit()
                 
             return jobs
        else:
            query = db.query(Job).options(joinedload(Job.department)).filter(Job.department_id == department_id, Job.is_deleted == False)
            if status:
                query = query.filter(Job.status == status)
            return query.offset(skip).limit(limit).all()

    def create_job(self, db: Session, job: JobCreate, user_id: UUID = None):
        job_code = self._generate_job_code(db, job.title)
        db_job = Job(**job.dict(), job_code=job_code)
        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        self.log_activity(db, db_job.id, "CREATED", {"title": job.title}, user_id)
        return db_job

    def update_job(self, db: Session, job_id: UUID, job_update: JobUpdate, user_id: UUID = None):
        # Allow updating deleted jobs (e.g. to unarchive)
        db_job = self.get_job(db, job_id, include_deleted=True)
        if not db_job:
            return None
        
        update_data = job_update.dict(exclude_unset=True)
        changes = {}
        for key, value in update_data.items():
            old_value = getattr(db_job, key)
            if old_value != value:
                changes[key] = {"old": str(old_value), "new": str(value)}
                setattr(db_job, key, value)
                
            # Auto-handle is_deleted if status is changing from/to Archived
            if key == "status":
                if value != JobStatus.ARCHIVED.value and db_job.is_deleted:
                     db_job.is_deleted = False
                     changes["is_deleted"] = {"old": "True", "new": "False"}
            
        if changes:
            db.add(db_job)
            db.commit()
            db.refresh(db_job)
            self.log_activity(db, job_id, "UPDATED", changes, user_id)
            
        return db_job

    def clone_job(self, db: Session, job_id: UUID, user_id: UUID = None):
        original_job = self.get_job(db, job_id)
        if not original_job:
            return None
            
        # Create a new job based on the original
        new_job_data = {
            "title": f"Copy of {original_job.title}",
            "department_id": original_job.department_id,
            "location": original_job.location,
            "employment_type": original_job.employment_type,
            "headcount": original_job.headcount,
            "min_salary": original_job.min_salary,
            "max_salary": original_job.max_salary,
            "experience_range": original_job.experience_range,
            "skills": original_job.skills,
            "description": original_job.description,
            "hiring_manager_id": original_job.hiring_manager_id,
            "recruiter_id": original_job.recruiter_id,
            "deadline": original_job.deadline,
            "pipeline_config": original_job.pipeline_config,
            "status": JobStatus.DRAFT.value # Reset status
        }
        
        job_code = self._generate_job_code(db, new_job_data["title"])
        new_job = Job(**new_job_data, job_code=job_code)
        
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        
        self.log_activity(db, new_job.id, "CLONED_FROM", {"original_job_id": str(job_id)}, user_id)
        
        return new_job

    def update_pipeline_config(self, db: Session, job_id: UUID, config: list, user_id: UUID = None):
        db_job = self.get_job(db, job_id)
        if not db_job:
            return None
            
        old_config = db_job.pipeline_config
        db_job.pipeline_config = config
        
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        
        self.log_activity(db, job_id, "PIPELINE_UPDATED", {"old": old_config, "new": config}, user_id)
        return db_job

    def delete_job(self, db: Session, job_id: UUID, user_id: UUID = None):
        db_job = self.get_job(db, job_id)
        if not db_job:
            return None
            
        db_job.is_deleted = True
        db_job.status = JobStatus.ARCHIVED.value
        db.add(db_job)
        db.commit()
        
        self.log_activity(db, job_id, "ARCHIVED", None, user_id)
        return db_job

    def permanently_delete_job(self, db: Session, job_id: UUID, user_id: UUID = None):
        # Only allow permanent deletion of already-archived jobs
        # Use include_deleted=True to find it
        db_job = self.get_job(db, job_id, include_deleted=True)
        if not db_job:
            return None
        
        # Safety check: must be archived first
        if not db_job.is_deleted:
            raise ValueError("Job must be archived before permanent deletion")
            
        # Check for candidates - Prevention logic
        # We need to import Candidate/JobApplication logic or query directly.
        # To avoid circular imports, we'll do a direct query on the relationship if loaded, or query DB.
        # db_job.candidates might not be loaded. 
        # Let's check through the relationship or a count query.
        from app.models.candidate import JobApplication
        candidate_count = db.query(JobApplication).filter(JobApplication.job_id == job_id).count()
        
        if candidate_count > 0:
            raise ValueError(f"Cannot delete job with {candidate_count} active candidates. Please remove candidates first.")
        
        # Log before deletion (this log will be deleted? No, JobActivity is separate but CASCADE might delete it if linked to Job)
        # If JobActivity has cascade delete on job_id, the logs will be gone.
        # But we probably want to keep system logs? 
        # Usually permanent delete means everything gone. 
        # If we want to keep logs, we need to set job_id to NULL or have a separate audit log.
        # For now, we accept valuable data loss as "Permanent Delete".
        
        # Hard delete
        db.delete(db_job)
        db.commit()
        
        return True

job_service = JobService()
