from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("UPDATE users SET role = 'OWNER' WHERE email LIKE 'owner%'"))
            conn.execute(text("UPDATE users SET role = 'HR' WHERE email LIKE 'hr%'"))
            conn.execute(text("UPDATE users SET role = 'HIRING_MANAGER' WHERE email LIKE 'manager%'"))
            print("Roles updated successfully.")
            
        res = conn.execute(text("SELECT email, role FROM users LIMIT 10"))
        for row in res:
            print(row)
except Exception as e:
    print(f"Error: {e}")
