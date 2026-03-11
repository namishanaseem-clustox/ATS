import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.scorecard_template import ScorecardTemplate

def _persist_user(db_session, role: UserRole) -> User:
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@scorecard-test.com",
        full_name=f"Test {role.value.title()}",
        hashed_password=get_password_hash("test"),
        role=role,
        is_active=True,
        is_deleted=False
    )
    db_session.add(user)
    db_session.flush()
    return user

@pytest.fixture
def test_template(db_session):
    template = ScorecardTemplate(
        name="Engineering Scorecard",
        description="Standard eng template",
        is_default=False,
        sections=[{"key": "tech", "label": "Tech", "weight": 1}]
    )
    db_session.add(template)
    db_session.flush()
    return template

def test_list_scorecard_templates(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get("/scorecards/")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(t["id"] == str(test_template.id) for t in data)

def test_create_scorecard_template_as_owner(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "New Scorecard",
        "description": "desc",
        "is_default": False
    }
    
    with TestClient(app) as client:
        response = client.post("/scorecards/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 201
    assert response.json()["name"] == "New Scorecard"

def test_create_scorecard_template_forbidden_interviewer(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "Interviewer Scorecard",
    }
    
    with TestClient(app) as client:
        response = client.post("/scorecards/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 403

def test_create_default_scorecard_replaces_old_default(db_session, override_get_db):
    old_default = ScorecardTemplate(name="Old default", is_default=True, sections=[])
    db_session.add(old_default)
    db_session.flush()
    
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "New default",
        "is_default": True
    }
    
    with TestClient(app) as client:
        response = client.post("/scorecards/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 201
    
    # Check old default
    db_session.refresh(old_default)
    assert old_default.is_default == False

def test_get_scorecard_template(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.INTERVIEWER) # anyone can read
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get(f"/scorecards/{test_template.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json()["name"] == "Engineering Scorecard"

def test_update_scorecard_template(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "Updated Engineering Scorecard"
    }
    
    with TestClient(app) as client:
        response = client.put(f"/scorecards/{test_template.id}", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Engineering Scorecard"

def test_delete_scorecard_template(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.delete(f"/scorecards/{test_template.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 204
    deleted = db_session.query(ScorecardTemplate).filter_by(id=test_template.id).first()
    assert deleted is None
def test_get_scorecard_template_not_found(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        response = client.get(f"/scorecards/{uuid4()}")
    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_update_scorecard_template_failures(db_session, override_get_db, test_template):
    # 1. Forbidden
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        response = client.put(f"/scorecards/{test_template.id}", json={"name": "X"})
    assert response.status_code == 403
    
    # 2. Not Found
    admin = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: admin
    with TestClient(app) as client:
        response = client.put(f"/scorecards/{uuid4()}", json={"name": "X"})
    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_update_scorecard_template_clear_default(db_session, override_get_db, test_template):
    """Cover line 73."""
    # Set another as default
    other = ScorecardTemplate(name="Default", is_default=True, sections=[])
    db_session.add(other)
    db_session.commit()
    
    admin = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: admin
    with TestClient(app) as client:
        # Update test_template to be default, should clear 'other'
        response = client.put(f"/scorecards/{test_template.id}", json={"is_default": True})
    
    assert response.status_code == 200
    db_session.refresh(other)
    assert other.is_default is False
    app.dependency_overrides.clear()


def test_delete_scorecard_template_failures(db_session, override_get_db, test_template):
    # 1. Forbidden
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        response = client.delete(f"/scorecards/{test_template.id}")
    assert response.status_code == 403
    
    # 2. Not Found
    admin = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: admin
    with TestClient(app) as client:
        response = client.delete(f"/scorecards/{uuid4()}")
    assert response.status_code == 404
    app.dependency_overrides.clear()
