import smtplib
from email.message import EmailMessage
import os
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
        </div>
      </body>
    </html>
    """
    
    msg.set_content("Please enable HTML to view this message.")
    msg.add_alternative(html_content, subtype='html')
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(SMTP_EMAIL, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
