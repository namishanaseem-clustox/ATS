import uuid
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base


class ScorecardTemplate(Base):
    __tablename__ = "scorecard_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)

    # List of scoring criteria sections
    # e.g. [{"key": "technical", "label": "Technical Skills", "weight": 1},
    #        {"key": "communication", "label": "Communication", "weight": 1}]
    sections = Column(JSONB, default=lambda: [
        {"key": "technical_score", "label": "Technical Skills", "weight": 1},
        {"key": "communication_score", "label": "Communication", "weight": 1},
        {"key": "culture_fit_score", "label": "Culture Fit", "weight": 1},
        {"key": "problem_solving_score", "label": "Problem Solving", "weight": 1},
        {"key": "leadership_score", "label": "Leadership", "weight": 1},
    ])

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
