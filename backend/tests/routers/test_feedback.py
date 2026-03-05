import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.scheduled_activity import ScheduledActivity, ActivityStatus
from app.models.feedback import Feedback

# ─── Mocks & Fixtures ────────────────────────────────────────────────────────

def _persist_user(db_session, role: UserRole) -> User:
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@feedback-test.com",
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
def test_job(db_session):
    from app.models.department import Department
    from app.models.job import Job
    d = Department(name=f"Fb-Test-Dept-{uuid4().hex[:4]}")
    db_session.add(d)
    db_session.flush()
    j = Job(title="Test Job", location="Remote", employment_type="Full-time", department_id=d.id, job_code=f"J-{uuid4().hex[:4]}")
    db_session.add(j)
    db_session.flush()
    return j

@pytest.fixture
def test_candidate(db_session, test_job):
    from app.models.candidate import Candidate, JobApplication
    c = Candidate(first_name="Test", last_name="Cand", email=f"cand_{uuid4().hex[:4]}@test.com")
    db_session.add(c)
    db_session.flush()
    ja = JobApplication(candidate_id=c.id, job_id=test_job.id)
    db_session.add(ja)
    db_session.flush()
    return c

@pytest.fixture
def test_activity(db_session, test_job, test_candidate):
    owner = _persist_user(db_session, UserRole.OWNER)
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    act = ScheduledActivity(
        job_id=test_job.id,
        candidate_id=test_candidate.id,
        activity_type="Interview",
        title="Initial Screen",
        status=ActivityStatus.PENDING,
        created_by=owner.id,
        scheduled_at=datetime.now() + timedelta(days=1),
        assignees=[interviewer]
    )
    db_session.add(act)
    db_session.flush()
    return act, owner, interviewer

# ─── Tests ───────────────────────────────────────────────────────────────────

def test_create_feedback_success_assigned(db_session, override_get_db, test_activity, test_candidate):
    act, owner, interviewer = test_activity
    # Must be assigned to create feedback
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    
    payload = {
        "activity_id": str(act.id),
        "candidate_id": str(test_candidate.id),
        "overall_score": 4,
        "recommendation": "Strong Hire",
        "scorecard": [
            {"criteria": "Communication", "score": 5, "comment": "Great"}
        ],
        "comments": "Good candidate overall."
    }
    
    with TestClient(app) as client:
        response = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 201
    data = response.json()
    assert data["overall_score"] == 4
    assert data["recommendation"] == "Strong Hire"
    assert data["interviewer_id"] == str(interviewer.id)

    # Activity auto-completes on feedback
    db_session.refresh(act)
    assert act.status == ActivityStatus.COMPLETED

def test_create_feedback_forbidden_not_assigned(db_session, override_get_db, test_activity, test_candidate):
    act, owner, interviewer = test_activity
    unassigned_interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: unassigned_interviewer
    
    payload = {
        "activity_id": str(act.id),
        "candidate_id": str(test_candidate.id),
        "overall_score": 3,
        "recommendation": "Hire",
        "scorecard": []
    }
    
    with TestClient(app) as client:
        response = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 403
    assert "Not assigned" in response.json()["detail"]

def test_create_feedback_success_hr_bypass(db_session, override_get_db, test_activity, test_candidate):
    act, owner, interviewer = test_activity
    unassigned_hr = _persist_user(db_session, UserRole.HR)
    # HR should be allowed to bypass assignee check
    app.dependency_overrides[get_current_active_user] = lambda: unassigned_hr
    
    payload = {
        "activity_id": str(act.id),
        "candidate_id": str(test_candidate.id),
        "overall_score": 5,
        "recommendation": "Strong Hire",
        "scorecard": []
    }
    
    with TestClient(app) as client:
        response = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 201

def test_update_existing_feedback(db_session, override_get_db, test_activity, test_candidate):
    act, owner, interviewer = test_activity
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    
    payload = {
        "activity_id": str(act.id),
        "candidate_id": str(test_candidate.id),
        "overall_score": 2,
        "recommendation": "No Hire",
        "scorecard": []
    }
    
    # Create first time
    with TestClient(app) as client:
        res1 = client.post("/feedbacks/", json=payload)
    
    assert res1.status_code == 201
    feedback_id = res1.json()["id"]
    
    # Submit again to trigger update branch
    payload["overall_score"] = 5
    payload["recommendation"] = "Hire"
    
    with TestClient(app) as client:
        res2 = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert res2.status_code == 201
    assert res2.json()["id"] == feedback_id # Should retain the ID
    assert res2.json()["overall_score"] == 5
    
    # Ensure there isn't a duplicate row
    count = db_session.query(Feedback).filter(Feedback.activity_id == act.id).count()
    assert count == 1

