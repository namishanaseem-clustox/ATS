import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
user = db.query(User).filter(User.email == "hr@clustox.com").first()
if user:
    print(f"Found user {user.email}")
    user.hashed_password = get_password_hash("test_password")
    db.add(user)
    db.commit()
    print("Password reset to 'test_password'")
else:
    print("User not found")
db.close()
