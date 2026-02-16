
import sys
import os
from uuid import UUID

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.job import Job
from app.models.department import Department
from app.models.user import User
from app.models.scheduled_activity import ScheduledActivity
from app.models.candidate import Candidate

def simple_debug():
    db = SessionLocal()
    try:
        # Get manager
        manager = db.query(User).filter(User.email == "manager3@clustox.com").first()
        if not manager:
            print("Manager not found")
            return

        print(f"Manager ID: {manager.id}")

        # Get their department
        dept = db.query(Department).filter(Department.owner_id == manager.id).first()
        if not dept:
            print("Manager owns no department. Assigning 'Engineering' or first available...")
            dept = db.query(Department).filter(Department.name == "Engineering").first()
            if not dept:
                dept = db.query(Department).first()
            
            if dept:
                print(f"Assigning {dept.name} to manager {manager.id}")
                dept.owner_id = manager.id
                db.commit()
                db.refresh(dept)
            else:
                print("No departments found to assign!")
                return
        else:
            print(f"Manager owns Dept: {dept.name} ({dept.id})")
            
            # Check jobs in that dept
            jobs_count = db.query(Job).filter(Job.department_id == dept.id).count()
            print(f"Jobs in dept: {jobs_count}")

            if jobs_count == 0:
                print("No jobs in Engineering. Finding other jobs to reassign...")
                other_jobs = db.query(Job).limit(5).all()
                if other_jobs:
                    print(f"Found {len(other_jobs)} jobs. Reassigning to {dept.name}...")
                    for j in other_jobs:
                        j.department_id = dept.id
                    db.commit()
                    # Re-count
                    jobs_count = db.query(Job).filter(Job.department_id == dept.id).count()
                    print(f"Now have {jobs_count} jobs in {dept.name}")
                else:
                    print("No jobs found in system at all!")

            # Try the join query manually
            query = db.query(Job).join(Department).filter(Department.owner_id == manager.id)
            print(f"Query SQL: {query}")
            results = query.all()
            print(f"Query returned {len(results)} jobs via join.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    simple_debug()
