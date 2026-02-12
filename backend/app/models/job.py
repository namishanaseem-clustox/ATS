import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class JobStatus(str, enum.Enum):
    DRAFT = "Draft"
    PUBLISHED = "Published"
    ARCHIVED = "Archived"
    CLOSED = "Closed"

class EmploymentType(str, enum.Enum):
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT = "Contract"
    FREELANCE = "Freelance"
    INTERNSHIP = "Internship"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    
    title = Column(String, nullable=False, index=True)
    job_code = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, nullable=False)
    employment_type = Column(String, nullable=False) # Storing Enum as String for flexibility or use SAEnum
    
    headcount = Column(Integer, default=1)
    min_salary = Column(Float, nullable=True)
    max_salary = Column(Float, nullable=True)
    experience_range = Column(String, nullable=True)
    
    skills = Column(JSONB, default=list) # List of strings
    description = Column(Text, nullable=True)
    
    hiring_manager_id = Column(UUID(as_uuid=True), nullable=True)
    recruiter_id = Column(UUID(as_uuid=True), nullable=True)
    
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default=JobStatus.DRAFT.value)
    
    pipeline_config = Column(JSONB, default=lambda: [
        {"name": "New Candidates", "id": "new", "type": "standard"},
        {"name": "Shortlisted", "id": "shortlisted", "type": "standard"},
        {"name": "Technical Review", "id": "technical_review", "type": "standard"},
        {"name": "Interview Round 1", "id": "interview_round_1", "type": "standard"},
        {"name": "Interview Round 2", "id": "interview_round_2", "type": "standard"},
        {"name": "Offer", "id": "offer", "type": "standard"},
        {"name": "Hired", "id": "hired", "type": "standard"},
        {"name": "Rejected", "id": "rejected", "type": "standard"}
    ])
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    department = relationship("Department", backref="jobs")
    activities = relationship("JobActivity", back_populates="job", cascade="all, delete-orphan")

class JobActivity(Base):
    __tablename__ = "job_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=True) # User who performed action
    action_type = Column(String, nullable=False) # e.g., "STATUS_CHANGE", "EDIT", "CLONE"
    details = Column(JSONB, nullable=True) # Before/After values
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="activities")
