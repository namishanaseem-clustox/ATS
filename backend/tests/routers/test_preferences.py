import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.user_preferences import UserPreferences
from app.core.security import get_password_hash


def _persist_user(db_session, role: UserRole) -> User:
    """Creates a user and saves to test DB to satisfy foreign keys."""
    user = User(
        email=f"prefuser.{uuid4().hex[:6]}@test.com",
        full_name="Prefs User",
        hashed_password=get_password_hash("testpass"),
        role=role,
        is_active=True,
        is_deleted=False
    )
    db_session.add(user)
    db_session.flush()
    return user


def get_client(role: UserRole, db_session):
    user = _persist_user(db_session, role)
    app.dependency_overrides.pop(get_current_active_user, None)
    app.dependency_overrides[get_current_active_user] = lambda: user
    return TestClient(app), user


# ─── Preferences endpoints ───────────────────────────────────────────────────

def test_get_my_preferences_creates_default(db_session, override_get_db):
    """If preferences don't exist yet, GET /preferences/me should auto-create them."""
    client, user = get_client(UserRole.HR, db_session)
    
    # Ensure no preferences exist initially
    prefs = db_session.query(UserPreferences).filter_by(user_id=user.id).first()
    assert prefs is None

    response = client.get("/preferences/me")
    assert response.status_code == 200
    
    data = response.json()
    assert data["notify_new_candidate"] is True
    assert data["language"] == "en"
    assert data["timezone"] == "UTC"
    assert data["user_id"] == str(user.id)
    
    # Verify it was actually saved to DB
    db_session.expire_all() # ensure we fetch fresh row
    prefs_after = db_session.query(UserPreferences).filter_by(user_id=user.id).first()
    assert prefs_after is not None


def test_update_my_preferences(db_session, override_get_db):
    """PUT /preferences/me alters existing preferences."""
    client, user = get_client(UserRole.INTERVIEWER, db_session)
    
    # First, let GET auto-create them
    client.get("/preferences/me")

    payload = {
        "notify_new_candidate": False,
        "notify_activity_assigned": False,
        "language": "es",
        "timezone": "Europe/London"
    }
    
    response = client.put("/preferences/me", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["language"] == "es"
    assert data["notify_new_candidate"] is False
    assert data["notify_activity_assigned"] is False
    # Check untouched fields remain at default
    assert data["notify_feedback_submitted"] is True 


def test_update_creates_if_not_exist(db_session, override_get_db):
    """PUT /preferences/me should also auto-create if they don't exist yet."""
    client, user = get_client(UserRole.HIRING_MANAGER, db_session)
    
    # Ensure no preferences exist initially
    prefs = db_session.query(UserPreferences).filter_by(user_id=user.id).first()
    assert prefs is None

    payload = {
        "timezone": "Asia/Tokyo"
    }
    
    response = client.put("/preferences/me", json=payload)
    assert response.status_code == 200
    assert response.json()["timezone"] == "Asia/Tokyo"
    
    # Check DB
    db_session.expire_all()
    prefs_after = db_session.query(UserPreferences).filter_by(user_id=user.id).first()
    assert prefs_after is not None
    assert prefs_after.timezone == "Asia/Tokyo"

