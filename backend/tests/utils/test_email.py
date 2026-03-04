import pytest
from unittest.mock import MagicMock, patch, mock_open


# ─── send_invitation_email ────────────────────────────────────────────────────

def test_send_invitation_email_success(mocker):
    """Successfully sends an invitation email via SMTP."""
    mocker.patch.dict("os.environ", {"SMTP_EMAIL": "test@clustox.com", "SMTP_PASSWORD": "secret"})
    
    # Patch at the source so the module-level globals get the env values
    mocker.patch("app.utils.email.SMTP_EMAIL", "test@clustox.com")
    mocker.patch("app.utils.email.SMTP_PASSWORD", "secret")
    
    # Mock SMTP_SSL so no real connection is made
    mock_smtp = MagicMock()
    mock_smtp_class = mocker.patch("app.utils.email.smtplib.SMTP_SSL", return_value=mock_smtp)
    mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
    mock_smtp.__exit__ = MagicMock(return_value=False)

    # Mock logo file not existing so we skip the logo attachment branch
    mocker.patch("app.utils.email.Path.exists", return_value=False)
    
    from app.utils.email import send_invitation_email
    result = send_invitation_email("invite@example.com", "HR Manager", "https://app.clustox.com/accept?token=abc")
    
    assert result is True
    mock_smtp.login.assert_called_once_with("test@clustox.com", "secret")
    mock_smtp.send_message.assert_called_once()
    
    # Verify the email message was constructed correctly
    sent_msg = mock_smtp.send_message.call_args[0][0]
    assert "invite@example.com" in sent_msg["To"]
    assert "invited" in sent_msg["Subject"].lower()


def test_send_invitation_email_with_logo(mocker, tmpdir):
    """Sends invitation email successfully when a logo file is present."""
    mocker.patch("app.utils.email.SMTP_EMAIL", "test@clustox.com")
    mocker.patch("app.utils.email.SMTP_PASSWORD", "secret")

    mock_smtp = MagicMock()
    mocker.patch("app.utils.email.smtplib.SMTP_SSL", return_value=mock_smtp)
    mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
    mock_smtp.__exit__ = MagicMock(return_value=False)

    # Simulate the logo file existing with some fake bytes
    mocker.patch("app.utils.email.Path.exists", return_value=True)
    mocker.patch("builtins.open", mock_open(read_data=b"\x89PNG fake logo bytes"))
    
    # Mock the add_related on payload so it doesn't error out on fake bytes
    mock_payload = MagicMock()
    mocker.patch("app.utils.email.EmailMessage.get_payload", return_value=[MagicMock(), mock_payload])

    from app.utils.email import send_invitation_email
    result = send_invitation_email("invite@example.com", "Interviewer", "https://app.clustox.com/accept?token=xyz")

    assert result is True


def test_send_invitation_email_no_smtp_credentials(mocker):
    """Returns False and logs a warning when SMTP credentials are missing."""
    mocker.patch("app.utils.email.SMTP_EMAIL", None)
    mocker.patch("app.utils.email.SMTP_PASSWORD", None)

    mock_smtp = mocker.patch("app.utils.email.smtplib.SMTP_SSL")

    from app.utils.email import send_invitation_email
    result = send_invitation_email("invite@example.com", "HR", "https://app.clustox.com/accept?token=abc")

    assert result is False
    # SMTP should never have been called
    mock_smtp.assert_not_called()


def test_send_invitation_email_smtp_failure(mocker):
    """Returns False and logs an error when SMTP throws an exception."""
    mocker.patch("app.utils.email.SMTP_EMAIL", "test@clustox.com")
    mocker.patch("app.utils.email.SMTP_PASSWORD", "secret")
    mocker.patch("app.utils.email.Path.exists", return_value=False)

    mock_smtp = MagicMock()
    mock_smtp.__enter__ = MagicMock(side_effect=Exception("SMTP Connection Refused"))
    mock_smtp.__exit__ = MagicMock(return_value=False)
    mocker.patch("app.utils.email.smtplib.SMTP_SSL", return_value=mock_smtp)

    from app.utils.email import send_invitation_email
    result = send_invitation_email("invite@example.com", "HR", "https://app.clustox.com/accept?token=abc")

    assert result is False


# ─── send_password_reset_email ────────────────────────────────────────────────

