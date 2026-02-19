from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class UserIntegration(Base):
    __tablename__ = "user_integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    provider = Column(String, nullable=False) # e.g. "google", "outlook"
    external_user_id = Column(String, nullable=True) # ID of the user in the external system
    external_email = Column(String, nullable=True) # Email in the external system
    
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=True)
    token_type = Column(String, default="Bearer")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    scope = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="integrations")
