from datetime import timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.user import User, UserRole
from app.core.security import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

from app.schemas.user import UserCreate, UserResponse, Token, UserUpdate

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}



from app.models.department import Department

from sqlalchemy.orm import joinedload

@router.get("/users", response_model=List[UserResponse])
def read_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view users"
        )
    # Eager load managed_departments to avoid N+1 and manual mapping
    # Filter out deleted users
    users = db.query(User).options(joinedload(User.managed_departments)).filter(User.is_deleted.isnot(True)).all()
    
    for user in users:
        # Fallback for UI 'department_id' (legacy single view)
        # If user is a manager and has no home department, use the first managed one
        if user.role == UserRole.HIRING_MANAGER and not user.department_id:
             if user.managed_departments:
                 # user.managed_departments is now a list of Department objects
                 user.department_id = user.managed_departments[0].id
                
    return users

@router.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Only Owner and HR can create new users
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create new users"
        )

    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        is_active=True,
        department_id=user.department_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

    return new_user



@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update users"
        )
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Optional checks could be added here (e.g., HR cannot edit Owner)

    update_data = user_update.dict(exclude_unset=True)
    
    if "password" in update_data:
        password = update_data.pop("password")
        if password: # strict check to ensure not empty string if sent?
             hashed_password = get_password_hash(password)
             db_user.hashed_password = hashed_password

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete users"
        )
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent deleting yourself
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    # Prevent deleting the main Owner (if explicit check needed, but role check covers general persmissions)
    # If the target is an Owner, maybe restrict only other Owners can delete?
    if db_user.role == UserRole.OWNER and current_user.role != UserRole.OWNER:
         raise HTTPException(status_code=403, detail="Only Owners can delete other Owners")

    # Soft verify or Hard delete? Plan said Soft Delete.
    # Setting is_active = False effectively "deletes" them from access.
    # Also remove from department to clean up?
    # Soft delete the user
    db_user.is_deleted = True
    db_user.is_active = False # Also deactivate to be safe
    db_user.department_id = None
    
    db.add(db_user)
    db.commit()
    
    return None
