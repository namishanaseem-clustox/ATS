from datetime import timedelta, datetime, timezone
from typing import List, Optional
from uuid import UUID
import secrets
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.user import User, UserRole
from app.models.password_reset import PasswordResetToken
from app.core.security import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.utils.email import send_password_reset_email

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
    # Eager load managed_departments to avoid N+1 and manual mapping
    # Filter out deleted users
    users = db.query(User).options(joinedload(User.managed_departments)).filter(User.is_deleted.isnot(True)).all()
    
    # Filter users based on current user's role
    if current_user.role == UserRole.INTERVIEWER:
        # Interviewers can only see other interviewers (for assignment purposes)
        users = [user for user in users if user.role == UserRole.INTERVIEWER]
    elif current_user.role not in [UserRole.OWNER, UserRole.HR, UserRole.HIRING_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view users"
        )
    
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
        phone=user.phone,
        location=user.location,
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
    # Allow if user is updating themselves OR if user is Owner/HR
    is_self_update = current_user.id == user_id
    is_admin = current_user.role in [UserRole.OWNER, UserRole.HR]

    if not is_self_update and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update users"
        )
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Optional checks could be added here (e.g., HR cannot edit Owner)

    update_data = user_update.dict(exclude_unset=True)

    # Security check: Non-admins cannot change their own Role, Status, or Department
    if not is_admin:
        if "role" in update_data:
            del update_data["role"]
        if "is_active" in update_data:
            del update_data["is_active"]
        if "department_id" in update_data:
            del update_data["department_id"]
    
    # Check if email is being updated and if it's already taken
    if "email" in update_data and update_data["email"] != db_user.email:
        existing_user = db.query(User).filter(User.email == update_data["email"]).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Email already registered")

    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            # Require current password when a user is changing their own password
            if is_self_update:
                current_password = update_data.pop("current_password", None)
                if not current_password:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="current_password is required to change your password."
                    )
                if not verify_password(current_password, db_user.hashed_password):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Current password is incorrect."
                    )
            else:
                # Admins changing someone else's password don't need current_password
                update_data.pop("current_password", None)
            db_user.hashed_password = get_password_hash(password)

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user


# ─── Password Reset Flow ───────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password", status_code=200)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Initiates email-based password reset. Always returns 200 to prevent user enumeration."""
    user = db.query(User).filter(User.email == payload.email).first()
    
    if user:
        # Invalidate any existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})
        
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=raw_token,
            expires_at=expires_at,
        )
        db.add(reset_token)
        db.commit()
        
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/reset-password?token={raw_token}"
        send_password_reset_email(user.email, reset_url)
    
    return {"message": "If that email address is in our system, you will receive a reset link shortly."}


@router.post("/reset-password", status_code=200)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Validates a reset token and updates the user's password."""
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    
    if token_record.is_used:
        raise HTTPException(status_code=400, detail="This reset link has already been used.")
    
    if datetime.now(timezone.utc) > token_record.expires_at:
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")
    
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset link.")
    
    user.hashed_password = get_password_hash(payload.new_password)
    token_record.is_used = True
    db.commit()
    
    return {"message": "Password reset successfully. You can now log in with your new password."}
import shutil
from fastapi import File, UploadFile

@router.post("/users/{user_id}/avatar", response_model=UserResponse)
async def upload_avatar(
    user_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only self or admin can update the avatar
    is_self_update = current_user.id == user_id
    is_admin = current_user.role in [UserRole.OWNER, UserRole.HR]

    if not is_self_update and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's avatar"
        )

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Ensure uploads/avatars directory exists
    UPLOAD_DIR = "uploads/avatars"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user_id}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    # Update DB
    db_user.avatar_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(db_user)

    return db_user

