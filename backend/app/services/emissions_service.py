"""Emissions computation service for job runs."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import joinedload

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


def _duration_hours(start_time: datetime, end_time: datetime | None) -> float:
    end = end_time or datetime.now(timezone.utc)
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    seconds = max((end - start_time).total_seconds(), 0.0)
    return seconds / 3600.0


def compute_emissions_for_job_run(job_run_id: UUID) -> None:
    """Compute emissions for a job run; safe to call in background."""
    session = SessionLocal()
    energy: JobRunEnergy | None = None
    try:
        run: JobRun | None = (
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
            return

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

        if total_kwh <= 0:
            energy.compute_status = "incomplete"
            energy.compute_error = "insufficient telemetry for energy_kwh"
            session.commit()
            return

        factor = GRID_FACTORS.get((run.region or "").lower(), DEFAULT_FACTOR)
        carbon = total_kwh * factor

        energy.total_kwh = total_kwh
        energy.emissions_kg = carbon
        energy.compute_status = "success"
        energy.compute_error = None

        session.commit()
    except Exception:
        logger.exception("Emission compute failed for job_run %s", job_run_id)
        try:
            if energy is not None:
                energy.compute_status = "failed"
                energy.compute_error = "internal_error"
                session.commit()
        except Exception:
            session.rollback()
    finally:
        SessionLocal.remove()
