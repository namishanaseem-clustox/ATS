from app.database import engine
from sqlalchemy import inspect, text

# Check tables
inspector = inspect(engine)
tables = inspector.get_table_names()
print("Current tables:", tables)

# Check alembic version
with engine.connect() as conn:
    result = conn.execute(text("SELECT version_num FROM alembic_version"))
    version = result.fetchone()
    print("Current alembic version:", version[0] if version else "None")