def test_get_candidate_feedbacks(db_session, override_get_db, test_activity, test_candidate):
    act, owner, interviewer = test_activity
    
    f1 = Feedback(
        activity_id=act.id,
        candidate_id=test_candidate.id,
        interviewer_id=interviewer.id,
        overall_score=4,
        recommendation="Hire",
        scorecard=[]
    )
    db_session.add(f1)
    db_session.commit()
    
    app.dependency_overrides[get_current_active_user] = lambda: owner
    with TestClient(app) as client:
        response = client.get(f"/feedbacks/candidate/{test_candidate.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(f1.id)

def test_get_individual_feedback(db_session, override_get_db, test_activity, test_candidate):
    act, owner, interviewer = test_activity
    
    f1 = Feedback(
        activity_id=act.id,
        candidate_id=test_candidate.id,
        interviewer_id=interviewer.id,
        overall_score=4,
        recommendation="Hire",
        scorecard=[]
    )
    db_session.add(f1)
    db_session.commit()
    
    app.dependency_overrides[get_current_active_user] = lambda: owner
    with TestClient(app) as client:
        response = client.get(f"/feedbacks/{f1.id}")
        not_found = client.get(f"/feedbacks/{uuid4()}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json()["id"] == str(f1.id)
    assert response.json()["interviewer"]["id"] == str(interviewer.id)
    
    assert not_found.status_code == 404

def test_update_feedback_forbidden_not_assigned(db_session, override_get_db, test_activity, test_candidate):
    act, owner, interviewer = test_activity
    
    f1 = Feedback(
        activity_id=act.id,
        candidate_id=test_candidate.id,
        interviewer_id=interviewer.id,
        overall_score=4,
        recommendation="Hire",
        scorecard=[]
    )
    db_session.add(f1)
    db_session.commit()
    
    unassigned_interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: unassigned_interviewer
    
    payload = {
        "activity_id": str(act.id),
        "candidate_id": str(test_candidate.id),
        "overall_score": 2,
        "recommendation": "No Hire",
        "scorecard": []
    }
    
    with TestClient(app) as client:
        response = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 403

def test_create_feedback_activity_not_found(db_session, override_get_db, test_candidate):
    owner = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: owner
    
    payload = {
        "activity_id": str(uuid4()),
        "candidate_id": str(test_candidate.id),
        "overall_score": 4,
        "recommendation": "Hire",
        "scorecard": []
    }
    
    with TestClient(app) as client:
        response = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 404
    assert "Activity not found" in response.json()["detail"]

def test_create_feedback_db_integrity_error(db_session, override_get_db, test_activity, test_candidate, mocker):
    act, owner, interviewer = test_activity
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    
    payload = {
        "activity_id": str(act.id),
        "candidate_id": str(test_candidate.id),
        "overall_score": 4,
        "recommendation": "Strong Hire",
        "scorecard": []
    }
    
    from sqlalchemy import exc
    mocker.patch("sqlalchemy.orm.Session.commit", side_effect=exc.IntegrityError("val", "param", "orig"))
    
    with TestClient(app) as client:
        response = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 400
    assert "Database constraint violation" in response.json()["detail"]

def test_create_feedback_general_exception(db_session, override_get_db, test_activity, test_candidate, mocker):
    act, owner, interviewer = test_activity
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    
    payload = {
        "activity_id": str(act.id),
        "candidate_id": str(test_candidate.id),
        "overall_score": 4,
        "recommendation": "Strong Hire",
        "scorecard": []
    }
    
    mocker.patch("sqlalchemy.orm.Session.commit", side_effect=Exception("DB down"))
    
    with TestClient(app) as client:
        response = client.post("/feedbacks/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 500
    assert "Failed to submit feedback" in response.json()["detail"]

def test_unauthenticated_requests(override_get_db):
    app.dependency_overrides.clear()
    
    with TestClient(app) as client:
        res1 = client.post("/feedbacks/", json={})
        
    assert res1.status_code == 401
