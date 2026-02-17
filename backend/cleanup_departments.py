
from sqlalchemy.orm import Session
from app.database import SessionLocal

db = SessionLocal()

TARGET_ID = "8749cb80-ffb0-4b76-8bab-41dfbe3c30c5" # Hiring Manager's Engineering Dept
DUPLICATE_IDS = [
    "ac057659-5b72-47f0-bb5f-66124a431d92",
    "fa379766-e037-4b2c-9074-2c7c745e49e6",
    "7767d633-a5d5-455c-a6e4-e9b52d6b740c"
]

def cleanup():
    # Import models locally to avoid circular imports during script startup
    from app.models.user import User
    from app.models.department import Department
    import app.models.scheduled_activity 
    from app.models.job import Job
    from app.models.candidate import JobApplication, Candidate 


TARGET_ID = "8749cb80-ffb0-4b76-8bab-41dfbe3c30c5" # Hiring Manager's Engineering Dept
DUPLICATE_IDS = [
    "ac057659-5b72-47f0-bb5f-66124a431d92",
    "fa379766-e037-4b2c-9074-2c7c745e49e6",
    "7767d633-a5d5-455c-a6e4-e9b52d6b740c"
]

def cleanup():
    target_dept = db.query(Department).filter(Department.id == TARGET_ID).first()
    if not target_dept:
        print(f"Target department {TARGET_ID} not found!")
        return

    print(f"Target Department: {target_dept.name} ({target_dept.id})")

    for old_id in DUPLICATE_IDS:
        old_dept = db.query(Department).filter(Department.id == old_id).first()
        if not old_dept:
            print(f"Duplicate {old_id} not found, skipping.")
            continue

        print(f"\nProcessing Duplicate: {old_dept.name} ({old_dept.id})")

        # 1. Update Members
        members = db.query(User).filter(User.department_id == old_id).all()
        for member in members:
            print(f"  - Moving User {member.full_name} to Target")
            member.department_id = TARGET_ID
        
        # 2. Update Managed Departments (Many-to-Many)
        # We need to check users who MANAGE this old dept
        # This is usually accessing old_dept.owners (users relationship) but depends on model backref
        # Let's check users.managed_departments.
        # Efficient way: query users where managed_departments contains old_dept
        # Since M2M is harder to query directly in simple sql without knowing table name 'user_departments',
        # we can iterate users (small dataset) or just check the owner if strict 1:1, but here it's M2M.
        # "managed_departments" in User model.
        
        # Let's iterate all users for safety (dataset is small < 50)
        all_users = db.query(User).all()
        for u in all_users:
            if old_dept in u.managed_departments:
                print(f"  - User {u.full_name} managed old dept. Unlinking.")
                u.managed_departments.remove(old_dept)
                if target_dept not in u.managed_departments:
                    print(f"    - Adding target dept to {u.full_name}'s managed list.")
                    u.managed_departments.append(target_dept)

        # 3. Update Jobs
        jobs = db.query(Job).filter(Job.department_id == old_id).all()
        for job in jobs:
            print(f"  - Moving Job {job.title} to Target")
            job.department_id = TARGET_ID
            
        # 4. Commit updates before deleting
        db.commit()

        # 5. Delete Old Department
        print(f"  - Deleting Department {old_id}")
        db.delete(old_dept)
        db.commit()

    print("\nCleanup Complete.")

if __name__ == "__main__":
    cleanup()
