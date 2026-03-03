import os
import pytest
from sqlalchemy import create_engine
from alembic.config import Config
from alembic import command
from typing import Generator

# IMPORTANT: Set this BEFORE importing any app modules
TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost/clustox_test_db"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.database import Base, get_db, SessionLocal
from app.main import app

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Creates the test database and runs all migrations.
    This happens exactly once per test session.
    """
    engine = create_engine(TEST_DATABASE_URL)
    
    # Database is handled outside tests now for stability
        
    # Run Alembic migrations
    # alembic_cfg = Config("alembic.ini")
    # command.upgrade(alembic_cfg, "head")
    
    yield
    
    # Optionally drop the database after all tests (commented out for debugging)
    # drop_database(engine.url)

@pytest.fixture(scope="function")
def db_session() -> Generator:
    """
    Provides a transactional scope around a series of operations.
    Rolls back the transaction after the test to ensure a clean slate.
    """
    engine = create_engine(TEST_DATABASE_URL)
    connection = engine.connect()
    transaction = connection.begin()
    
    # Bind session to our connection
    session = SessionLocal(bind=connection)
    
    yield session
    
    # Rollback and clean up after test
    session.close()
    transaction.rollback()
    connection.close()
    engine.dispose()

@pytest.fixture(scope="function")
def override_get_db(db_session):
    """
    Overrides the FastAPI dependency so routes use our transactional session.
    """
    def _override_get_db():
        yield db_session
        
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()
