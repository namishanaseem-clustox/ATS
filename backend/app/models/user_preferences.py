from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    # Notifications
    notify_new_candidate = Column(Boolean, default=True)
    notify_activity_assigned = Column(Boolean, default=True)
    notify_feedback_submitted = Column(Boolean, default=True)
    notify_stage_change = Column(Boolean, default=True)

    # Appearance
    timezone = Column(String, default="UTC")
    date_format = Column(String, default="DD/MM/YYYY")  # options: MM/DD/YYYY, YYYY-MM-DD
    language = Column(String, default="en")

    # Relationship to User
    user = relationship("User", back_populates="preferences")
