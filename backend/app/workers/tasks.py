"""Celery tasks for async processing."""
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime

logger = logging.getLogger(__name__)

# Import celery_app
from backend.app.workers.celery_app import celery_app, is_async_mode

# Import services
from backend.app.core.database import SessionLocal
from backend.app.models.job_run import JobRun
from backend.app.services.emissions_service import compute_emissions_for_job_run


# Create conditional task decorator
def conditional_task(**task_kwargs):
    """Decorator that only creates Celery task if celery_app is available."""
    def decorator(func):
        if celery_app:
            return celery_app.task(**task_kwargs)(func)
        return func
    return decorator


@conditional_task(name="backend.app.workers.tasks.compute_emissions_task", bind=True)
def compute_emissions_task(self, job_run_id: str):
    """
    Celery task to compute emissions for a job run.

    Args:
        job_run_id: UUID of the job run to process

    Returns:
        dict with status and results
    """
    logger.info(f"🔄 Starting emissions computation for job_run: {job_run_id}")

    db = SessionLocal()
    try:
        # Update job status to computing
        job_run = db.query(JobRun).filter(JobRun.id == job_run_id).first()
        if not job_run:
            logger.error(f"❌ Job run not found: {job_run_id}")
            return {"status": "error", "message": "Job run not found"}

        # Update status to computing (if we added computation_status field)
        # job_run.computation_status = "computing"
        # db.commit()

        # Compute emissions
        result = compute_emissions_for_job_run(db, job_run)

        # Update status to completed
        # job_run.computation_status = "completed"
        db.commit()

        logger.info(f"✅ Emissions computed for job_run: {job_run_id}")
        return {
            "status": "success",
            "job_run_id": str(job_run_id),
            "emissions_kg": result.get("emissions_kg", 0) if result else 0,
        }

    except Exception as e:
        logger.error(f"❌ Failed to compute emissions for {job_run_id}: {e}")
        # Update status to failed
        # if job_run:
        #     job_run.computation_status = "failed"
        #     db.commit()
        return {"status": "error", "message": str(e)}

    finally:
        db.close()


@conditional_task(name="backend.app.workers.tasks.send_email_task")
def send_email_task(email_type: str, **kwargs):
    """
    Celery task to send email notifications.

    Args:
        email_type: Type of email (welcome, usage_alert, report_ready, weekly_summary)
        **kwargs: Email-specific parameters

    Returns:
        dict with status
    """
    logger.info(f"📧 Sending {email_type} email")

    try:
        from backend.app.services.email_service import email_service

        if email_type == "welcome":
            result = email_service.send_welcome_email(
                to_email=kwargs["to_email"],
                organization_name=kwargs["organization_name"]
            )
        elif email_type == "usage_alert":
            result = email_service.send_usage_alert_email(
                to_email=kwargs["to_email"],
                organization_name=kwargs["organization_name"],
                usage_percentage=kwargs["usage_percentage"],
                plan_name=kwargs["plan_name"],
                limit_name=kwargs["limit_name"],
                current_usage=kwargs["current_usage"],
                limit_value=kwargs["limit_value"]
            )
        elif email_type == "report_ready":
            result = email_service.send_report_ready_email(
                to_email=kwargs["to_email"],
                report_name=kwargs["report_name"],
                report_id=kwargs["report_id"],
                download_url=kwargs.get("download_url")
            )
        elif email_type == "weekly_summary":
            result = email_service.send_weekly_summary_email(
                to_email=kwargs["to_email"],
                organization_name=kwargs["organization_name"],
                total_runs=kwargs["total_runs"],
                total_carbon_kg=kwargs["total_carbon_kg"],
                total_energy_kwh=kwargs["total_energy_kwh"],
                total_cost=kwargs["total_cost"],
                week_start=kwargs["week_start"],
                week_end=kwargs["week_end"]
            )
        else:
            logger.error(f"❌ Unknown email type: {email_type}")
            return {"status": "error", "message": f"Unknown email type: {email_type}"}

        logger.info(f"✅ Email sent: {email_type}")
        return {"status": "success", "email_type": email_type, "result": result}

    except Exception as e:
        logger.error(f"❌ Failed to send {email_type} email: {e}")
        return {"status": "error", "message": str(e)}


@conditional_task(name="backend.app.workers.tasks.generate_report_task")
def generate_report_task(report_type: str, **kwargs):
    """
    Celery task to generate PDF reports.

    Args:
        report_type: Type of report (project, job_run)
        **kwargs: Report-specific parameters

    Returns:
        dict with status and report_id
    """
    logger.info(f"📊 Generating {report_type} report")

    db = SessionLocal()
    try:
        from backend.app.services.report_service import generate_project_report, generate_job_run_report
        from backend.app.models.project import Project

        if report_type == "project":
            project = db.query(Project).filter(Project.id == kwargs["project_id"]).first()
            if not project:
                return {"status": "error", "message": "Project not found"}

            report = generate_project_report(
                db,
                project,
                from_date=kwargs.get("from_date"),
                to_date=kwargs.get("to_date")
            )
            db.commit()

            logger.info(f"✅ Project report generated: {report.id}")
            return {"status": "success", "report_id": str(report.id), "report_type": "project"}

        elif report_type == "job_run":
            from backend.app.services.job_service import get_job_run

            job_run = get_job_run(db, kwargs["job_run_id"], organization_id=kwargs["organization_id"])
            report = generate_job_run_report(db, job_run)
            db.commit()

            logger.info(f"✅ Job run report generated: {report.id}")
            return {"status": "success", "report_id": str(report.id), "report_type": "job_run"}

        else:
            return {"status": "error", "message": f"Unknown report type: {report_type}"}

    except Exception as e:
        logger.error(f"❌ Failed to generate {report_type} report: {e}")
        return {"status": "error", "message": str(e)}

    finally:
        db.close()


# Sync mode fallback functions (when Celery not available)
def compute_emissions_sync(db, job_run: JobRun):
    """
    Synchronous emissions computation (fallback when Celery not available).

    Args:
        db: Database session
        job_run: JobRun instance

    Returns:
        dict with computation results
    """
    logger.info(f"🔄 Computing emissions synchronously for job_run: {job_run.id}")
    try:
        result = compute_emissions_for_job_run(db, job_run)
        db.commit()
        logger.info(f"✅ Emissions computed synchronously for job_run: {job_run.id}")
        return result
    except Exception as e:
        logger.error(f"❌ Failed to compute emissions: {e}")
        raise


# Helper function to queue or run sync
def queue_emissions_computation(job_run_id: str, db=None, job_run=None):
    """
    Queue emissions computation task or run synchronously.

    Args:
        job_run_id: UUID of the job run
        db: Database session (required for sync mode)
        job_run: JobRun instance (optional, for sync mode)

    Returns:
        AsyncResult if async mode, dict if sync mode
    """
    if is_async_mode():
        # Async mode: queue task
        logger.info(f"📤 Queuing emissions computation task for: {job_run_id}")
        return compute_emissions_task.apply_async(args=[str(job_run_id)])
    else:
        # Sync mode: compute immediately
        if not db or not job_run:
            raise ValueError("Database session and job_run required for sync mode")
        logger.info(f"⚡ Computing emissions synchronously for: {job_run_id}")
        return compute_emissions_sync(db, job_run)
