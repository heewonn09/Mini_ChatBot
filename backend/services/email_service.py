import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_url: str, smtp_host: str,
                               smtp_port: int, smtp_user: str, smtp_password: str,
                               smtp_from: str) -> bool:
    if not smtp_user or not smtp_password:
        logger.warning("SMTP not configured — password reset email skipped (token: %s)", reset_url)
        return False

    sender = smtp_from or smtp_user
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "[마인드플로우] 비밀번호 재설정 안내"
    msg["From"] = sender
    msg["To"] = to_email

    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', sans-serif; background:#f6efe7; padding:40px 20px;">
      <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:20px; padding:40px; box-shadow:0 8px 30px rgba(0,0,0,0.08);">
        <h1 style="font-size:24px; color:#183235; margin-bottom:8px;">비밀번호 재설정</h1>
        <p style="color:#647377; font-size:15px; line-height:1.6;">
          마인드플로우 비밀번호 재설정을 요청하셨습니다.<br>
          아래 버튼을 클릭해 새 비밀번호를 설정하세요.
        </p>
        <div style="margin:32px 0; text-align:center;">
          <a href="{reset_url}"
             style="display:inline-block; background:#0f766e; color:#fff; font-weight:700;
                    font-size:15px; padding:14px 32px; border-radius:999px; text-decoration:none;">
            비밀번호 재설정하기
          </a>
        </div>
        <p style="color:#93a1a3; font-size:13px; line-height:1.6;">
          이 링크는 <strong>1시간</strong> 후 만료됩니다.<br>
          요청하지 않으셨다면 이 이메일을 무시하세요.
        </p>
        <hr style="border:none; border-top:1px solid #f0ebe4; margin:24px 0;">
        <p style="color:#b0bec5; font-size:12px; text-align:center;">Mindflow — 행동 패턴 분석 AI 코칭</p>
      </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(sender, [to_email], msg.as_string())
        logger.info("Password reset email sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Failed to send reset email to %s: %s", to_email, exc)
        return False
