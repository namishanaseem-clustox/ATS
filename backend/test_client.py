from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Login
r = client.post("/token", data={"username": "namisha.naseem@clustox.com", "password": "password123"})
token = r.json()["access_token"]

# Get users
r2 = client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
data = r2.json()
users = data.get("items", data) # handle if it's paginated
target_user = next(u for u in users if u["email"] == "namisha.naseem@clustox.com")

# Availability check
payload = {
    "user_ids": [target_user["id"]],
    "timeMin": "2026-02-26T07:30:00.000Z",
    "timeMax": "2026-02-26T08:00:00.000Z"
}
r3 = client.post(
    "/api/calendar/availability",
    json=payload,
    headers={"Authorization": f"Bearer {token}"}
)
print("Availability Response:")
print(r3.json())
