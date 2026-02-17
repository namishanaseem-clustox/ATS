import sys
import os
import uuid
# Add current directory to path to find app module
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.department import Department

db = SessionLocal()

# Find user by email 'hr@clustox.com' as seen in the logs
user = db.query(User).filter(User.email == "hr@clustox.com").first()

with open("/tmp/fix_hr_role.txt", "w") as f:
    if user:
        f.write(f"Found user: {user.email}, Role: {user.role}\n")
        if user.role != UserRole.HR:
            f.write("Updating role to HR...\n")
            user.role = UserRole.HR
            db.add(user)
            db.commit()
            db.refresh(user)
            f.write(f"Updated user: {user.email}, Role: {user.role}\n")
        else:
            f.write("User is already HR.\n")
    else:
        f.write("User hr@clustox.com NOT FOUND.\n")
    
db.close()
