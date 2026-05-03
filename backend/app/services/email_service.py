from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def send_reset_code(to_email: str, code: str, full_name: str) -> bool:
    """Send password-reset code via SMTP. Returns True on success.
    Falls back to logging when SMTP is not configured (dev mode).
    """
    if not _smtp_configured():
        logger.warning(
            "smtp_not_configured_reset_code_fallback",
            email=to_email,
            code=code,
        )
        return False

    from_addr = settings.smtp_from or settings.smtp_user
    subject = "IQ Invest ETF — Password Reset Code"
    body = f"""Hello {full_name},

Your password reset code is:

    {code}

This code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.

— IQ Invest ETF
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        if settings.smtp_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(from_addr, [to_email], msg.as_string())
        else:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(from_addr, [to_email], msg.as_string())

        logger.info("reset_email_sent", to=to_email)
        return True
    except Exception as exc:
        logger.error("reset_email_failed", to=to_email, error=str(exc))
        return False
