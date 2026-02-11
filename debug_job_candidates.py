import requests
import json

# Replace with the Job ID from the user screenshot or a known one
job_id = "71dbace3-784a-4e3b-979b-6c91c03179ac" # Dummy Job ID from previous output

url = f"http://localhost:8000/jobs/{job_id}/candidates"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
