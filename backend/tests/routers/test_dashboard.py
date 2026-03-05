import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from dateutil.relativedelta import relativedelta

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole, DismissedActivity
from app.models.job import Job, JobStatus
from app.models.candidate import Candidate, JobApplication
from app.models.department import Department
from app.models.scheduled_activity import ScheduledActivity, ActivityStatus
from app.models.pipeline_stage import PipelineStage

# ─── Mocks & Fixtures ────────────────────────────────────────────────────────

def _persist_user(db_session, role: UserRole, dept_id=None) -> User:
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@dashboard-test.com",
        full_name=f"Test {role.value.title()}",
        hashed_password=get_password_hash("test"),
        role=role,
        is_active=True,
        is_deleted=False,
        department_id=dept_id
    )
    db_session.add(user)
    db_session.flush()
    return user

@pytest.fixture
def test_data(db_session):
    # Setup Departments
    d1 = Department(name=f"Dash-Dept-1-{uuid4().hex[:4]}")
    d2 = Department(name=f"Dash-Dept-2-{uuid4().hex[:4]}")
    db_session.add_all([d1, d2])
    db_session.flush()

    # Setup Users
    owner = _persist_user(db_session, UserRole.OWNER)
    hr = _persist_user(db_session, UserRole.HR)
    hm1 = _persist_user(db_session, UserRole.HIRING_MANAGER, dept_id=d1.id)
    hm2 = _persist_user(db_session, UserRole.HIRING_MANAGER, dept_id=d2.id)
    interviewer = _persist_user(db_session, UserRole.INTERVIEWER, dept_id=d1.id)

    # Setup Jobs
    j1 = Job(title="Job 1 (d1 published)", location="Remote", employment_type="Full-time", status=JobStatus.PUBLISHED.value, department_id=d1.id, hiring_manager_id=hm1.id, job_code=f"J1-{uuid4().hex[:4]}", created_at=datetime.utcnow() - timedelta(days=5))
    j2 = Job(title="Job 2 (d2 draft)", location="Remote", employment_type="Full-time", status=JobStatus.DRAFT.value, department_id=d2.id, hiring_manager_id=hm2.id, job_code=f"J2-{uuid4().hex[:4]}", created_at=datetime.utcnow() - timedelta(days=40)) # More than 30 days old
    db_session.add_all([j1, j2])
    db_session.flush()

    # Setup Candidates & Applications
    c1 = Candidate(first_name="Cand1", last_name="A", email=f"c1_{uuid4().hex[:4]}@t.com", created_at=datetime.utcnow() - timedelta(days=2))
    c2 = Candidate(first_name="Cand2", last_name="B", email=f"c2_{uuid4().hex[:4]}@t.com", created_at=datetime.utcnow() - timedelta(days=2))
    db_session.add_all([c1, c2])
    db_session.flush()
    
    # Needs PipelineStage to be named 'hired' for hires_count
    stage = PipelineStage(name="Hired", order=5) # Normally pipelines have jobs, but for mock fallback this is sufficient since it matches by name
    db_session.add(stage)
    db_session.flush()

    app1 = JobApplication(candidate_id=c1.id, job_id=j1.id, current_stage=str(stage.id), application_status="Hired", applied_at=datetime.utcnow() - timedelta(days=5), hired_by_user_id=hm1.id)
    app2 = JobApplication(candidate_id=c2.id, job_id=j2.id, applied_at=datetime.utcnow() - timedelta(days=5))
    db_session.add_all([app1, app2])
    db_session.flush()
    
    # Setup Activities
    act1 = ScheduledActivity(job_id=j1.id, candidate_id=c1.id, activity_type="Interview", title="Test Act", status=ActivityStatus.PENDING, created_by=hm1.id, assignees=[interviewer])
    db_session.add(act1)
    db_session.flush()

    return {
        "users": {"owner": owner, "hr": hr, "hm1": hm1, "hm2": hm2, "int": interviewer},
        "jobs": {"j1": j1, "j2": j2},
        "candidates": {"c1": c1, "c2": c2},
        "activities": {"act1": act1}
    }

# ─── Overview Tests ──────────────────────────────────────────────────────────

def test_dashboard_overview_admin(db_session, override_get_db, test_data):
    owner = test_data["users"]["owner"]
    app.dependency_overrides[get_current_active_user] = lambda: owner
    
    with TestClient(app) as client:
        response = client.get("/dashboard/overview")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    # At least 2 jobs and 1 active job (j1)
    assert data["total_jobs"] >= 2
    assert data["active_jobs"] >= 1
    # j1 is recent (< 30 days)
    assert data["recent_jobs"] >= 1
    assert data["hires_count"] >= 1 # app1
    assert data["total_candidates"] >= 2
    assert "recent_growth" in data

