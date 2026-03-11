import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from fastapi import UploadFile

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.candidate import Candidate
from app.models.job import Job, JobStatus
from app.models.department import Department


def _persist_user(db_session, role: UserRole) -> User:
    """Creates a user and saves them to the test DB."""
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@candidates-test.com",
        full_name=f"Test {role.value.title()}",
        hashed_password=get_password_hash("test"),
        role=role,
        is_active=True,
        is_deleted=False
    )
    db_session.add(user)
    db_session.flush()
    return user


def get_client(role: UserRole, db_session):
    """Helper that persists a user and returns a TestClient authenticated as them."""
    user = _persist_user(db_session, role)
    app.dependency_overrides[get_current_active_user] = lambda: user
    return TestClient(app), user


@pytest.fixture
def existing_candidate(db_session):
    """Creates a real Candidate in the test DB."""
    candidate = Candidate(
        first_name="Alice",
        last_name="Smith",
        email=f"alice.{uuid4().hex[:6]}@example.com",
        phone="555-1234",
        current_salary="100000",
        expected_salary="120000"
    )
    db_session.add(candidate)
    db_session.flush()
    return candidate


CANDIDATE_PAYLOAD = {
    "first_name": "Bob",
    "last_name": "Jones",
    "email": "bob.jones@example.com",
    "phone": "555-9876",
    "current_salary": "90000",
    "expected_salary": "110000",
    "source": "LinkedIn"
}


# ─── POST /candidates/ ───────────────────────────────────────────────────────

