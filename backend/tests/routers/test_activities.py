import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.scheduled_activity import ScheduledActivity, ActivityStatus

def _persist_user(db_session, role: UserRole) -> User:
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@activity-test.com",
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
    d = Department(name=f"Act-Test-Dept-{uuid4().hex[:4]}")
    db_session.add(d)
    db_session.flush()
    j = Job(title="Test Job", location="Remote", employment_type="Full-time", department_id=d.id, job_code="J1")
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
    act = ScheduledActivity(
        job_id=test_job.id,
        candidate_id=test_candidate.id,
        activity_type="Interview",
        title="Initial Screen",
        status=ActivityStatus.PENDING,
        created_by=owner.id,
        scheduled_at=datetime.now() + timedelta(days=1)
    )
    db_session.add(act)
    db_session.flush()
    return act, owner

def test_create_activity(db_session, override_get_db, test_job, test_candidate):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "job_id": str(test_job.id),
        "candidate_id": str(test_candidate.id),
        "activity_type": "Interview",
        "title": "Technical Interview",
        "assignee_ids": [str(user.id)]
    }
    
    with TestClient(app) as client:
        response = client.post("/activities/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 201
    assert response.json()["title"] == "Technical Interview"
    assert len(response.json()["assignees"]) == 1

def test_create_activity_forbidden_interviewer(db_session, override_get_db, test_job, test_candidate):
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "title": "Sneaky Interview",
        "activity_type": "Interview"
    }
    
    with TestClient(app) as client:
        response = client.post("/activities/", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 403

def test_get_all_activities(db_session, override_get_db, test_activity):
    act, creator = test_activity
    user = _persist_user(db_session, UserRole.HR) # HR can see all
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get("/activities/all")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(a["id"] == str(act.id) for a in data)

def test_get_my_interviews(db_session, override_get_db, test_activity):
    act, creator = test_activity
    
    # Assign an interviewer
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    act.assignees.append(interviewer)
    db_session.flush()

    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as client:
        response = client.get("/activities/my-interviews")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(a["id"] == str(act.id) for a in data)

def test_get_activities_by_job(db_session, override_get_db, test_job, test_activity):
    act, creator = test_activity
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get(f"/activities/job/{test_job.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(a["job_id"] == str(test_job.id) for a in data)

def test_get_activities_by_candidate(db_session, override_get_db, test_candidate, test_activity):
    act, creator = test_activity
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get(f"/activities/candidate/{test_candidate.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(a["candidate"]["id"] == str(test_candidate.id) for a in data)

def test_get_activity(db_session, override_get_db, test_activity):
    act, creator = test_activity
    app.dependency_overrides[get_current_active_user] = lambda: creator
    
    with TestClient(app) as client:
        response = client.get(f"/activities/{act.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json()["title"] == act.title

def test_update_activity(db_session, override_get_db, test_activity):
    act, creator = test_activity
    app.dependency_overrides[get_current_active_user] = lambda: creator
    
    payload = {
        "title": "Updated Title",
        "status": ActivityStatus.COMPLETED.value
    }
    
    with TestClient(app) as client:
        response = client.put(f"/activities/{act.id}", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["status"] == ActivityStatus.COMPLETED.value

def test_delete_activity(db_session, override_get_db, test_activity):
    act, creator = test_activity
    app.dependency_overrides[get_current_active_user] = lambda: creator
    
    with TestClient(app) as client:
        response = client.delete(f"/activities/{act.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 204
    deleted = db_session.query(ScheduledActivity).filter_by(id=act.id).first()
    assert deleted is None

def test_get_all_activities_hiring_manager(db_session, override_get_db, test_activity, test_job):
    act, creator = test_activity
    hm = _persist_user(db_session, UserRole.HIRING_MANAGER)
    hm.department_id = test_job.department_id
    db_session.commit()
    
    app.dependency_overrides[get_current_active_user] = lambda: hm
    
    with TestClient(app) as client:
        response = client.get("/activities/all")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(a["id"] == str(act.id) for a in data)

def test_get_all_activities_interviewer(db_session, override_get_db, test_activity):
    act, creator = test_activity
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    
    # Should not see it initially
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as client:
        response = client.get("/activities/all")
    assert response.status_code == 200
    assert len(response.json()) == 0
    
    # Assign and should see it
    act.assignees.append(interviewer)
    db_session.flush()
    
    with TestClient(app) as client:
        response = client.get("/activities/all")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert any(a["id"] == str(act.id) for a in response.json())

def test_get_activities_by_job_interviewer(db_session, override_get_db, test_job, test_activity, test_candidate):
    act, creator = test_activity
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    
    # Create a note
    note = ScheduledActivity(
        job_id=test_job.id,
        candidate_id=test_candidate.id,
        activity_type="Note",
        title="Test Note",
        status=ActivityStatus.COMPLETED,
        created_by=creator.id,
        scheduled_at=datetime.now()
    )
    db_session.add(note)
    db_session.flush()

    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as client:
        response = client.get(f"/activities/job/{test_job.id}")
    
    assert response.status_code == 200
    data = response.json()
    # Should see the note, but not the unassigned interview
    assert len(data) == 1
    assert data[0]["id"] == str(note.id)
    
    # Assign the interview
    act.assignees.append(interviewer)
    db_session.flush()
    
    with TestClient(app) as client:
        response = client.get(f"/activities/job/{test_job.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert len(response.json()) == 2

def test_get_activity_not_found(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get(f"/activities/{uuid4()}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 404

def test_get_activity_forbidden_interviewer(db_session, override_get_db, test_activity):
    act, creator = test_activity
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    
    with TestClient(app) as client:
        response = client.get(f"/activities/{act.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 403

def test_update_activity_not_found(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {"title": "Updated Title"}
    
    with TestClient(app) as client:
        response = client.put(f"/activities/{uuid4()}", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 404

def test_delete_activity_not_found(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.delete(f"/activities/{uuid4()}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 404

def test_delete_activity_forbidden_interviewer(db_session, override_get_db, test_activity):
    act, creator = test_activity
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER)
    
    # Ensure it's not a note
    assert act.activity_type != "Note"
    
    app.dependency_overrides[get_current_active_user] = lambda: interviewer
    with TestClient(app) as client:
        response = client.delete(f"/activities/{act.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 403
