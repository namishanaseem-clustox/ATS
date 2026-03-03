import pytest
import os
import shutil
from uuid import uuid4
from fastapi import UploadFile
from unittest.mock import MagicMock
from app.services.candidate_service import candidate_service, UPLOAD_DIR
from app.schemas.candidate import CandidateCreate, CandidateUpdate
from app.models.candidate import Candidate, JobApplication
from app.models.job import Job, JobStatus
from app.models.department import Department

def setup_job(db_session):
    dept = Department(name="HR")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    job = Job(
        title="Test HR Manager",
        department_id=dept.id,
        location="HQ",
        employment_type="Full-time",
        job_code=f"JOB-{uuid4().hex[:4]}",
        status=JobStatus.PUBLISHED.value,
        pipeline_config=[
            {"id": "new", "name": "New", "type": "standard"},
            {"id": "interview", "name": "Interview", "type": "standard"}
        ]
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job

def test_create_candidate(db_session):
    job = setup_job(db_session)
    candidate_data = CandidateCreate(
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        experience_years=5.0,
        job_id=job.id
    )
    
    candidate = candidate_service.create_candidate(db_session, candidate_data)
    
    assert candidate.id is not None
    assert candidate.first_name == "John"
    assert candidate.email == "john.doe@example.com"
    
    # Check if application was created automatically
    apps = db_session.query(JobApplication).filter(JobApplication.candidate_id == candidate.id).all()
    assert len(apps) == 1
    assert apps[0].job_id == job.id
    assert apps[0].current_stage == "new" # Fallback or first stage

def test_get_candidate(db_session):
    job = setup_job(db_session)
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="Jane", last_name="Smith", email="jane@example.com", experience_years=2.0))
    
    fetched = candidate_service.get_candidate(db_session, cand.id)
    assert fetched is not None
    assert fetched.id == cand.id
    assert fetched.first_name == "Jane"

def test_get_candidates(db_session):
    cand1 = candidate_service.create_candidate(db_session, CandidateCreate(first_name="C1", last_name="L1", email="c1@example.com", experience_years=1.0))
    cand2 = candidate_service.create_candidate(db_session, CandidateCreate(first_name="C2", last_name="L2", email="c2@example.com", experience_years=2.0))
    
    candidates = candidate_service.get_candidates(db_session)
    assert len(candidates) >= 2
    emails = [c.email for c in candidates]
    assert "c1@example.com" in emails
    assert "c2@example.com" in emails

def test_update_candidate(db_session):
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="Update", last_name="Me", email="upd@example.com", experience_years=1.0))
    
    update_data = CandidateUpdate(first_name="Updated", experience_years=2.5)
    updated = candidate_service.update_candidate(db_session, cand.id, update_data)
    
    assert updated.first_name == "Updated"
    assert updated.experience_years == 2.5
    assert updated.email == "upd@example.com" # unchanged

def test_delete_candidate(db_session):
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="Delete", last_name="Me", email="del@example.com", experience_years=1.0))
    
    candidate_service.delete_candidate(db_session, cand.id)
    
    fetched = candidate_service.get_candidate(db_session, cand.id)
    assert fetched is None

def test_get_candidate_by_email(db_session):
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="Email", last_name="Test", email="exact@example.com", experience_years=1.0))
    
    fetched = candidate_service.get_candidate_by_email(db_session, "exact@example.com")
    assert fetched is not None
    assert fetched.id == cand.id

def test_upload_resume_stub_creation(db_session, tmpdir):
    # Mock UploadFile
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test_resume.pdf"
    
    # Create a dummy file contents
    test_content = b"PDF content"
    dummy_path = tmpdir.join("test_resume.pdf")
    dummy_path.write_binary(test_content)
    
    with open(dummy_path, "rb") as f:
        mock_file.file = f
        
        # Test creating stub (no parsed data)
        candidate = candidate_service.upload_resume(db_session, mock_file)
        
        assert candidate.id is not None
        assert candidate.first_name == "Parsed"
        assert candidate.email.startswith("parsed_")
        assert candidate.resume_file_path == f"{UPLOAD_DIR}/test_resume.pdf"
        
        # Cleanup
        if os.path.exists(candidate.resume_file_path):
            os.remove(candidate.resume_file_path)

def test_upload_resume_with_parsed_data(db_session, tmpdir):
    job = setup_job(db_session)
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "parsed_resume.pdf"
    
    dummy_path = tmpdir.join("parsed_resume.pdf")
    dummy_path.write_binary(b"PDF content")
    
    with open(dummy_path, "rb") as f:
        mock_file.file = f
        parsed_data = CandidateCreate(first_name="Parsed", last_name="Guy", email="parsed.guy@example.com", experience_years=3.0)
        
        candidate = candidate_service.upload_resume(db_session, mock_file, job_id=job.id, parsed_data=parsed_data)
        
        assert candidate.id is not None
        assert candidate.first_name == "Parsed"
        assert candidate.email == "parsed.guy@example.com"
        
        apps = db_session.query(JobApplication).filter(JobApplication.candidate_id == candidate.id).all()
        assert len(apps) == 1
        assert apps[0].job_id == job.id
        
        if os.path.exists(candidate.resume_file_path):
            os.remove(candidate.resume_file_path)

def test_get_candidates_by_ids(db_session):
    cand1 = candidate_service.create_candidate(db_session, CandidateCreate(first_name="ID1", last_name="L1", email="id1@ex.com", experience_years=1.0))
    cand2 = candidate_service.create_candidate(db_session, CandidateCreate(first_name="ID2", last_name="L2", email="id2@ex.com", experience_years=1.0))
    
    results = candidate_service.get_candidates_by_ids(db_session, [cand1.id, cand2.id])
    assert len(results) == 2

def test_get_candidates_by_job(db_session):
    job = setup_job(db_session)
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="JobCand", last_name="Last", email="jobcand@ex.com", experience_years=1.0, job_id=job.id))
    
    apps = candidate_service.get_candidates_by_job(db_session, job.id)
    assert len(apps) == 1
    assert apps[0].candidate_id == cand.id
    assert apps[0].candidate.first_name == "JobCand"

def test_update_application_stage(db_session):
    job = setup_job(db_session)
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="Stage", last_name="Test", email="stage@ex.com", experience_years=1.0, job_id=job.id))
    
    app = candidate_service.update_application_stage(db_session, job.id, cand.id, "interview")
    assert app is not None
    assert app.current_stage == "interview"

def test_update_application_score(db_session):
    job = setup_job(db_session)
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="Score", last_name="Test", email="score@ex.com", experience_years=1.0, job_id=job.id))
    
    scores = {
        "technical_score": 8,
        "communication_score": 7,
        "recommendation": "Hire"
    }
    app = candidate_service.update_application_score(db_session, job.id, cand.id, scores)
    
    assert app.overall_score > 0
    assert app.score_details["technical_score"] == 8
    assert app.recommendation == "Hire"

def test_remove_job_application(db_session):
    job = setup_job(db_session)
    cand = candidate_service.create_candidate(db_session, CandidateCreate(first_name="Unlink", last_name="Me", email="unlink@ex.com", experience_years=1.0, job_id=job.id))
    
    result = candidate_service.remove_job_application(db_session, cand.id, job.id)
    assert result is True
    
    apps = candidate_service.get_candidates_by_job(db_session, job.id)
    assert len(apps) == 0
