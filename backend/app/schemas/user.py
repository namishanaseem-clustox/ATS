from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional, List
from app.models.user import UserRole

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.INTERVIEWER
    is_active: bool = True
    department_id: Optional[UUID] = None

class UserCreate(UserBase):
    password: str

class DepartmentSummary(BaseModel):
    id: UUID
    name: str

    class Config:
        orm_mode = True
        from_attributes = True

class UserResponse(UserBase):
    id: UUID
    managed_departments: List[DepartmentSummary] = []

    class Config:
        orm_mode = True
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    department_id: Optional[UUID] = None

class UserInvitationCreate(BaseModel):
    email: EmailStr
    role: UserRole
    department_id: Optional[UUID] = None

class UserRegisterInvited(BaseModel):
    token: str
    full_name: str
    password: str
