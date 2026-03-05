import pytest
from unittest.mock import MagicMock
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient
from jose import jwt

from app.main import app
from app.routers.auth import get_current_user, get_current_active_user
from app.models.user import User, UserRole
from app.core.security import SECRET_KEY, ALGORITHM

# ─── Mocks & Fixtures ────────────────────────────────────────────────────────

def _persist_user(db_session, role: UserRole, has_google=False) -> User:
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@cal-test.com",
        full_name=f"Test {role.value.title()}",
        hashed_password=get_password_hash("test"),
        role=role,
        is_active=True,
        is_deleted=False,
        google_access_token="fake_access_token" if has_google else None,
        google_refresh_token="fake_refresh_token" if has_google else None,
    )
    db_session.add(user)
    db_session.flush()
    return user

@pytest.fixture(autouse=True)
def mock_google_creds(mocker):
    # Ensure all tests have fake Google environment configs
    mocker.patch("app.routers.calendar.GOOGLE_CLIENT_ID", "fake_client_id")
    mocker.patch("app.routers.calendar.GOOGLE_CLIENT_SECRET", "fake_client_secret")

# ─── Tests ───────────────────────────────────────────────────────────────────

def test_authorize_google_calendar(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR)
    db_session.commit()
    
    # Generate a valid JWT token
    token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm=ALGORITHM)
    
    # Mock Flow
    mock_flow = MagicMock()
    mock_flow.authorization_url.return_value = ("https://accounts.google.com/o/oauth2/auth?mock=1", "mock_state")
    mocker.patch("app.routers.calendar.Flow.from_client_config", return_value=mock_flow)
    
    with TestClient(app) as client:
        response = client.get(f"/api/calendar/authorize?token={token}", follow_redirects=False)

    assert response.status_code == 307 # Redirect
    assert "https://accounts.google.com/o/oauth2/auth?mock=1" in response.headers["location"]

def test_google_calendar_callback(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR, has_google=False)
    db_session.commit()
    state = str(user.id)
    
    # Mock Flow and Credentials
    mock_credentials = MagicMock()
    mock_credentials.token = "new_access_token"
    mock_credentials.refresh_token = "new_refresh_token"
    mock_credentials.expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    mock_flow = MagicMock()
    mock_flow.credentials = mock_credentials
    
    mocker.patch("app.routers.calendar.Flow.from_client_config", return_value=mock_flow)
    
    with TestClient(app) as client:
        response = client.get(f"/api/calendar/callback?state={state}&code=mock_auth_code", follow_redirects=False)
        
    assert response.status_code == 307
    assert "settings/profile?calendar=connected" in response.headers["location"]
    
    # Verify DB was updated
    db_session.refresh(user)
    assert user.google_access_token == "new_access_token"
    assert user.google_refresh_token == "new_refresh_token"

def test_disconnect_google_calendar(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR, has_google=True)
    app.dependency_overrides[get_current_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.delete("/api/calendar/disconnect")
    
    app.dependency_overrides.clear()
    assert response.status_code == 200
    
    # Verify tokens were wiped
    db_session.refresh(user)
    assert user.google_access_token is None
    assert user.google_refresh_token is None

def test_get_calendar_availability_no_token(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR, has_google=False)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "user_ids": [str(user.id)],
        "timeMin": datetime.utcnow().isoformat() + "Z",
        "timeMax": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
    }
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/availability", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    # Should be "None" indicating we don't know their availability because they aren't connected
    assert response.json() == {str(user.id): None}

def test_get_calendar_availability_success(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR, has_google=True)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "user_ids": [str(user.id)],
        "timeMin": datetime.utcnow().isoformat() + "Z",
        "timeMax": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
    }
    
    # Mock Google Build Service
    mock_freebusy = MagicMock()
    mock_query = MagicMock()
    
    mock_freebusy.query.return_value = mock_query
    
    # Returning one mock busy block
    mock_query.execute.return_value = {
        "calendars": {
            "primary": {
                "busy": [
                    {"start": "2024-03-05T10:00:00Z", "end": "2024-03-05T11:00:00Z"}
                ]
            }
        }
    }
    
    mock_service = MagicMock()
    mock_service.freebusy.return_value = mock_freebusy
    
    mocker.patch("app.routers.calendar.build", return_value=mock_service)
    mocker.patch("app.routers.calendar.Credentials")  # avoid real oauth parse
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/availability", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json() == {
        str(user.id): [
            {"start": "2024-03-05T10:00:00Z", "end": "2024-03-05T11:00:00Z"}
        ]
    }

def test_get_available_slots_conflict(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR, has_google=True)
    app.dependency_overrides[get_current_user] = lambda: user
    
    target_date = "2024-10-10" # Arbitrary date
    
    payload = {
        "date": target_date,
        "duration_minutes": 60,
        "user_ids": [str(user.id)]
    }
    
    # We will mock a busy block right at 10 AM local time
    # Working hours are 09:00 - 17:00 local (Asia/Karachi).
    # 10:00 AM PKT = 05:00 AM UTC
    mock_freebusy = MagicMock()
    mock_query = MagicMock()
    mock_freebusy.query.return_value = mock_query
    
    mock_query.execute.return_value = {
        "calendars": {
            "primary": {
                "busy": [
                    {"start": "2024-10-10T05:00:00Z", "end": "2024-10-10T06:00:00Z"}
                ]
            }
        }
    }
    
    mock_service = MagicMock()
    mock_service.freebusy.return_value = mock_freebusy
    
    mocker.patch("app.routers.calendar.build", return_value=mock_service)
    mocker.patch("app.routers.calendar.Credentials")
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/available-slots", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    slots = response.json()
    
    # We expect multiple slots. The one at 10:00 PKT should be busy.
    # Because of PKT timezone (UTC+5), slot text should have +05:00.
    ten_am_slot = next((s for s in slots if "T10:00:00+05:00" in s["start"]), None)
    
    assert ten_am_slot is not None, "10 AM slot missing from generation"
    assert ten_am_slot["available"] is False, "10 AM slot should be marked busy because of the Google mock"
    
    # The 9 AM and 11 AM slots should be fine
    nine_am_slot = next((s for s in slots if "T09:00:00+05:00" in s["start"]), None)
    assert nine_am_slot["available"] is True
    
    eleven_am_slot = next((s for s in slots if "T11:00:00+05:00" in s["start"]), None)
    assert eleven_am_slot["available"] is True

