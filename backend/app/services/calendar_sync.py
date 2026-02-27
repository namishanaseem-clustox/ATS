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
    Creates or updates an event directly on the Google Calendar of ALL involved users (creator + assignees)
    who have connected their Google accounts.
    """
    if activity.activity_type == "Note":
        return

    if not activity.scheduled_at or not activity.end_time:
        return # Cannot schedule without a time block

    # Map attendees for the invitation list (Google will email them)
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

    # Use activity.details to store the universal event ID under the creator
    from sqlalchemy.orm.attributes import flag_modified
    details = activity.details or {}
    google_event_ids = details.get('google_event_ids', {})
    creator_uid_str = str(creator.id)
    
    service = _get_service(creator)
    if not service:
        print(f"[Calendar Sync] Creator {creator.email} has no Google connection. Calendar invites cannot be sent on their behalf.")
        return

    try:
        existing_event_id = google_event_ids.get(creator_uid_str)
        
        if existing_event_id:
            # Update existing event
            updated_event = service.events().update(
                calendarId='primary', 
                eventId=existing_event_id, 
                body=event_body,
                sendUpdates='all'
            ).execute()
            activity.event_html_link = updated_event.get('htmlLink')
        else:
            # Create new event natively on creator's calendar
            created_event = service.events().insert(
                calendarId='primary', 
                body=event_body,
                sendUpdates='all'
            ).execute()
            
            google_event_ids[creator_uid_str] = created_event.get('id')
            activity.external_id = created_event.get('id')
            activity.external_provider = 'google'
            activity.event_html_link = created_event.get('htmlLink')
                
    except Exception as e:
        print(f"Failed to sync GC for creator {creator.email} on activity {activity.id}: {e}")

    details['google_event_ids'] = google_event_ids
    activity.details = details
    flag_modified(activity, "details")
    db.commit()

def delete_event_from_google(activity: ScheduledActivity, creator: User, db):
    """
    Deletes the individual Google Calendar events for all involved users.
    """
    details = activity.details or {}
    google_event_ids = details.get('google_event_ids', {})
    
    # Handle legacy fallback (creator's external_id)
    if not google_event_ids and activity.external_id and activity.external_provider == 'google':
        google_event_ids = {str(creator.id): activity.external_id}

    if not google_event_ids:
        return
        
    for user_id_str, event_id in google_event_ids.items():
        try:
            # We must lookup the user to get their tokens
            u = db.query(User).filter(User.id == user_id_str).first()
            if not u:
                continue
                
            service = _get_service(u)
            if not service:
                continue
                
            service.events().delete(
                calendarId='primary', 
                eventId=event_id,
                sendUpdates='all'
            ).execute()
        except Exception as e:
            print(f"Failed to delete GC event for user {user_id_str} on activity {activity.id}: {e}")
            
    # clear them out
    details['google_event_ids'] = {}
    from sqlalchemy.orm.attributes import flag_modified
    activity.details = details
    flag_modified(activity, "details")
    db.commit()