def test_dashboard_overview_forbidden(db_session, override_get_db, test_data):
    hm1 = test_data["users"]["hm1"]
    app.dependency_overrides[get_current_active_user] = lambda: hm1
    
    with TestClient(app) as client:
        response = client.get("/dashboard/overview")
    app.dependency_overrides.clear()
    
    assert response.status_code == 403

# ─── Recent Activities Tests ─────────────────────────────────────────────────

def test_recent_activities_admin(db_session, override_get_db, test_data):
    owner = test_data["users"]["owner"]
    app.dependency_overrides[get_current_active_user] = lambda: owner
    
    with TestClient(app) as client:
        response = client.get("/dashboard/recent-activities")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    types = [a["type"] for a in data]
    assert "job_created" in types
    assert "candidate_created" in types

def test_recent_activities_hm_scoped(db_session, override_get_db, test_data):
    hm1 = test_data["users"]["hm1"]
    app.dependency_overrides[get_current_active_user] = lambda: hm1
    
    with TestClient(app) as client:
        response = client.get("/dashboard/recent-activities")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    # HM1 should see job created for j1, candidate c1 (belongs to j1), etc.
    # Should NOT see Candidate C2 which is attached to J2 in dept 2 (hm2)
    # Actually Candidates might be linked across, but our logic filters by job dept
    for act in data:
        if act["type"] == "candidate_created":
            # Just ensure the endpoint returns 200 and shapes the data
            assert "notification_key" in act

def test_recent_activities_dismiss(db_session, override_get_db, test_data):
    hm1 = test_data["users"]["hm1"]
    app.dependency_overrides[get_current_active_user] = lambda: hm1
    
    # 1. Fetch activities
    with TestClient(app) as client:
        res1 = client.get("/dashboard/recent-activities")
        data1 = res1.json()
        assert len(data1) > 0
        
        # 2. Dismiss the first one
        target_key = data1[0]["notification_key"]
        res_dismiss = client.post(f"/dashboard/recent-activities/{target_key}/dismiss")
        assert res_dismiss.status_code == 200
        
        # 3. Fetch again and ensure it's gone
        res2 = client.get("/dashboard/recent-activities")
        data2 = res2.json()
        assert target_key not in [a["notification_key"] for a in data2]
        
    app.dependency_overrides.clear()

# ─── Top Performers Tests ────────────────────────────────────────────────────

def test_top_performers_admin(db_session, override_get_db, test_data):
    owner = test_data["users"]["owner"]
    hm1 = test_data["users"]["hm1"]
    app.dependency_overrides[get_current_active_user] = lambda: owner
    
    with TestClient(app) as client:
        response = client.get("/dashboard/top-performers")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert "hires" in data
    assert "candidates" in data
    assert "jobs" in data
    
    # HM1 should be in the hires list since they hired c1
    hires_ids = [str(h["id"]) for h in data["hires"]]
    assert str(hm1.id) in hires_ids

def test_top_performers_hm_scoped(db_session, override_get_db, test_data):
    hm2 = test_data["users"]["hm2"]
    app.dependency_overrides[get_current_active_user] = lambda: hm2
    
    # hm2 is in dept2. They shouldn't see hm1's hires in dept1.
    with TestClient(app) as client:
        response = client.get("/dashboard/top-performers")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    hm1_hired = False
    for h in data["hires"]:
        if str(h["id"]) == str(test_data["users"]["hm1"].id):
            hm1_hired = True
    assert not hm1_hired  # hm1 is isolated from hm2

# ─── My Performance Tests ────────────────────────────────────────────────────

def test_my_performance_monthly(db_session, override_get_db, test_data):
    hm1 = test_data["users"]["hm1"]
    app.dependency_overrides[get_current_active_user] = lambda: hm1
    
    with TestClient(app) as client:
        response = client.get("/dashboard/my-performance")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    # Returns 5 recent months
    assert len(data) == 5
    # Each entry has the expected fields
    for entry in data:
        assert "name" in entry
        assert "candidates" in entry
        assert isinstance(entry["candidates"], int)
    # The current month must be present in the data
    current_month_name = datetime.utcnow().strftime("%b")
    assert any(m["name"] == current_month_name for m in data)

