from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class ScorecardSection(BaseModel):
    key: str
    label: str
    weight: float = 1.0


class ScorecardTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False
    sections: List[Dict[str, Any]] = [
        {"key": "technical_score", "label": "Technical Skills", "weight": 1},
        {"key": "communication_score", "label": "Communication", "weight": 1},
        {"key": "culture_fit_score", "label": "Culture Fit", "weight": 1},
        {"key": "problem_solving_score", "label": "Problem Solving", "weight": 1},
        {"key": "leadership_score", "label": "Leadership", "weight": 1},
    ]


class ScorecardTemplateCreate(ScorecardTemplateBase):
    pass


class ScorecardTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    sections: Optional[List[Dict[str, Any]]] = None


class ScorecardTemplateResponse(ScorecardTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
