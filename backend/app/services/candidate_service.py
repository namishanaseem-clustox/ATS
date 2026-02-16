from sqlalchemy.orm import Session, joinedload, selectinload
from app.models.candidate import Candidate, JobApplication
from app.schemas.candidate import CandidateCreate, CandidateUpdate
from uuid import UUID
import uuid
import os
import shutil
from fastapi import UploadFile

UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class CandidateService:
    def get_candidate(self, db: Session, candidate_id: UUID):
        return db.query(Candidate).options(
            selectinload(Candidate.applications).selectinload(JobApplication.job)
        ).filter(Candidate.id == candidate_id).first()

    def get_candidates(self, db: Session, skip: int = 0, limit: int = 100, filter_by_owner_id: UUID = None):
        query = db.query(Candidate)
        
        if filter_by_owner_id:
             # Join Candidate -> JobApplication -> Job -> Department
             # We need to ensure we don't get duplicates if a candidate applied to multiple jobs in same department
             from app.models.department import Department
             from app.models.job import Job
             
             query = query.join(JobApplication).join(Job).join(Department).filter(
                 Department.owner_id == filter_by_owner_id
             ).distinct()
             
        # Simplified query without loading applications to avoid performance issues
        return query.offset(skip).limit(limit).all()

    def create_candidate(self, db: Session, candidate: CandidateCreate):
        # Extract job_id if present
        job_id = candidate.job_id
        # Convert Pydantic model to dict, excluding job_id from Candidate model fields
        candidate_data = candidate.dict(exclude={"job_id"})
        
        print(f"\n[DEBUG] Creating Candidate with Data:\n{candidate_data}\n")
        
        # Create Candidate
        db_candidate = Candidate(**candidate_data)
        db.add(db_candidate)
        db.commit()
        db.refresh(db_candidate)
        
        # If job_id provided, create Application
        if job_id:
            application = JobApplication(
                candidate_id=db_candidate.id,
                job_id=job_id,
                current_stage="new",
                application_status="New"
            )
            db.add(application)
            db.commit()
            
        # Refresh to get applications
        db.refresh(db_candidate)
        return db_candidate

    def update_candidate(self, db: Session, candidate_id: UUID, candidate: CandidateUpdate):
        db_candidate = self.get_candidate(db, candidate_id)
        if not db_candidate:
            return None
            
        update_data = candidate.dict(exclude_unset=True)
        
        # Extract job_id if present
        job_id = update_data.pop("job_id", None)
        
        for key, value in update_data.items():
            setattr(db_candidate, key, value)
            
        db.add(db_candidate)
        db.commit()
        
        # specific to update: check if we need to link a job
        if job_id:
             # Check if application already exists
            existing_app = db.query(JobApplication).filter(
                JobApplication.candidate_id == db_candidate.id, 
                JobApplication.job_id == job_id
            ).first()
            
            if not existing_app:
                 application = JobApplication(
                    candidate_id=db_candidate.id,
                    job_id=job_id,
                    current_stage="new",
                    application_status="New"
                )
                 db.add(application)
                 db.commit()

        db.refresh(db_candidate)
        return db_candidate

    def delete_candidate(self, db: Session, candidate_id: UUID):
        db_candidate = self.get_candidate(db, candidate_id)
        if not db_candidate:
            return None
            
        db.delete(db_candidate)
        db.commit()
        return db_candidate

    def get_candidate_by_email(self, db: Session, email: str):
        return db.query(Candidate).filter(Candidate.email == email).first()

    def upload_resume(self, db: Session, file: UploadFile, job_id: UUID = None, parsed_data: CandidateCreate = None):
        # Save file
        file_location = f"{UPLOAD_DIR}/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        if parsed_data:
            # Update resume_file_path in parsed data
            parsed_data.resume_file_path = file_location
            # If job_id is provided in form, it overrides or sets the one in parsed data
            if job_id:
                parsed_data.job_id = job_id
            
            # Check if candidate exists by email
            existing_candidate = self.get_candidate_by_email(db, parsed_data.email)
            if existing_candidate:
                print(f"[DEBUG] Candidate with email {parsed_data.email} exists. Updating...")
                # Update fields
                candidate_data = parsed_data.dict(exclude={"job_id"}, exclude_unset=True)
                for key, value in candidate_data.items():
                    setattr(existing_candidate, key, value)
                
                # Check if we need to link to job
                if job_id:
                    # Check if application already exists
                    existing_app = db.query(JobApplication).filter(
                        JobApplication.candidate_id == existing_candidate.id, 
                        JobApplication.job_id == job_id
                    ).first()
                    
                    if not existing_app:
                         application = JobApplication(
                            candidate_id=existing_candidate.id,
                            job_id=job_id,
                            current_stage="new",
                            application_status="New"
                        )
                         db.add(application)
                
                db.commit()
                db.refresh(existing_candidate)
                return existing_candidate

            # Use the existing create_candidate method which handles job linking
            return self.create_candidate(db, parsed_data)
        else:
            # Create Stub Candidate (to be parsed later)
            # Using a UUID for unique email to avoid constraint errors
            unique_email = f"parsed_{uuid.uuid4()}@example.com"
            
            db_candidate = Candidate(
                first_name="Parsed",
                last_name="Candidate",
                email=unique_email,
                resume_file_path=file_location,
                experience_years=0.0
            )
            db.add(db_candidate)
            db.commit()
            db.refresh(db_candidate)
            
            if job_id:
                 application = JobApplication(
                    candidate_id=db_candidate.id,
                    job_id=job_id,
                    current_stage="new",
                    application_status="New"
                )
                 db.add(application)
                 db.commit()
                 db.refresh(db_candidate)
                 
            return db_candidate
        
    def get_candidates_by_job(self, db: Session, job_id: UUID):
        # Return all applications for this job, joining the candidate details
        return db.query(JobApplication).filter(JobApplication.job_id == job_id).options(
            joinedload(JobApplication.candidate)
        ).all()

    def update_application_stage(self, db: Session, job_id: UUID, candidate_id: UUID, stage: str):
        # Find the application
        application = db.query(JobApplication).filter(
            JobApplication.job_id == job_id,
            JobApplication.candidate_id == candidate_id
        ).first()

        if not application:
            return None

        application.current_stage = stage
        
        # Map stage to status if possible (simplistic mapping for now)
        if stage in ["Rejected", "Hired", "Offer", "Shortlisted"]:
             application.application_status = stage
        else:
             # Default to "Interview" or "In Progress" if it's an interview stage?
             # For now, let's leave it or set to "In Progress" if it was New?
             if application.application_status == "New" and stage != "New":
                 application.application_status = "In Progress"
        
        db.commit()
        db.commit()
        db.refresh(application)
        return application

    def update_application_score(self, db: Session, job_id: UUID, candidate_id: UUID, score_data: dict):
        application = db.query(JobApplication).filter(
            JobApplication.job_id == job_id,
            JobApplication.candidate_id == candidate_id
        ).first()

        if not application:
            return None

        # Extract only numeric scores (exclude recommendation)
        numeric_scores = {
            'technical_score': score_data.get('technical_score', 0),
            'communication_score': score_data.get('communication_score', 0),
            'culture_fit_score': score_data.get('culture_fit_score', 0),
            'problem_solving_score': score_data.get('problem_solving_score', 0),
            'leadership_score': score_data.get('leadership_score', 0)
        }

        # Calculate Overall Score (Simple Average)
        scores = list(numeric_scores.values())
        overall = sum(scores) / len(scores) if scores else 0

        # Save only numeric scores to score_details
        application.score_details = numeric_scores
        application.overall_score = round(overall, 1)
        application.recommendation = score_data.get('recommendation')

        db.commit()
        db.refresh(application)
        return application

    def remove_job_application(self, db: Session, candidate_id: UUID, job_id: UUID):
        # Find the application
        application = db.query(JobApplication).filter(
            JobApplication.candidate_id == candidate_id,
            JobApplication.job_id == job_id
        ).first()

        if not application:
            return False

        # Delete the application (unlink)
        db.delete(application)
        db.commit()
        return True

candidate_service = CandidateService()
