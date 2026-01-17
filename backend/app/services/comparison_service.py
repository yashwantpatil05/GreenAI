"""Job run comparison utilities."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.app.models.job_run import JobRun
from backend.app.models.region_emission_factor import RegionEmissionFactor


def _duration_seconds(run: JobRun) -> Optional[float]:
    if not run.start_time or not run.end_time:
        return None
    return max((run.end_time - run.start_time).total_seconds(), 0.0)


def _emission_factor(db: Session, region: str) -> float:
    if not region:
        return 0.0
    factor = (
        db.query(RegionEmissionFactor)
        .filter(RegionEmissionFactor.region == region.lower())
        .order_by(RegionEmissionFactor.version.desc())
        .first()
    )
    return factor.factor_kg_co2e_per_kwh if factor else 0.0004


def _metrics_tuple(db: Session, run: JobRun) -> Dict[str, Any]:
    duration = _duration_seconds(run)
    energy_kwh = run.energy.total_kwh if run.energy else None
    carbon = run.energy.emissions_kg if run.energy else None
    cost = run.costs.amount_usd if run.costs else None
    factor = _emission_factor(db, run.region or "")
    if carbon is None and energy_kwh is not None:
        carbon = energy_kwh * factor
    return {
        "energy_kwh": energy_kwh,
        "carbon_kg_co2e": carbon,
        "duration_seconds": duration,
        "estimated_cost": cost,
        "factor": factor,
    }


def _delta(a: Optional[float], b: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
    if a is None or b is None:
        return None, None
    abs_delta = b - a
    pct = None if a == 0 else (abs_delta / a) * 100.0
    return abs_delta, pct


def _explanation(metrics_a: Dict[str, Any], metrics_b: Dict[str, Any], run_a: JobRun, run_b: JobRun) -> list[str]:
    notes: list[str] = []
    if metrics_a["factor"] != metrics_b["factor"]:
        notes.append("Region emission factor changed, affecting carbon intensity.")
    if metrics_a["duration_seconds"] and metrics_b["duration_seconds"]:
        if metrics_b["duration_seconds"] > metrics_a["duration_seconds"] * 1.2:
            notes.append("Duration increased significantly; investigate workload efficiency.")
    if run_a.region != run_b.region:
        notes.append("Region changed from %s to %s." % (run_a.region, run_b.region))
    if run_a.job_type != run_b.job_type:
        notes.append("Job type changed: %s -> %s." % (run_a.job_type, run_b.job_type))
    if run_a.hardware and run_b.hardware and run_a.hardware.gpu_model != run_b.hardware.gpu_model:
        notes.append("GPU model changed; energy/cost characteristics differ.")
    return notes


def compare_runs(db: Session, run_a_id: UUID, run_b_id: UUID, organization_id: UUID) -> Dict[str, Any]:
    runs = (
        db.query(JobRun)
        .options(joinedload(JobRun.energy), joinedload(JobRun.hardware), joinedload(JobRun.costs))
        .filter(JobRun.id.in_([run_a_id, run_b_id]))
        .all()
    )
    if len(runs) != 2:
        raise HTTPException(status_code=404, detail="One or both runs not found")
    run_map = {r.id: r for r in runs}
    run_a = run_map.get(run_a_id)
    run_b = run_map.get(run_b_id)
    if not run_a or not run_b:
        raise HTTPException(status_code=404, detail="One or both runs not found")
    if run_a.organization_id != organization_id or run_b.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Job run not found")

    metrics_a = _metrics_tuple(db, run_a)
    metrics_b = _metrics_tuple(db, run_b)

    def assemble(field: str):
        abs_delta, pct = _delta(metrics_a[field], metrics_b[field])
        return {
            "a": metrics_a[field],
            "b": metrics_b[field],
            "delta": abs_delta,
            "percent": pct,
        }

    return {
        "run_a": str(run_a_id),
        "run_b": str(run_b_id),
        "metrics": {
            "energy_kwh": assemble("energy_kwh"),
            "carbon_kg_co2e": assemble("carbon_kg_co2e"),
            "duration_seconds": assemble("duration_seconds"),
            "estimated_cost": assemble("estimated_cost"),
        },
        "meta": {
            "region": {"a": run_a.region, "b": run_b.region},
            "job_type": {"a": run_a.job_type, "b": run_b.job_type},
            "status": {"a": run_a.status, "b": run_b.status},
            "tags": {"a": run_a.tags, "b": run_b.tags},
        },
        "explanation": _explanation(metrics_a, metrics_b, run_a, run_b),
    }


def baseline_for_project(db: Session, project_id: UUID) -> Optional[JobRun]:
    return (
        db.query(JobRun)
        .options(joinedload(JobRun.energy), joinedload(JobRun.hardware), joinedload(JobRun.costs))
        .filter(JobRun.project_id == project_id)
        .filter(JobRun.status.in_(["completed", "success", "succeeded"]))
        .order_by(JobRun.end_time.desc().nullslast(), JobRun.created_at.desc())
        .first()
    )
