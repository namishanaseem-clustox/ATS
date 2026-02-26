import requests

# 1. Login as Admin
data = {"username": "admin@clustox.com", "password": "password123"}
r = requests.post("http://localhost:8000/api/auth/token", data=data)
token = r.json()["access_token"]
print("Got token")

# 2. Get Users
r2 = requests.get("http://localhost:8000/api/users", headers={"Authorization": f"Bearer {token}"})
users = r2.json()
target_user = next(u for u in users if u["email"] == "namisha.naseem@clustox.com")

# 3. Check Availability for target user
# Note the UTC time matching the user's conflicting time! (12:30 PM to 1:00 PM GMT+5 -> 7:30 to 8:00 UTC)
payload = {
    "user_ids": [target_user["id"]],
    "timeMin": "2026-02-26T07:30:00.000Z",
    "timeMax": "2026-02-26T08:00:00.000Z"
}
r3 = requests.post(
    "http://localhost:8000/api/calendar/availability",
    json=payload,
    headers={"Authorization": f"Bearer {token}"}
)
print("Availability Response:")
print(r3.json())
