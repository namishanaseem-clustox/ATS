from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'"))
        for row in res:
            print(f"{row[0]}: {row[1]}")
            
        res2 = conn.execute(text("SELECT email, role FROM users LIMIT 5"))
        for row in res2:
            print(row)
except Exception as e:
    print(f"Error: {e}")
