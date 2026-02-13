import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class ApplicationStatus(str, enum.Enum):
    NEW = "New"
    SHORTLISTED = "Shortlisted"
    INTERVIEW = "Interview"
    OFFER = "Offer"
    HIRED = "Hired"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic Info
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    current_company = Column(String, nullable=True)
    current_position = Column(String, nullable=True)
    experience_years = Column(Float, default=0.0)
    
    # Additional Info
    nationality = Column(String, nullable=True)
    notice_period = Column(Integer, nullable=True) # In days
    '''
    current_salary = Column(String, nullable=True)
    expected_salary = Column(String, nullable=True)
    '''
    
    # JSONB Fields for Parsing
    skills = Column(JSONB, default=list)
    education = Column(JSONB, default=list)
    experience_history = Column(JSONB, default=list)
    social_links = Column(JSONB, default=dict)
    
    # Meta
    resume_file_path = Column(String, nullable=True)
    parsed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    applications = relationship("JobApplication", back_populates="candidate", cascade="all, delete-orphan")
    scheduled_activities = relationship("ScheduledActivity", back_populates="candidate", cascade="all, delete-orphan")

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    current_stage = Column(String, default="new") # Matches Pipeline stages
    application_status = Column(String, default=ApplicationStatus.NEW.value)
    
    # Relationships
    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", backref="applications") # Simple backref for now

    # Scoring
    score_details = Column(JSONB, default=dict) # { "technical": 4, "communication": 5, ... }
    overall_score = Column(Float, nullable=True) # Calculated average or manual override
    recommendation = Column(String, nullable=True) # Strong Yes, Yes, Neutral, No, Strong No
