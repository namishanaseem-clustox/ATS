import requests
import json

# First, get a job ID
jobs_response = requests.get("http://localhost:8000/jobs/")
jobs = jobs_response.json()
if not jobs:
    print("No jobs found. Please create a job first.")
    exit(1)

job_id = jobs[0]["id"]
print(f"Using job ID: {job_id}")

# Create a candidate linked to this job
candidate_data = {
    "first_name": "Test",
    "last_name": "Candidate",
    "email": f"test{job_id[:8]}@example.com",  # Unique email
    "phone": "1234567890",
    "experience_years": 3,
    "job_id": job_id
}

create_response = requests.post("http://localhost:8000/candidates/", json=candidate_data)
print(f"\nCreate Candidate Status: {create_response.status_code}")
if create_response.status_code == 200:
    print(f"Created candidate: {json.dumps(create_response.json(), indent=2)}")
else:
    print(f"Error: {create_response.text}")
    exit(1)

# Now check the job's candidates endpoint
job_candidates_response = requests.get(f"http://localhost:8000/jobs/{job_id}/candidates")
print(f"\nJob Candidates Status: {job_candidates_response.status_code}")
print(f"Job Candidates Response:\n{json.dumps(job_candidates_response.json(), indent=2)}")
