
import sys
import os
from uuid import UUID

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.job import Job
from app.models.department import Department
from app.services.job_service import job_service
from app.models.scheduled_activity import ScheduledActivity

def debug_jobs():
    db = SessionLocal()
    try:
        # 1. Find the Hiring Manager (manager3)
        manager = db.query(User).filter(User.email == "manager3@clustox.com").first()
        if not manager:
            print("Manager3 not found!")
            return

        print(f"Manager: {manager.email}, ID: {manager.id}, Role: {manager.role}")

        # 2. Check Department Ownership
        dept = db.query(Department).filter(Department.owner_id == manager.id).first()
        if not dept:
            print(f"Manager {manager.email} does not own any department!")
            # Let's list all departments and their owners
            all_depts = db.query(Department).all()
            for d in all_depts:
                print(f"Dept: {d.name}, OwnerID: {d.owner_id}")
        else:
            print(f"Manager owns Dept: {dept.name} ({dept.id})")

            # 3. Check Jobs in that Department
            jobs = db.query(Job).filter(Job.department_id == dept.id).all()
            print(f"Found {len(jobs)} jobs in {dept.name}:")
            for j in jobs:
                print(f" - {j.title} ({j.id}) Status: {j.status}, Deleted: {j.is_deleted}")

            # 4. Test Service Method
            print("\nTesting job_service.get_jobs with filter:")
            service_jobs = job_service.get_jobs(db, filter_by_owner_id=manager.id)
            print(f"Service returned {len(service_jobs)} jobs.")
            for j in service_jobs:
                print(f" - {j.title}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_jobs()
