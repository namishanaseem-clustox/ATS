from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services.department import department_service

router = APIRouter(
    prefix="/departments",
    tags=["departments"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=DepartmentResponse)
def create_department(department: DepartmentCreate, db: Session = Depends(get_db)):
    return department_service.create_department(db=db, department=department)

@router.get("/", response_model=List[DepartmentResponse])
def read_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    departments = department_service.get_departments(db, skip=skip, limit=limit)
    return departments

@router.get("/{department_id}", response_model=DepartmentResponse)
def read_department(department_id: UUID, db: Session = Depends(get_db)):
    db_department = department_service.get_department(db, department_id=department_id)
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_department

@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(department_id: UUID, department: DepartmentUpdate, db: Session = Depends(get_db)):
    db_department = department_service.update_department(db, department_id=department_id, department=department)
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_department

@router.delete("/{department_id}", response_model=DepartmentResponse)
def delete_department(department_id: UUID, db: Session = Depends(get_db)):
    db_department = department_service.delete_department(db, department_id=department_id)
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return db_department
