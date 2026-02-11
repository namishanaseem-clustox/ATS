import requests
import os

BASE_URL = "http://localhost:8000"

def check_server():
    try:
        print(f"Checking {BASE_URL}...")
        resp = requests.get(f"{BASE_URL}/")
        print(f"Root status: {resp.status_code}")
        
        print("Checking /candidates/...")
        resp = requests.get(f"{BASE_URL}/candidates/")
        print(f"Candidates list status: {resp.status_code}")
        
        # Create a dummy PDF
        with open("dummy.pdf", "wb") as f:
            f.write(b"%PDF-1.4 dummy content")
            
        print("Attempting upload...")
        with open("dummy.pdf", "rb") as f:
            files = {"file": ("dummy.pdf", f, "application/pdf")}
            resp = requests.post(f"{BASE_URL}/candidates/upload", files=files)
            print(f"Upload status: {resp.status_code}")
            print(f"Response: {resp.text}")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    check_server()
