import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.job import Job, JobStatus


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


def get_client(role: UserRole, override_get_db):
    """Helper that returns a TestClient authenticated as the specified role."""
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


def test_unauthenticated_request_returns_401():
    """Without auth override, the real JWT dependency should return 401."""
    app.dependency_overrides.clear()
    with TestClient(app) as c:
        response = c.get("/jobs/")
    assert response.status_code == 401
