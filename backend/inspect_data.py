
from app.database import SessionLocal
from app.models.user import User
from app.models.department import Department

db = SessionLocal()

with open("debug_output.txt", "w") as f:
    f.write("--- DEPARTMENTS ---\n")
    depts = db.query(Department).all()
    for d in depts:
        owner_name = d.owner.full_name if d.owner else "None"
        f.write(f"ID: {d.id} | Name: {d.name} | Status: {d.status} | OwnerID: {d.owner_id} ({owner_name})\n")

    f.write("\n--- USERS ---\n")
    users = db.query(User).all()
    for u in users:
        dept_name = u.department.name if u.department else "None"
        managed = [d.name for d in u.managed_departments]
        f.write(f"ID: {u.id} | Name: {u.full_name} | Role: {u.role} | DeptID: {u.department_id} ({dept_name}) | Managed: {managed}\n")
