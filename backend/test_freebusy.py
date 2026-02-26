import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
# Import base to load all models
from app.db.base import Base 
from app.models.user import User
from app.models.department import Department
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/clustox_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

user = db.query(User).filter(User.email == "namisha.naseem@clustox.com").first()
print(f"User ID: {user.id}")
if not user.google_refresh_token:
    print("User has no google_refresh_token")
    exit()

creds = Credentials(
    token=user.google_access_token,
    refresh_token=user.google_refresh_token,
    token_uri="https://oauth2.googleapis.com/token",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    scopes=['https://www.googleapis.com/auth/calendar.readonly']
)
service = build('calendar', 'v3', credentials=creds)

# Use the exact UTC times corresponding to GMT+5 timezone 
# 12:30 PM GMT+5 -> 07:30 UTC
# 01:00 PM GMT+5 -> 08:00 UTC
body = {
    "timeMin": "2026-02-26T07:30:00.000Z",
    "timeMax": "2026-02-26T08:00:00.000Z",
    "timeZone": 'UTC',
    "items": [{"id": 'primary'}]
}
eventsResult = service.freebusy().query(body=body).execute()
print(json.dumps(eventsResult, indent=2))
