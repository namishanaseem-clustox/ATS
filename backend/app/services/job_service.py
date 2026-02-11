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

    def get_job(self, db: Session, job_id: UUID):
        return db.query(Job).options(joinedload(Job.department)).filter(Job.id == job_id, Job.is_deleted == False).first()

    def get_jobs(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(Job).options(joinedload(Job.department)).filter(Job.is_deleted == False).offset(skip).limit(limit).all()
        
    def get_jobs_by_department(self, db: Session, department_id: UUID, skip: int = 0, limit: int = 100):
        return db.query(Job).options(joinedload(Job.department)).filter(Job.department_id == department_id, Job.is_deleted == False).offset(skip).limit(limit).all()

    def create_job(self, db: Session, job: JobCreate, user_id: UUID = None):
        job_code = self._generate_job_code(db, job.title)
        db_job = Job(**job.dict(), job_code=job_code)
        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        self.log_activity(db, db_job.id, "CREATED", {"title": job.title}, user_id)
        return db_job

    def update_job(self, db: Session, job_id: UUID, job_update: JobUpdate, user_id: UUID = None):
        db_job = self.get_job(db, job_id)
        if not db_job:
            return None
        
        update_data = job_update.dict(exclude_unset=True)
        changes = {}
        for key, value in update_data.items():
            old_value = getattr(db_job, key)
            if old_value != value:
                changes[key] = {"old": str(old_value), "new": str(value)}
                setattr(db_job, key, value)
            
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
        db.add(db_job)
        db.commit()
        
        self.log_activity(db, job_id, "ARCHIVED", None, user_id)
        return db_job

job_service = JobService()
