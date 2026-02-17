from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services.department import department_service
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.department import Department

router = APIRouter(
    prefix="/departments",
    tags=["departments"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=DepartmentResponse)
def create_department(department: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create departments"
        )
    return department_service.create_department(db=db, department=department)

@router.get("/", response_model=List[DepartmentResponse])
def read_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # All active users can read departments, but visibility is restricted by role
    
    filter_by_owner_id = None
    filter_by_member_id = None

    
    import logging
    logger = logging.getLogger("debug_departments")
    if not logger.handlers:
        logger.addHandler(logging.FileHandler('/tmp/debug_departments.log'))
    logger.setLevel(logging.INFO)
    
    logger.info(f"User: {current_user.email}, Role: {current_user.role}, DeptID: {current_user.department_id}")

    if current_user.role == UserRole.HIRING_MANAGER:
        # HM sees departments they own OR are a member of
        filter_by_owner_id = current_user.id
        filter_by_member_id = current_user.department_id
        logger.info("Role: HIRING_MANAGER - Apply filters")

    elif current_user.role == UserRole.INTERVIEWER:
        # Interviewer sees ONLY their assigned department
        if current_user.department_id:
             filter_by_member_id = current_user.department_id
             logger.info("Role: INTERVIEWER - Filter by member_id")
        else:
             # If no department assigned, they see nothing
             logger.info("Role: INTERVIEWER - No department assigned")
             return []
    else:
        logger.info(f"Role: {current_user.role} - No filters (Admin/HR/Owner)")
    
    # Use service to fetch and populate counts
    return department_service.get_departments(
        db, 
        skip=skip, 
        limit=limit, 
        filter_by_owner_id=filter_by_owner_id, 
        filter_by_member_id=filter_by_member_id
    )

@router.get("/{department_id}", response_model=DepartmentResponse)
def read_department(department_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_department = department_service.get_department(db, department_id=department_id)
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_department

@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(department_id: UUID, department: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update departments"
        )
    db_department = department_service.update_department(db, department_id=department_id, department=department)
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_department

@router.delete("/{department_id}", response_model=DepartmentResponse)
def delete_department(department_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete departments"
        )
    db_department = department_service.delete_department(db, department_id=department_id)
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_department

@router.delete("/{department_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(department_id: UUID, user_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # 1. Get Department
    dept = department_service.get_department(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # 2. Check Permissions
    is_admin = current_user.role in [UserRole.OWNER, UserRole.HR]
    is_dept_owner = dept.owner_id == current_user.id
    
    if not (is_admin or is_dept_owner):
        raise HTTPException(status_code=403, detail="Not authorized to remove members from this department")

    # 3. Get Target User
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 4. Verify membership
    if target_user.department_id != department_id:
        raise HTTPException(status_code=400, detail="User is not a member of this department")
        
    # 5. Remove from department
    target_user.department_id = None
    db.add(target_user)
    db.commit()
    
    target_user.department_id = None
    db.add(target_user)
    db.commit()
    
    return None

from app.schemas.user import UserResponse

@router.get("/{department_id}/members", response_model=List[UserResponse])
def read_department_members(department_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # 1. Get Department
    dept = department_service.get_department(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # 3. Check Permissions
    is_admin = current_user.role in [UserRole.OWNER, UserRole.HR]
    is_dept_owner = dept.owner_id == current_user.id
    is_dept_member = current_user.department_id == department_id
    
    # Allow if Admin, Owner, OR Member of the department
    if not (is_admin or is_dept_owner or is_dept_member):
         raise HTTPException(status_code=403, detail="Not authorized to view members of this department")

    # 3. Fetch Members (include Owner and assigned members)
    from sqlalchemy import or_
    members = db.query(User).filter(
        or_(User.department_id == department_id, User.id == dept.owner_id),
        User.is_active == True
    ).all()
    return members