def test_create_candidate_as_hr(db_session, override_get_db):
    client, _ = get_client(UserRole.HR, db_session)
    response = client.post("/candidates/", json=CANDIDATE_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Bob"
    assert data["email"] == "bob.jones@example.com"
    app.dependency_overrides.clear()


def test_create_candidate_forbidden_for_interviewer(db_session, override_get_db):
    client, _ = get_client(UserRole.INTERVIEWER, db_session)
    response = client.post("/candidates/", json=CANDIDATE_PAYLOAD)
    assert response.status_code == 403
    app.dependency_overrides.clear()


# ─── GET /candidates/ ────────────────────────────────────────────────────────

def test_get_candidates_as_owner(db_session, override_get_db, existing_candidate):
    client, _ = get_client(UserRole.OWNER, db_session)
    response = client.get("/candidates/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    # Check that salary is visible for Owner
    alice = next(c for c in data if c["first_name"] == "Alice")
    assert alice["current_salary"] == "100000"
    app.dependency_overrides.clear()

def test_get_candidates_as_interviewer_empty(db_session, override_get_db, existing_candidate):
    """Interviewer with no assigned activities should see an empty list."""
    client, _ = get_client(UserRole.INTERVIEWER, db_session)
    response = client.get("/candidates/")
    assert response.status_code == 200
    assert response.json() == []
    app.dependency_overrides.clear()


def test_get_candidates_as_hiring_manager(db_session, override_get_db):
    """HM sees candidates they own (via Job/Department ownership) (line 25)."""
    hm_client, hm = get_client(UserRole.HIRING_MANAGER, db_session)
    
    # 1. Create a Department owned by this HM
    dept = Department(name="HM Dept", owner_id=hm.id)
    db_session.add(dept)
    db_session.flush()
    
    # 2. Create a Job in that Dept
    job = Job(
        title="HM Job", 
        department_id=dept.id, 
        status=JobStatus.PUBLISHED.value, 
        job_code=f"HM-{uuid4().hex[:6]}",
        location="Remote",
        employment_type="Full-time"
    )
    db_session.add(job)
    db_session.flush()
    
    # 3. Create a Candidate with an Application to that Job
    c1 = Candidate(first_name="Owned", last_name="ByHM", email="owned@hm.com")
    db_session.add(c1)
    db_session.flush()
    
    from app.models.candidate import JobApplication
    app_link = JobApplication(candidate_id=c1.id, job_id=job.id)
    db_session.add(app_link)
    db_session.commit()
    
    response = hm_client.get("/candidates/")
    assert response.status_code == 200
    names = [c["first_name"] for c in response.json()]
    assert "Owned" in names
    app.dependency_overrides.clear()


def test_get_candidates_as_assigned_interviewer(db_session, override_get_db, existing_candidate):
    """Interviewer should see the candidate if assigned, but salary must be redacted."""
    client, user = get_client(UserRole.INTERVIEWER, db_session)
    
    # Assign the interviewer to an activity for this candidate
    from app.models.scheduled_activity import ScheduledActivity
    activity = ScheduledActivity(
        title="Tech Interview",
        candidate_id=existing_candidate.id,
        created_by=user.id
    )
    activity.assignees.append(user)
    db_session.add(activity)
    db_session.flush()

    response = client.get("/candidates/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(existing_candidate.id)
    assert data[0].get("current_salary") is None
    assert data[0].get("expected_salary") is None
    app.dependency_overrides.clear()


# ─── GET /candidates/{candidate_id} ──────────────────────────────────────────

def test_get_candidate_by_id_as_owner(db_session, override_get_db, existing_candidate):
    client, _ = get_client(UserRole.OWNER, db_session)
    response = client.get(f"/candidates/{existing_candidate.id}")
    assert response.status_code == 200
    assert response.json()["first_name"] == "Alice"
    app.dependency_overrides.clear()


def test_get_candidate_by_id_as_assigned_interviewer(db_session, override_get_db, existing_candidate):
    """Assigned interviewer can see candidate with redacted salary (lines 148-149)."""
    client, user = get_client(UserRole.INTERVIEWER, db_session)
    
    from app.models.scheduled_activity import ScheduledActivity
    activity = ScheduledActivity(candidate_id=existing_candidate.id, title="Test", created_by=user.id)
    activity.assignees.append(user)
    db_session.add(activity)
    db_session.commit()
    
    response = client.get(f"/candidates/{existing_candidate.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["current_salary"] is None
    assert data["expected_salary"] is None
    app.dependency_overrides.clear()


def test_get_candidate_by_id_as_assigned_interviewer(db_session, override_get_db, existing_candidate):
    """Assigned interviewer can see candidate with redacted salary (lines 148-149)."""
    client, user = get_client(UserRole.INTERVIEWER, db_session)
    
    from app.models.scheduled_activity import ScheduledActivity
    activity = ScheduledActivity(candidate_id=existing_candidate.id, title="Test")
    activity.assignees.append(user)
    db_session.add(activity)
    db_session.commit()
    
    response = client.get(f"/candidates/{existing_candidate.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["current_salary"] is None
    assert data["expected_salary"] is None
    app.dependency_overrides.clear()


# ─── PUT /candidates/{candidate_id} ──────────────────────────────────────────

def test_update_candidate_as_hr(db_session, override_get_db, existing_candidate):
    client, _ = get_client(UserRole.HR, db_session)
    response = client.put(f"/candidates/{existing_candidate.id}", json={"first_name": "Alicia"})
    assert response.status_code == 200
    assert response.json()["first_name"] == "Alicia"
    app.dependency_overrides.clear()


def test_update_candidate_forbidden_for_interviewer(db_session, override_get_db, existing_candidate):
    client, _ = get_client(UserRole.INTERVIEWER, db_session)
    response = client.put(f"/candidates/{existing_candidate.id}", json={"first_name": "Hacked"})
    assert response.status_code == 403
    app.dependency_overrides.clear()


# ─── DELETE /candidates/{candidate_id} ───────────────────────────────────────

def test_delete_candidate_as_owner(db_session, override_get_db, existing_candidate):
    client, _ = get_client(UserRole.OWNER, db_session)
    response = client.delete(f"/candidates/{existing_candidate.id}")
    assert response.status_code == 200
    
    # Confirm it's gone
    follow_up = client.get(f"/candidates/{existing_candidate.id}")
    assert follow_up.status_code == 404
    app.dependency_overrides.clear()


def test_delete_candidate_forbidden_for_hiring_manager(db_session, override_get_db, existing_candidate):
    client, _ = get_client(UserRole.HIRING_MANAGER, db_session)
    response = client.delete(f"/candidates/{existing_candidate.id}")
    assert response.status_code == 403
    app.dependency_overrides.clear()


# ─── POST /candidates/upload ─────────────────────────────────────────────────

def test_upload_resume(mocker, db_session, override_get_db):
    client, _ = get_client(UserRole.HR, db_session)
    
    # Mock the parser service entirely so we don't need real PDFs or OpenAI keys
    mock_extract = mocker.patch("app.routers.candidate.parser_service.extract_text_from_pdf", return_value="Dummy resume text")
    
    # Mock the LLM parsing to return a dummy parsed model 
    # The router expects a pydantic model with model_dump_json() and other fields. 
    # We will mock candidate_service.upload_resume directly, which is simpler and more robust for an API test.
    
    mocker.patch("app.routers.candidate.candidate_service.upload_resume", return_value={"id": str(uuid4()), "first_name": "Parsed", "last_name": "Resume"})
    
    # Send a dummy file
    files = {"file": ("test_resume.pdf", b"%PDF-1.4 dummy content", "application/pdf")}
    data = {"job_id": str(uuid4())}
    
    response = client.post("/candidates/upload", files=files, data=data)
    assert response.json()["first_name"] == "Parsed"
    app.dependency_overrides.clear()


def test_upload_resume_docx_and_fail_parsing(mocker, db_session, override_get_db):
    """Cover lines 191, 202."""
    client, _ = get_client(UserRole.HR, db_session)
    
    mocker.patch("app.routers.candidate.parser_service.extract_text_from_docx", return_value="Docx text")
    mocker.patch("app.routers.candidate.parser_service.parse_with_llm", return_value=None) # Fail parsing
    mocker.patch("app.routers.candidate.candidate_service.upload_resume", return_value={"id": str(uuid4())})
    
    files = {"file": ("test.docx", b"dummy docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    response = client.post("/candidates/upload", files=files)
    assert response.status_code == 200
    app.dependency_overrides.clear()


def test_candidate_not_found_errors(db_session, override_get_db, existing_candidate):
    """Cover lines 157, 164, 171."""
    client, _ = get_client(UserRole.OWNER, db_session)
    
    # 1. Update Not Found
    response = client.put(f"/candidates/{uuid4()}", json={"first_name": "X"})
    assert response.status_code == 404
    
    # 2. Delete Not Found
    response = client.delete(f"/candidates/{uuid4()}")
    assert response.status_code == 404
    
    # 3. Remove Job Application Not Found
    response = client.delete(f"/candidates/{existing_candidate.id}/jobs/{uuid4()}")
    assert response.status_code == 404
    
    app.dependency_overrides.clear()

