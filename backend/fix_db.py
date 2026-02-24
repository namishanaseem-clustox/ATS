from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        # Recreate the userrole ENUM if it was dropped
        try:
            with conn.begin():
                conn.execute(text("CREATE TYPE userrole AS ENUM ('OWNER', 'HR', 'HIRING_MANAGER', 'INTERVIEWER')"))
                print("Created userrole ENUM")
        except Exception as e:
            print("ENUM already exists or error:", e)

        # Add the role column back to the users table
        try:
            with conn.begin():
                conn.execute(text("ALTER TABLE users ADD COLUMN role userrole NOT NULL DEFAULT 'INTERVIEWER'"))
                print("Added role column back to users table")
        except Exception as e:
            print("Column might already exist or error:", e)

except Exception as e:
    print(f"Error: {e}")
