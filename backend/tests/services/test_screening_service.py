import pytest
import os
import json
from uuid import uuid4
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.services.screening_service import screening_service
from app.models.job import Job, JobStatus
from app.models.department import Department
from app.models.candidate import Candidate, JobApplication


def setup_data(db_session):
    """Set up test data using raw ORM inserts + flush (no commit) to stay within the test transaction."""
    dept = Department(name=f"Engineering-{uuid4().hex[:4]}")
    db_session.add(dept)
    db_session.flush()

    job = Job(
        title="Senior Python Developer",
        department_id=dept.id,
        location="Remote",
        employment_type="Full-time",
        skills=["Python", "FastAPI", "SQLAlchemy"],
        description="Looking for a senior developer.",
        status=JobStatus.PUBLISHED.value,
        job_code=f"JOB-{uuid4().hex[:4]}"
    )
    db_session.add(job)
    db_session.flush()

    candidate = Candidate(
        first_name="Alice",
        last_name="Smith",
        email=f"alice.{uuid4().hex[:4]}@example.com",
        experience_years=6.0,
        skills=["Python", "Django", "FastAPI"]
    )
    db_session.add(candidate)
    db_session.flush()

    application = JobApplication(
        job_id=job.id,
        candidate_id=candidate.id,
        current_stage="new"
    )
    db_session.add(application)
    db_session.flush()

    return job, candidate, application


def test_screen_candidate_success(db_session, mocker, tmpdir):
    job, candidate, application = setup_data(db_session)

    # Create a dummy resume file
    dummy_pdf_path = tmpdir.join("resume.pdf")
    dummy_pdf_path.write_binary(b"Dummy PDF Content")
    candidate.resume_file_path = str(dummy_pdf_path)

    # Mock the PDF parser so we don't try to actually parse the fake file
    mocker.patch(
        "app.services.screening_service.parser_service.extract_text_from_pdf",
        return_value="Alice has 6 years of Python experience."
    )

    # Mock the OpenAI client response
    expected_analysis = {
        "match_score": 85,
        "key_strengths": ["Python", "FastAPI experience"],
        "missing_skills": ["SQLAlchemy"],
        "reasoning": "Strong match but missing specific ORM experience."
    }
    mock_response = MagicMock()
    mock_response.choices[0].message.content = json.dumps(expected_analysis)

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    screening_service.client = mock_client

    # Execute
    result_app = screening_service.screen_candidate(
        db_session, str(job.id), str(candidate.id)
    )

    # Assert scores were saved
    assert result_app is not None
    assert result_app.ai_score == 85
    assert result_app.ai_analysis["match_score"] == 85
    assert "SQLAlchemy" in result_app.ai_analysis["missing_skills"]

    # Verify OpenAI was called with the correct job/candidate content
    mock_client.chat.completions.create.assert_called_once()
    call_args = mock_client.chat.completions.create.call_args[1]
    assert call_args["model"] == "gpt-4o-mini"
    assert "Alice Smith" in call_args["messages"][1]["content"]
    assert "Senior Python Developer" in call_args["messages"][1]["content"]


def test_screen_candidate_no_resume(db_session, mocker):
    """Screening should still work even if there's no resume file."""
    job, candidate, application = setup_data(db_session)
    candidate.resume_file_path = None  # No resume

    expected_analysis = {
        "match_score": 60,
        "key_strengths": ["Python"],
        "missing_skills": ["FastAPI"],
        "reasoning": "Some relevant experience."
    }
    mock_response = MagicMock()
    mock_response.choices[0].message.content = json.dumps(expected_analysis)
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    screening_service.client = mock_client

    result_app = screening_service.screen_candidate(
        db_session, str(job.id), str(candidate.id)
    )
    assert result_app.ai_score == 60


def test_screen_candidate_not_found(db_session):
    """Should raise 404 when job/candidate/application doesn't exist."""
    screening_service.client = MagicMock()  # Ensure client exists

    with pytest.raises(HTTPException) as exc_info:
        screening_service.screen_candidate(
            db_session,
            "00000000-0000-0000-0000-000000000000",
            "00000000-0000-0000-0000-000000000000"
        )

    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail.lower()


def test_screen_candidate_no_api_key(db_session):
    """Should raise 500 when OpenAI client is not configured."""
    job, candidate, application = setup_data(db_session)
    screening_service.client = None  # Simulate missing key

    with pytest.raises(HTTPException) as exc_info:
        screening_service.screen_candidate(
            db_session, str(job.id), str(candidate.id)
        )

    assert exc_info.value.status_code == 500
    assert "not configured" in exc_info.value.detail.lower()


def test_screen_candidate_api_error(db_session):
    """Should raise 500 when OpenAI throws an exception."""
    job, candidate, application = setup_data(db_session)

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("OpenAI outage")
    screening_service.client = mock_client

    with pytest.raises(HTTPException) as exc_info:
        screening_service.screen_candidate(
            db_session, str(job.id), str(candidate.id)
        )

    assert exc_info.value.status_code == 500
    assert "screening failed" in exc_info.value.detail.lower()
