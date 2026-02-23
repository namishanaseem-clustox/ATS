from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User, UserRole
from app.models.requisition import JobRequisition, RequisitionLog, RequisitionStatus
from app.models.candidate import JobApplication, Candidate
from app.models.job import Job
from app.schemas.requisition import (
    JobRequisitionCreate,
    JobRequisitionUpdate,
    JobRequisitionResponse,
    JobRequisitionDetailResponse,
    JobRequisitionReject
)
from app.routers.auth import get_current_active_user
from app.dependencies import RoleChecker

router = APIRouter(
    prefix="/requisitions",
    tags=["requisitions"],
    dependencies=[Depends(RoleChecker([UserRole.OWNER, UserRole.HR, UserRole.HIRING_MANAGER]))]
)

@router.post("/", response_model=JobRequisitionResponse)
def create_requisition(req_in: JobRequisitionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Generate a simple req code
    count = db.query(JobRequisition).count()
    req_code = f"REQ-{count + 1:03d}"
    
    new_req = JobRequisition(
        **req_in.model_dump(),
        req_code=req_code,
        status=RequisitionStatus.DRAFT,
        hiring_manager_id=current_user.id
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    
    # Audit log
    log = RequisitionLog(
        requisition_id=new_req.id,
        user_id=current_user.id,
        action="Created Requisition"
    )
    db.add(log)
    db.commit()
    
    return new_req

@router.get("/", response_model=List[JobRequisitionResponse])
def get_requisitions(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role in [UserRole.OWNER, UserRole.HR]:
        reqs = db.query(JobRequisition).order_by(JobRequisition.created_at.desc()).all()
    else:
        # Dept Head only sees reqs in their explicit managed department or created by themselves
        reqs = db.query(JobRequisition).filter(
            or_(
                JobRequisition.department_id == current_user.department_id,
                JobRequisition.hiring_manager_id == current_user.id
            )
        ).order_by(JobRequisition.created_at.desc()).all()
    return reqs

@router.get("/{req_id}", response_model=JobRequisitionDetailResponse)
def get_requisition(req_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    req = db.query(JobRequisition).filter(JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
        
    if current_user.role == UserRole.HIRING_MANAGER:
        if req.department_id != current_user.department_id and req.hiring_manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this requisition")
            
    returnreq = JobRequisitionDetailResponse.model_validate(req)
    returnreq.department_name = req.department.name if req.department else None
    returnreq.hiring_manager_name = req.hiring_manager.full_name if req.hiring_manager else None
    return returnreq

@router.put("/{req_id}", response_model=JobRequisitionResponse)
def update_requisition(req_id: UUID, req_update: JobRequisitionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    req = db.query(JobRequisition).filter(JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
        
    if req.status != RequisitionStatus.DRAFT and current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(status_code=400, detail="Cannot edit after submission unless you are HR/Owner")
        
    update_data = req_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(req, key, value)
        
    log = RequisitionLog(
        requisition_id=req.id,
        user_id=current_user.id,
        action="Updated Details"
    )
    db.add(log)
    db.commit()
    db.refresh(req)
    return req

@router.post("/{req_id}/submit")
def submit_requisition(req_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    req = db.query(JobRequisition).filter(JobRequisition.id == req_id).first()
    if not req or req.status != RequisitionStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Requisition must be in Draft to submit")
        
    req.status = RequisitionStatus.PENDING_HR
    log = RequisitionLog(requisition_id=req.id, user_id=current_user.id, action="Submitted to HR")
    db.add(log)
    db.commit()
    return {"message": "Submitted"}

@router.post("/{req_id}/approve")
def approve_requisition(req_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker([UserRole.HR, UserRole.OWNER]))):
    req = db.query(JobRequisition).filter(JobRequisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Not found")

    if req.status == RequisitionStatus.PENDING_HR and current_user.role in [UserRole.HR, UserRole.OWNER]:
        req.status = RequisitionStatus.PENDING_OWNER
        action = "Approved by HR"
    elif req.status == RequisitionStatus.PENDING_OWNER and current_user.role == UserRole.OWNER:
        req.status = RequisitionStatus.OPEN
        action = "Approved by Owner"
    else:
        raise HTTPException(status_code=400, detail=f"Cannot approve from status {req.status.value} as your role")

    log = RequisitionLog(requisition_id=req.id, user_id=current_user.id, action=action)
    db.add(log)
    db.commit()
    return {"message": action, "new_status": req.status}

@router.post("/{req_id}/reject")
def reject_requisition(req_id: UUID, payload: JobRequisitionReject, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker([UserRole.HR, UserRole.OWNER]))):
    req = db.query(JobRequisition).filter(JobRequisition.id == req_id).first()
    if not req or req.status in [RequisitionStatus.OPEN, RequisitionStatus.FILLED, RequisitionStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Cannot reject at this stage")

    req.status = RequisitionStatus.DRAFT
    req.rejection_reason = payload.reason
    
    action_text = f"Returned to Draft / Rejected - Reason: {payload.reason}"
    log = RequisitionLog(requisition_id=req.id, user_id=current_user.id, action=action_text)
    db.add(log)
    db.commit()
    return {"message": "Rejected"}

@router.post("/{req_id}/convert")
def convert_to_job(req_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))):
    req = db.query(JobRequisition).filter(JobRequisition.id == req_id).first()
    if not req or req.status != RequisitionStatus.OPEN:
        raise HTTPException(status_code=400, detail="Requisition must be OPEN to convert")

    # Generate the safe public-facing job
    new_job = Job(
        title=req.job_title,
        job_code=f"JOB-{req.req_code}",
        department_id=req.department_id,
        location=req.location,
        employment_type=req.employment_type,
        status="Draft", # Public job starts as draft
        hiring_manager_id=req.hiring_manager_id
    )
    db.add(new_job)

    # Mark requisition as filled
    req.status = RequisitionStatus.FILLED
    log = RequisitionLog(requisition_id=req.id, user_id=current_user.id, action="Converted to Job Posting")
    db.add(log)
    
    db.commit()
    db.refresh(new_job)
    
    return {"message": "Converted", "job_id": str(new_job.id)}
