import os
import json
from datetime import datetime, timedelta

# Allow HTTP (non-HTTPS) redirect URIs during local development
# IMPORTANT: Remove this in production and use HTTPS
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import requests

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user

# Google API libraries
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

router = APIRouter()

# --- Configuration Setup ---
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
# The redirect URI needs to match exactly what is mapped in the GCP console
# We use an environment variable or default to localhost
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

REDIRECT_URI = f"{BACKEND_URL}/api/calendar/callback"

SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly', # View availability
    'https://www.googleapis.com/auth/calendar.events', # Create/Update events
]

# Create a client secrets dictionary in-memory from env vars so we don't need a JSON file locally
def get_client_config():
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "project_id": "clustox-ats-calendar",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uris": [REDIRECT_URI]
        }
    }

from jose import JWTError, jwt
from app.core.security import SECRET_KEY, ALGORITHM

@router.get("/authorize")
async def authorize_google_calendar(
    token: str = Query(..., description="JWT token from frontend"),
    db: Session = Depends(get_db)
):
    """
    Returns the Google OAuth 2.0 authorization URL and redirects the user.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError as e:
        print("JWTError:", str(e))
        raise HTTPException(status_code=401, detail=f"Not authenticated: {str(e)}")
        
    current_user = db.query(User).filter(User.email == email).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Google Calendar credentials are not configured on the server."
        )

    # Use the user ID as state to link the callback to the right user securely
    state = str(current_user.id)

    flow = Flow.from_client_config(
        get_client_config(),
        scopes=SCOPES,
        state=state
    )
    
    flow.redirect_uri = REDIRECT_URI
    
    # offline access gives us the refresh token
    # prompt='consent' forces the consent screen so we ALWAYS get a refresh token
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=authorization_url)

@router.get("/callback")
async def google_calendar_callback(request: Request, state: str, code: str, db: Session = Depends(get_db)):
    """
    Callback endpoint that Google redirects to after the user authorizes the app.
    It exchanges the auth code for access and refresh tokens, and saves them to the DB.
    """
    import traceback
    try:
        print(f"DEBUG callback: state={state}, code={code[:20]}...")
        print(f"DEBUG callback: full URL={str(request.url)}")
        
        flow = Flow.from_client_config(
            get_client_config(),
            scopes=SCOPES,
            state=state
        )
        flow.redirect_uri = REDIRECT_URI
        
        print(f"DEBUG callback: fetching token with redirect_uri={REDIRECT_URI}")
        # Use the code to get the credentials object containing tokens
        flow.fetch_token(authorization_response=str(request.url))
        credentials = flow.credentials
        
        print(f"DEBUG callback: got credentials token={bool(credentials.token)} refresh={bool(credentials.refresh_token)}")
        
        # 'state' contains the user_id passing through
        user_id = state
        
        # Update user record
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"DEBUG callback: user not found with id={user_id}")
            raise HTTPException(status_code=404, detail="User not found")

        print(f"DEBUG callback: saving tokens for user={user.email}")
        user.google_access_token = credentials.token
        user.google_refresh_token = credentials.refresh_token
        
        if credentials.expiry:
            user.google_token_expiry = credentials.expiry.isoformat()
            
        db.commit()
        db.refresh(user)
        print(f"DEBUG callback: saved! access_token present={bool(user.google_access_token)}, refresh_token present={bool(user.google_refresh_token)}")
        
        # Redirect back to the frontend settings page
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{FRONTEND_URL}/settings/profile?calendar=connected")
        
    except Exception as e:
        print(f"Calendar OAuth Error: {type(e).__name__}: {e}")
        traceback.print_exc()
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{FRONTEND_URL}/settings/profile?calendar=error")



@router.delete("/disconnect")
async def disconnect_google_calendar(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Removes the Google Calendar tokens from the user's account.
    """
    current_user.google_access_token = None
    current_user.google_refresh_token = None
    current_user.google_token_expiry = None
    
    db.commit()
    return {"message": "Google Calendar disconnected successfully"}

class AvailabilityRequest(BaseModel):
    user_ids: List[str]
    timeMin: str # ISO string
    timeMax: str # ISO string
    
@router.post("/availability")
async def get_calendar_availability(
    req: AvailabilityRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Checks the Google Calendar free/busy schedules for the requested users.
    Only checks users who have connected their Google Calendar.
    Returns: { "user_id": [{"start": "...", "end": "..."}] }
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return {} # Calendar integration disabled

    busy_slots = {}
    
    # Fetch all requested users to check their google credentials
    users = db.query(User).filter(User.id.in_(req.user_ids)).all()
    
    for user in users:
        if not user.google_refresh_token:
            # User hasn't connected calendar or disconnected
            busy_slots[str(user.id)] = None  # None indicates we don't know their availability
            continue
            
        try:
            # Reconstruct oauth credentials from stored tokens
            creds = Credentials(
                token=user.google_access_token,
                refresh_token=user.google_refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=GOOGLE_CLIENT_ID,
                client_secret=GOOGLE_CLIENT_SECRET,
                scopes=SCOPES
            )
            
            # Build the calendar API service
            service = build('calendar', 'v3', credentials=creds)
            
            # Formulate the free/busy query
            body = {
                "timeMin": req.timeMin,
                "timeMax": req.timeMax,
                "timeZone": 'UTC',
                "items": [{"id": 'primary'}] # We only check the primary calendar for now
            }
            
            # Execute the API call
            eventsResult = service.freebusy().query(body=body).execute()
            
            print(f"DEBUG FreeBusy -> {eventsResult}")
            
            # Parse results
            calendars = eventsResult.get('calendars', {})
            primary_cal = calendars.get('primary', {})
            busy_blocks = primary_cal.get('busy', [])
            
            busy_slots[str(user.id)] = busy_blocks
            
        except Exception as e:
            print(f"Failed to fetch availability for user {user.id}: {e}")
            busy_slots[str(user.id)] = None # Default to None if API call fails
            
    return busy_slots