def test_send_password_reset_email_success(mocker):
    """Successfully sends a password reset email via SMTP."""
    mocker.patch("app.utils.email.SMTP_EMAIL", "test@clustox.com")
    mocker.patch("app.utils.email.SMTP_PASSWORD", "secret")
    mocker.patch("app.utils.email.Path.exists", return_value=False)

    mock_smtp = MagicMock()
    mocker.patch("app.utils.email.smtplib.SMTP_SSL", return_value=mock_smtp)
    mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
    mock_smtp.__exit__ = MagicMock(return_value=False)

    from app.utils.email import send_password_reset_email
    result = send_password_reset_email("user@example.com", "https://app.clustox.com/reset?token=xyz")

    assert result is True
    mock_smtp.login.assert_called_once_with("test@clustox.com", "secret")
    mock_smtp.send_message.assert_called_once()

    sent_msg = mock_smtp.send_message.call_args[0][0]
    assert "user@example.com" in sent_msg["To"]
    assert "reset" in sent_msg["Subject"].lower()


def test_send_password_reset_email_no_credentials(mocker):
    """Returns False when SMTP credentials are missing."""
    mocker.patch("app.utils.email.SMTP_EMAIL", None)
    mocker.patch("app.utils.email.SMTP_PASSWORD", None)
    mock_smtp = mocker.patch("app.utils.email.smtplib.SMTP_SSL")

    from app.utils.email import send_password_reset_email
    result = send_password_reset_email("user@example.com", "https://app.clustox.com/reset?token=xyz")

    assert result is False
    mock_smtp.assert_not_called()


def test_send_password_reset_email_smtp_failure(mocker):
    """Returns False when SMTP connection raises an exception."""
    mocker.patch("app.utils.email.SMTP_EMAIL", "test@clustox.com")
    mocker.patch("app.utils.email.SMTP_PASSWORD", "secret")
    mocker.patch("app.utils.email.Path.exists", return_value=False)

    mock_smtp = MagicMock()
    mock_smtp.__enter__ = MagicMock(side_effect=Exception("Auth failed"))
    mock_smtp.__exit__ = MagicMock(return_value=False)
    mocker.patch("app.utils.email.smtplib.SMTP_SSL", return_value=mock_smtp)

    from app.utils.email import send_password_reset_email
    result = send_password_reset_email("user@example.com", "https://app.clustox.com/reset?token=xyz")

    assert result is False


def test_send_password_reset_email_html_contains_reset_url(mocker):
    """Verifies the reset URL is embedded in the HTML body."""
    mocker.patch("app.utils.email.SMTP_EMAIL", "test@clustox.com")
    mocker.patch("app.utils.email.SMTP_PASSWORD", "secret")
    mocker.patch("app.utils.email.Path.exists", return_value=False)

    mock_smtp = MagicMock()
    mocker.patch("app.utils.email.smtplib.SMTP_SSL", return_value=mock_smtp)
    mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
    mock_smtp.__exit__ = MagicMock(return_value=False)

    from app.utils.email import send_password_reset_email
    reset_url = "https://app.clustox.com/reset?token=unique-abc-123"
    send_password_reset_email("user@example.com", reset_url)

    sent_msg = mock_smtp.send_message.call_args[0][0]
    # The HTML payload should contain the reset URL
    msg_body = sent_msg.get_body(preferencelist=("html",))
    assert reset_url in msg_body.get_content()


def test_send_invitation_email_html_contains_invite_url(mocker):
    """Verifies the invite URL and role are embedded in the HTML body."""
    mocker.patch("app.utils.email.SMTP_EMAIL", "test@clustox.com")
    mocker.patch("app.utils.email.SMTP_PASSWORD", "secret")
    mocker.patch("app.utils.email.Path.exists", return_value=False)

    mock_smtp = MagicMock()
    mocker.patch("app.utils.email.smtplib.SMTP_SSL", return_value=mock_smtp)
    mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
    mock_smtp.__exit__ = MagicMock(return_value=False)

    from app.utils.email import send_invitation_email
    invite_url = "https://app.clustox.com/accept?token=unique-invite-456"
    send_invitation_email("invite@example.com", "Senior Hiring Manager", invite_url)

    sent_msg = mock_smtp.send_message.call_args[0][0]
    msg_body = sent_msg.get_body(preferencelist=("html",))
    html = msg_body.get_content()
    assert invite_url in html
    assert "Senior Hiring Manager" in html
