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


# ─── Auth Failures & Inactive Users ──────────────────────────────────────────

def test_get_current_user_invalid_token(override_get_db):
    """Test get_current_user with invalid token (line 24-39 logic indirectly)."""
    with TestClient(app) as client:
        response = client.get("/users/me", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401


def test_login_inactive_user(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR, email="inactive@test.com")
    user.is_active = False
    db_session.commit()
    
    with TestClient(app) as client:
        response = client.post("/token", data={"username": "inactive@test.com", "password": "testpass"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Account is inactive"


# ─── Users Update & Validation ───────────────────────────────────────────────

def test_update_user_not_found(db_session, override_get_db):
    client, _ = get_client(UserRole.OWNER, db_session)
    response = client.put(f"/users/{uuid4()}", json={"full_name": "Ghost"})
    assert response.status_code == 404


def test_update_user_unauthorized_role_change(db_session, override_get_db):
    """Interpolate line 151-158: Hiring Manager cannot change roles."""
    target = _persist_user(db_session, UserRole.INTERVIEWER)
    client, _ = get_client(UserRole.HIRING_MANAGER, db_session)
    response = client.put(f"/users/{target.id}", json={"role": UserRole.OWNER.value})
    assert response.status_code == 403


def test_update_user_email_taken(db_session, override_get_db):
    u1 = _persist_user(db_session, UserRole.INTERVIEWER, email="u1@test.com")
    u2 = _persist_user(db_session, UserRole.INTERVIEWER, email="u2@test.com")
    client, _ = get_client(UserRole.OWNER, db_session)
    
    response = client.put(f"/users/{u1.id}", json={"email": "u2@test.com"})
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_update_self_password(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.INTERVIEWER, password="oldpassword")
    app.dependency_overrides[get_current_active_user] = lambda: user
    client = TestClient(app)
    
    # Missing current_password
    response = client.put(f"/users/{user.id}", json={"password": "newpassword"})
    assert response.status_code == 400
    
    # Correct current_password
    response = client.put(f"/users/{user.id}", json={"password": "newpassword", "current_password": "oldpassword"})
    assert response.status_code == 200


# ─── Avatars ─────────────────────────────────────────────────────────────────

def test_upload_avatar_unauthorized(db_session, override_get_db):
    target = _persist_user(db_session, UserRole.INTERVIEWER)
    client, _ = get_client(UserRole.HIRING_MANAGER, db_session)
    response = client.post(f"/users/{target.id}/avatar", files={"file": ("test.png", b"fake-data", "image/png")})
    assert response.status_code == 403


def test_upload_avatar_not_image(db_session, override_get_db):
    client, user = get_client(UserRole.OWNER, db_session)
    response = client.post(f"/users/{user.id}/avatar", files={"file": ("test.txt", b"fake-data", "text/plain")})
    assert response.status_code == 400


# ─── Delete Failures ─────────────────────────────────────────────────────────

def test_delete_self_forbidden(db_session, override_get_db):
    client, user = get_client(UserRole.OWNER, db_session)
    response = client.delete(f"/users/{user.id}")
    assert response.status_code == 400


def test_hr_delete_owner_forbidden(db_session, override_get_db):
    owner = _persist_user(db_session, UserRole.OWNER)
    client, _ = get_client(UserRole.HR, db_session)
    response = client.delete(f"/users/{owner.id}")
    assert response.status_code == 403


# ─── Invitation Edge Cases ──────────────────────────────────────────────────

def test_create_invitation_duplicate(db_session, override_get_db):
    _persist_user(db_session, UserRole.INTERVIEWER, email="exists@test.com")
    client, _ = get_client(UserRole.HR, db_session)
    response = client.post("/invitations", json={"email": "exists@test.com", "role": "interviewer"})
    assert response.status_code == 400


def test_validate_invitation_failures(db_session, override_get_db):
    token = "bad-token"
    with TestClient(app) as client:
        # Invalid
        assert client.get(f"/invitations/{token}").status_code == 404
        
        # Used
        creator = _persist_user(db_session, UserRole.OWNER)
        invite = UserInvitation(email="used@test.com", role=UserRole.HR, token="used", is_used=True, created_by_id=creator.id, expires_at=datetime.now(timezone.utc)+timedelta(days=1))
        db_session.add(invite)
        db_session.commit()
        assert client.get("/invitations/used").status_code == 400
        
        # Expired
        invite_exp = UserInvitation(email="exp@test.com", role=UserRole.HR, token="exp", expires_at=datetime.now(timezone.utc)-timedelta(days=1), created_by_id=creator.id)
        db_session.add(invite_exp)
        db_session.commit()
        assert client.get("/invitations/exp").status_code == 400


def test_register_invited_duplicate_email(db_session, override_get_db):
    _persist_user(db_session, UserRole.INTERVIEWER, email="taken@test.com")
    creator = _persist_user(db_session, UserRole.OWNER)
    token = "reg-dup"
    invite = UserInvitation(email="taken@test.com", role=UserRole.HR, token=token, created_by_id=creator.id, expires_at=datetime.now(timezone.utc)+timedelta(days=1))
    db_session.add(invite)
    db_session.commit()
    
    with TestClient(app) as client:
        response = client.post("/register-invited", json={"token": token, "full_name": "X", "password": "P"})
    assert response.status_code == 400


def test_register_invited_reactivate_deleted_user(db_session, override_get_db):
    """Test reactivation of a soft-deleted user (line 480-490)."""
    # 1. Create and delete user
    email = "reactivate@test.com"
    old_user = _persist_user(db_session, UserRole.INTERVIEWER, email=email)
    old_user.is_deleted = True
    db_session.commit()
    
    # 2. Invite them
    creator = _persist_user(db_session, UserRole.OWNER)
    token = "react-token"
    invite = UserInvitation(email=email, role=UserRole.HR, token=token, created_by_id=creator.id, expires_at=datetime.now(timezone.utc)+timedelta(days=1))
    db_session.add(invite)
    db_session.commit()
    
    # 3. Register
    with TestClient(app) as client:
        response = client.post("/register-invited", json={"token": token, "full_name": "Reactivated", "password": "newpassword"})
    
    assert response.status_code == 200
    db_session.refresh(old_user)
    assert old_user.is_deleted is False
    assert old_user.is_active is True
    assert old_user.full_name == "Reactivated"
    assert old_user.role == UserRole.HR


def test_remove_avatar(db_session, override_get_db):
    client, user = get_client(UserRole.OWNER, db_session)
    user.avatar_url = "some/path.png"
    db_session.commit()
    
    response = client.delete(f"/users/{user.id}/avatar")
    assert response.status_code == 200
    db_session.refresh(user)
    assert user.avatar_url is None


def test_read_users_me(db_session, override_get_db):
    client, user = get_client(UserRole.INTERVIEWER, db_session)
    response = client.get("/users/me")
    assert response.status_code == 200
    assert response.json()["email"] == user.email
def test_read_users_unauthorized_role(db_session, override_get_db):
    """Test 403 by mocking a user with an invalid role string."""
    from unittest.mock import MagicMock
    mock_user = MagicMock()
    mock_user.role = "hacker" 
    mock_user.is_active = True
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    
    with TestClient(app) as client:
        response = client.get("/users")
    assert response.status_code == 403
    app.dependency_overrides.clear()


def test_upload_avatar_success(db_session, override_get_db, mocker):
    client, user = get_client(UserRole.OWNER, db_session)
    # Mock os.makedirs and open to avoid real file IO issues in some environments
    mocker.patch("os.makedirs")
    mocker.patch("shutil.copyfileobj")
    mocker.patch("builtins.open", mocker.mock_open())
    
    response = client.post(
        f"/users/{user.id}/avatar", 
        files={"file": ("test.png", b"fake-image-data", "image/png")}
    )
    assert response.status_code == 200
    db_session.refresh(user)
    assert "/static/avatars/" in user.avatar_url


def test_update_user_non_admin_removes_protected_fields(db_session, override_get_db):
    """Cover lines 154, 156, 158."""
    user = _persist_user(db_session, UserRole.INTERVIEWER, email="me@test.com")
    app.dependency_overrides[get_current_active_user] = lambda: user
    client = TestClient(app)
    
    payload = {
        "full_name": "New Name",
        "role": UserRole.OWNER.value, # Should be ignored
        "is_active": False, # Should be ignored
        "department_id": str(uuid4()) # Should be ignored
    }
    response = client.put(f"/users/{user.id}", json=payload)
    assert response.status_code == 200
    db_session.refresh(user)
    assert user.full_name == "New Name"
    assert user.role == UserRole.INTERVIEWER
    assert user.is_active is True


def test_register_invited_existing_active_user_forbidden(db_session, override_get_db):
    """Cover line 477."""
    email = "active@test.com"
    _persist_user(db_session, UserRole.INTERVIEWER, email=email)
    
    creator = _persist_user(db_session, UserRole.OWNER)
    token = "active-token"
    invite = UserInvitation(email=email, role=UserRole.HR, token=token, created_by_id=creator.id, expires_at=datetime.now(timezone.utc)+timedelta(days=1))
    db_session.add(invite)
    db_session.commit()
    
    with TestClient(app) as client:
        response = client.post("/register-invited", json={"token": token, "full_name": "X", "password": "P"})
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_reset_password_failures(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    
    # Invalid token (line 243)
    with TestClient(app) as client:
        response = client.post("/reset-password", json={"token": "non-existent", "new_password": "p"})
    assert response.status_code == 400
    
    # Used token (line 246)
    t_used = PasswordResetToken(token="used-t", user_id=user.id, is_used=True, expires_at=datetime.now(timezone.utc)+timedelta(days=1))
    db_session.add(t_used)
    db_session.commit()
    with TestClient(app) as client:
        response = client.post("/reset-password", json={"token": "used-t", "new_password": "p"})
    assert response.status_code == 400
    
    # Expired token (line 249)
    t_exp = PasswordResetToken(token="exp-t", user_id=user.id, expires_at=datetime.now(timezone.utc)-timedelta(days=1))
    db_session.add(t_exp)
    db_session.commit()
    with TestClient(app) as client:
        response = client.post("/reset-password", json={"token": "exp-t", "new_password": "p"})
    assert response.status_code == 400


def test_avatar_failures_extended(db_session, override_get_db):
    client, user = get_client(UserRole.OWNER, db_session)
    
    # User not found (line 282)
    response = client.post(f"/users/{uuid4()}/avatar", files={"file": ("t.png", b"d", "image/png")})
    assert response.status_code == 404
    
    # Remove avatar user not found (line 322)
    response = client.delete(f"/users/{uuid4()}/avatar")
    assert response.status_code == 404


def test_register_invited_reactivate_with_optional_fields(db_session, override_get_db):
    """Cover lines 482, 484."""
    email = "opt@test.com"
    u = _persist_user(db_session, UserRole.INTERVIEWER, email=email)
    u.is_deleted = True
    db_session.commit()
    
    creator = _persist_user(db_session, UserRole.OWNER)
    token = "opt-token"
    invite = UserInvitation(email=email, role=UserRole.HR, token=token, created_by_id=creator.id, expires_at=datetime.now(timezone.utc)+timedelta(days=1))
    db_session.add(invite)
    db_session.commit()
    
    with TestClient(app) as client:
        response = client.post("/register-invited", json={
            "token": token, 
            "full_name": "New", 
            "password": "P",
            "phone": "123",
            "location": "Earth"
        })
    assert response.status_code == 200
    db_session.refresh(u)
    assert u.phone == "123"
    assert u.location == "Earth"


def test_get_current_user_unauthorized_branches(db_session, override_get_db):
    """Cover line 31-39 indirectly by calling protected route without token or with broken user."""
    with TestClient(app) as client:
        # No token (line 31-33)
        response = client.get("/users/me")
        assert response.status_code == 401
    
    # User not found in DB but token valid? Hard to trigger without mock.
    # We can mock get_current_active_user for other tests, but lines 24-39 are in the dependency itself.
