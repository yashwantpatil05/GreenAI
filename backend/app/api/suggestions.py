"""Suggestion endpoints."""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user, require_roles
from backend.app.auth.context import get_request_context
from backend.app.core.database import get_db
from backend.app.models.suggestion import OptimizationSuggestion
from backend.app.schemas.suggestion import SuggestionRead
from backend.app.services.suggestion_service import (
    generate_project_suggestions,
    generate_run_suggestions,
    update_suggestion_status,
)
from backend.app.services.job_service import get_job_run
from backend.app.services.audit_service import audit_log, AuditEvent


router = APIRouter()


@router.get("/", response_model=list[SuggestionRead])
@router.get("", response_model=list[SuggestionRead])
def list_suggestions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """List suggestions for organization."""
    return (
        db.query(OptimizationSuggestion)
        .join(OptimizationSuggestion.project)
        .filter(OptimizationSuggestion.project.has(organization_id=user.organization_id))
        .all()
    )


@router.get("/job-runs/{job_run_id}", response_model=list[SuggestionRead])
def generate_for_run(job_run_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    run = get_job_run(db, job_run_id, organization_id=user.organization_id)
    suggestions = generate_run_suggestions(db, run)
    db.commit()
    return suggestions


@router.get("/projects/{project_id}", response_model=list[SuggestionRead])
def generate_for_project(project_id: str, window: str = "30d", db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        window_days = int(window.replace("d", ""))
    except Exception:
        window_days = 30
    from backend.app.models.project import Project

    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == user.organization_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    suggestions = generate_project_suggestions(db, project.id, window_days=window_days)
    db.commit()
    return suggestions


@router.post("/{suggestion_id}/accept", response_model=SuggestionRead)
def accept_suggestion(
    suggestion_id: str,
    feedback: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "admin")),
    ctx=Depends(get_request_context),
):
    suggestion = update_suggestion_status(db, suggestion_id, "accepted", feedback, user.organization_id)
    db.commit()
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="suggestion.accept",
            resource_type="suggestion",
            resource_id=suggestion.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return suggestion


@router.post("/{suggestion_id}/dismiss", response_model=SuggestionRead)
def dismiss_suggestion(
    suggestion_id: str,
    feedback: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    ctx=Depends(get_request_context),
):
    suggestion = update_suggestion_status(db, suggestion_id, "dismissed", feedback, user.organization_id)
    db.commit()
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="suggestion.dismiss",
            resource_type="suggestion",
            resource_id=suggestion.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return suggestion
