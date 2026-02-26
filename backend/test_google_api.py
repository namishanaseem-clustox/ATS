from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import create_engine, text
import os
import json
from dotenv import load_dotenv

load_dotenv()
engine = create_engine("postgresql://postgres:postgres@localhost:5432/clustox_ats")
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, google_access_token, google_refresh_token FROM users WHERE email='namisha.naseem@clustox.com'")).fetchone()
    user_id, access_token, refresh_token = res

print(f"Testing for user {user_id}")
creds = Credentials(
    token=access_token,
    refresh_token=refresh_token,
    token_uri="https://oauth2.googleapis.com/token",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    scopes=['https://www.googleapis.com/auth/calendar.readonly']
)
service = build('calendar', 'v3', credentials=creds)

body = {
    "timeMin": "2026-02-26T07:30:00.000Z",
    "timeMax": "2026-02-26T08:00:00.000Z",
    "timeZone": 'UTC',
    "items": [{"id": 'primary'}]
}
eventsResult = service.freebusy().query(body=body).execute()
print("Google FreeBusy Response:")
print(json.dumps(eventsResult, indent=2))
