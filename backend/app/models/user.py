import enum
import uuid
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    OWNER = "owner"
    HR = "hr"
    HIRING_MANAGER = "hiring_manager"
    INTERVIEWER = "interviewer"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    role = Column(Enum(UserRole), default=UserRole.INTERVIEWER, nullable=False)
    
    # Link to a specific department (for Hiring Managers/Owners)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    
    # Relationships
    department = relationship("Department", back_populates="managed_by_users", foreign_keys=[department_id])
    
    # Departments owned by this user
    managed_departments = relationship("Department", back_populates="owner", foreign_keys="Department.owner_id", viewonly=True)
    
    # managed_jobs = relationship("Job", back_populates="hiring_manager") # To be added to Job model
