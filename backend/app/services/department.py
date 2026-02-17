from sqlalchemy.orm import Session
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from uuid import UUID
from datetime import datetime

from app.models.job import Job, JobStatus
from sqlalchemy import func

from app.models.user import User

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
            
            # Calculate actual member count
            from sqlalchemy import or_
            dept.total_members_count = db.query(User).filter(
                or_(User.department_id == dept.id, User.id == dept.owner_id),
                User.is_active == True
            ).count()
        return dept

    def get_departments_query(self, db: Session):
        return db.query(Department).filter(Department.is_deleted == False)

    def get_departments(self, db: Session, skip: int = 0, limit: int = 100, filter_by_owner_id: UUID = None, filter_by_member_id: UUID = None):
        query = self.get_departments_query(db)
        
        if filter_by_owner_id and filter_by_member_id:
             from sqlalchemy import or_
             query = query.filter(or_(Department.owner_id == filter_by_owner_id, Department.id == filter_by_member_id))
        elif filter_by_owner_id:
             query = query.filter(Department.owner_id == filter_by_owner_id)
        elif filter_by_member_id:
             query = query.filter(Department.id == filter_by_member_id)

        departments_db = query.offset(skip).limit(limit).all()
        
        results = []
        # Populate counts and convert to Pydantic
        for dept in departments_db:
             active_jobs_count = db.query(Job).filter(
                Job.department_id == dept.id,
                Job.status == JobStatus.PUBLISHED.value,
                Job.is_deleted == False
            ).count()
             total_jobs_count = db.query(Job).filter(
                Job.department_id == dept.id,
                Job.is_deleted == False
            ).count()
             
             # Calculate actual member count
             # Include members (department_id match) AND Owner (owner_id match)
             from sqlalchemy import or_
             member_count = db.query(User).filter(
                or_(User.department_id == dept.id, User.id == dept.owner_id),
                User.is_active == True
            ).count()
             
             
             # Create Pydantic model explicitly
             dept_out = DepartmentResponse.from_orm(dept)
             
             # Force set the computed values
             # Pydantic models are immutable by default in v2 but mutable in v1/compat unless configured otherwise
             # DepartmentResponse inherits from Department which inherits DepartmentInDBBase -> DepartmentBase -> BaseModel
             # If mutation fails, we can use copy(update={...})
             
             # dept_out.total_members_count = member_count 
             # Let's use copy() to be safe and cleaner
             dept_out = dept_out.copy(update={
                 "total_members_count": member_count,
                 "active_jobs_count": active_jobs_count,
                 "total_jobs_count": total_jobs_count
             })
             
             results.append(dept_out)
             
        return results

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
