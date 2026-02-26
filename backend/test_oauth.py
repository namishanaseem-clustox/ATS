import requests

# 1. Login
r = requests.post("http://localhost:8000/token", data={"username": "namisha.naseem@clustox.com", "password": "password123"})
token = r.json()["access_token"]

# 2. Hit /authorize
r2 = requests.get(f"http://localhost:8000/api/calendar/authorize?token={token}", allow_redirects=False)
if str(r2.status_code).startswith('3'):
    print("Authorize Redirect URL:")
    print(r2.headers['Location'])
else:
    print(f"Failed to authorize: {r2.status_code} {r2.text}")
