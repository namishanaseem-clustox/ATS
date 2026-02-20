import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    order = Column(Integer, nullable=False)
    color = Column(String, nullable=True) # Hex color code
    is_default = Column(Boolean, default=False)
    
    pipeline_template_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_templates.id"), nullable=True)
    
    template = relationship("PipelineTemplate", back_populates="stages")
