import pytest
from app.services.job_service import job_service
from app.schemas.job import JobCreate, JobUpdate
from app.models.job import Job, JobStatus
from app.models.department import Department

def setup_department(db_session):
    dept = Department(name="Recruiting")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    return dept

def test_create_job(db_session):
    dept = setup_department(db_session)
    job_data = JobCreate(
        title="Software Engineer",
        department_id=dept.id,
        location="Remote",
        employment_type="Full-time",
        experience_range="3-5 years"
    )
    
    # Needs to handle _generate_job_code, pipeline config implicitly
    job = job_service.create_job(db_session, job_data)
    
    assert job.id is not None
    assert job.title == "Software Engineer"
    assert job.department_id == dept.id
    assert job.status == JobStatus.DRAFT.value
    assert job.job_code.startswith("JOB-") 

def test_get_job(db_session):
    dept = setup_department(db_session)
    job_data = JobCreate(title="Test Job", department_id=dept.id, location="HQ", employment_type="Full")
    job = job_service.create_job(db_session, job_data)
    
    fetched_job = job_service.get_job(db_session, job.id)
    assert fetched_job is not None
    assert fetched_job.id == job.id
    assert fetched_job.title == "Test Job"

def test_delete_job(db_session):
    dept = setup_department(db_session)
    job_data = JobCreate(title="To Be Deleted", department_id=dept.id, location="HQ", employment_type="Full")
    job = job_service.create_job(db_session, job_data)
    
    job_service.delete_job(db_session, job.id)
    
    # Should not be found without include_deleted=True
    not_found = job_service.get_job(db_session, job.id)
    assert not_found is None
    
    # Should exist as archived
    found = job_service.get_job(db_session, job.id, include_deleted=True)
    assert found is not None
    assert found.is_deleted is True
    assert found.status == JobStatus.ARCHIVED.value

def test_get_jobs(db_session):
    dept = setup_department(db_session)
    job_service.create_job(db_session, JobCreate(title="Job 1", department_id=dept.id, location="HQ", employment_type="Full"))
    job_service.create_job(db_session, JobCreate(title="Job 2", department_id=dept.id, location="Remote", employment_type="Full"))
    
    jobs = job_service.get_jobs(db_session)
    assert len(jobs) >= 2
    titles = [j.title for j in jobs]
    assert "Job 1" in titles
    assert "Job 2" in titles

def test_get_jobs_by_ids(db_session):
    dept = setup_department(db_session)
    job1 = job_service.create_job(db_session, JobCreate(title="ID Job 1", department_id=dept.id, location="HQ", employment_type="Full"))
    job2 = job_service.create_job(db_session, JobCreate(title="ID Job 2", department_id=dept.id, location="HQ", employment_type="Full"))
    
    jobs = job_service.get_jobs_by_ids(db_session, [job1.id, job2.id])
    assert len(jobs) == 2
    assert jobs[0].id in [job1.id, job2.id]

def test_get_jobs_by_department(db_session):
    dept1 = setup_department(db_session)
    dept2 = Department(name="Sales")
    db_session.add(dept2)
    db_session.commit()
    db_session.refresh(dept2)
    
    job_service.create_job(db_session, JobCreate(title="Dept1 Job", department_id=dept1.id, location="HQ", employment_type="Full"))
    job_service.create_job(db_session, JobCreate(title="Dept2 Job", department_id=dept2.id, location="HQ", employment_type="Full"))
    
    dept1_jobs = job_service.get_jobs_by_department(db_session, dept1.id)
    assert len(dept1_jobs) == 1
    assert dept1_jobs[0].title == "Dept1 Job"

def test_update_job(db_session):
    dept = setup_department(db_session)
    job = job_service.create_job(db_session, JobCreate(title="Old Title", department_id=dept.id, location="HQ", employment_type="Full"))
    
    update_data = JobUpdate(title="New Title", location="Remote")
    updated_job = job_service.update_job(db_session, job.id, update_data)
    
    assert updated_job is not None
    assert updated_job.title == "New Title"
    assert updated_job.location == "Remote"

def test_clone_job(db_session):
    dept = setup_department(db_session)
    job = job_service.create_job(db_session, JobCreate(title="Original Job", department_id=dept.id, location="HQ", employment_type="Full", headcount=5))
    
    cloned_job = job_service.clone_job(db_session, job.id)
    
    assert cloned_job is not None
    assert cloned_job.id != job.id
    assert cloned_job.title == "Copy of Original Job"
    assert cloned_job.headcount == 5
    assert cloned_job.department_id == dept.id

def test_update_pipeline_config(db_session):
    dept = setup_department(db_session)
    job = job_service.create_job(db_session, JobCreate(title="Pipeline Job", department_id=dept.id, location="HQ", employment_type="Full"))
    
    new_config = [{"id": "stage1", "name": "Interview", "type": "standard", "color": "#000000"}]
    updated_job = job_service.update_pipeline_config(db_session, job.id, new_config)
    
    assert updated_job is not None
    assert len(updated_job.pipeline_config) == 1
    assert updated_job.pipeline_config[0]["name"] == "Interview"

def test_permanently_delete_job(db_session):
    dept = setup_department(db_session)
    job = job_service.create_job(db_session, JobCreate(title="Perm Delete Job", department_id=dept.id, location="HQ", employment_type="Full"))
    
    # Must archive first
    job_service.delete_job(db_session, job.id)
    
    # Now permanently delete
    result = job_service.permanently_delete_job(db_session, job.id)
    assert result is True
    
    # Verify it is completely gone
    not_found = job_service.get_job(db_session, job.id, include_deleted=True)
    assert not_found is None

