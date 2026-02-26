import requests
import json

# 1. Login
r = requests.post("http://localhost:8000/token", data={"username": "namisha.naseem@clustox.com", "password": "password123"})
print(f"Login: {r.status_code}")
token = r.json()["access_token"]

# 2. Hit /authorize — get the redirect URL
r2 = requests.get(f"http://localhost:8000/api/calendar/authorize?token={token}", allow_redirects=False)
auth_url = r2.headers.get('Location', '')
print(f"Auth URL: {auth_url[:100]}...")

# 3. Check if the URL looks correct
import urllib.parse
parsed = urllib.parse.urlparse(auth_url)
params = urllib.parse.parse_qs(parsed.query)
print(f"State: {params.get('state', ['?'])[0]}")
print(f"Redirect URI: {params.get('redirect_uri', ['?'])[0]}")
print(f"Scopes: {params.get('scope', ['?'])[0]}")
