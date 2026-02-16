
import sys
import os
from uuid import UUID

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.job import Job
from app.models.department import Department
from app.models.user import User
from app.models.candidate import Candidate, JobApplication
from app.models.scheduled_activity import ScheduledActivity

def debug_candidates():
    db = SessionLocal()
    try:
        # Get manager
        manager = db.query(User).filter(User.email == "manager3@clustox.com").first()
        if not manager:
            print("Manager not found")
            return

        print(f"Manager ID: {manager.id}")
        
        # Get Dept
        dept = db.query(Department).filter(Department.owner_id == manager.id).first()
        if not dept:
            print("Manager owns no department!")
            return
        
        print(f"Dept: {dept.name}")

        # Check jobs
        jobs = db.query(Job).filter(Job.department_id == dept.id).all()
        job_ids = [j.id for j in jobs]
        print(f"Jobs in dept: {len(jobs)}")

        # Check applications
        apps = db.query(JobApplication).filter(JobApplication.job_id.in_(job_ids)).all()
        print(f"Applications in dept: {len(apps)}")

        if not apps:
            print("No applications found. Creating one...")
            # Find a candidate or create one
            candidate = db.query(Candidate).first()
            if not candidate:
                print("No candidates found. Creating one...")
                candidate = Candidate(
                    first_name="Test", last_name="Candidate", email="test@example.com", 
                    resume_file_path="test.pdf", experience_years=5
                )
                db.add(candidate)
                db.commit()
                db.refresh(candidate)
            
            # Create application for first job
            if jobs:
                job = jobs[0]
                app = JobApplication(candidate_id=candidate.id, job_id=job.id, current_stage="new", application_status="New")
                db.add(app)
                db.commit()
                print(f"Created application for {candidate.email} to {job.title}")

        # Test Query
        query = db.query(Candidate).join(JobApplication).join(Job).join(Department).filter(
            Department.owner_id == manager.id
        ).distinct()
        
        results = query.all()
        print(f"Query returned {len(results)} candidates for HM.")
        for c in results:
            print(f" - {c.first_name} {c.last_name}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_candidates()
