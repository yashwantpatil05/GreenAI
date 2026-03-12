"""Emissions computation service for job runs."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional, Union
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from backend.app.core.database import SessionLocal
from backend.app.models.job_run import JobRun, JobRunEnergy

logger = logging.getLogger(__name__)

# Simple static factors (kg CO2e per kWh)
GRID_FACTORS = {
    "us-east-1": 0.0004,
    "us-west-2": 0.0002,
    "eu-west-1": 0.00025,
    "ap-northeast-1": 0.00045,
}
DEFAULT_FACTOR = 0.0004

# GPU TDP lookup table (Thermal Design Power in Watts).
# Used when job run provides a gpu_model but no measured energy data.
GPU_TDP_WATTS: dict[str, float] = {
    # NVIDIA Data Center
    "h100": 700.0,
    "h100 80gb": 700.0,
    "h100 sxm5": 700.0,
    "a100": 400.0,
    "a100 80gb": 400.0,
    "a100 40gb": 300.0,
    "a100 sxm4": 400.0,
    "a40": 300.0,
    "a30": 165.0,
    "a10": 150.0,
    "a10g": 150.0,
    "v100": 300.0,
    "v100 16gb": 300.0,
    "v100 32gb": 300.0,
    "v100s": 250.0,
    "t4": 70.0,
    "l4": 72.0,
    "l40": 300.0,
    "l40s": 350.0,
    "p100": 250.0,
    "p100 16gb": 250.0,
    # Consumer / Workstation
    "rtx 4090": 450.0,
    "rtx 4080": 320.0,
    "rtx 4070 ti": 285.0,
    "rtx 4070": 200.0,
    "rtx 3090": 350.0,
    "rtx 3090 ti": 450.0,
    "rtx 3080": 320.0,
    "rtx 3080 ti": 350.0,
    "rtx 3070": 220.0,
    "rtx 2080 ti": 260.0,
    "rtx 2080": 215.0,
    "gtx 1080 ti": 250.0,
    "gtx 1080": 180.0,
    # AMD
    "mi300x": 750.0,
    "mi250x": 500.0,
    "mi250": 500.0,
    "mi100": 300.0,
    "rx 7900 xtx": 355.0,
    "rx 6900 xt": 300.0,
    # Cloud instance short-hands
    "nvidia a100": 400.0,
    "nvidia h100": 700.0,
    "nvidia v100": 300.0,
    "nvidia t4": 70.0,
    "nvidia a10": 150.0,
    "nvidia a10g": 150.0,
    "nvidia l4": 72.0,
    "nvidia rtx 4090": 450.0,
    "nvidia rtx 3090": 350.0,
}


def _estimate_gpu_kwh(gpu_model: str, gpu_count: int, duration_hours: float) -> Optional[float]:
    """Return estimated kWh for a given GPU model and count, or None if unknown."""
    key = gpu_model.strip().lower()
    tdp = GPU_TDP_WATTS.get(key)
    # Try partial match for cases like "NVIDIA A100 SXM4 80GB"
    if tdp is None:
        for known_key, known_tdp in GPU_TDP_WATTS.items():
            if known_key in key:
                tdp = known_tdp
                break
    if tdp is None:
        return None
    return (tdp * max(gpu_count, 1) * duration_hours) / 1000.0


def _duration_hours(start_time: datetime, end_time: datetime | None) -> float:
    end = end_time or datetime.now(timezone.utc)
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    seconds = max((end - start_time).total_seconds(), 0.0)
    return seconds / 3600.0


def compute_emissions_for_job_run(
    db_or_job_run_id: Union[Session, UUID],
    job_run: Optional[JobRun] = None
) -> Optional[dict]:
    """
    Compute emissions for a job run; safe to call in background.

    Supports two usage patterns:
    1. Old pattern (background tasks, API): compute_emissions_for_job_run(job_run_id)
    2. New pattern (tests, sync tasks): compute_emissions_for_job_run(db, job_run)

    Args:
        db_or_job_run_id: Either a database Session or a job run UUID
        job_run: Optional JobRun object (required if first arg is Session)

    Returns:
        dict with computation results if successful, None otherwise
    """
    # Determine usage pattern
    if isinstance(db_or_job_run_id, Session):
        # New pattern: Session provided, use it
        session = db_or_job_run_id
        owns_session = False
        if job_run is None:
            logger.error("job_run required when Session is provided")
            return None
        job_run_id = job_run.id
        run = job_run
    else:
        # Old pattern: UUID provided, create session
        job_run_id = db_or_job_run_id
        session = SessionLocal()
        owns_session = True
        run = None

    energy: JobRunEnergy | None = None
    try:
        # If we don't have the job_run object yet, fetch it
        if run is None:
            run = (
                session.query(JobRun)
                .options(
                    joinedload(JobRun.energy),
                    joinedload(JobRun.hardware),
                )
                .filter(JobRun.id == job_run_id)
                .first()
            )
            if run is None:
                logger.warning("JobRun %s not found for emissions computation", job_run_id)
                return None

        energy = run.energy or JobRunEnergy(job_run_id=run.id, compute_status="pending")
        if run.energy is None:
            session.add(energy)

        # Prefer provided totals
        total_kwh = (energy.total_kwh or 0.0) + 0.0
        if total_kwh <= 0:
            summed = (energy.cpu_kwh or 0.0) + (energy.gpu_kwh or 0.0) + (energy.ram_kwh or 0.0)
            total_kwh = summed

        # Fallback: derive from duration and optional average power
        if total_kwh <= 0 and run.start_time:
            power_watts = None
            meta = run.run_metadata or {}
            if isinstance(meta, dict):
                power_watts = meta.get("power_watts") or meta.get("avg_power_watts")
            try:
                if power_watts is not None:
                    power_watts = float(power_watts)
            except Exception:
                power_watts = None

            if power_watts is not None:
                duration_h = _duration_hours(run.start_time, run.end_time)
                total_kwh = max(power_watts, 0.0) * duration_h / 1000.0

        # Fallback: estimate from GPU TDP if hardware info is available
        if total_kwh <= 0 and run.start_time:
            hw = run.hardware
            if hw is not None:
                # gpu_model is a direct column; gpu_count may be in the details JSON
                gpu_model = hw.gpu_model or ""
                details = hw.details if isinstance(hw.details, dict) else {}
                gpu_count = int(details.get("gpu_count") or 1)
                if gpu_model:
                    duration_h = _duration_hours(run.start_time, run.end_time)
                    estimated = _estimate_gpu_kwh(gpu_model, gpu_count, duration_h)
                    if estimated is not None and estimated > 0:
                        total_kwh = estimated
                        energy.compute_status = "estimated"
                        logger.info(
                            "Estimated %.4f kWh for job_run %s via GPU TDP (%s×%d)",
                            total_kwh, job_run_id, gpu_model, gpu_count,
                        )

        if total_kwh <= 0:
            energy.compute_status = "incomplete"
            energy.compute_error = "insufficient telemetry for energy_kwh"
            session.commit()
            return {"status": "incomplete", "error": "insufficient telemetry"}

        factor = GRID_FACTORS.get((run.region or "").lower(), DEFAULT_FACTOR)
        carbon = total_kwh * factor

        energy.total_kwh = total_kwh
        energy.emissions_kg = carbon
        # Preserve "estimated" status set by TDP fallback; otherwise mark success
        if energy.compute_status != "estimated":
            energy.compute_status = "success"
        energy.compute_error = None

        session.commit()

        return {
            "status": "success",
            "emissions_kg": carbon,
            "energy_kwh": total_kwh,
        }
    except Exception:
        logger.exception("Emission compute failed for job_run %s", job_run_id)
        try:
            if energy is not None:
                energy.compute_status = "failed"
                energy.compute_error = "internal_error"
                session.commit()
        except Exception:
            session.rollback()
        return {"status": "failed", "error": "internal_error"}
    finally:
        if owns_session:
            session.close()
