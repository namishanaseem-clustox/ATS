import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.job import Job, JobStatus
from app.models.scheduled_activity import ScheduledActivity, ActivityType
from app.models.pipeline_template import PipelineTemplate
from app.models.pipeline_stage import PipelineStage
from app.models.candidate import Candidate, JobApplication
from unittest.mock import patch, MagicMock


def make_user(role: UserRole) -> User:
    """Creates an in-memory mock user with the given role."""
    user = User()
    user.id = uuid4()
    user.email = f"{role.value}.job.test@example.com"
    user.full_name = f"Test {role.value.title()}"
    user.role = role
    user.is_active = True
    user.is_deleted = False
    user.department_id = None
    return user


def get_client(role: UserRole, override_get_db, db_session=None):
    """Helper that returns a TestClient authenticated as the specified role.
    If db_session is provided, the user is persisted to avoid FK violations."""
    if db_session:
        user = _persist_user(db_session, role)
    else:
        user = make_user(role)
    app.dependency_overrides[get_current_active_user] = lambda: user
    return TestClient(app), user


JOB_PAYLOAD = {
    "title": "Backend Engineer",
    "location": "Remote",
    "employment_type": "Full-time",
    "status": "published"
}


@pytest.fixture
def dept(db_session):
    """Creates a real Department in the test DB for jobs to belong to."""
    d = Department(name=f"Jobs-Test-Dept-{uuid4().hex[:4]}")
    db_session.add(d)
    db_session.flush()
    return d


@pytest.fixture
def existing_job(db_session, dept):
    """Creates a real Job in the test DB."""
    job = Job(
        title="Existing Job",
        location="On-site",
        employment_type="Full-time",
        department_id=dept.id,
        job_code=f"J-{uuid4().hex[:4]}",
        status=JobStatus.PUBLISHED.value
    )
    db_session.add(job)
    db_session.flush()
    return job


# ─── POST /jobs/ ─────────────────────────────────────────────────────────────

def _persist_user(db_session, role: UserRole) -> User:
    """Creates a user and actually saves them to the test DB (needed when the router uses current_user.id as an FK)."""
    from app.core.security import get_password_hash
    from uuid import uuid4
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@jobs-test.com",
        full_name=f"Test {role.value.title()}",
        hashed_password=get_password_hash("test"),
        role=role,
        is_active=True,
        is_deleted=False
    )
    db_session.add(user)
    db_session.flush()
    return user

def test_create_job_as_owner(db_session, override_get_db, dept):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        payload = {**JOB_PAYLOAD, "department_id": str(dept.id)}
        response = client.post("/jobs/", json=payload)
    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Backend Engineer"
    assert data["location"] == "Remote"


def test_create_job_as_hr(db_session, override_get_db, dept):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        payload = {**JOB_PAYLOAD, "department_id": str(dept.id), "title": "HR Coordinator"}
        response = client.post("/jobs/", json=payload)
    app.dependency_overrides.clear()
    assert response.status_code == 201


