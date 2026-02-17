import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from app.database import engine

with engine.connect() as connection:
    result = connection.execute(text("SELECT version_num FROM alembic_version"))
    for row in result:
        print(f"Current Alembic Version: {row[0]}")
