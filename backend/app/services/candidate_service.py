from sqlalchemy.orm import Session, joinedload
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
            joinedload(Candidate.applications).joinedload(JobApplication.job)
        ).filter(Candidate.id == candidate_id).first()

    def get_candidates(self, db: Session, skip: int = 0, limit: int = 100):
        # We might want to join applications to show "Applied to X" in the list
        return db.query(Candidate).options(
            joinedload(Candidate.applications).joinedload(JobApplication.job)
        ).offset(skip).limit(limit).all()

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
                current_stage="New",
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
        for key, value in update_data.items():
            setattr(db_candidate, key, value)
            
        db.add(db_candidate)
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
                            current_stage="New",
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
                    current_stage="New",
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

candidate_service = CandidateService()
