"""Job run ingestion and retrieval endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from hashlib import sha256

from backend.app.auth.deps import get_current_user
from backend.app.auth.context import get_request_context
from backend.app.auth.security import verify_password
from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.models.api_key import ApiKey
from backend.app.models.job_run import JobRun, JobRunHardware, JobRunEnergy, JobRunCost
from backend.app.models.model import Model
from backend.app.models.model_version import ModelVersion
from backend.app.models.organization import Organization
from backend.app.models.project import Project
from backend.app.schemas.job_run import JobRunCreate, JobRunDetail, JobRunRead
from backend.app.schemas.pagination import PaginationParams, PaginatedResponse
from backend.app.services.emissions_service import compute_emissions_for_job_run
from backend.app.services.job_service import get_job_run, list_job_runs, upsert_job_run
from backend.app.services.esg_service import generate_esg_narrative
from backend.app.services.rate_limit_service import rate_limiter
from backend.app.services.audit_service import audit_log, AuditEvent
from backend.app.services.subscription_limits import check_job_runs_limit
from backend.app.services.cache_service import get_cache, CacheService

settings = get_settings()

router = APIRouter(tags=["job-runs"])


def _dedupe_key(payload: JobRunCreate, project_id) -> str:
    if payload.dedupe_key:
        return payload.dedupe_key
    if payload.external_run_id:
        return payload.external_run_id
    start = payload.start_time.isoformat() if isinstance(payload.start_time, datetime) else str(payload.start_time)
    seed = f"{project_id}:{payload.run_name}:{start}:{payload.job_type}"
    return sha256(seed.encode("utf-8")).hexdigest()


def get_api_key(
    x_api_key: str = Header(default="", alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> ApiKey:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    if not x_api_key.startswith("gai_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    # Attempt prefix-based lookup when available
    prefix = x_api_key[:12]
    candidates = (
        db.query(ApiKey)
        .filter(ApiKey.revoked_at.is_(None), ApiKey.active.is_(True))
        .filter(ApiKey.key_prefix == prefix)
        .all()
    )
    if not candidates:
        candidates = db.query(ApiKey).filter(ApiKey.revoked_at.is_(None), ApiKey.active.is_(True)).all()

    for key in candidates:
        if verify_password(x_api_key, key.hashed_key):
            if key.blocked_until:
                from datetime import datetime
                if key.blocked_until > datetime.utcnow():
                    raise HTTPException(status_code=403, detail="API key temporarily blocked")
            return key

    raise HTTPException(status_code=401, detail="Invalid or revoked API key")


def get_project_for_api_key(
    payload: JobRunCreate,
    api_key: ApiKey = Depends(get_api_key),
    db: Session = Depends(get_db),
) -> Project:
    project = db.query(Project).filter(Project.id == api_key.project_id).first()
    if not project:
        raise HTTPException(status_code=401, detail="API key project not found")
    if payload.project_id and payload.project_id != project.id:
        raise HTTPException(status_code=403, detail="Project mismatch for this API key")
    return project


def _validate_model_version_for_project(db: Session, project_id: UUID, model_version_id: UUID) -> None:
    ok = (
        db.query(ModelVersion.id)
        .join(Model, ModelVersion.model_id == Model.id)
        .filter(ModelVersion.id == model_version_id, Model.project_id == project_id)
        .first()
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid model_version_id for this project",
        )


@router.post("/validate", tags=["ingest"])
def validate_api_key(
    api_key: ApiKey = Depends(get_api_key),
    db: Session = Depends(get_db),
):
    """Validate an API key and return plan/project info.

    Used by the onboarding wizard and SDK ``greenai.validate()`` to verify
    that a key is active before running a long job.
    """
    project = db.query(Project).filter(Project.id == api_key.project_id).first()
    if not project:
        raise HTTPException(status_code=401, detail="API key project not found")

    org = db.query(Organization).filter(Organization.id == project.organization_id).first()

    job_runs_remaining: int | None = None
    if org and org.job_runs_limit != -1:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = db.query(func.count(JobRun.id)).filter(
            JobRun.organization_id == org.id,
            JobRun.created_at >= month_start,
        ).scalar() or 0
        job_runs_remaining = max(0, org.job_runs_limit - used)

    return {
        "valid": True,
        "project": project.name,
        "organization": org.name if org else None,
        "plan": getattr(org, "subscription_plan", "starter") if org else "starter",
        "job_runs_remaining": job_runs_remaining,
    }


@router.post("/", response_model=JobRunRead, status_code=status.HTTP_201_CREATED)
def ingest_job_run(
    payload: JobRunCreate,
    response: Response,
    db: Session = Depends(get_db),
    project: Project = Depends(get_project_for_api_key),
    background_tasks: BackgroundTasks = None,
    ctx=Depends(get_request_context),
):
    # Validate optional FK BEFORE insert -> avoids generic 409
    if payload.model_version_id:
        _validate_model_version_for_project(db, project.id, payload.model_version_id)

    dedupe = _dedupe_key(payload, project.id)
    payload = payload.model_copy(
        update={
            "project_id": project.id,
            "organization_id": project.organization_id,
            "dedupe_key": dedupe,
        }
    )

    audit_status = "success"
    try:
        # Check subscription limits before ingesting
        check_job_runs_limit(project.organization_id, db)

        # Rate limit per api key
        rl = rate_limiter.check(
            key=str(ctx.api_key.id if getattr(ctx, "api_key", None) else project.id),
            scope="ingest",
            limit=settings.rate_limit_ingest_per_minute,
            burst=settings.rate_limit_burst_multiplier,
            db=db,
            context=ctx,
        )
        response.headers["X-RateLimit-Limit"] = str(rl.limit)
        response.headers["X-RateLimit-Remaining"] = str(rl.remaining)

        job_run, created = upsert_job_run(db, payload)

        if settings.sync_compute:
            if background_tasks is not None:
                background_tasks.add_task(compute_emissions_for_job_run, job_run.id)
            else:
                compute_emissions_for_job_run(job_run.id)

        # Invalidate analytics cache for organization
        cache = get_cache()
        CacheService.invalidate_org_analytics(cache, str(project.organization_id))

        if not created and response is not None:
            response.status_code = status.HTTP_200_OK
        return job_run
    except IntegrityError as e:
        db.rollback()
        audit_status = "failure"
        msg = str(getattr(e, "orig", e)).lower()
        if "foreign key" in msg or "violates foreign key constraint" in msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid foreign key (check project_id/model_version_id)",
            )
        if "ux_job_runs_project_dedupe" in msg:
            # Idempotent fetch
            existing = (
                db.query(JobRun)
                .filter(JobRun.project_id == project.id, JobRun.dedupe_key == dedupe)
                .first()
            )
            if existing:
                response.status_code = status.HTTP_200_OK
                return existing
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate or invalid job_run data (constraint violation).",
        )
    finally:
        try:
            audit_log(
                AuditEvent(
                    organization_id=project.organization_id,
                    actor_type="api_key",
                    actor_api_key_id=getattr(ctx, "api_key", None).id if getattr(ctx, "api_key", None) else None,
                    action="job_run.ingest",
                    status=audit_status,
                    resource_type="job_run",
                    request_id=ctx.request_id if hasattr(ctx, "request_id") else None,
                    metadata={"project_id": str(project.id)},
                ),
                db,
            )
        except Exception:
            pass


@router.get("/", response_model=PaginatedResponse[JobRunRead])
@router.get("", response_model=PaginatedResponse[JobRunRead])
def list_runs(
    project_id: UUID | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """List job runs for the organization with pagination."""
    # Build base query with filters
    q = db.query(JobRun).filter(JobRun.organization_id == user.organization_id)

    if project_id:
        # Convert UUID to string for comparison (SQLite stores UUIDs as strings)
        q = q.filter(JobRun.project_id == str(project_id))
    if start:
        q = q.filter(JobRun.start_time >= start)
    if end:
        q = q.filter(JobRun.start_time <= end)

    # Get total count
    total = q.count()

    # Get paginated items with eager loading
    job_runs = (
        q.options(
            joinedload(JobRun.hardware),
            joinedload(JobRun.energy),
            joinedload(JobRun.costs),
        )
        .order_by(JobRun.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.limit)
        .all()
    )

    return PaginatedResponse.create(
        items=job_runs,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size
    )


@router.get("/{job_run_id}", response_model=JobRunDetail)
def get_run_detail(
    job_run_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_job_run(db, job_run_id, organization_id=user.organization_id)


@router.get("/{job_run_id}/esg-narrative")
def esg_narrative(
    job_run_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    run = get_job_run(db, job_run_id, organization_id=user.organization_id)
    return generate_esg_narrative(run)
