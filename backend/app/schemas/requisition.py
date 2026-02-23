from pydantic import BaseModel, ConfigDict
from pydantic.types import UUID4
from typing import Optional, List
from datetime import datetime
from app.models.requisition import RequisitionStatus

# Requisition Logs
class RequisitionLogBase(BaseModel):
    action: str
    comments: Optional[str] = None

class RequisitionLogCreate(RequisitionLogBase):
    pass

class UserBasicInfo(BaseModel):
    id: UUID4
    full_name: str
    
    model_config = ConfigDict(from_attributes=True)

class RequisitionLogResponse(RequisitionLogBase):
    id: UUID4
    requisition_id: UUID4
    user_id: UUID4
    timestamp: datetime
    user: Optional[UserBasicInfo] = None

    model_config = ConfigDict(from_attributes=True)

# Requisitions
class JobRequisitionBase(BaseModel):
    job_title: str
    department_id: UUID4
    location: str
    employment_type: str
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    currency: Optional[str] = "USD"
    has_equity_bonus: Optional[bool] = False
    budget_code: Optional[str] = None
    justification: Optional[str] = None

class JobRequisitionCreate(JobRequisitionBase):
    pass

class JobRequisitionUpdate(BaseModel):
    job_title: Optional[str] = None
    department_id: Optional[UUID4] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    currency: Optional[str] = None
    has_equity_bonus: Optional[bool] = None
    budget_code: Optional[str] = None
    justification: Optional[str] = None

class JobRequisitionResponse(JobRequisitionBase):
    id: UUID4
    req_code: str
    status: RequisitionStatus
    hiring_manager_id: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class JobRequisitionDetailResponse(JobRequisitionResponse):
    audit_logs: List[RequisitionLogResponse] = []
    
    # Optional fields for expanded views
    department_name: Optional[str] = None
    hiring_manager_name: Optional[str] = None

class JobRequisitionReject(BaseModel):
    reason: str
