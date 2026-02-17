import sys
import os
import uuid
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.department import Department
from app.core.security import get_password_hash

db = SessionLocal()
email = "admin@clustox.com"
password = "password123"
hashed_password = get_password_hash(password)

user = db.query(User).filter(User.email == email).first()

if user:
    print(f"Updating existing user {email}")
    user.hashed_password = hashed_password
    user.role = UserRole.OWNER
    user.is_active = True
else:
    print(f"Creating new user {email}")
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name="System Admin",
        role=UserRole.OWNER,
        is_active=True
    )
    db.add(user)

db.commit()
print("Admin user ready with 'password123'")
db.close()