@router.delete("/users/{user_id}/avatar", response_model=UserResponse)
async def remove_avatar(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only self or admin can update the avatar
    is_self_update = current_user.id == user_id
    is_admin = current_user.role in [UserRole.OWNER, UserRole.HR]

    if not is_self_update and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's avatar"
        )

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.avatar_url:
        # Try to delete the physical file
        try:
            filename = db_user.avatar_url.split("/")[-1]
            file_path = os.path.join("uploads/avatars", filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            # Log error but continue with DB update
            print(f"Error deleting avatar file: {e}")

        db_user.avatar_url = None
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

import secrets
from datetime import datetime, timezone
from app.models.invitation import UserInvitation
from app.schemas.user import UserInvitationCreate, UserRegisterInvited
from app.utils.email import send_invitation_email

@router.post("/invitations", response_model=dict)
def create_invitation(
    invite_data: UserInvitationCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    # Only Owner and HR can invite users
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=403, detail="Not authorized to invite users")

    # Check if a non-deleted user with this email is already registered
    existing_user = db.query(User).filter(User.email == invite_data.email, User.is_deleted.isnot(True)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Generate a secure random token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # Save to database
    invitation = UserInvitation(
        email=invite_data.email,
        full_name=invite_data.full_name,
        phone=invite_data.phone,
        location=invite_data.location,
        role=invite_data.role,
        department_id=invite_data.department_id,
        token=token,
        expires_at=expires_at,
        created_by_id=current_user.id
    )
    db.add(invitation)
    db.commit()

    # Send Email
    # Construct the frontend URL where the user will land to accept the invite
    # Assuming the frontend is running on localhost:5173 for local dev, or the production URL
    # In a real app, this base URL would come from an environment variable.
    import os
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    invite_url = f"{frontend_url}/invite/{token}"
    
    email_sent = send_invitation_email(invite_data.email, invite_data.role.value, invite_url)
    if not email_sent:
        # We might want to handle this differently in production, e.g., queue it or show a warning
        pass

    return {"message": "Invitation sent successfully", "email": invite_data.email}

@router.get("/invitations/{token}", response_model=dict)
def validate_invitation(token: str, db: Session = Depends(get_db)):
    """Public endpoint to validate an invitation token when the user clicks the email link."""
    invitation = db.query(UserInvitation).filter(UserInvitation.token == token).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation token.")
        
    if invitation.is_used:
        raise HTTPException(status_code=400, detail="This invitation has already been used.")
        
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invitation has expired.")
        
    return {
        "email": invitation.email,
        "role": invitation.role,
        "department_id": invitation.department_id,
        "valid": True
    }

@router.post("/register-invited", response_model=UserResponse)
def register_invited_user(data: UserRegisterInvited, db: Session = Depends(get_db)):
    """Public endpoint to consume the token and create the user account."""
    invitation = db.query(UserInvitation).filter(UserInvitation.token == data.token).first()
    
    if not invitation or invitation.is_used or invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid, expired, or already used invitation token.")
        
    # Check if a non-deleted user with this email unexpectedly signed up in the meantime
    existing_user = db.query(User).filter(User.email == invitation.email).first()
    
    hashed_password = get_password_hash(data.password)
    
    if existing_user:
        if not existing_user.is_deleted:
            raise HTTPException(status_code=400, detail="A user with this email already exists.")
        else:
            # Reactivate soft-deleted user
            existing_user.full_name = data.full_name
            if data.phone:
                existing_user.phone = data.phone
            if data.location:
                existing_user.location = data.location
            existing_user.hashed_password = hashed_password
            existing_user.role = invitation.role
            existing_user.department_id = invitation.department_id
            existing_user.is_active = True
            existing_user.is_deleted = False
            new_user = existing_user
    else:
        # Create a new user
        new_user = User(
            email=invitation.email,
            full_name=data.full_name or invitation.full_name,
            phone=data.phone or invitation.phone,
            location=data.location or invitation.location,
            hashed_password=hashed_password,
            role=invitation.role,
            department_id=invitation.department_id,
            is_active=True
        )
        db.add(new_user)
    
    # Mark invitation as used
    invitation.is_used = True
    
    db.commit()
    db.refresh(new_user)
    return new_user
