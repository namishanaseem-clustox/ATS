import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
import os
from pathlib import Path
from dotenv import load_dotenv
import logging

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

logger = logging.getLogger(__name__)

def send_invitation_email(to_email: str, role: str, invite_url: str):
    """
    Sends an invitation email using Gmail SMTP.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.warning(f"SMTP credentials not found. Would have sent invite to {to_email}: {invite_url}")
        return False
        
    msg = EmailMessage()
    msg['Subject'] = 'You have been invited to join Clustox ATS'
    msg['From'] = f"Clustox ATS <{SMTP_EMAIL}>"
    msg['To'] = to_email

    logo_cid = make_msgid()
    
    html_content = f"""
    <html>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <div style="max-w-md mx-auto p-6 bg-white border rounded">
            <h2 style="color: #00A3FF;">Welcome to Clustox ATS</h2>
            <p>You have been invited to join the platform with the role of <strong>{role}</strong>.</p>
            <p>Please click the button below to complete your registration and set your password:</p>
            <div style="margin: 30px 0;">
                <a href="{invite_url}" style="background-color: #00A3FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Accept Invitation
                </a>
            </div>

            <p style="font-size: 0.9em; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{invite_url}">{invite_url}</a>
            </p>
            <p>This invitation link will expire in 7 days.</p>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0 20px 0;">
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td>
                        <img src="cid:{logo_cid[1:-1]}" alt="Clustox Logo" style="width: 120px; height: auto; display: block;">
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 10px; font-size: 12px; color: #888;">
                        © 2024 Clustox. All rights reserved.<br>
                        This is an automated message, please do not reply.
                    </td>
                </tr>
            </table>
        </div>
      </body>
    </html>
    """
    
    msg.set_content("Please enable HTML to view this message.")
    msg.add_alternative(html_content, subtype='html')
    
    logo_path = Path(__file__).parent.parent / "assets" / "logo.png"
    if logo_path.exists():
        with open(logo_path, "rb") as f:
            msg.get_payload()[1].add_related(f.read(), maintype='image', subtype='png', cid=logo_cid, filename='clustox_logo.png')
    else:
        logger.warning(f"Logo not found at {logo_path}")
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(SMTP_EMAIL, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_password_reset_email(to_email: str, reset_url: str):
    """
    Sends a password reset email using Gmail SMTP.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.warning(f"SMTP credentials not found. Would have sent password reset to {to_email}: {reset_url}")
        return False

    msg = EmailMessage()
    msg['Subject'] = 'Reset your Clustox ATS password'
    msg['From'] = f"Clustox ATS <{SMTP_EMAIL}>"
    msg['To'] = to_email

    logo_cid = make_msgid()

    html_content = f"""
    <html>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 480px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #00C853;">Reset your password</h2>
            <p>We received a request to reset the password for your Clustox ATS account associated with this email address.</p>
            <p>Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>
            <div style="margin: 30px 0;">
                <a href="{reset_url}" style="background-color: #00C853; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 0.9em; color: #666;">
                If the button doesn't work, paste this link into your browser:<br>
                <a href="{reset_url}">{reset_url}</a>
            </p>
            <p style="font-size: 0.85em; color: #999;">
                If you did not request a password reset, please ignore this email. Your password will not change.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0 20px 0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td>
                        <img src="cid:{logo_cid[1:-1]}" alt="Clustox Logo" style="width: 120px; height: auto; display: block;">
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 10px; font-size: 12px; color: #888;">
                        © 2024 Clustox. All rights reserved.<br>
                        This is an automated message, please do not reply.
                    </td>
                </tr>
            </table>
        </div>
      </body>
    </html>
    """

    msg.set_content("Please enable HTML to view this message.")
    msg.add_alternative(html_content, subtype='html')

    logo_path = Path(__file__).parent.parent / "assets" / "logo.png"
    if logo_path.exists():
        with open(logo_path, "rb") as f:
            msg.get_payload()[1].add_related(f.read(), maintype='image', subtype='png', cid=logo_cid, filename='clustox_logo.png')

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(SMTP_EMAIL, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        return False
