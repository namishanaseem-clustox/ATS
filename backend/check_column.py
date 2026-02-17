import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import text
from app.database import engine

def check_column():
    with engine.connect() as connection:
        try:
            # Query pg_attribute to check for column existence safely
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='job_applications' AND column_name='ai_score'"
            ))
            if result.fetchone():
                print("Column 'ai_score' EXISTS")
                with open("/tmp/col_check.txt", "w") as f:
                    f.write("Column 'ai_score' EXISTS\n")
            else:
                print("Column 'ai_score' MISSING")
                with open("/tmp/col_check.txt", "w") as f:
                    f.write("Column 'ai_score' MISSING\n")
        except Exception as e:
            print(f"Check FAILED: {e}")
            with open("/tmp/col_check.txt", "w") as f:
                f.write(f"Check FAILED: {e}\n")

if __name__ == "__main__":
    check_column()
