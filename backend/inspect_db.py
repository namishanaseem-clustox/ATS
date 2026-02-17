import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from app.database import engine

def check_table():
    with engine.connect() as connection:
        try:
            connection.execute(text("SELECT count(*) FROM candidates"))
            print("Candidates table EXISTS")
            with open("/tmp/db_check.txt", "w") as f:
                f.write("Candidates table EXISTS\n")
        except Exception as e:
            print(f"Candidates table check FAILED: {e}")
            with open("/tmp/db_check.txt", "w") as f:
                f.write(f"Candidates table check FAILED: {e}\n")

if __name__ == "__main__":
    check_table()