def test_create_job_as_hiring_manager(db_session, override_get_db, dept):
    user = _persist_user(db_session, UserRole.HIRING_MANAGER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        payload = {**JOB_PAYLOAD, "department_id": str(dept.id), "title": "Product Manager"}
        response = client.post("/jobs/", json=payload)
    app.dependency_overrides.clear()
    assert response.status_code == 201


def test_create_job_forbidden_for_interviewer(db_session, override_get_db, dept):
    client, _ = get_client(UserRole.INTERVIEWER, override_get_db)
    payload = {**JOB_PAYLOAD, "department_id": str(dept.id)}
    response = client.post("/jobs/", json=payload)
    assert response.status_code == 403
    app.dependency_overrides.clear()


def test_create_job_missing_title_returns_422(db_session, override_get_db, dept):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.post("/jobs/", json={"location": "Remote"})
    assert response.status_code == 422
    app.dependency_overrides.clear()


# ─── GET /jobs/ ──────────────────────────────────────────────────────────────

def test_get_jobs_as_owner(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.get("/jobs/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    titles = [j["title"] for j in response.json()]
    assert "Existing Job" in titles
    app.dependency_overrides.clear()


def test_get_jobs_interviewer_with_no_assignments_returns_empty(db_session, override_get_db):
    """Interviewers with no assigned activities should get an empty list."""
    client, _ = get_client(UserRole.INTERVIEWER, override_get_db)
    response = client.get("/jobs/")
    assert response.status_code == 200
    assert response.json() == []
    app.dependency_overrides.clear()


def test_get_jobs_filter_by_department(db_session, override_get_db, existing_job, dept):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.get(f"/jobs/?department_id={dept.id}")
    assert response.status_code == 200
    data = response.json()
    assert all(j["department_id"] == str(dept.id) for j in data)
    app.dependency_overrides.clear()


# ─── GET /jobs/{job_id} ──────────────────────────────────────────────────────

def test_get_job_by_id(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.get(f"/jobs/{existing_job.id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Existing Job"
    app.dependency_overrides.clear()


def test_get_job_not_found(db_session, override_get_db):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.get(f"/jobs/{uuid4()}")
    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_get_job_salary_redacted_for_interviewer(db_session, override_get_db, dept):
    """Interviewers should not see salary information."""
    job = Job(
        title="Confidential Pay Job",
        location="Remote",
        employment_type="Full-time",
        department_id=dept.id,
        job_code=f"J-{uuid4().hex[:4]}",
        status=JobStatus.PUBLISHED.value,
        min_salary=80000,
        max_salary=120000
    )
    db_session.add(job)
    db_session.flush()

    client, _ = get_client(UserRole.INTERVIEWER, override_get_db)
    response = client.get(f"/jobs/{job.id}")
    assert response.status_code == 200
    data = response.json()
    assert data.get("min_salary") is None
    assert data.get("max_salary") is None
    app.dependency_overrides.clear()


# ─── PUT /jobs/{job_id} ──────────────────────────────────────────────────────

def test_update_job_as_owner(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.put(f"/jobs/{existing_job.id}", json={"title": "Updated Title"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"
    app.dependency_overrides.clear()


def test_update_job_not_found(db_session, override_get_db):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.put(f"/jobs/{uuid4()}", json={"title": "Ghost"})
    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_update_job_forbidden_for_interviewer(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.INTERVIEWER, override_get_db)
    response = client.put(f"/jobs/{existing_job.id}", json={"title": "Hack"})
    assert response.status_code == 403
    app.dependency_overrides.clear()


# ─── DELETE /jobs/{job_id} ───────────────────────────────────────────────────

def test_delete_job_as_owner(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.delete(f"/jobs/{existing_job.id}")
    assert response.status_code == 200
    app.dependency_overrides.clear()


def test_delete_job_not_found(db_session, override_get_db):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.delete(f"/jobs/{uuid4()}")
    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_delete_job_forbidden_for_hiring_manager(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.HIRING_MANAGER, override_get_db)
    response = client.delete(f"/jobs/{existing_job.id}")
    assert response.status_code == 403
    app.dependency_overrides.clear()


# ─── POST /jobs/{job_id}/clone ───────────────────────────────────────────────

def test_clone_job(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.post(f"/jobs/{existing_job.id}/clone")
    assert response.status_code == 200
    data = response.json()
    # Clone should have a different ID but same title (usually with "Copy of" prefix)
    assert data["id"] != str(existing_job.id)
    app.dependency_overrides.clear()


def test_clone_job_not_found(db_session, override_get_db):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.post(f"/jobs/{uuid4()}/clone")
    assert response.status_code == 404
    app.dependency_overrides.clear()


# ─── GET /jobs/{job_id}/candidates ──────────────────────────────────────────

def test_get_job_candidates_returns_list(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.get(f"/jobs/{existing_job.id}/candidates")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    app.dependency_overrides.clear()


def test_get_job_candidates_not_found(db_session, override_get_db):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.get(f"/jobs/{uuid4()}/candidates")
    assert response.status_code == 404
    app.dependency_overrides.clear()



def test_get_jobs_as_hiring_manager_filtered(db_session, override_get_db):
    """Hiring Managers see jobs they own (assigned as recruiter or explicitly filtered)."""
    user = _persist_user(db_session, UserRole.HIRING_MANAGER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    # Create two jobs, one with this HM as recruiter
    dept = Department(name="HM Dept", owner_id=user.id) # HM sees jobs in departments they own (line 39 logic)
    db_session.add(dept)
    db_session.flush()
    
    job1 = Job(
        title="HM Owned", 
        department_id=dept.id, 
        job_code=f"J1-{uuid4().hex[:4]}", 
        status="published",
        location="Remote",
        employment_type="Full-time"
    )
    job2 = Job(
        title="Other HM", 
        department_id=dept.id, # Using same dept but owner_id check on dept should pass for both? 
        # Wait, the logic is: Department.owner_id == filter_by_owner_id
        job_code=f"J2-{uuid4().hex[:4]}", 
        status="published",
        location="Remote",
        employment_type="Full-time"
    )
    db_session.add_all([job1, job2])
    db_session.flush()
    
    with TestClient(app) as client:
        response = client.get("/jobs/")
    
    assert response.status_code == 200
    titles = [j["title"] for j in response.json()]
    assert "HM Owned" in titles
    assert "Other HM" in titles 
    app.dependency_overrides.clear()


def test_get_jobs_as_interviewer_assigned(db_session, override_get_db):
    """Interviewers see only jobs where they have assigned activities."""
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    dept = Department(name="Interviewer Dept")
    db_session.add(dept)
    db_session.flush()
    
    job_assigned = Job(
        title="Assigned Job", 
        department_id=dept.id, 
        job_code=f"J3-{uuid4().hex[:4]}", 
        status="published", 
        min_salary=50, 
        max_salary=100,
        location="Remote",
        employment_type="Full-time"
    )
    job_unassigned = Job(
        title="Hidden Job", 
        department_id=dept.id, 
        job_code=f"J4-{uuid4().hex[:4]}", 
        status="published",
        location="Remote",
        employment_type="Full-time"
    )
    db_session.add_all([job_assigned, job_unassigned])
    db_session.flush()
    
    # Create activity and assign user
    activity = ScheduledActivity(title="Interview", job_id=job_assigned.id, activity_type="Interview")
    activity.assignees.append(user)
    db_session.add(activity)
    db_session.flush()
    
    with TestClient(app) as client:
        response = client.get("/jobs/")
    
    assert response.status_code == 200
    data = response.json()
    # Filter Based on Role (line 37-65)
    assert len(data) == 1
    assert data[0]["title"] == "Assigned Job"
    assert data[0]["min_salary"] is None
    app.dependency_overrides.clear()


def test_read_jobs_by_department_endpoint(db_session, override_get_db, existing_job, dept):
    """Test the /department/{id} endpoint."""
    client, _ = get_client(UserRole.OWNER, override_get_db)
    response = client.get(f"/jobs/department/{dept.id}")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    app.dependency_overrides.clear()


def test_permanently_delete_job_value_error(db_session, override_get_db, existing_job):
    """Test permanently delete with a mock service failure if needed, or valid success."""
    client, _ = get_client(UserRole.OWNER, override_get_db, db_session=db_session)
    # Success case first (must be archived)
    existing_job.is_deleted = True
    db_session.commit()
    
    response = client.delete(f"/jobs/{existing_job.id}/permanent")
    assert response.status_code == 204
    
    # Not found case (line 136)
    response = client.delete(f"/jobs/{uuid4()}/permanent")
    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_update_pipeline_config(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    new_config = [{"id": "stage1", "name": "Phone Screen", "order": 0}]
    response = client.put(f"/jobs/{existing_job.id}/pipeline", json=new_config)
    assert response.status_code == 200
    assert response.json()["pipeline_config"][0]["name"] == "Phone Screen"
    app.dependency_overrides.clear()


def test_pipeline_sync_and_change_template(db_session, override_get_db, existing_job):
    client, user = get_client(UserRole.OWNER, override_get_db)
    
    # Setup Template and Stages
    template = PipelineTemplate(name="Standard")
    db_session.add(template)
    db_session.flush()
    stage = PipelineStage(name="Technical", order=1, pipeline_template_id=template.id)
    db_session.add(stage)
    db_session.flush()
    
    # 1. Test Sync (Job has no template yet)
    response = client.post(f"/jobs/{existing_job.id}/pipeline/sync")
    assert response.status_code == 400 # No linked template
    
    # Link template
    existing_job.pipeline_template_id = template.id
    db_session.commit()
    
    # Create Candidate and Application to test migration
    candidate = Candidate(first_name="Alice", last_name="C", email="alice@test.com")
    db_session.add(candidate)
    db_session.flush()
    application = JobApplication(candidate_id=candidate.id, job_id=existing_job.id, current_stage="old-stage")
    db_session.add(application)
    db_session.flush()
    
    # Test Sync Success
    response = client.post(f"/jobs/{existing_job.id}/pipeline/sync")
    assert response.status_code == 200
    db_session.refresh(application)
    assert application.current_stage == str(stage.id) # Fallback to first stage
    
    # 2. Test Change Template
    template2 = PipelineTemplate(name="Advanced")
    db_session.add(template2)
    db_session.flush()
    stage2 = PipelineStage(name="Technical", order=1, pipeline_template_id=template2.id) # Same name
    db_session.add(stage2)
    db_session.flush()
    
    response = client.patch(f"/jobs/{existing_job.id}/pipeline/template", json={"pipeline_template_id": str(template2.id)})
    assert response.status_code == 200
    db_session.refresh(application)
    assert application.current_stage == str(stage2.id) # Mapped by name
    
    app.dependency_overrides.clear()


def test_update_candidate_stage_hired_logic(db_session, override_get_db, existing_job):
    client, user = get_client(UserRole.OWNER, override_get_db, db_session=db_session)
    
    candidate = Candidate(first_name="Bob", last_name="H", email="bob@hire.com")
    db_session.add(candidate)
    db_session.flush()
    application = JobApplication(candidate_id=candidate.id, job_id=existing_job.id, current_stage="new")
    db_session.add(application)
    db_session.flush()
    
    # Move to Hired
    response = client.put(f"/jobs/{existing_job.id}/candidates/{candidate.id}/stage", json={"stage": "hired"})
    assert response.status_code == 200
    db_session.refresh(application)
    assert application.hired_by_user_id == user.id
    assert application.added_by_user_id == user.id 
    
    # Move away from Hired
    client.put(f"/jobs/{existing_job.id}/candidates/{candidate.id}/stage", json={"stage": "interview"})
    db_session.refresh(application)
    assert application.hired_by_user_id is None
    
    app.dependency_overrides.clear()


def test_score_and_screen_candidates(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db, db_session=db_session)
    candidate = Candidate(first_name="Charlie", last_name="S", email="charlie@score.com")
    db_session.add(candidate)
    db_session.flush()
    application = JobApplication(candidate_id=candidate.id, job_id=existing_job.id, current_stage="new")
    db_session.add(application)
    db_session.flush()
    
    # Score (Satisfy ApplicationScoreCreate schema)
    score_payload = {
        "technical_score": 5,
        "communication_score": 4,
        "culture_fit_score": 5,
        "problem_solving_score": 4,
        "leadership_score": 3,
        "recommendation": "Strong Yes"
    }
    response = client.put(f"/jobs/{existing_job.id}/candidates/{candidate.id}/score", json=score_payload)
    assert response.status_code == 200
    assert response.json()["recommendation"] == "Strong Yes"
    
    # Screen (Mock AI)
    with patch("app.routers.job.screening_service.screen_candidate") as mock_screen:
        mock_screen.return_value = application
        response = client.post(f"/jobs/{existing_job.id}/candidates/{candidate.id}/screen")
        assert response.status_code == 200
        assert mock_screen.called
    
    app.dependency_overrides.clear()


def test_read_job_candidates_interviewer_access(db_session, override_get_db, existing_job):
    """Test Interviewer access and redaction in candidate list."""
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    # Create two candidates
    c1 = Candidate(first_name="Assigned", last_name="C", email="a@c.com", current_salary="100k")
    c2 = Candidate(first_name="Unassigned", last_name="C", email="u@c.com", current_salary="200k")
    db_session.add_all([c1, c2])
    db_session.flush()
    
    a1 = JobApplication(candidate_id=c1.id, job_id=existing_job.id, current_stage="new")
    a2 = JobApplication(candidate_id=c2.id, job_id=existing_job.id, current_stage="new")
    db_session.add_all([a1, a2])
    db_session.flush()
    
    # 1. Unassigned Interviewer -> 403
    with TestClient(app) as client:
        response = client.get(f"/jobs/{existing_job.id}/candidates")
    assert response.status_code == 403
    
    # 2. Assign Interviewer to c1
    activity = ScheduledActivity(title="Interview", job_id=existing_job.id, candidate_id=c1.id, activity_type="Interview")
    activity.assignees.append(user)
    db_session.add(activity)
    db_session.flush()
    
    # 3. Assigned Interviewer -> Only c1, redacted
    with TestClient(app) as client:
        response = client.get(f"/jobs/{existing_job.id}/candidates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["candidate"]["first_name"] == "Assigned"
    assert data[0]["candidate"]["current_salary"] is None
    
    app.dependency_overrides.clear()


def test_job_pipeline_validation_errors(db_session, override_get_db, existing_job):
    client, _ = get_client(UserRole.OWNER, override_get_db)
    
    # update_candidate_stage missing stage (400)
    response = client.put(f"/jobs/{existing_job.id}/candidates/{uuid4()}/stage", json={})
    assert response.status_code == 400
    
    # change_pipeline_template missing id (400)
    response = client.patch(f"/jobs/{existing_job.id}/pipeline/template", json={})
    assert response.status_code == 400
    
    # sync_pipeline_from_template missing template in DB (404)
    t_tmp = PipelineTemplate(name="Temp")
    db_session.add(t_tmp)
    db_session.commit()
    t_id = t_tmp.id
    existing_job.pipeline_template_id = t_id
    db_session.commit()
    
    # Delete template directly via SQL to avoid ORM session issues or just delete and set null first
    existing_job.pipeline_template_id = None # Break link first if needed, but then router won't hit 171
    # Wait, I'll just use a non-existent UUID and hope FK check is deferred or I can mock
    
    with patch("app.routers.job.job_service.get_job") as mock_get:
        mock_job = MagicMock()
        mock_job.pipeline_template_id = uuid4()
        mock_get.return_value = mock_job
        response = client.post(f"/jobs/{existing_job.id}/pipeline/sync")
        assert response.status_code == 404
    
    app.dependency_overrides.clear()


def test_read_jobs_interviewer_redaction_loop(db_session, override_get_db):
    """Cover line 93-95 redaction loop in read_jobs."""
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    dept = Department(name="Redact Dept")
    db_session.add(dept)
    db_session.flush()
    job = Job(title="Redact Me", department_id=dept.id, job_code=f"R-{uuid4().hex[:4]}", status="published", min_salary=10, location="L", employment_type="F")
    db_session.add(job)
    db_session.flush()
    
    # Assign activity so job is visible
    activity = ScheduledActivity(title="Interview", job_id=job.id, activity_type="Interview")
    activity.assignees.append(user)
    db_session.add(activity)
    db_session.flush()
    
    with TestClient(app) as client:
        response = client.get("/jobs/")
    
    assert response.status_code == 200
    assert response.json()[0]["min_salary"] is None
    app.dependency_overrides.clear()
