from app.database import engine
from sqlalchemy import text

# Downgrade alembic version to previous migration
with engine.connect() as conn:
    conn.execute(text("UPDATE alembic_version SET version_num = '9c0f702d3178'"))
    conn.commit()
    print("Alembic version reset to 9c0f702d3178")
