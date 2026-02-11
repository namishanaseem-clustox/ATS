from sqlalchemy.orm import Session
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from uuid import UUID
from datetime import datetime

from app.models.job import Job, JobStatus
from sqlalchemy import func

class DepartmentService:
    def get_department(self, db: Session, department_id: UUID):
        dept = db.query(Department).filter(Department.id == department_id, Department.is_deleted == False).first()
        if dept:
            dept.active_jobs_count = db.query(Job).filter(
                Job.department_id == dept.id,
                Job.status == JobStatus.PUBLISHED.value,
                Job.is_deleted == False
            ).count()
            dept.total_jobs_count = db.query(Job).filter(
                Job.department_id == dept.id,
                Job.is_deleted == False
            ).count()
            # Mock member count for now or implement similarly if User model exists
            dept.total_members_count = 0 
        return dept

    def get_departments(self, db: Session, skip: int = 0, limit: int = 100):
        departments = db.query(Department).filter(Department.is_deleted == False).offset(skip).limit(limit).all()
        for dept in departments:
             dept.active_jobs_count = db.query(Job).filter(
                Job.department_id == dept.id,
                Job.status == JobStatus.PUBLISHED.value,
                Job.is_deleted == False
            ).count()
             dept.total_jobs_count = db.query(Job).filter(
                Job.department_id == dept.id,
                Job.is_deleted == False
            ).count()
             dept.total_members_count = 0
        return departments

    def create_department(self, db: Session, department: DepartmentCreate):
        db_department = Department(**department.dict())
        db.add(db_department)
        db.commit()
        db.refresh(db_department)
        return db_department

    def update_department(self, db: Session, department_id: UUID, department: DepartmentUpdate):
        db_department = self.get_department(db, department_id)
        if not db_department:
            return None
        
        update_data = department.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_department, key, value)
            
        db.add(db_department)
        db.commit()
        db.refresh(db_department)
        return db_department

    def delete_department(self, db: Session, department_id: UUID):
        # Soft delete
        db_department = self.get_department(db, department_id)
        if not db_department:
            return None
            
        db_department.is_deleted = True
        db.add(db_department)
        db.commit()
        return db_department

department_service = DepartmentService()
