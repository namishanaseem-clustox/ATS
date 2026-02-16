import requests
import json

BASE_URL = "http://localhost:8000"
TOKEN_URL = f"{BASE_URL}/token"
USERS_URL = f"{BASE_URL}/users"

# Login as owner
payload = {
    "username": "owner@clustox.com",
    "password": "password123"
}
response = requests.post(TOKEN_URL, data=payload)
if response.status_code != 200:
    print(f"Failed to login as owner: {response.text}")
    exit(1)

token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Get all users
response = requests.get(USERS_URL, headers=headers)
if response.status_code != 200:
    print(f"Failed to get users: {response.text}")
    exit(1)

users = response.json()
hiring_managers = [u for u in users if u["role"] == "hiring_manager"]

if hiring_managers:
    print(f"Found {len(hiring_managers)} hiring managers.")
    for hm in hiring_managers:
        print(f" - {hm['email']} (ID: {hm['id']})")
else:
    print("No hiring managers found. Creating one...")
    new_user = {
        "email": "manager3@clustox.com",
        "password": "password123",
        "full_name": "Test Hiring Manager",
        "role": "hiring_manager"
    }
    create_resp = requests.post(USERS_URL, json=new_user, headers=headers)
    if create_resp.status_code == 200:
        print("Created manager3@clustox.com")
    else:
        print(f"Failed to create user: {create_resp.text}")
