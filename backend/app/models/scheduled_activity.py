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
    NOTE = "Note"

class ActivityStatus(str, enum.Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class ScheduledActivity(Base):
    __tablename__ = "scheduled_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=True)
    scorecard_template_id = Column(UUID(as_uuid=True), ForeignKey("scorecard_templates.id"), nullable=True)
    
    activity_type = Column(String, nullable=False, default=ActivityType.TASK.value)
    title = Column(String, nullable=False)
    status = Column(String, default=ActivityStatus.PENDING.value)
    
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # List of names or emails of participants
    participants = Column(JSONB, default=list)

    # Flexible details (e.g. Note Type, Meeting Agenda, etc.)
    details = Column(JSONB, default=dict)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # User ID if available
    
    creator = relationship("User", foreign_keys=[created_by])
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # External Sync Fields
    external_id = Column(String, nullable=True) # e.g. Google Calendar Event ID
    external_provider = Column(String, nullable=True) # e.g. "google"
    event_html_link = Column(String, nullable=True) # Direct link to external event

    # Relationships
    job = relationship("Job", back_populates="scheduled_activities")
    candidate = relationship("Candidate", back_populates="scheduled_activities")
    assignees = relationship("User", secondary="activity_assignees", backref="assigned_activities")
    scorecard_template = relationship("ScorecardTemplate")

# Association Table for Many-to-Many
from sqlalchemy import Table, ForeignKey
activity_assignees = Table(
    "activity_assignees",
    Base.metadata,
    Column("activity_id", UUID(as_uuid=True), ForeignKey("scheduled_activities.id"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
)
