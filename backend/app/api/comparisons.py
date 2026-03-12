"""Job run comparison endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user
from backend.app.auth.context import get_request_context
from backend.app.core.database import get_db
from backend.app.schemas.comparison import ComparisonResult
from backend.app.services.comparison_service import compare_runs, baseline_for_project
from backend.app.services.job_service import get_job_run
from backend.app.services.audit_service import audit_log, AuditEvent

router = APIRouter(tags=["job-runs"])


@router.get("/job-runs/compare", response_model=ComparisonResult)
def compare_job_runs(
    run_a: UUID,
    run_b: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    ctx=Depends(get_request_context),
):
    result = compare_runs(db, run_a, run_b, organization_id=user.organization_id)
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="job_run.compare",
            resource_type="job_run",
            resource_id=run_a,
            request_id=ctx.request_id,
        ),
        db,
    )
    return result


@router.get("/projects/{project_id}/compare-latest", response_model=ComparisonResult)
def compare_latest(
    project_id: UUID,
    candidate: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    ctx=Depends(get_request_context),
):
    candidate_run = get_job_run(db, candidate, organization_id=user.organization_id)
    if candidate_run.project_id != project_id:
        raise HTTPException(status_code=403, detail="Run does not belong to project")
    baseline = baseline_for_project(db, project_id)
    if not baseline:
        raise HTTPException(status_code=404, detail="No baseline run found for project")
    result = compare_runs(db, baseline.id, candidate, organization_id=user.organization_id)
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="job_run.compare",
            resource_type="project",
            resource_id=project_id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return result
