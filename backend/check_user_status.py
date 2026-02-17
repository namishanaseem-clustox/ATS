import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.user import User
from app.models.department import Department

db = SessionLocal()
user = db.query(User).filter(User.email == "tobedeleted@clustox.com").first()

with open("/tmp/user_status.txt", "w") as f:
    if user:
         f.write(f"User found. Active: {user.is_active}, Dept: {user.department_id}\n")
    else:
         f.write("User not found (maybe verify_delete didn't create it?)\n")
         
db.close()
