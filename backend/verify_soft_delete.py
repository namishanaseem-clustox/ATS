import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def login(email, password):
    response = requests.post(f"{BASE_URL}/token", data={"username": email, "password": password})
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def create_user(token, email, role="HIRING_MANAGER"):
    headers = {"Authorization": f"Bearer {token}"}
    data = {"email": email, "password": "password123", "full_name": "Test User", "role": role}
    response = requests.post(f"{BASE_URL}/users", json=data, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Create user failed: {response.text}")
        return None

def delete_user(token, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(f"{BASE_URL}/users/{user_id}", headers=headers)
    return response.status_code

def get_users(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Get users failed: {response.text}")
        return []

def verify():
    # Login as Owner
    token = login("owner@clustox.com", "owner123")
    if not token:
        sys.exit(1)

    # Create a user to delete
    email = "delete_me@example.com"
    user = create_user(token, email)
    if not user:
        # Check if user already exists
        users = get_users(token)
        for u in users:
            if u["email"] == email:
                user = u
                break
    
    if not user:
         print("Could not create or find user")
         sys.exit(1)

    print(f"User created: {user['id']}")

    # Verify user is in list
    users = get_users(token)
    if not any(u['id'] == user['id'] for u in users):
        print("User NOT found in list before deletion!")
        sys.exit(1)
    print("User found in list.")

    # Delete user
    status = delete_user(token, user['id'])
    if status != 204:
        print(f"Delete failed with status {status}")
        sys.exit(1)
    print("User deleted.")

    # Verify user is NOT in list
    users = get_users(token)
    if any(u['id'] == user['id'] for u in users):
        print("User FOUND in list after deletion! Soft delete filter failed.")
        sys.exit(1)
    else:
        print("User NOT found in list after deletion. (Success)")

    print("Verification Passed!")

if __name__ == "__main__":
    verify()
