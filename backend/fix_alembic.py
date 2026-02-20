from sqlalchemy import text
from app.database import engine

def fix_alembic_version():
    with engine.connect() as conn:
        conn.execute(text("UPDATE alembic_version SET version_num = 'b3790e838679';"))
        conn.commit()
    print("Updated alembic_version to 'b3790e838679'")

if __name__ == "__main__":
    fix_alembic_version()
