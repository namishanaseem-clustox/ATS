import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from app.database import engine

def fix_version():
    with engine.connect() as connection:
        with connection.begin():
            connection.execute(text("DELETE FROM alembic_version"))
            connection.execute(text("INSERT INTO alembic_version (version_num) VALUES ('8342d0c9a488')"))
            print("Forced alembic version to 8342d0c9a488")

if __name__ == "__main__":
    fix_version()
