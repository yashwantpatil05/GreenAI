"""System endpoints: health, readiness, metrics, dev seed."""
from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.models.organization import Organization
from backend.app.models.project import Project
from backend.app.models.api_key import ApiKey
from backend.app.auth.security import get_password_hash
from backend.app.services.audit_service import audit_log, AuditEvent
from backend.app.services.job_service import upsert_job_run
from backend.app.schemas.job_run import JobRunCreate
from backend.app.observability.metrics import registry

settings = get_settings()
router = APIRouter(tags=["system"])

@router.get("/healthz")
def healthz(response: Response):
    response.headers["X-Request-ID"] = response.headers.get("X-Request-ID", "")
    return {"status": "ok"}


@router.get("/readyz")
def readyz(db: Session = Depends(get_db), response: Response = None):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="database not ready")
    if response:
        response.headers["X-Request-ID"] = response.headers.get("X-Request-ID", "")
    return {"status": "ready"}


@router.get("/metrics")
def metrics():
    if not settings.enable_metrics:
        raise HTTPException(status_code=404, detail="metrics disabled")
    return PlainTextResponse(generate_latest(registry), media_type="text/plain; version=0.0.4")


@router.post("/system/dev/seed")
def dev_seed(db: Session = Depends(get_db)):
    if not settings.enable_dev_seed:
        raise HTTPException(status_code=403, detail="dev seed disabled")
    org = db.query(Organization).filter(Organization.name == "Dev Seed Org").first()
    if not org:
        org = Organization(name="Dev Seed Org")
        db.add(org)
        db.flush()
    project = (
        db.query(Project)
        .filter(Project.organization_id == org.id)
        .first()
    )
    if not project:
        project = Project(name="Dev Project", organization_id=org.id)
        db.add(project)
        db.flush()
    # create api key
    api_key_value = f"gai_dev_{uuid.uuid4().hex[:12]}"
    hashed = get_password_hash(api_key_value)
    key = ApiKey(
        name="dev seed key",
        hashed_key=hashed,
        key_prefix=api_key_value[:12],
        organization_id=org.id,
        project_id=project.id,
        scopes=["ingest"],
    )
    db.add(key)
    db.flush()

    jr_payload = JobRunCreate(
        run_name="seed-run",
        job_type="training",
        region="us-east-1",
        status="completed",
        start_time=datetime.utcnow() - timedelta(minutes=5),
        end_time=datetime.utcnow(),
        tags={},
        metadata={},
        project_id=project.id,
        organization_id=org.id,
        energy={"total_kwh": 0.5, "emissions_kg": 0.2},
    )
    upsert_job_run(db, jr_payload)
    db.commit()

    audit_log(
        AuditEvent(
            organization_id=org.id,
            actor_type="system",
            action="system.dev_seed",
            resource_type="organization",
            resource_id=org.id,
            metadata={"project_id": str(project.id)},
        ),
        db,
    )

    return {
        "organization_id": org.id,
        "project_id": project.id,
        "api_key": api_key_value,
    }
