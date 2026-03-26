import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings
from domain.ports.email import EmailPort


class SmtpEmailAdapter(EmailPort):
    async def send_invitation(self, to_email: str, signup_link: str, campaign_name: str) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"You're invited to join as a driver — {campaign_name}"
        msg["From"] = "noreply@driveronboarding.com"
        msg["To"] = to_email

        text = f"""
You've been invited to sign up as a driver!

Campaign: {campaign_name}

Click the link below to get started:
{signup_link}

This link is unique to you. Please do not share it.
"""

        html = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2563eb; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Driver Onboarding</h1>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1e293b; margin-top: 0;">You're Invited!</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      You've been invited to sign up as a driver for the
      <strong>{campaign_name}</strong> campaign.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{signup_link}"
         style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px;
                text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
        Sign Up Now
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 13px; text-align: center;">
      This link is unique to you. Please do not share it.
    </p>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.sendmail(msg["From"], to_email, msg.as_string())
