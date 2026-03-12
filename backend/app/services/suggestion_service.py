"""Suggestion generation and lifecycle management."""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.models.job_run import JobRun
from backend.app.models.suggestion import OptimizationSuggestion
from backend.app.models.region_emission_factor import RegionEmissionFactor

ENGINE_VERSION = "v1"


def _hash_key(seed: str) -> str:
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def _factor_for_region(db: Session, region: str) -> float:
    rec = (
        db.query(RegionEmissionFactor)
        .filter(RegionEmissionFactor.region == region.lower())
        .order_by(RegionEmissionFactor.version.desc())
        .first()
    )
    return rec.factor_kg_co2e_per_kwh if rec else 0.0004


def _ensure_unique(db: Session, suggestion: OptimizationSuggestion) -> OptimizationSuggestion:
    existing = (
        db.query(OptimizationSuggestion)
        .filter(OptimizationSuggestion.hash_key == suggestion.hash_key)
        .first()
    )
    if existing:
        return existing
    db.add(suggestion)
    db.flush()
    return suggestion


def _build_suggestion(
    *,
    project_id: UUID,
    job_run_id: Optional[UUID],
    category: str,
    title: str,
    description: str,
    severity: str,
    impact_co2: float,
    impact_kwh: float,
    confidence: float,
    steps: str,
    rationale: str,
    evidence: Dict[str, Any],
) -> OptimizationSuggestion:
    seed = f"{project_id}:{job_run_id}:{category}:{title}:{description}:{ENGINE_VERSION}:{evidence}"
    hash_key = _hash_key(seed)
    return OptimizationSuggestion(
        category=category,
        title=title,
        description=description,
        severity=severity,
        confidence=confidence,
        impact_co2=impact_co2,
        impact_kwh=impact_kwh,
        estimated_cost_usd=evidence.get("cost_delta", 0.0),
        priority=impact_co2 + impact_kwh,
        status="proposed",
        feedback=None,
        rationale=rationale,
        steps=steps,
        evidence=evidence,
        hash_key=hash_key,
        engine_version=ENGINE_VERSION,
        generated_at=datetime.now(timezone.utc),
        project_id=project_id,
        job_run_id=job_run_id,
    )


