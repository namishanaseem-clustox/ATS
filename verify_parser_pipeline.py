import fitz  # PyMuPDF
import requests
import os

# 1. Create a dummy PDF
doc = fitz.open()
page = doc.new_page()
text = """
John Doe
Software Engineer
Email: johndoe@example.com
Phone: 555-0199

Skills: Python, React, FastAPI
Experience: 5 years at Tech Corp
Education: BS Computer Science
"""
page.insert_text((50, 50), text)
pdf_path = "test_resume.pdf"
doc.save(pdf_path)
print(f"Created {pdf_path}")

# 2. Upload it
url = "http://localhost:8000/candidates/upload"
print(f"Uploading to {url}...")

with open(pdf_path, "rb") as f:
    files = {"file": f}
    try:
        response = requests.post(url, files=files)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Success!")
            print(f"Created Candidate ID: {data.get('id')}")
            print(f"Name: {data.get('first_name')} {data.get('last_name')}")
            print(f"Email: {data.get('email')}")
            print("(Note: Without API Key, name should be 'Parsed Candidate')")
        else:
            print(f"Failed: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

# Cleanup
if os.path.exists(pdf_path):
    os.remove(pdf_path)
