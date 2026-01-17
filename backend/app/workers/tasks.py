"""RQ worker tasks.

Phase 1: compute energy + emissions for a job run and persist results.

Design goals:
- Idempotent: safe to run multiple times (won't double-write or explode).
- Robust fallbacks: if precise kWh not available, estimate from runtime + hardware.
- Configurable: carbon intensity and power assumptions can be overridden via env.
- Transaction-safe: commits only when updates are valid.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal
from backend.app.models.job_run import JobRun, JobRunEnergy, JobRunHardware

logger = logging.getLogger("greenai.worker")
logger.setLevel(logging.INFO)


# -----------------------------
# Config + defaults (override via env)
# -----------------------------

# Default carbon intensity if region not found (grams CO2e per kWh)
DEFAULT_CI_G_PER_KWH = float(os.getenv("DEFAULT_CARBON_INTENSITY_G_PER_KWH", "475"))

# Simple estimation defaults (used only when energy_kwh is missing/0)
DEFAULT_CPU_W_PER_CORE = float(os.getenv("DEFAULT_CPU_W_PER_CORE", "10"))      # W per CPU core (avg)
DEFAULT_GPU_W = float(os.getenv("DEFAULT_GPU_W", "150"))                       # W for one GPU (avg)
DEFAULT_BASE_OVERHEAD_W = float(os.getenv("DEFAULT_BASE_OVERHEAD_W", "30"))    # platform overhead

# Optional: allow overriding region→intensity map via env JSON
# Example:
#   {"ap-south-1": 700, "us-east-1": 380}
ENV_CI_MAP_JSON = os.getenv("CARBON_INTENSITY_MAP_JSON", "").strip()

# Baseline map (keep small but useful; user can override via env)
BASE_REGION_CI_G_PER_KWH: Dict[str, float] = {
    # India
    "ap-south-1": 700,  # AWS Mumbai (approx; override with env for your org)
    "in": 700,
    # US
    "us-east-1": 380,
    "us-west-2": 250,
    "us": 380,
    # EU
    "eu-west-1": 230,
    "eu-central-1": 270,
    "eu": 250,
}


def _load_ci_map() -> Dict[str, float]:
    m = dict(BASE_REGION_CI_G_PER_KWH)
    if ENV_CI_MAP_JSON:
        try:
            override = json.loads(ENV_CI_MAP_JSON)
            if isinstance(override, dict):
                for k, v in override.items():
                    try:
                        m[str(k).strip().lower()] = float(v)
                    except Exception:
                        continue
        except Exception:
            # Do not crash worker because of bad env config
            logger.warning("Invalid CARBON_INTENSITY_MAP_JSON; ignoring.")
    return m


CI_MAP = _load_ci_map()


def _norm_region(region: Optional[str]) -> str:
    if not region:
        return ""
    return region.strip().lower()


def _lookup_ci_g_per_kwh(region: Optional[str]) -> float:
    r = _norm_region(region)
    if not r:
        return DEFAULT_CI_G_PER_KWH

    # Exact
    if r in CI_MAP:
        return CI_MAP[r]

    # Heuristics by prefix
    for key in ("ap-south-1", "us-east-1", "us-west-2", "eu-west-1", "eu-central-1"):
        if r.startswith(key):
            return CI_MAP.get(key, DEFAULT_CI_G_PER_KWH)

    # Fallback by continent-ish shorthand
    if r.startswith("us-"):
        return CI_MAP.get("us", DEFAULT_CI_G_PER_KWH)
    if r.startswith("eu-"):
        return CI_MAP.get("eu", DEFAULT_CI_G_PER_KWH)

    return DEFAULT_CI_G_PER_KWH


def _safe_uuid(value: str) -> UUID:
    try:
        return UUID(str(value))
    except Exception as e:
        raise ValueError(f"Invalid UUID: {value}") from e


def _hours_between(start: Optional[datetime], end: Optional[datetime]) -> float:
    if not start or not end:
        return 0.0
    delta = (end - start).total_seconds()
    if delta <= 0:
        return 0.0
    return delta / 3600.0


def _parse_int(s: Optional[str], default: int = 0) -> int:
    if not s:
        return default
    try:
        return int(str(s).strip())
    except Exception:
        return default


def _estimate_energy_kwh(run: JobRun, hw: Optional[JobRunHardware], existing_breakdown: Optional[dict]) -> Dict[str, Any]:
    """Estimate kWh using runtime + rough power assumptions. Used only if energy_kwh is missing/0."""
    hours = _hours_between(run.start_time, run.end_time)
    if hours <= 0:
        # If runtime unknown, we cannot estimate meaningfully.
        return {
            "estimated_kwh": 0.0,
            "breakdown": {
                "method": "runtime_power_estimate",
                "note": "Missing/invalid start_time/end_time; cannot estimate energy",
            },
        }

    cpu_cores = _parse_int(hw.cpu_count if hw else None, default=0)
    gpu_count = _parse_int(hw.gpu_count if hw else None, default=0)

    cpu_w = max(cpu_cores, 1) * DEFAULT_CPU_W_PER_CORE  # assume at least 1 core active
    gpu_w = max(gpu_count, 0) * DEFAULT_GPU_W
    total_w = cpu_w + gpu_w + DEFAULT_BASE_OVERHEAD_W

    kwh = (total_w * hours) / 1000.0

    breakdown = dict(existing_breakdown or {})
    breakdown.update(
        {
            "method": "runtime_power_estimate",
            "assumptions": {
                "hours": hours,
                "cpu_cores": cpu_cores,
                "gpu_count": gpu_count,
                "cpu_w_per_core": DEFAULT_CPU_W_PER_CORE,
                "gpu_w_each": DEFAULT_GPU_W,
                "base_overhead_w": DEFAULT_BASE_OVERHEAD_W,
                "total_w": total_w,
            },
        }
    )

    return {"estimated_kwh": float(kwh), "breakdown": breakdown}


def compute_energy_and_emissions(job_run_id: str) -> Dict[str, Any]:
    """Compute energy_kwh (if needed) and emissions_kg for a given job_run_id."""
    run_uuid = _safe_uuid(job_run_id)

    db: Session = SessionLocal()
    try:
        run: Optional[JobRun] = db.get(JobRun, run_uuid)
        if not run:
            return {"ok": False, "job_run_id": job_run_id, "reason": "job_run_not_found"}

        # Load related rows (may be absent)
        energy: Optional[JobRunEnergy] = (
            db.query(JobRunEnergy).filter(JobRunEnergy.job_run_id == run_uuid).one_or_none()
        )
        hw: Optional[JobRunHardware] = (
            db.query(JobRunHardware).filter(JobRunHardware.job_run_id == run_uuid).one_or_none()
        )

        # Ensure energy row exists
        if energy is None:
            energy = JobRunEnergy(
                job_run_id=run_uuid,
                energy_kwh=0.0,
                emissions_kg=0.0,
                breakdown={},
            )
            db.add(energy)
            db.flush()

        # Idempotency: if emissions already computed and energy_kwh present, no-op
        if (energy.energy_kwh or 0.0) > 0 and (energy.emissions_kg or 0.0) > 0:
            return {
                "ok": True,
                "job_run_id": job_run_id,
                "energy_kwh": float(energy.energy_kwh),
                "emissions_kg": float(energy.emissions_kg),
                "status": "already_computed",
            }

        # If energy_kwh missing/0, estimate
        if (energy.energy_kwh or 0.0) <= 0.0:
            est = _estimate_energy_kwh(run, hw, energy.breakdown)
            energy.energy_kwh = float(est["estimated_kwh"])
            energy.breakdown = est["breakdown"]

        # If still 0, we cannot compute emissions
        if (energy.energy_kwh or 0.0) <= 0.0:
            db.commit()
            return {
                "ok": False,
                "job_run_id": job_run_id,
                "reason": "energy_kwh_unavailable",
            }

        ci_g_per_kwh = _lookup_ci_g_per_kwh(run.region)
        emissions_kg = (float(ci_g_per_kwh) * float(energy.energy_kwh)) / 1000.0

        # Persist
        energy.emissions_kg = float(emissions_kg)
        energy.breakdown = dict(energy.breakdown or {})
        energy.breakdown.update(
            {
                "carbon_intensity_g_per_kwh": float(ci_g_per_kwh),
                "region": run.region,
                "computed_at": datetime.utcnow().isoformat() + "Z",
            }
        )

        # Optional status update (safe)
        # If run has an end_time, mark completed; otherwise keep running.
        if run.end_time and str(run.status).lower() in {"running", "ingested", "processing"}:
            run.status = "completed"

        db.commit()

        return {
            "ok": True,
            "job_run_id": job_run_id,
            "energy_kwh": float(energy.energy_kwh),
            "emissions_kg": float(energy.emissions_kg),
            "carbon_intensity_g_per_kwh": float(ci_g_per_kwh),
            "status": "computed",
        }

    except Exception as e:
        db.rollback()
        logger.exception("compute_energy_and_emissions failed")
        return {"ok": False, "job_run_id": job_run_id, "reason": str(e)}
    finally:
        db.close()


# Backward-compatible alias if API enqueues "compute_emissions"
def compute_emissions(job_run_id: str) -> Dict[str, Any]:
    return compute_energy_and_emissions(job_run_id)


def generate_report(job_run_id: str) -> Dict[str, Any]:
    """Phase 2: PDF report generation placeholder. Keep worker import-safe."""
    _ = _safe_uuid(job_run_id)
    return {"ok": True, "job_run_id": job_run_id, "status": "not_implemented_yet"}
