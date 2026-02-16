import sys
import os
import logging
from sqlalchemy.orm import Session

# Add the parent directory (backend) to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.job import Job
from app.models.candidate import Candidate
from app.models.scheduled_activity import ScheduledActivity
from app.core.security import get_password_hash

# Ensure all tables are created
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_users():
    db = SessionLocal()
    try:
        users = [
            {
                "email": "owner@clustox.com",
                "password": "password123",
                "full_name": "Cluster Owner",
                "role": UserRole.OWNER,
            },
            {
                "email": "hr@clustox.com",
                "password": "password123",
                "full_name": "Human Resources",
                "role": UserRole.HR,
            },
            {
                "email": "manager@clustox.com",
                "password": "password123",
                "full_name": "Hiring Manager",
                "role": UserRole.HIRING_MANAGER,
            },
            {
                "email": "interviewer@clustox.com",
                "password": "password123",
                "full_name": "Tech Interviewer",
                "role": UserRole.INTERVIEWER,
            },
        ]

        for user_data in users:
            user = db.query(User).filter(User.email == user_data["email"]).first()
            if not user:
                logger.info(f"Creating user: {user_data['email']} ({user_data['role']})")
                new_user = User(
                    email=user_data["email"],
                    hashed_password=get_password_hash(user_data["password"]),
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    is_active=True,
                )
                db.add(new_user)
            else:
                logger.info(f"User already exists: {user_data['email']}")
        
        db.commit()
        logger.info("Seeding completed successfully.")

    except Exception as e:
        logger.error(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
