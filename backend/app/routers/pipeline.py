from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.pipeline_stage import PipelineStage
from app.models.pipeline_template import PipelineTemplate
from app.models.user import User, UserRole
from app.routers.auth import get_current_active_user
from app.schemas.pipeline import PipelineStageCreate, PipelineStageUpdate, PipelineStageResponse, PipelineTemplateCreate, PipelineTemplateResponse

router = APIRouter(
    prefix="/pipeline",
    tags=["pipeline"],
    responses={404: {"description": "Not found"}},
)

# --- Templates ---

@router.get("/templates", response_model=List[PipelineTemplateResponse])
def get_pipeline_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(PipelineTemplate).all()

@router.post("/templates", response_model=PipelineTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline_template(template: PipelineTemplateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    new_template = PipelineTemplate(**template.dict())
    if new_template.is_default:
        # Unset existing default
        db.query(PipelineTemplate).update({PipelineTemplate.is_default: False})
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

@router.put("/templates/{template_id}", response_model=PipelineTemplateResponse)
def update_pipeline_template(template_id: UUID, template_update: PipelineTemplateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    db_template = db.query(PipelineTemplate).filter(PipelineTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    update_data = template_update.dict(exclude_unset=True)
    if update_data.get('is_default'):
         # Unset existing default
        db.query(PipelineTemplate).filter(PipelineTemplate.id != template_id).update({PipelineTemplate.is_default: False})
        
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline_template(template_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db_template = db.query(PipelineTemplate).filter(PipelineTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if db_template.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default template")
        
    db.delete(db_template)
    db.commit()

# --- Stages ---

@router.get("/stages", response_model=List[PipelineStageResponse])
def get_pipeline_stages(template_id: Optional[UUID] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    query = db.query(PipelineStage)
    if template_id:
        query = query.filter(PipelineStage.pipeline_template_id == template_id)
    return query.order_by(PipelineStage.order).all()

@router.post("/stages", response_model=PipelineStageResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline_stage(stage: PipelineStageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Verify template exists if provided
    if stage.pipeline_template_id:
         template = db.query(PipelineTemplate).filter(PipelineTemplate.id == stage.pipeline_template_id).first()
         if not template:
             raise HTTPException(status_code=404, detail="Template not found")

    new_stage = PipelineStage(**stage.dict())
    db.add(new_stage)
    db.commit()
    db.refresh(new_stage)
    return new_stage

@router.put("/stages/{stage_id}", response_model=PipelineStageResponse)
def update_pipeline_stage(stage_id: UUID, stage_update: PipelineStageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    db_stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id).first()
    if not db_stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    update_data = stage_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_stage, key, value)
    
    db.commit()
    db.refresh(db_stage)
    return db_stage

@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline_stage(stage_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    db_stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id).first()
    if not db_stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    if db_stage.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default stage")

    db.delete(db_stage)
    db.commit()
