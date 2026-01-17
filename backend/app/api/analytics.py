"""Aggregation endpoints for overview and trends."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.models.job_run import JobRun, JobRunEnergy
from backend.app.models.project import Project


router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Return aggregate totals and last 30 day trend buckets."""
    total_runs = (
        db.query(func.count(JobRun.id))
        .filter(JobRun.organization_id == user.organization_id)
        .scalar()
    )

    total_energy = (
        db.query(func.coalesce(func.sum(JobRunEnergy.total_kwh), 0))
        .join(JobRunEnergy.job_run)
        .filter(JobRun.organization_id == user.organization_id)
        .scalar()
    )
    total_emissions = (
        db.query(func.coalesce(func.sum(JobRunEnergy.emissions_kg), 0))
        .join(JobRunEnergy.job_run)
        .filter(JobRun.organization_id == user.organization_id)
        .scalar()
    )

    since = datetime.now(timezone.utc) - timedelta(days=30)
    trend = (
        db.query(
            func.date_trunc("day", JobRun.start_time).label("day"),
            func.count(JobRun.id).label("runs"),
            func.coalesce(func.sum(JobRunEnergy.total_kwh), 0).label("kwh"),
            func.coalesce(func.sum(JobRunEnergy.emissions_kg), 0).label("co2e"),
        )
        .join(JobRunEnergy.job_run)
        .filter(JobRun.organization_id == user.organization_id, JobRun.start_time >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )

    return {
        "total_runs": total_runs or 0,
        "total_energy_kwh": float(total_energy or 0),
        "total_co2e_kg": float(total_emissions or 0),
        "last_30_days": [
            {"day": row.day, "runs": row.runs, "energy_kwh": float(row.kwh), "co2e_kg": float(row.co2e)}
            for row in trend
        ],
    }


@router.get("/overview")
def overview(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Return aggregate totals for organization (legacy)."""
    total_kwh = (
        db.query(func.coalesce(func.sum(JobRunEnergy.total_kwh), 0))
        .join(JobRunEnergy.job_run)
        .join(JobRun.project)
        .filter(JobRun.project.has(organization_id=user.organization_id))
        .scalar()
    )
    total_emissions = (
        db.query(func.coalesce(func.sum(JobRunEnergy.emissions_kg), 0))
        .join(JobRunEnergy.job_run)
        .join(JobRun.project)
        .filter(JobRun.project.has(organization_id=user.organization_id))
        .scalar()
    )
    return {"total_kwh": total_kwh, "total_emissions_kg": total_emissions}


@router.get("/trends")
def trends(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Return simple monthly trend for energy."""
    results = (
        db.query(
            func.date_trunc("month", JobRun.created_at).label("month"),
            func.sum(JobRunEnergy.total_kwh).label("kwh"),
        )
        .join(JobRunEnergy.job_run)
        .join(JobRun.project)
        .filter(JobRun.project.has(organization_id=user.organization_id))
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": r.month, "kwh": r.kwh} for r in results]


@router.get("/hotspots")
def hotspots(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Top emitting job runs."""
    rows = (
        db.query(JobRun.run_name, JobRunEnergy.total_kwh, JobRunEnergy.emissions_kg)
        .join(JobRunEnergy.job_run)
        .join(JobRun.project)
        .filter(JobRun.project.has(organization_id=user.organization_id))
        .order_by(JobRunEnergy.emissions_kg.desc())
        .limit(5)
        .all()
    )
    return [
        {"run_name": r.run_name, "total_kwh": r.total_kwh, "emissions_kg": r.emissions_kg}
        for r in rows
    ]


@router.get("/project/{project_id}/breakdown")
def project_breakdown(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Breakdowns by model, job type, region, hardware for a project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == user.organization_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    def group_by(field):
        rows = (
            db.query(getattr(JobRun, field).label("label"), func.sum(JobRunEnergy.total_kwh).label("kwh"))
            .join(JobRunEnergy.job_run)
            .filter(JobRun.project_id == project_id)
            .group_by("label")
            .all()
        )
        return [{"label": r.label, "kwh": r.kwh} for r in rows]

    hardware_rows = (
        db.query(JobRun.hardware)
        .join(JobRunEnergy.job_run)
        .filter(JobRun.project_id == project_id)
        .all()
    )
    hardware_counts = {}
    for (hw,) in hardware_rows:
        if hw and hw.gpu_model:
            hardware_counts[hw.gpu_model] = hardware_counts.get(hw.gpu_model, 0) + 1
        else:
            hardware_counts["cpu_only"] = hardware_counts.get("cpu_only", 0) + 1

    return {
        "by_model": group_by("model_version_id"),
        "by_job_type": group_by("job_type"),
        "by_region": group_by("region"),
        "hardware_mix": [{"label": k, "count": v} for k, v in hardware_counts.items()],
    }
