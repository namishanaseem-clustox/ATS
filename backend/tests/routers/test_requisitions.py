import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.requisition import JobRequisition, RequisitionStatus
from app.models.job import Job

def _persist_user(db_session, role: UserRole) -> User:
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@req-test.com",
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
def dept(db_session):
    d = Department(name=f"Req-Test-Dept-{uuid4().hex[:4]}")
    db_session.add(d)
    db_session.flush()
    return d

@pytest.fixture
def existing_draft_req(db_session, dept):
    owner = _persist_user(db_session, UserRole.OWNER)
    req = JobRequisition(
        job_title="Test Draft Req",
        department_id=dept.id,
        location="Remote",
        employment_type="Full-time",
        req_code="REQ-TEST1",
        status=RequisitionStatus.DRAFT,
        hiring_manager_id=owner.id
    )
    db_session.add(req)
    db_session.flush()
    return req

REQ_PAYLOAD = {
    "job_title": "Software Engineer",
    "location": "Remote",
    "employment_type": "Full-time"
}

def test_create_requisition(db_session, override_get_db, dept):
    user = _persist_user(db_session, UserRole.HIRING_MANAGER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        payload = {**REQ_PAYLOAD, "department_id": str(dept.id)}
        response = client.post("/requisitions/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["job_title"] == "Software Engineer"
    assert data["status"] == RequisitionStatus.DRAFT.value

def test_get_requisitions(db_session, override_get_db, existing_draft_req):
    user = db_session.query(User).filter_by(id=existing_draft_req.hiring_manager_id).first()
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        response = client.get("/requisitions/")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert len(response.json()) >= 1

def test_get_requisition(db_session, override_get_db, existing_draft_req):
    user = db_session.query(User).filter_by(id=existing_draft_req.hiring_manager_id).first()
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        response = client.get(f"/requisitions/{existing_draft_req.id}")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["id"] == str(existing_draft_req.id)

def test_update_requisition(db_session, override_get_db, existing_draft_req):
    user = db_session.query(User).filter_by(id=existing_draft_req.hiring_manager_id).first()
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        response = client.put(f"/requisitions/{existing_draft_req.id}", json={"job_title": "Updated Title"})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["job_title"] == "Updated Title"

def test_submit_requisition(db_session, override_get_db, existing_draft_req):
    user = db_session.query(User).filter_by(id=existing_draft_req.hiring_manager_id).first()
    app.dependency_overrides[get_current_active_user] = lambda: user
    with TestClient(app) as client:
        response = client.post(f"/requisitions/{existing_draft_req.id}/submit")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    # verify status
    req = db_session.query(JobRequisition).filter_by(id=existing_draft_req.id).first()
    assert req.status == RequisitionStatus.PENDING_HR

def test_approve_requisition_hr(db_session, override_get_db, existing_draft_req):
    existing_draft_req.status = RequisitionStatus.PENDING_HR
    db_session.flush()
    
    hr_user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: hr_user
    with TestClient(app) as client:
        response = client.post(f"/requisitions/{existing_draft_req.id}/approve")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    
    req = db_session.query(JobRequisition).filter_by(id=existing_draft_req.id).first()
    assert req.status == RequisitionStatus.PENDING_OWNER

def test_approve_requisition_owner(db_session, override_get_db, existing_draft_req):
    existing_draft_req.status = RequisitionStatus.PENDING_OWNER
    db_session.flush()
    
    owner_user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: owner_user
    with TestClient(app) as client:
        response = client.post(f"/requisitions/{existing_draft_req.id}/approve")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    
    req = db_session.query(JobRequisition).filter_by(id=existing_draft_req.id).first()
    assert req.status == RequisitionStatus.APPROVED

def test_reject_requisition(db_session, override_get_db, existing_draft_req):
    existing_draft_req.status = RequisitionStatus.PENDING_HR
    db_session.flush()
    
    hr_user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: hr_user
    with TestClient(app) as client:
        response = client.post(f"/requisitions/{existing_draft_req.id}/reject", json={"reason": "Need bigger budget"})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    req = db_session.query(JobRequisition).filter_by(id=existing_draft_req.id).first()
    assert req.status == RequisitionStatus.DRAFT
    assert req.rejection_reason == "Need bigger budget"

def test_convert_to_job(db_session, override_get_db, existing_draft_req):
    existing_draft_req.status = RequisitionStatus.APPROVED
    db_session.flush()
    
    hr_user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: hr_user
    with TestClient(app) as client:
        response = client.post(f"/requisitions/{existing_draft_req.id}/convert")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert "job_id" in response.json()
    
    req = db_session.query(JobRequisition).filter_by(id=existing_draft_req.id).first()
    assert req.status == RequisitionStatus.OPEN
    
    # check if job is created
    job_id = response.json()["job_id"]
    job = db_session.query(Job).filter_by(id=job_id).first()
    assert job is not None
    assert job.title == req.job_title
