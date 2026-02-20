from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.user_preferences import UserPreferences
from app.schemas.preferences import UserPreferencesResponse, UserPreferencesUpdate
from app.routers.auth import get_current_active_user

router = APIRouter(
    prefix="/preferences",
    tags=["preferences"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me", response_model=UserPreferencesResponse)
def get_my_preferences(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    
    # Auto-create defaults if not exists
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
        
    return prefs

@router.put("/me", response_model=UserPreferencesResponse)
def update_my_preferences(
    prefs_update: UserPreferencesUpdate, 
    current_user: User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)
    
    update_data = prefs_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)
        
    db.commit()
    db.refresh(prefs)
    return prefs