def generate_run_suggestions(db: Session, run: JobRun) -> List[OptimizationSuggestion]:
    energy_kwh = run.energy.total_kwh if run.energy else 0.0
    carbon = run.energy.emissions_kg if run.energy else energy_kwh * _factor_for_region(db, run.region or "")
    duration = None
    if run.start_time and run.end_time:
        duration = max((run.end_time - run.start_time).total_seconds(), 0.0)
    hardware = run.hardware

    suggestions: List[OptimizationSuggestion] = []

    # Region switching
    lower_factor = 0.0002
    if run.region and _factor_for_region(db, run.region) > lower_factor * 1.5:
        suggestions.append(
            _build_suggestion(
                project_id=run.project_id,
                job_run_id=run.id,
                category="region",
                title="Switch to lower-carbon region",
                description="Current region has higher emission factor; consider moving workloads to a greener region if latency allows.",
                severity="medium",
                impact_co2=max(carbon * 0.3, 0.0),
                impact_kwh=0.0,
                confidence=0.6,
                steps="Evaluate latency and data residency, then migrate workload to a greener region.",
                rationale="Region emission factor higher than available alternatives.",
                evidence={"current_region": run.region, "factor": _factor_for_region(db, run.region)},
            )
        )

    # GPU underutilization heuristic
    if hardware and hardware.gpu_model:
        if energy_kwh < 0.5 and duration and duration > 600:
            suggestions.append(
                _build_suggestion(
                    project_id=run.project_id,
                    job_run_id=run.id,
                    category="compute",
                    title="GPU underutilization",
                    description="Energy usage low but runtime high; GPU may be underutilized. Optimize batch size or switch to smaller GPU.",
                    severity="high",
                    impact_co2=carbon * 0.2,
                    impact_kwh=energy_kwh * 0.2,
                    confidence=0.5,
                    steps="Profile GPU utilization; increase batch size or pick smaller GPU tier.",
                    rationale="Long duration with low energy suggests idle or overhead.",
                    evidence={"gpu_model": hardware.gpu_model, "energy_kwh": energy_kwh, "duration_s": duration},
                )
            )

    # Mixed precision hint for training
    if run.job_type and run.job_type.lower() == "training" and duration and duration > 1800:
        suggestions.append(
            _build_suggestion(
                project_id=run.project_id,
                job_run_id=run.id,
                category="model",
                title="Enable mixed precision or gradient accumulation",
                description="Training run is long; enabling mixed precision/grad accumulation can reduce compute without accuracy loss.",
                severity="medium",
                impact_co2=carbon * 0.15,
                impact_kwh=energy_kwh * 0.15,
                confidence=0.6,
                steps="Enable AMP/bfloat16 and tune grad accumulation to fit GPU memory.",
                rationale="Training workloads benefit from precision optimizations to cut runtime and energy.",
                evidence={"job_type": run.job_type, "duration_s": duration},
            )
        )

    # Idle/overhead detection
    if duration and energy_kwh and duration > 0:
        intensity = energy_kwh / (duration / 3600.0)
        if intensity < 0.2:
            suggestions.append(
                _build_suggestion(
                    project_id=run.project_id,
                    job_run_id=run.id,
                    category="scheduling",
                    title="Reduce idle/overhead time",
                    description="Energy intensity is low relative to runtime; reduce idle time or consolidate tasks.",
                    severity="low",
                    impact_co2=carbon * 0.1,
                    impact_kwh=energy_kwh * 0.1,
                    confidence=0.4,
                    steps="Inspect data loading and startup overhead; co-locate preprocessing or cache datasets.",
                    rationale="Low energy intensity indicates substantial idle time.",
                    evidence={"intensity_kwh_per_hour": intensity},
                )
            )

    output: List[OptimizationSuggestion] = []
    for s in suggestions:
        output.append(_ensure_unique(db, s))
    return output


def generate_project_suggestions(db: Session, project_id: Union[UUID, str], window_days: int = 30) -> List[OptimizationSuggestion]:
    project_uuid = UUID(str(project_id))
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    runs = (
        db.query(JobRun)
        .options(joinedload(JobRun.energy))
        .filter(JobRun.project_id == project_uuid, JobRun.start_time >= since)
        .all()
    )
    if not runs:
        return []

    avg_energy = sum((r.energy.total_kwh for r in runs if r.energy and r.energy.total_kwh)) / max(
        len([r for r in runs if r.energy and r.energy.total_kwh]), 1
    )
    suggestion = _build_suggestion(
        project_id=project_uuid,
        job_run_id=None,
        category="cost",
        title="Enable spot/preemptible where safe",
        description="Use spot/preemptible instances for non-critical workloads to reduce cost and emissions.",
        severity="medium",
        impact_co2=avg_energy * 0.1,
        impact_kwh=avg_energy * 0.1,
        confidence=0.5,
        steps="Mark tolerant jobs for spot/preemptible scheduling and add checkpointing.",
        rationale="Trend shows consistent workloads; moving some to spot can save cost and energy.",
        evidence={"window_days": window_days, "avg_energy_kwh": avg_energy},
    )
    return [_ensure_unique(db, suggestion)]


def update_suggestion_status(db: Session, suggestion_id: UUID, status_value: str, feedback: Optional[str], org_id: UUID) -> OptimizationSuggestion:
    suggestion = (
        db.query(OptimizationSuggestion)
        .join(OptimizationSuggestion.project)
        .filter(OptimizationSuggestion.id == suggestion_id, OptimizationSuggestion.project.has(organization_id=org_id))
        .first()
    )
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    suggestion.status = status_value
    if feedback is not None:
        suggestion.feedback = feedback
    db.flush()
    return suggestion
