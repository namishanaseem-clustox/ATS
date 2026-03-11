import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.department import Department
from app.core.security import get_password_hash


def _persist_user(db_session, role: UserRole, email: str = None, password: str = "testpass") -> User:
    """Creates a user and saves them to the test DB."""
    if not email:
        email = f"{role.value}.{uuid4().hex[:6]}@dept-test.com"
        
    user = User(
        email=email,
        full_name=f"Test {role.value.title()}",
        hashed_password=get_password_hash(password),
        role=role,
        is_active=True,
        is_deleted=False
    )
    db_session.add(user)
    db_session.flush()
    return user


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


def test_get_departments_hiring_manager_specific_access(db_session, override_get_db):
    """HM sees depts they own or are members of (lines 46-48)."""
    hm = _persist_user(db_session, UserRole.HIRING_MANAGER)
    
    # Dept owned by HM
    dept_owned = Department(name="Owned", owner_id=hm.id)
    # Dept where HM is a member
    dept_member = Department(name="Member")
    db_session.add_all([dept_owned, dept_member])
    db_session.flush() # Flush to get IDs
    
    hm.department_id = dept_member.id
    db_session.commit()

    app.dependency_overrides[get_current_active_user] = lambda: hm
    with TestClient(app) as client:
        response = client.get("/departments/")
    
    assert response.status_code == 200
    names = [d["name"] for d in response.json()]
    assert "Owned" in names
    assert "Member" in names
    app.dependency_overrides.clear()


def test_get_departments_interviewer_with_dept(db_session, override_get_db):
    """Interviewer sees ONLY their assigned department (lines 53-54)."""
    dept = Department(name="Interviewer Dept")
    db_session.add(dept)
    db_session.flush()
    
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER, email="int@test.com")
    interviewer.department_id = dept.id
    db_session.commit()
    
    # Another dept they shouldn't see
    other = Department(name="Other Dept")
    db_session.add(other)
    db_session.commit()

    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as client:
        response = client.get("/departments/")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Interviewer Dept"
    app.dependency_overrides.clear()


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


def test_get_department_members_forbidden(db_session, override_get_db):
    """Interviewer cannot see members of a dept they don't belong to (line 153)."""
    dept = Department(name="Secret Dept")
    db_session.add(dept)
    db_session.flush()
    
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER, email="intranger@test.com")
    interviewer.department_id = None
    db_session.commit()

    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as client:
        response = client.get(f"/departments/{dept.id}/members")
    assert response.status_code == 403
    app.dependency_overrides.clear()


def test_remove_member_success_and_failures(db_session, override_get_db):
    """Cover lines 107-135."""
    dept = Department(name="Member Dept")
    db_session.add(dept)
    db_session.flush()
    
    member = _persist_user(db_session, UserRole.INTERVIEWER, email="member@test.com")
    member.department_id = dept.id
    db_session.commit()
    
    # 1. Not Found Dept
    owner = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: owner
    client = TestClient(app)
    response = client.delete(f"/departments/{uuid4()}/members/{member.id}")
    assert response.status_code == 404
    
    # 2. Forbidden (non-admin)
    hm = _persist_user(db_session, UserRole.HIRING_MANAGER)
    app.dependency_overrides[get_current_active_user] = lambda: hm
    response = client.delete(f"/departments/{dept.id}/members/{member.id}")
    assert response.status_code == 403
    
    # 3. User Not Found
    app.dependency_overrides[get_current_active_user] = lambda: owner
    response = client.delete(f"/departments/{dept.id}/members/{uuid4()}")
    assert response.status_code == 404
    
    # 4. Success
    response = client.delete(f"/departments/{dept.id}/members/{member.id}")
    assert response.status_code == 204
    db_session.refresh(member)
    assert member.department_id is None
    
    # 5. User not a member (already removed)
    response = client.delete(f"/departments/{dept.id}/members/{member.id}")
    assert response.status_code == 400
    assert "not a member" in response.json()["detail"]
    
    app.dependency_overrides.clear()
