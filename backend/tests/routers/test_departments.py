import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.department import Department


def make_user(role: UserRole) -> User:
    """Creates an in-memory mock user with the specified role (not persisted)."""
    user = User()
    user.id = uuid4()
    user.email = f"{role.value}@test.com"
    user.full_name = f"Test {role.value.title()}"
    user.role = role
    user.is_active = True
    user.is_deleted = False
    user.department_id = None
    return user


@pytest.fixture
def client(db_session, override_get_db):
    """
    Returns a TestClient with:
    - the real DB session replaced by the test transaction session
    - auth dependency set to an Owner user by default
    """
    owner = make_user(UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: owner
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def client_as(db_session, override_get_db):
    """
    Factory fixture: returns a function you call with a UserRole to get a TestClient
    authenticated as that role.
    """
    def _make_client(role: UserRole):
        user = make_user(role)
        app.dependency_overrides[get_current_active_user] = lambda: user
        return TestClient(app)
    yield _make_client
    app.dependency_overrides.clear()


# ─── POST /departments/ ──────────────────────────────────────────────────────

def test_create_department_as_owner(client, db_session):
    response = client.post("/departments/", json={"name": "Engineering"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Engineering"
    assert "id" in data


def test_create_department_as_hr(db_session, override_get_db):
    hr = make_user(UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: hr
    with TestClient(app) as c:
        response = c.post("/departments/", json={"name": "Marketing"})
    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["name"] == "Marketing"


def test_create_department_forbidden_for_interviewer(db_session, override_get_db):
    interviewer = make_user(UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as c:
        response = c.post("/departments/", json={"name": "Design"})
    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_create_department_validation_error(client):
    """Missing required 'name' field should return 422."""
    response = client.post("/departments/", json={})
    assert response.status_code == 422


# ─── GET /departments/ ──────────────────────────────────────────────────────

def test_get_departments_returns_list(client, db_session):
    # Create a couple of departments first
    dept1 = Department(name="HR-API-Test")
    dept2 = Department(name="Finance-API-Test")
    db_session.add_all([dept1, dept2])
    db_session.flush()

    response = client.get("/departments/")
    assert response.status_code == 200
    names = [d["name"] for d in response.json()]
    assert "HR-API-Test" in names
    assert "Finance-API-Test" in names


def test_get_departments_interviewer_without_dept_returns_empty(db_session, override_get_db):
    """An Interviewer with no department assigned should receive an empty list."""
    interviewer = make_user(UserRole.INTERVIEWER)
    interviewer.department_id = None
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as c:
        response = c.get("/departments/")
    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == []


# ─── GET /departments/{department_id} ──────────────────────────────────────

def test_get_department_by_id(client, db_session):
    dept = Department(name="Ops-API-Test")
    db_session.add(dept)
    db_session.flush()

    response = client.get(f"/departments/{dept.id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Ops-API-Test"


def test_get_department_not_found(client):
    response = client.get(f"/departments/{uuid4()}")
    assert response.status_code == 404


# ─── PUT /departments/{department_id} ──────────────────────────────────────

def test_update_department(client, db_session):
    dept = Department(name="Old Name")
    db_session.add(dept)
    db_session.flush()

    response = client.put(f"/departments/{dept.id}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


def test_update_department_not_found(client):
    response = client.put(f"/departments/{uuid4()}", json={"name": "Ghost"})
    assert response.status_code == 404


def test_update_department_forbidden_for_hiring_manager(db_session, override_get_db):
    dept = Department(name="Cannot Update")
    db_session.add(dept)
    db_session.flush()

    hm = make_user(UserRole.HIRING_MANAGER)
    app.dependency_overrides[get_current_active_user] = lambda: hm
    with TestClient(app) as c:
        response = c.put(f"/departments/{dept.id}", json={"name": "Attempt"})
    app.dependency_overrides.clear()
    assert response.status_code == 403


# ─── DELETE /departments/{department_id} ───────────────────────────────────

def test_delete_department(client, db_session):
    dept = Department(name="To Delete")
    db_session.add(dept)
    db_session.flush()

    response = client.delete(f"/departments/{dept.id}")
    assert response.status_code == 200
    assert response.json()["name"] == "To Delete"

    # Confirm it's gone
    follow_up = client.get(f"/departments/{dept.id}")
    assert follow_up.status_code == 404


def test_delete_department_not_found(client):
    response = client.delete(f"/departments/{uuid4()}")
    assert response.status_code == 404


def test_delete_department_forbidden_for_interviewer(db_session, override_get_db):
    dept = Department(name="Protected")
    db_session.add(dept)
    db_session.flush()

    interviewer = make_user(UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as c:
        response = c.delete(f"/departments/{dept.id}")
    app.dependency_overrides.clear()
    assert response.status_code == 403


# ─── GET /departments/{department_id}/members ──────────────────────────────

def test_get_department_members(client, db_session):
    dept = Department(name="Members Dept")
    db_session.add(dept)
    db_session.flush()

    response = client.get(f"/departments/{dept.id}/members")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_department_members_not_found(client):
    response = client.get(f"/departments/{uuid4()}/members")
    assert response.status_code == 404


def test_unauthenticated_request_returns_401():
    """Without auth override, the real JWT dependency should return 401."""
    app.dependency_overrides.clear()
    with TestClient(app) as c:
        response = c.get("/departments/")
    assert response.status_code == 401
