from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserResponse

# Shared properties
class DepartmentBase(BaseModel):
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[UUID] = None
    status: Optional[str] = "Active"

# Properties to receive on department creation
class DepartmentCreate(DepartmentBase):
    pass

# Properties to receive on department update
class DepartmentUpdate(DepartmentBase):
    pass

# Properties shared by models stored in DB
class DepartmentInDBBase(DepartmentBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Properties to return to client
class Department(DepartmentInDBBase):
    # These would ideally be computed or joined, for now we can mock/placeholder them in the service
    active_jobs_count: int = 0
    total_jobs_count: int = 0
    total_members_count: int = 0
    
    # We need to forward reference or use a simplified User schema to avoid circular imports if possible
    # For now, let's just return the owner dictionary or object if Pydantic handles it
    owner: Optional[UserResponse] = None

class DepartmentResponse(Department):
    pass
