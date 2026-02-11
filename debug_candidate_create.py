import requests

url = "http://localhost:8000/candidates/"
data = {
    "first_name": "jane",
    "last_name": "paul",
    "email": "jane123@paul.com",
    "phone": "123123123",
    "experience_years": 1,
    "job_id": "71dbace3-784a-4e3b-979b-6c91c03179ac",
    # Including other fields as empty/default as per frontend
    "location": "",
    "current_company": "",
    "current_position": "",
    "linkedin_url": "",
    "skills": [],
    "education": [],
    "experience_history": []
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
