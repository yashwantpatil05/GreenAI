"""Deterministic ESG narrative generator."""
from __future__ import annotations

from datetime import datetime
from typing import Dict

from backend.app.models.job_run import JobRun


def generate_esg_narrative(run: JobRun) -> Dict[str, str]:
    energy = run.energy.total_kwh if run.energy else 0.0
    carbon = run.energy.emissions_kg if run.energy else 0.0
    duration = None
    if run.start_time and run.end_time:
        duration = max((run.end_time - run.start_time).total_seconds(), 0) / 3600.0

    summary = (
        f"{run.run_name} ({run.job_type}) executed in {run.region or 'unknown region'} "
        f"with estimated {energy:.2f} kWh and {carbon:.2f} kg CO2e."
    )
    highlights = [
        f"Run status: {run.status}",
        f"Energy: {energy:.2f} kWh; Carbon: {carbon:.2f} kg CO2e",
        f"Duration: {duration:.2f} hours" if duration is not None else "Duration: not available",
    ]
    next_actions = [
        "Review optimization suggestions and apply accepted actions.",
        "Schedule in greener regions/slots when feasible.",
        "Track API-key scoped runs for compliance trail.",
    ]

    return {
        "executive_summary": summary,
        "highlights": "\n".join(f"- {h}" for h in highlights),
        "next_actions": "\n".join(f"- {n}" for n in next_actions),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
