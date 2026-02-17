import sys
import os
import uuid
# Add current directory to path to find app module
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.services.department import department_service
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.job import Job, JobStatus
# Start Import Fix
try:
    from app.models.scheduled_activity import ScheduledActivity
    from app.models.candidate import Candidate
except ImportError:
    print("Warning: Could not import ScheduledActivity or Candidate, check path")
# End Import Fix

db = SessionLocal()

try:
    print("Beginning reproduction...")
    # 1. Setup Data
    dept_name = "Debug Dept " + str(uuid.uuid4())[:8]
    dept = Department(name=dept_name, status="Active")
    db.add(dept)
    db.commit()
    db.refresh(dept)
    print(f"Created Dept: {dept.name} ({dept.id})")

    # Create Owner (Hiring Manager) - Is NOT a member initially
    owner_email = f"owner_{uuid.uuid4()}@debug.com"
    owner = User(
        email=owner_email,
        hashed_password="hashed_password",
        role=UserRole.HIRING_MANAGER,
        full_name="Debug Owner",
        is_active=True
        # department_id is None by default
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    
    # Assign owner to dept
    dept.owner_id = owner.id
    db.add(dept)
    db.commit()
    print(f"Created Owner: {owner.email} ({owner.id})")

    # Create Interviewer (Member)
    interviewer_email = f"interviewer_{uuid.uuid4()}@debug.com"
    interviewer = User(
        email=interviewer_email,
        hashed_password="hashed_password",
        role=UserRole.INTERVIEWER,
        full_name="Debug Interviewer",
        department_id=dept.id,
        is_active=True
    )
    db.add(interviewer)
    db.commit()
    db.refresh(interviewer)
    print(f"Created Interviewer: {interviewer.email} ({interviewer.id}) assigned to {dept.id}")

    # 2. Debug Query directly
    print("\n[Direct Query Check]")
    count = db.query(User).filter(User.department_id == dept.id, User.is_active == True).count()
    print(f"Direct Query Count for Dept {dept.id}: {count}")

    # 3. Test Service Method for HR (No filters)
    with open("/tmp/reproduce_hr.txt", "w") as f:
        f.write("[Testing Service Method for HR]\n")
        # HR passes None for both filters
        departments_hr = department_service.get_departments(
            db, 
            filter_by_member_id=None,
            filter_by_owner_id=None
        )

        if departments_hr:
            f.write(f"  [SUCCESS] HR see {len(departments_hr)} departments.\n")
            for d in departments_hr:
                f.write(f"  - Dept: {d.name} ({d.id})\n")
        else:
            f.write("  [ERROR] HR sees NO departments!\n")

finally:
    db.close()
