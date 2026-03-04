import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.pipeline_template import PipelineTemplate
from app.models.pipeline_stage import PipelineStage

def _persist_user(db_session, role: UserRole) -> User:
    from app.core.security import get_password_hash
    user = User(
        email=f"{role.value}.{uuid4().hex[:6]}@pipeline-test.com",
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
    template = PipelineTemplate(
        name="Standard Tech Pipeline",
        description="Default tech pipeline",
        is_default=False
    )
    db_session.add(template)
    db_session.flush()
    return template

@pytest.fixture
def test_stage(db_session, test_template):
    stage = PipelineStage(
        name="Initial Screening",
        order=1,
        color="#3498db",
        pipeline_template_id=test_template.id
    )
    db_session.add(stage)
    db_session.flush()
    return stage

# --- Templates ---

def test_get_pipeline_templates(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get("/pipeline/templates")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(t["id"] == str(test_template.id) for t in data)

def test_create_pipeline_template(db_session, override_get_db):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "New Template",
        "description": "A fresh new template",
        "is_default": True
    }
    
    with TestClient(app) as client:
        response = client.post("/pipeline/templates", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Template"
    assert data["is_default"] == True

def test_update_pipeline_template(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "Updated Tech Pipeline",
        "description": "Updated desc",
        "is_default": False
    }
    
    with TestClient(app) as client:
        response = client.put(f"/pipeline/templates/{test_template.id}", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Tech Pipeline"

def test_delete_pipeline_template(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.delete(f"/pipeline/templates/{test_template.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 204
    
    # Verify it's gone
    deleted = db_session.query(PipelineTemplate).filter_by(id=test_template.id).first()
    assert deleted is None

def test_delete_default_template_fails(db_session, override_get_db):
    template = PipelineTemplate(name="Default Tpl", is_default=True)
    db_session.add(template)
    db_session.flush()
    
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.delete(f"/pipeline/templates/{template.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 400
    assert "Cannot delete default template" in response.json()["detail"]

# --- Stages ---

def test_get_pipeline_stages(db_session, override_get_db, test_template, test_stage):
    user = _persist_user(db_session, UserRole.INTERVIEWER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.get(f"/pipeline/stages?template_id={test_template.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(s["id"] == str(test_stage.id) for s in data)

def test_create_pipeline_stage(db_session, override_get_db, test_template):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "Technical Interview",
        "order": 2,
        "color": "#e74c3c",
        "pipeline_template_id": str(test_template.id)
    }
    
    with TestClient(app) as client:
        response = client.post("/pipeline/stages", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Technical Interview"
    assert data["order"] == 2

def test_update_pipeline_stage(db_session, override_get_db, test_stage):
    user = _persist_user(db_session, UserRole.HR)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    payload = {
        "name": "Updated Screening",
        "order": 1,
        "color": "#2ecc71"
    }
    
    with TestClient(app) as client:
        response = client.put(f"/pipeline/stages/{test_stage.id}", json=payload)
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Screening"
    assert data["color"] == "#2ecc71"

def test_delete_pipeline_stage(db_session, override_get_db, test_stage):
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.delete(f"/pipeline/stages/{test_stage.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 204
    
    # Verify it's gone
    deleted = db_session.query(PipelineStage).filter_by(id=test_stage.id).first()
    assert deleted is None

def test_delete_default_stage_fails(db_session, override_get_db, test_template):
    stage = PipelineStage(name="Default Stg", order=1, is_default=True, pipeline_template_id=test_template.id)
    db_session.add(stage)
    db_session.flush()
    
    user = _persist_user(db_session, UserRole.OWNER)
    app.dependency_overrides[get_current_active_user] = lambda: user
    
    with TestClient(app) as client:
        response = client.delete(f"/pipeline/stages/{stage.id}")
    app.dependency_overrides.clear()
    
    assert response.status_code == 400
    assert "Cannot delete default stage" in response.json()["detail"]
