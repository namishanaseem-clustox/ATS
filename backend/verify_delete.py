import requests
import sys
import os
sys.path.append(os.getcwd())

# Config
BASE_URL = "http://localhost:8000"
OWNER_EMAIL = "hiring.manager@clustox.com" # Assuming this is the owner/HR from previous context or I can use the one I fixed
# Wait, hiring.manager might not be owner. I fixed "hr@clustox.com" to be HR.
HR_EMAIL = "admin@clustox.com"
PASSWORD = "password123" # Updated based on admin script

def login(email, password):
    response = requests.post(f"{BASE_URL}/token", data={"username": email, "password": password})
    if response.status_code != 200:
        print(f"Login failed for {email}: {response.text}")
        return None
    return response.json()["access_token"]

def create_dummy_user(token):
    headers = {"Authorization": f"Bearer {token}"}
    user_data = {
        "email": "tobedeleted@clustox.com",
        "password": "password123",
        "full_name": "To Be Deleted",
        "role": "interviewer",
        "is_active": True
    }
    # Check if exists first to avoid error
    # Actually, let's just try to create, if 400 (exists), we proceed to delete
    response = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers)
    if response.status_code == 200:
        return response.json()["id"]
    elif response.status_code == 400 and "already registered" in response.text:
        # Fetch ID - wait, no GET /users endpoint that filters by email easily without list
        # detailed list
        users = requests.get(f"{BASE_URL}/users", headers=headers).json()
        for u in users:
            if u["email"] == "tobedeleted@clustox.com":
                return u["id"]
    print(f"Failed to create/find dummy user: {response.text}")
    return None

def delete_user(token, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(f"{BASE_URL}/users/{user_id}", headers=headers)
    return response

def verify_db_state(user_id):
    # Direct DB check or API check
    # API check: get users list, find user, check is_active
    # But get_users might filter inactive? No, read_users returns all.
    # Wait, read_users in auth.py returns all.
    
    # Let's use direct DB check for certainty
    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    db.close()
    
    if not user:
        return "NOT_FOUND"
    
    return {
        "is_active": user.is_active,
        "department_id": user.department_id
    }

def main():
    print("1. Logging in as HR...")
    token = login(HR_EMAIL, PASSWORD)
    if not token:
        # Try owner if HR fails (maybe password diff)
        print("HR login failed. Trying to find a working user/pass manually if needed.")
        return

    print("2. Creating dummy user to delete...")
    user_id = create_dummy_user(token)
    if not user_id:
        return

    print(f"3. Deleting user {user_id}...")
    response = delete_user(token, user_id)
    
    if response.status_code == 204:
        print("   [SUCCESS] API returned 204 No Content.")
    else:
        print(f"   [ERROR] API returned {response.status_code}: {response.text}")
        return

    print("4. Verifying DB state...")
    state = verify_db_state(user_id)
    print(f"   DB State: {state}")
    
    if state != "NOT_FOUND" and state["is_active"] == False and state["department_id"] is None:
        print("   [VERIFIED] User is inactive and department_id is None.")
    else:
        print("   [FAILED] User state is not correct.")

if __name__ == "__main__":
    main()
