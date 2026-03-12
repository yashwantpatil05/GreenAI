"""Email notification service with console logging fallback."""
import os
from typing import Optional
from datetime import datetime

# Console logging mode (set to False to use SendGrid)
USE_CONSOLE_MODE = os.getenv("EMAIL_CONSOLE_MODE", "true").lower() == "true"


class EmailService:
    """Email service with console fallback for testing."""

    def __init__(self):
        self.console_mode = USE_CONSOLE_MODE
        if not self.console_mode:
            # Import SendGrid only if not in console mode
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail

                self.sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
                self.from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@greenai.io")
            except ImportError:
                print("⚠️  SendGrid not installed. Using console mode.")
                self.console_mode = True

    def _log_email(self, to_email: str, subject: str, body: str):
        """Log email to console instead of sending."""
        print("\n" + "=" * 80)
        print("📧 EMAIL (Console Mode)")
        print("=" * 80)
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Timestamp: {datetime.utcnow().isoformat()}")
        print("-" * 80)
        print(body)
        print("=" * 80 + "\n")

    def send_welcome_email(self, to_email: str, organization_name: str) -> bool:
        """Send welcome email to new user."""
        subject = "Welcome to GreenAI - Start Tracking Your Carbon Footprint"
        body = f"""
Hi there!

Welcome to GreenAI! 🌱

Your organization "{organization_name}" has been successfully created.

GreenAI helps you track, analyze, and reduce the carbon footprint of your AI/ML workloads.

Getting Started:
1. Create a project to organize your ML runs
2. Generate an API key for data ingestion
3. Start sending job run data via our SDK or API
4. View your carbon analytics in real-time

Useful Resources:
- Documentation: https://docs.greenai.io
- API Integration Guide: https://docs.greenai.io/integration
- Python SDK: pip install greenai-sdk

Need Help?
Reply to this email or visit our support portal.

Best regards,
The GreenAI Team

---
GreenAI - Sustainable AI for a Better Tomorrow
"""

        if self.console_mode:
            self._log_email(to_email, subject, body)
            return True

        try:
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                plain_text_content=body,
            )
            response = self.sg.send(message)
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"❌ Failed to send welcome email: {e}")
            return False

    def send_usage_alert_email(
        self,
        to_email: str,
        organization_name: str,
        usage_percentage: int,
        plan_name: str,
        limit_name: str,
        current_usage: int,
        limit_value: int,
    ) -> bool:
        """Send usage alert email when approaching or hitting limits."""
        if usage_percentage >= 100:
            subject = f"⚠️ {limit_name} Limit Reached - {organization_name}"
            alert_type = "reached"
            icon = "🚨"
        else:
            subject = f"⚠️ {limit_name} Alert ({usage_percentage}% Used) - {organization_name}"
            alert_type = "approaching"
            icon = "⚠️"

        body = f"""
Hi there,

{icon} Your organization "{organization_name}" has {alert_type} its {limit_name.lower()} limit.

Usage Summary:
- Current Usage: {current_usage:,}
- Plan Limit: {limit_value:,}
- Usage Percentage: {usage_percentage}%
- Current Plan: {plan_name}
"""

        if usage_percentage >= 100:
            body += f"""
Action Required:
Your organization has reached its {limit_name.lower()} limit. To continue using GreenAI:

1. Upgrade to a higher plan
2. Contact sales for custom enterprise limits

Upgrade Now:
Visit your billing page to upgrade: https://app.greenai.io/billing
"""
        else:
            body += f"""
Heads Up:
You're approaching your {limit_name.lower()} limit. Consider upgrading to avoid service interruption.

View Your Usage:
Visit your billing page: https://app.greenai.io/billing
"""

        body += """
Questions?
Reply to this email or contact support.

Best regards,
The GreenAI Team

---
GreenAI - Sustainable AI for a Better Tomorrow
"""

        if self.console_mode:
            self._log_email(to_email, subject, body)
            return True

        try:
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                plain_text_content=body,
            )
            response = self.sg.send(message)
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"❌ Failed to send usage alert email: {e}")
            return False

    def send_report_ready_email(
        self, to_email: str, report_name: str, report_id: str, download_url: Optional[str] = None
    ) -> bool:
        """Send notification when report is ready."""
        subject = f"📊 Your Report is Ready - {report_name}"
        body = f"""
Hi there,

Your carbon footprint report "{report_name}" has been generated and is ready for download!

Report Details:
- Report Name: {report_name}
- Generated: {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}
"""

        if download_url:
            body += f"""
Download Your Report:
{download_url}

Note: This download link expires in 24 hours.
"""
        else:
            body += f"""
View Your Report:
Visit the Reports page in your dashboard: https://app.greenai.io/reports
"""

        body += """
Questions?
Reply to this email or contact support.

Best regards,
The GreenAI Team

---
GreenAI - Sustainable AI for a Better Tomorrow
"""

        if self.console_mode:
            self._log_email(to_email, subject, body)
            return True

        try:
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                plain_text_content=body,
            )
            response = self.sg.send(message)
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"❌ Failed to send report ready email: {e}")
            return False

    def send_weekly_summary_email(
        self,
        to_email: str,
        organization_name: str,
        total_runs: int,
        total_carbon_kg: float,
        total_energy_kwh: float,
        total_cost: float,
        week_start: str,
        week_end: str,
    ) -> bool:
        """Send weekly usage summary email."""
        subject = f"📈 Weekly Carbon Summary - {organization_name}"
        body = f"""
Hi there,

Here's your weekly carbon footprint summary for "{organization_name}":

Period: {week_start} to {week_end}

Summary:
- Total Job Runs: {total_runs:,}
- Carbon Emissions: {total_carbon_kg:.2f} kg CO₂e
- Energy Consumed: {total_energy_kwh:.2f} kWh
- Estimated Cost: ${total_cost:.2f}

Environmental Impact:
{total_carbon_kg:.2f} kg CO₂e is equivalent to:
- {total_carbon_kg * 2.5:.1f} miles driven by an average car
- {total_carbon_kg * 0.12:.1f} pounds of coal burned
- {total_carbon_kg / 21.77:.2f} tree seedlings grown for 10 years

View Detailed Analytics:
Visit your dashboard: https://app.greenai.io

Tips to Reduce Your Carbon Footprint:
1. Use more efficient models (smaller models when possible)
2. Choose regions with lower carbon intensity
3. Schedule training during off-peak renewable energy hours
4. Enable auto-scaling to avoid idle compute time

Questions?
Reply to this email or contact support.

Best regards,
The GreenAI Team

---
GreenAI - Sustainable AI for a Better Tomorrow
"""

        if self.console_mode:
            self._log_email(to_email, subject, body)
            return True

        try:
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                plain_text_content=body,
            )
            response = self.sg.send(message)
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"❌ Failed to send weekly summary email: {e}")
            return False


# Singleton instance
email_service = EmailService()