def test_authorize_google_calendar_invalid_token(db_session):
    with TestClient(app) as client:
        response = client.get("/api/calendar/authorize?token=bad_token", follow_redirects=False)
    assert response.status_code == 401

def test_authorize_google_calendar_no_creds(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR)
    db_session.commit()
    token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm=ALGORITHM)
    
    mocker.patch("app.routers.calendar.GOOGLE_CLIENT_ID", None)
    
    with TestClient(app) as client:
        response = client.get(f"/api/calendar/authorize?token={token}", follow_redirects=False)
    assert response.status_code == 500

def test_google_calendar_callback_exception(db_session, mocker):
    mocker.patch("app.routers.calendar.Flow.from_client_config", side_effect=Exception("Flow error"))
    
    with TestClient(app) as client:
        response = client.get("/api/calendar/callback?state=123&code=abc", follow_redirects=False)
        
    assert response.status_code == 307
    assert "calendar=error" in response.headers["location"]

def test_get_calendar_availability_no_creds(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_user] = lambda: user
    
    mocker.patch("app.routers.calendar.GOOGLE_CLIENT_ID", None)
    
    payload = {
        "user_ids": [str(user.id)],
        "timeMin": datetime.utcnow().isoformat() + "Z",
        "timeMax": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
    }
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/availability", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json() == {}

def test_get_calendar_availability_api_exception(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR, has_google=True)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "user_ids": [str(user.id)],
        "timeMin": datetime.utcnow().isoformat() + "Z",
        "timeMax": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
    }
    
    mocker.patch("app.routers.calendar.build", side_effect=Exception("Google API down"))
    mocker.patch("app.routers.calendar.Credentials")
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/availability", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json() == {str(user.id): None}

def test_get_available_slots_invalid_date(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "date": "2024-invalid-10",
        "duration_minutes": 60,
        "user_ids": [str(user.id)]
    }
    with TestClient(app) as client:
        response = client.post("/api/calendar/available-slots", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 400

def test_get_available_slots_no_creds(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR, has_google=True)
    app.dependency_overrides[get_current_user] = lambda: user
    
    mocker.patch("app.routers.calendar.GOOGLE_CLIENT_ID", None)
    
    payload = {
        "date": "2024-10-10",
        "duration_minutes": 60,
        "user_ids": [str(user.id)]
    }
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/available-slots", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    slots = response.json()
    assert len(slots) > 0
    assert all(s["available"] == True for s in slots)

def test_authorize_google_calendar_token_missing_email(db_session):
    token = jwt.encode({}, SECRET_KEY, algorithm=ALGORITHM)
    with TestClient(app) as client:
        response = client.get(f"/api/calendar/authorize?token={token}", follow_redirects=False)
    assert response.status_code == 401
    assert "Invalid token payload" in response.json()["detail"]

def test_authorize_google_calendar_user_not_found(db_session):
    token = jwt.encode({"sub": "nonexistent@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    with TestClient(app) as client:
        response = client.get(f"/api/calendar/authorize?token={token}", follow_redirects=False)
    assert response.status_code == 401
    assert "User not found" in response.json()["detail"]

def test_google_calendar_callback_user_not_found(db_session, mocker):
    mock_flow = MagicMock()
    mock_flow.credentials.token = "fake"
    mock_flow.credentials.refresh_token = "fake"
    mock_flow.credentials.expiry = None
    mocker.patch("app.routers.calendar.Flow.from_client_config", return_value=mock_flow)
    
    with TestClient(app) as client:
        state = str(uuid4())
        response = client.get(f"/api/calendar/callback?state={state}&code=abc", follow_redirects=False)
        
    assert response.status_code == 307
    assert "calendar=error" in response.headers["location"]

def test_get_available_slots_no_users(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "date": "2024-10-10",
        "duration_minutes": 60,
        "user_ids": []
    }
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/available-slots", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    slots = response.json()
    assert len(slots) > 0
    assert all(s["available"] == True for s in slots)

def test_get_available_slots_user_no_token(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR, has_google=False)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "date": "2024-10-10",
        "duration_minutes": 60,
        "user_ids": [str(user.id)]
    }
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/available-slots", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    slots = response.json()
    assert len(slots) > 0
    assert all(s["available"] == True for s in slots)

def test_get_available_slots_api_exception(db_session, override_get_db, mocker):
    user = _persist_user(db_session, UserRole.HR, has_google=True)
    app.dependency_overrides[get_current_user] = lambda: user
    
    mocker.patch("app.routers.calendar.build", side_effect=Exception("Google API error"))
    mocker.patch("app.routers.calendar.Credentials")
    
    payload = {
        "date": "2024-10-10",
        "duration_minutes": 60,
        "user_ids": [str(user.id)]
    }
    
    with TestClient(app) as client:
        response = client.post("/api/calendar/available-slots", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    slots = response.json()
    assert len(slots) > 0
    assert all(s["available"] == True for s in slots)
