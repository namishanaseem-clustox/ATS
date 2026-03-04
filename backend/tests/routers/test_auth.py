import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.invitation import UserInvitation
from app.models.password_reset import PasswordResetToken
from app.core.security import get_password_hash


def _persist_user(db_session, role: UserRole, email: str = None, password: str = "testpass") -> User:
    """Creates a user and saves them to the test DB."""
    if not email:
        email = f"{role.value}.{uuid4().hex[:6]}@auth-test.com"
        
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


def get_client(role: UserRole, db_session):
    """Returns a TestClient authenticated as a persisted mock user."""
    user = _persist_user(db_session, role)
    app.dependency_overrides[get_current_active_user] = lambda: user
    return TestClient(app), user


# ─── Auth / Token ────────────────────────────────────────────────────────────

def test_login_success(db_session, override_get_db):
    """Test standard OAuth2 form login."""
    _persist_user(db_session, UserRole.HR, email="login@test.com", password="mysecretpassword")
    
    with TestClient(app) as client:
        response = client.post("/token", data={"username": "login@test.com", "password": "mysecretpassword"})
        
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_wrong_password(db_session, override_get_db):
    _persist_user(db_session, UserRole.HR, email="login2@test.com", password="realpassword")
    
    with TestClient(app) as client:
        response = client.post("/token", data={"username": "login2@test.com", "password": "wrongpassword"})
        
    assert response.status_code == 401


# ─── Users CRUD ──────────────────────────────────────────────────────────────

def test_read_users_as_admin(db_session, override_get_db):
    """HR and Owner can see all active/non-deleted users."""
    client, _ = get_client(UserRole.HR, db_session)
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_read_users_as_interviewer(db_session, override_get_db):
    """Interviewers should only see other Interviewers (for scheduling)."""
    # Create one HR and one Interviewer
    _persist_user(db_session, UserRole.HR)
    _persist_user(db_session, UserRole.INTERVIEWER)
    
    client, user = get_client(UserRole.INTERVIEWER, db_session)
    response = client.get("/users")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    # Ensure they only see interviewers
    assert all(u["role"] == UserRole.INTERVIEWER.value for u in data)


def test_create_user_as_owner(db_session, override_get_db):
    client, _ = get_client(UserRole.OWNER, db_session)
    payload = {
        "email": f"new.user.{uuid4().hex[:6]}@test.com",
        "password": "securepassword",
        "full_name": "New User"
    }
    response = client.post("/users", json=payload)
    assert response.status_code == 200
    assert response.json()["email"] == payload["email"]


def test_create_user_forbidden_for_hiring_manager(db_session, override_get_db):
    client, _ = get_client(UserRole.HIRING_MANAGER, db_session)
    response = client.post("/users", json={
        "email": "hacker@test.com", "password": "pw", "full_name": "Hack"
    })
    assert response.status_code == 403


def test_delete_user_as_admin(db_session, override_get_db):
    target_user = _persist_user(db_session, UserRole.INTERVIEWER)
    client, _ = get_client(UserRole.OWNER, db_session)
    
    response = client.delete(f"/users/{target_user.id}")
    assert response.status_code == 204
    
    # Verify soft delete
    db_session.refresh(target_user)
    assert target_user.is_deleted is True


# ─── Password Reset Flow ─────────────────────────────────────────────────────

def test_forgot_password_sends_email(mocker, db_session, override_get_db):
    user = _persist_user(db_session, UserRole.INTERVIEWER, email="forgot@test.com")
    mock_send = mocker.patch("app.routers.auth.send_password_reset_email", return_value=True)
    
    with TestClient(app) as client:
        response = client.post("/forgot-password", json={"email": "forgot@test.com"})
        
    assert response.status_code == 200
    assert response.json()["message"] == "If that email address is in our system, you will receive a reset link shortly."
    mock_send.assert_called_once()
    
    # Verify token exists in DB
    token_record = db_session.query(PasswordResetToken).filter_by(user_id=user.id).first()
    assert token_record is not None


def test_reset_password_with_valid_token(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.INTERVIEWER, password="oldpassword")
    
    token_str = "valid-reset-token-123"
    token_record = PasswordResetToken(
        token=token_str,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    db_session.add(token_record)
    db_session.flush()

    with TestClient(app) as client:
        response = client.post("/reset-password", json={
            "token": token_str,
            "new_password": "newsecurepassword"
        })
        
    assert response.status_code == 200
    
    # Verify token is used
    db_session.refresh(token_record)
    assert token_record.is_used is True
    
    # Verify we can login with the new password
    with TestClient(app) as client:
        login_resp = client.post("/token", data={"username": user.email, "password": "newsecurepassword"})
    assert login_resp.status_code == 200


# ─── Invitations ─────────────────────────────────────────────────────────────

def test_create_invitation(mocker, db_session, override_get_db):
    client, _ = get_client(UserRole.HR, db_session)
    mock_send = mocker.patch("app.routers.auth.send_invitation_email", return_value=True)
    
    response = client.post("/invitations", json={
        "email": "invitee@test.com",
        "role": UserRole.INTERVIEWER.value
    })
    assert response.status_code == 200
    mock_send.assert_called_once()


def test_validate_invitation(db_session, override_get_db):
    creator = _persist_user(db_session, UserRole.HR)
    token_str = "invite-token-999"
    invite = UserInvitation(
        email="validate@test.com",
        role=UserRole.HIRING_MANAGER,
        token=token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        created_by_id=creator.id
    )
    db_session.add(invite)
    db_session.flush()

    with TestClient(app) as client:
        response = client.get(f"/invitations/{token_str}")
        
    assert response.status_code == 200
    assert response.json()["email"] == "validate@test.com"


def test_register_invited_user(db_session, override_get_db):
    creator = _persist_user(db_session, UserRole.OWNER)
    token_str = "register-token-888"
    invite = UserInvitation(
        email="ready@test.com",
        role=UserRole.INTERVIEWER,
        token=token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        created_by_id=creator.id
    )
    db_session.add(invite)
    db_session.flush()

    with TestClient(app) as client:
        response = client.post("/register-invited", json={
            "token": token_str,
            "full_name": "Ready User",
            "password": "brandnewpassword"
        })
        
    assert response.status_code == 200
    
    # Verify user was actually created
    new_user = db_session.query(User).filter_by(email="ready@test.com").first()
    assert new_user is not None
    assert new_user.role == UserRole.INTERVIEWER
    
    # Verify invite is marked used
    db_session.refresh(invite)
    assert invite.is_used is True

