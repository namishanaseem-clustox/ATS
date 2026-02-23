from sqlalchemy import text
from app.database import engine

with engine.begin() as con:
    con.execute(text("UPDATE job_requisitions SET status = 'Approved' WHERE status = 'Open'"))
print("Done")
