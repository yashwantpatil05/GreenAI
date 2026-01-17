"""Job run service (robust upsert + nested hardware/energy/costs handling)."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Dict, Optional, Tuple, Union
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from backend.app.models.job_run import JobRun, JobRunHardware, JobRunEnergy, JobRunCost
from backend.app.schemas.job_run import JobRunCreate


def _parse_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        # Ensure tz-aware (store UTC)
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        s = value.strip()
        # Handle common ISO formats including trailing Z
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(s)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid datetime format: {value}",
            )
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Invalid datetime type: {type(value).__name__}",
    )


def _normalize_tags(tags: Any) -> Dict[str, Any]:
    if tags is None:
        return {}
    if isinstance(tags, dict):
        return tags
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="tags must be an object (JSON dict).",
    )


def _normalize_status(status_value: Optional[str], start_time: datetime, end_time: Optional[datetime]) -> str:
    if status_value:
        return str(status_value).strip().lower()
    # auto infer
    if end_time is not None:
        return "completed"
    # start_time in future => queued
    if start_time > datetime.now(timezone.utc):
        return "queued"
    return "running"


def _dedupe_key_for(payload: dict) -> str:
    """Stable dedupe key derived from payload."""
    provided = payload.get("dedupe_key") or payload.get("external_run_id")
    if provided:
        return str(provided)
    project_id = str(payload.get("project_id"))
    run_name = str(payload.get("run_name"))
    start_time = payload.get("start_time")
    job_type = str(payload.get("job_type"))
    start_str = start_time.isoformat() if isinstance(start_time, datetime) else str(start_time)
    seed = f"{project_id}:{run_name}:{start_str}:{job_type}"
    return sha256(seed.encode("utf-8")).hexdigest()


def _apply_hardware(existing: Optional[JobRunHardware], job_run_id: UUID, payload: Dict[str, Any]) -> JobRunHardware:
    cpu_count = payload.get("cpu_count")
    gpu_model = payload.get("gpu_model")
    ram_gb = payload.get("ram_gb")
    details = payload.get("details") or {}

    if existing is None:
        return JobRunHardware(
            job_run_id=job_run_id,
            cpu_count=str(cpu_count) if cpu_count is not None else None,
            gpu_model=str(gpu_model) if gpu_model is not None else None,
            ram_gb=float(ram_gb) if ram_gb is not None else None,
            details=details if isinstance(details, dict) else {},
        )

    if cpu_count is not None:
        existing.cpu_count = str(cpu_count)
    if gpu_model is not None:
        existing.gpu_model = str(gpu_model)
    if ram_gb is not None:
        existing.ram_gb = float(ram_gb)
    if details is not None:
        existing.details = details if isinstance(details, dict) else {}
    return existing


def _apply_energy(existing: Optional[JobRunEnergy], job_run_id: UUID, payload: Dict[str, Any]) -> JobRunEnergy:
    def f(key: str, default: float = 0.0) -> float:
        v = payload.get(key, default)
        try:
            return float(v) if v is not None else default
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"energy.{key} must be a number",
            )

    cpu_kwh = f("cpu_kwh")
    gpu_kwh = f("gpu_kwh")
    ram_kwh = f("ram_kwh")
    total_kwh = f("total_kwh")
    emissions_kg = f("emissions_kg")

    if existing is None:
        return JobRunEnergy(
            job_run_id=job_run_id,
            cpu_kwh=cpu_kwh,
            gpu_kwh=gpu_kwh,
            ram_kwh=ram_kwh,
            total_kwh=total_kwh,
            emissions_kg=emissions_kg,
            compute_status="pending",
        )

    existing.cpu_kwh = cpu_kwh
    existing.gpu_kwh = gpu_kwh
    existing.ram_kwh = ram_kwh
    existing.total_kwh = total_kwh
    existing.emissions_kg = emissions_kg
    return existing


def _apply_costs(existing: Optional[JobRunCost], job_run_id: UUID, payload: Dict[str, Any]) -> JobRunCost:
    amount_usd = payload.get("amount_usd", 0.0)
    currency = payload.get("currency", "USD")
    breakdown = payload.get("breakdown") or {}

    try:
        amount_usd_f = float(amount_usd) if amount_usd is not None else 0.0
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="costs.amount_usd must be a number",
        )

    if existing is None:
        return JobRunCost(
            job_run_id=job_run_id,
            amount_usd=amount_usd_f,
            currency=str(currency) if currency else "USD",
            breakdown=breakdown if isinstance(breakdown, dict) else {},
        )

    existing.amount_usd = amount_usd_f
    if currency is not None:
        existing.currency = str(currency) if currency else "USD"
    if breakdown is not None:
        existing.breakdown = breakdown if isinstance(breakdown, dict) else {}
    return existing


def upsert_job_run(db: Session, payload: JobRunCreate) -> Tuple[JobRun, bool]:
    """
    Robust upsert:
    - If payload.id exists -> update that row.
    - Else upsert by (project_id, run_name, start_time) to avoid duplicates.
    - Handles nested hardware/energy/costs (create or update).
    - Returns (job_run, created_flag).
    """
    data = payload.model_dump(exclude_unset=True)

    # Required fields validation (schema should already enforce, but we harden)
    project_id = data.get("project_id")
    run_name = data.get("run_name")
    job_type = data.get("job_type")
    region = data.get("region")
    organization_id = data.get("organization_id")

    if not project_id:
        raise HTTPException(status_code=422, detail="project_id is required")
    if not organization_id:
        raise HTTPException(status_code=422, detail="organization_id is required")
    if not run_name:
        raise HTTPException(status_code=422, detail="run_name is required")
    if not job_type:
        raise HTTPException(status_code=422, detail="job_type is required")
    if not region:
        raise HTTPException(status_code=422, detail="region is required")

    start_time = _parse_dt(data.get("start_time"))
    end_time = _parse_dt(data.get("end_time"))

    if start_time is None:
        raise HTTPException(status_code=422, detail="start_time is required")
    if end_time is not None and end_time < start_time:
        raise HTTPException(status_code=422, detail="end_time cannot be before start_time")

    tags = _normalize_tags(data.get("tags"))
    metadata_payload = data.get("metadata") or {}
    if metadata_payload is not None and not isinstance(metadata_payload, dict):
        raise HTTPException(status_code=422, detail="metadata must be an object (JSON dict).")
    dedupe_key = _dedupe_key_for(
        {
            "dedupe_key": data.get("dedupe_key"),
            "external_run_id": data.get("external_run_id"),
            "project_id": project_id,
            "run_name": run_name,
            "start_time": start_time,
            "job_type": job_type,
        }
    )

    status_value = _normalize_status(data.get("status"), start_time, end_time)

    hardware_payload = data.get("hardware")
    energy_payload = data.get("energy")
    costs_payload = data.get("costs")

    try:
        # Load existing
        obj: Optional[JobRun] = None
        created = False
        if data.get("id"):
            obj = (
                db.query(JobRun)
                .options(
                    joinedload(JobRun.hardware),
                    joinedload(JobRun.energy),
                    joinedload(JobRun.costs),
                )
                .filter(JobRun.id == data["id"])
                .first()
            )
            if obj is None:
                raise HTTPException(status_code=404, detail="job_run not found")
        else:
            obj = (
                db.query(JobRun)
                .options(
                    joinedload(JobRun.hardware),
                    joinedload(JobRun.energy),
                    joinedload(JobRun.costs),
                )
                .filter(
                    JobRun.project_id == project_id,
                    JobRun.dedupe_key == dedupe_key,
                )
                .first()
            )

        if obj is None:
            obj = JobRun(
                project_id=project_id,
                organization_id=organization_id,
                run_name=run_name,
                job_type=job_type,
                region=region,
                start_time=start_time,
                end_time=end_time,
                status=status_value,
                tags=tags,
                run_metadata=metadata_payload,
                dedupe_key=dedupe_key,
                external_run_id=data.get("external_run_id"),
                model_version_id=data.get("model_version_id"),
            )
            db.add(obj)
            db.flush()  # allocate id for nested inserts
            created = True
        else:
            # Update fields (only if provided)
            obj.project_id = project_id
            obj.organization_id = organization_id
            obj.run_name = run_name
            obj.job_type = job_type
            obj.region = region
            obj.start_time = start_time
            obj.end_time = end_time
            obj.status = status_value
            obj.tags = tags
            obj.run_metadata = metadata_payload
            obj.dedupe_key = dedupe_key
            if "external_run_id" in data:
                obj.external_run_id = data.get("external_run_id")
            if "model_version_id" in data:
                obj.model_version_id = data.get("model_version_id")

        # Nested: hardware
        if hardware_payload is not None:
            if not isinstance(hardware_payload, dict):
                raise HTTPException(status_code=422, detail="hardware must be an object")
            hw = _apply_hardware(obj.hardware, obj.id, hardware_payload)
            if obj.hardware is None:
                db.add(hw)

        # Nested: energy (optional direct write; worker will also update later)
        if energy_payload is not None:
            if not isinstance(energy_payload, dict):
                raise HTTPException(status_code=422, detail="energy must be an object")
            en = _apply_energy(obj.energy, obj.id, energy_payload)
            if obj.energy is None:
                db.add(en)

        # Nested: costs
        if costs_payload is not None:
            if not isinstance(costs_payload, dict):
                raise HTTPException(status_code=422, detail="costs must be an object")
            cs = _apply_costs(obj.costs, obj.id, costs_payload)
            if obj.costs is None:
                db.add(cs)

        db.commit()

        # Reload fully for response
        obj = (
            db.query(JobRun)
            .options(
                joinedload(JobRun.hardware),
                joinedload(JobRun.energy),
                joinedload(JobRun.costs),
            )
            .filter(JobRun.id == obj.id)
            .one()
        )
        return obj, created

    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate or invalid job_run data (constraint violation).",
        ) from e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job run upsert failed: {str(e)}",
        ) from e


def list_job_runs(
    db: Session,
    organization_id: Union[UUID, str],
    project_id: Optional[UUID] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = 50,
) -> list[JobRun]:
    q = (
        db.query(JobRun)
        .options(
            joinedload(JobRun.hardware),
            joinedload(JobRun.energy),
            joinedload(JobRun.costs),
        )
        .order_by(JobRun.created_at.desc())
        .filter(JobRun.organization_id == UUID(str(organization_id)))
    )
    if project_id:
        q = q.filter(JobRun.project_id == project_id)
    if start:
        q = q.filter(JobRun.start_time >= start)
    if end:
        q = q.filter(JobRun.start_time <= end)
    return q.limit(max(1, min(int(limit), 200))).all()


def get_job_run(db: Session, job_run_id: UUID, organization_id: Optional[Union[UUID, str]] = None) -> JobRun:
    try:
        run_uuid = UUID(str(job_run_id))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid job_run_id")

    q = (
        db.query(JobRun)
        .options(
            joinedload(JobRun.hardware),
            joinedload(JobRun.energy),
            joinedload(JobRun.costs),
        )
        .filter(JobRun.id == run_uuid)
    )
    if organization_id:
        try:
            org_uuid = UUID(str(organization_id))
        except Exception:
            raise HTTPException(status_code=403, detail="Invalid organization context")
        q = q.filter(JobRun.organization_id == org_uuid)

    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="Job run not found")
    return obj
