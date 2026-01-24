"""Report routes."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user, require_roles
from backend.app.core.database import get_db
from backend.app.models.report import Report
from backend.app.schemas.report import ReportRead
from backend.app.services.report_service import generate_project_report, generate_job_run_report
from backend.app.services.job_service import get_job_run
from backend.app.models.project import Project
from backend.app.auth.context import get_request_context
from backend.app.services.audit_service import audit_log, AuditEvent


router = APIRouter()


@router.get("/", response_model=list[ReportRead])
@router.get("", response_model=list[ReportRead])
def list_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """List reports for organization."""
    return (
        db.query(Report)
        .filter(Report.organization_id == user.organization_id)
        .all()
    )


@router.post("/job-run/{job_run_id}", response_model=ReportRead)
def create_job_run_report(
    job_run_id: str, db: Session = Depends(get_db), user=Depends(get_current_user), ctx=Depends(get_request_context)
):
    run = get_job_run(db, job_run_id, organization_id=user.organization_id)
    report = generate_job_run_report(db, run)
    db.commit()
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="report.generate",
            resource_type="job_run",
            resource_id=run.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return report


@router.post("/project/{project_id}", response_model=ReportRead)
def create_project_report(
    project_id: str,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "admin")),
    ctx=Depends(get_request_context),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == user.organization_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    report = generate_project_report(db, project, from_date=from_date, to_date=to_date)
    db.commit()
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="report.generate",
            resource_type="project",
            resource_id=project.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return report


@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db), user=Depends(get_current_user), ctx=Depends(get_request_context)):
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.organization_id == user.organization_id)
        .first()
    )
    if not report or not report.file_path:
        raise HTTPException(status_code=404, detail="Report not found")
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="report.download",
            resource_type=report.report_type,
            resource_id=report.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return FileResponse(report.file_path, filename=report.name + ".pdf")
