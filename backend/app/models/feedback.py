import uuid
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("scheduled_activities.id"), nullable=False, unique=True)
    interviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    
    overall_score = Column(Integer) # 1-5
    recommendation = Column(String) # Strong Yes, Yes, No, Strong No
    
    # Store dynamic scorecard fields
    # Format: [{"criteria": "Problem Solving", "score": 4, "comment": "..."}, ...]
    scorecard = Column(JSONB, default=list)
    
    comments = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    activity = relationship("ScheduledActivity", backref="feedback")
    interviewer = relationship("User", backref="feedbacks_given")
    candidate = relationship("Candidate", backref="feedbacks")
