import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime, timedelta

from app.services.calendar_sync import sync_event_to_google, delete_event_from_google
from app.models.user import User
from app.models.scheduled_activity import ScheduledActivity


def make_user(db_session, has_google=True):
    """Create a test user, optionally with a Google refresh token."""
    user = User(
        email=f"user.{uuid4().hex[:6]}@example.com",
        hashed_password="hashed",
        full_name="Test User",
        google_refresh_token="fake_refresh_token" if has_google else None,
        google_access_token="fake_access_token" if has_google else None,
    )
    db_session.add(user)
    db_session.flush()
    return user


def make_activity(db_session, creator, activity_type="Interview", details=None):
    """Create a test ScheduledActivity."""
    now = datetime.utcnow()
    activity = ScheduledActivity(
        title="Interview with Alice",
        activity_type=activity_type,
        scheduled_at=now + timedelta(hours=1),
        end_time=now + timedelta(hours=2),
        created_by=creator.id,
        location="Zoom",
        description="Technical interview",
        details=details or {}
    )
    db_session.add(activity)
    db_session.flush()
    return activity


# ─── sync_event_to_google tests ─────────────────────────────────────────────

def test_sync_skips_notes(db_session, mocker):
    """Activities of type 'Note' should be silently skipped."""
    user = make_user(db_session)
    activity = make_activity(db_session, user, activity_type="Note")

    mock_build = mocker.patch("app.services.calendar_sync.build")
    sync_event_to_google(activity, user, db_session)

    # Google Calendar should never have been called
    mock_build.assert_not_called()


def test_sync_skips_when_no_time(db_session, mocker):
    """Activities without scheduled_at should be skipped."""
    user = make_user(db_session)
    activity = make_activity(db_session, user)
    activity.scheduled_at = None

    mock_build = mocker.patch("app.services.calendar_sync.build")
    sync_event_to_google(activity, user, db_session)
    mock_build.assert_not_called()


def test_sync_skips_when_no_google_token(db_session, mocker):
    """Creator without a Google token → no calendar event created."""
    user = make_user(db_session, has_google=False)
    activity = make_activity(db_session, user)

    mock_build = mocker.patch("app.services.calendar_sync.build")
    sync_event_to_google(activity, user, db_session)
    mock_build.assert_not_called()


def test_sync_creates_new_event(db_session, mocker):
    """A new event should be inserted on Google Calendar and IDs stored."""
    user = make_user(db_session)
    activity = make_activity(db_session, user)

    # Build a mock Google service chain
    mock_event = {"id": "gc_event_123", "htmlLink": "https://calendar.google.com/event/123"}
    mock_insert = MagicMock()
    mock_insert.execute.return_value = mock_event

    mock_events = MagicMock()
    mock_events.return_value.insert.return_value = mock_insert

    mock_service = MagicMock()
    mock_service.events = mock_events

    mocker.patch("app.services.calendar_sync.build", return_value=mock_service)
    mocker.patch("app.services.calendar_sync.Credentials")  # prevent real OAuth

    sync_event_to_google(activity, user, db_session)

    # Verify the insert was called
    mock_service.events().insert.assert_called_once()
    insert_kwargs = mock_service.events().insert.call_args[1]
    assert insert_kwargs["calendarId"] == "primary"
    assert insert_kwargs["body"]["summary"] == "Interview with Alice"

    # Verify the activity was updated with the event ID
    assert activity.external_id == "gc_event_123"
    assert activity.external_provider == "google"
    assert activity.event_html_link == "https://calendar.google.com/event/123"


def test_sync_updates_existing_event(db_session, mocker):
    """When an event already exists, it should be updated, not re-created."""
    user = make_user(db_session)
    existing_event_id = "gc_existing_event"
    activity = make_activity(db_session, user, details={
        "google_event_ids": {str(user.id): existing_event_id}
    })

    mock_updated_event = {"htmlLink": "https://calendar.google.com/event/updated"}
    mock_update = MagicMock()
    mock_update.execute.return_value = mock_updated_event

    mock_events = MagicMock()
    mock_events.return_value.update.return_value = mock_update

    mock_service = MagicMock()
    mock_service.events = mock_events

    mocker.patch("app.services.calendar_sync.build", return_value=mock_service)
    mocker.patch("app.services.calendar_sync.Credentials")

    sync_event_to_google(activity, user, db_session)

    mock_service.events().update.assert_called_once_with(
        calendarId="primary",
        eventId=existing_event_id,
        body=mocker.ANY,
        sendUpdates="all"
    )
    assert activity.event_html_link == "https://calendar.google.com/event/updated"


# ─── delete_event_from_google tests ──────────────────────────────────────────

def test_delete_skips_when_no_event_ids(db_session, mocker):
    """If the activity has no google_event_ids, nothing should happen."""
    user = make_user(db_session)
    activity = make_activity(db_session, user, details={})
    activity.external_id = None  # No legacy ID either

    mock_build = mocker.patch("app.services.calendar_sync.build")
    delete_event_from_google(activity, user, db_session)
    mock_build.assert_not_called()


def test_delete_removes_event(db_session, mocker):
    """When an event ID exists, it should be deleted from Google Calendar."""
    user = make_user(db_session)
    event_id = "gc_to_delete"
    activity = make_activity(db_session, user, details={
        "google_event_ids": {str(user.id): event_id}
    })

    mock_delete = MagicMock()
    mock_delete.execute.return_value = {}

    mock_events = MagicMock()
    mock_events.return_value.delete.return_value = mock_delete

    mock_service = MagicMock()
    mock_service.events = mock_events

    mocker.patch("app.services.calendar_sync.build", return_value=mock_service)
    mocker.patch("app.services.calendar_sync.Credentials")

    delete_event_from_google(activity, user, db_session)

    mock_service.events().delete.assert_called_once_with(
        calendarId="primary",
        eventId=event_id,
        sendUpdates="all"
    )
    # IDs should be cleared from the activity
    assert activity.details["google_event_ids"] == {}
