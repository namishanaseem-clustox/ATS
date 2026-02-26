import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.models.user import User
from app.models.scheduled_activity import ScheduledActivity

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

def _get_service(user: User):
    if not user.google_refresh_token or not GOOGLE_CLIENT_ID:
        return None
    try:
        creds = Credentials(
            token=user.google_access_token,
            refresh_token=user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=SCOPES
        )
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f"Error building google service for {user.id}: {e}")
        return None

def sync_event_to_google(activity: ScheduledActivity, creator: User, db):
    """
    Creates or updates an event in Google Calendar.
    Requires `scheduled_at` and `end_time` to be set.
    """
    if activity.activity_type == "Note":
        return

    # To create an event, we need the creator's connected calendar
    service = _get_service(creator)
    if not service:
        return
        
    if not activity.scheduled_at or not activity.end_time:
        return # Cannot schedule without a time block
        
    # Map assignees to attendee emails
    attendees = []
    if activity.assignees:
        for u in activity.assignees:
            if u.email:
                attendees.append({'email': u.email})

    event_body = {
        'summary': activity.title,
        'location': activity.location or "",
        'description': activity.description or "",
        'start': {
            'dateTime': activity.scheduled_at.isoformat(),
        },
        'end': {
            'dateTime': activity.end_time.isoformat(),
        },
        'attendees': attendees,
        'reminders': {
            'useDefault': True,
        },
    }

    try:
        if activity.external_id and activity.external_provider == 'google':
            # Update existing event
            updated_event = service.events().update(
                calendarId='primary', 
                eventId=activity.external_id, 
                body=event_body
            ).execute()
            activity.event_html_link = updated_event.get('htmlLink')
        else:
            # Create new event
            created_event = service.events().insert(
                calendarId='primary', 
                body=event_body
            ).execute()
            
            activity.external_id = created_event.get('id')
            activity.external_provider = 'google'
            activity.event_html_link = created_event.get('htmlLink')
            
        db.commit()
    except Exception as e:
        print(f"Failed to sync event to Google Calendar for activity {activity.id}: {e}")

def delete_event_from_google(activity: ScheduledActivity, creator: User):
    """
    Deletes the event from Google Calendar if it was synced.
    """
    if not activity.external_id or activity.external_provider != 'google':
        return
        
    service = _get_service(creator)
    if not service:
        return
        
    try:
        service.events().delete(
            calendarId='primary', 
            eventId=activity.external_id
        ).execute()
    except Exception as e:
        print(f"Failed to delete event from Google Calendar for activity {activity.id}: {e}")
