from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List

# --- Templates ---

class PipelineTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False

class PipelineTemplateCreate(PipelineTemplateBase):
    pass

class PipelineTemplateUpdate(PipelineTemplateBase):
    pass

class PipelineTemplateResponse(PipelineTemplateBase):
    id: UUID
    is_default: bool

    class Config:
        from_attributes = True

# --- Stages ---

class PipelineStageBase(BaseModel):
    name: str
    order: int
    color: Optional[str] = "#000000"
    pipeline_template_id: Optional[UUID] = None

class PipelineStageCreate(PipelineStageBase):
    pass

class PipelineStageUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    color: Optional[str] = None
    is_default: Optional[bool] = None
    pipeline_template_id: Optional[UUID] = None

class PipelineStageResponse(PipelineStageBase):
    id: UUID
    is_default: bool

    class Config:
        from_attributes = True
