from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User, UserRole
from app.models.scorecard_template import ScorecardTemplate
from app.schemas.scorecard import ScorecardTemplateCreate, ScorecardTemplateUpdate, ScorecardTemplateResponse
from app.routers.auth import get_current_active_user

router = APIRouter(prefix="/scorecards", tags=["Scorecard Templates"])


@router.get("/", response_model=List[ScorecardTemplateResponse])
def list_scorecard_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(ScorecardTemplate).order_by(ScorecardTemplate.is_default.desc(), ScorecardTemplate.name).all()


@router.post("/", response_model=ScorecardTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_scorecard_template(
    template: ScorecardTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=403, detail="Only Owner/HR can manage scorecard templates")

    # If this is set as default, unset any existing default
    if template.is_default:
        db.query(ScorecardTemplate).filter(ScorecardTemplate.is_default == True).update({"is_default": False})

    db_template = ScorecardTemplate(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.get("/{template_id}", response_model=ScorecardTemplateResponse)
def get_scorecard_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    template = db.query(ScorecardTemplate).filter(ScorecardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Scorecard template not found")
    return template


@router.put("/{template_id}", response_model=ScorecardTemplateResponse)
def update_scorecard_template(
    template_id: UUID,
    update: ScorecardTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=403, detail="Only Owner/HR can manage scorecard templates")

    template = db.query(ScorecardTemplate).filter(ScorecardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Scorecard template not found")

    update_data = update.dict(exclude_unset=True)

    # If setting as default, clear others
    if update_data.get("is_default"):
        db.query(ScorecardTemplate).filter(ScorecardTemplate.id != template_id).update({"is_default": False})

    for key, value in update_data.items():
        setattr(template, key, value)

    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scorecard_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=403, detail="Only Owner/HR can delete scorecard templates")

    template = db.query(ScorecardTemplate).filter(ScorecardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Scorecard template not found")

    db.delete(template)
    db.commit()
