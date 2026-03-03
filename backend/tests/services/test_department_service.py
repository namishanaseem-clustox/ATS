import pytest
from app.services.department import department_service
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.models.department import Department

def test_create_department(db_session):
    # Prepare test data
    dept_data = DepartmentCreate(
        name="Engineering",
        location="Remote",
        description="Software development department"
    )
    
    # Execute the service function
    created_dept = department_service.create_department(db_session, dept_data)
    
    # Verify the object returned
    assert created_dept.id is not None
    assert created_dept.name == "Engineering"
    assert created_dept.location == "Remote"
    assert created_dept.description == "Software development department"
    assert created_dept.status == "Active"
    assert created_dept.is_deleted is False
    
    # Verify the object was actually persisted in the database
    persisted_dept = db_session.query(Department).filter(Department.id == created_dept.id).first()
    assert persisted_dept is not None
    assert persisted_dept.name == "Engineering"

def test_get_departments(db_session):
    # Setup: Create some departments directly in DB
    dept1 = Department(name="HR", location="HQ")
    dept2 = Department(name="Marketing", is_deleted=False)
    # This one shouldn't be returned
    dept3 = Department(name="Deleted Dept", is_deleted=True) 
    
    db_session.add(dept1)
    db_session.add(dept2)
    db_session.add(dept3)
    db_session.commit()
    
    # Execute
    departments = department_service.get_departments(db_session, skip=0, limit=100)
    
    # Verify
    # Extract names for easier assertion
    returned_names = [d.name for d in departments]
    
    assert "HR" in returned_names
    assert "Marketing" in returned_names
    assert "Deleted Dept" not in returned_names
    
    # For HR, active_jobs_count should be computed to 0 since no jobs exist
    hr_dept_resp = next(d for d in departments if d.name == "HR")
    assert hr_dept_resp.active_jobs_count == 0
    assert hr_dept_resp.total_members_count == 0

def test_get_department(db_session):
    dept = Department(name="Sales", location="NY")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    found_dept = department_service.get_department(db_session, dept.id)
    assert found_dept is not None
    assert found_dept.id == dept.id
    assert found_dept.name == "Sales"
    
    # Verify deleted dept is not found
    dept.is_deleted = True
    db_session.commit()
    
    not_found_dept = department_service.get_department(db_session, dept.id)
    assert not_found_dept is None

def test_get_departments_query(db_session):
    dept1 = Department(name="Operations", is_deleted=False)
    dept2 = Department(name="Deleted Ops", is_deleted=True)
    db_session.add(dept1)
    db_session.add(dept2)
    db_session.commit()
    
    query = department_service.get_departments_query(db_session)
    result = query.all()
    
    names = [d.name for d in result]
    assert "Operations" in names
    assert "Deleted Ops" not in names

def test_update_department(db_session):
    dept = Department(name="Legal", location="London")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    update_data = DepartmentUpdate(name="Legal & Compliance", location="Paris")
    updated_dept = department_service.update_department(db_session, dept.id, update_data)
    
    assert updated_dept is not None
    assert updated_dept.name == "Legal & Compliance"
    assert updated_dept.location == "Paris"
    
    db_dept = db_session.query(Department).filter(Department.id == dept.id).first()
    assert db_dept.name == "Legal & Compliance"
    assert db_dept.location == "Paris"

def test_delete_department(db_session):
    dept = Department(name="Finance")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    assert dept.is_deleted is False
    
    deleted_dept = department_service.delete_department(db_session, dept.id)
    assert deleted_dept is not None
    assert deleted_dept.is_deleted is True
    
    db_dept = db_session.query(Department).filter(Department.id == dept.id).first()
    assert db_dept.is_deleted is True
