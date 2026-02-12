import uuid
import enum
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ActivityType(str, enum.Enum):
    TASK = "Task"
    MEETING = "Meeting"
    INTERVIEW = "Interview"
    CALL = "Call"

class ActivityStatus(str, enum.Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class ScheduledActivity(Base):
    __tablename__ = "scheduled_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=True)
    
    activity_type = Column(String, nullable=False, default=ActivityType.TASK.value)
    title = Column(String, nullable=False)
    status = Column(String, default=ActivityStatus.PENDING.value)
    
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # List of names or emails of participants
    participants = Column(JSONB, default=list)
    
    created_by = Column(UUID(as_uuid=True), nullable=True) # User ID if available
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    job = relationship("Job", back_populates="scheduled_activities")
    candidate = relationship("Candidate", back_populates="scheduled_activities")
