import os
import pytest
from sqlalchemy import create_engine, event
from alembic.config import Config
from alembic import command
from typing import Generator
from unittest.mock import patch

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
    Provides a transactional scope using nested transactions (SAVEPOINTs).
    
    Services that call db.commit() are redirected to flush + restart the
    nested transaction, so the outer transaction can still rollback cleanly
    after each test, ensuring full isolation.
    """
    engine = create_engine(TEST_DATABASE_URL)
    connection = engine.connect()
    # Begin outer transaction — will be rolled back at end of test
    transaction = connection.begin()
    
    session = SessionLocal(bind=connection)
    
    # Start a SAVEPOINT nested transaction
    session.begin_nested()
    
    # Whenever session.commit() is called by service code, instead of
    # committing to the outer transaction, we flush and restart the savepoint.
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.begin_nested()
    
    yield session
    
    # Rollback the outer transaction — this undoes everything done in the test
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
