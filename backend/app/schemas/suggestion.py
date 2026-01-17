"""Suggestion schemas."""
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from backend.app.schemas.base import ORMBase


class SuggestionRead(ORMBase):
    """Suggestion representation."""

    model_config = ConfigDict(from_attributes=True)

    category: str
    title: str
    description: str
    severity: str | None = None
    confidence: float | None = None
    impact_kwh: float
    impact_co2: float
    estimated_cost_usd: float | None = None
    priority: float
    status: str
    feedback: str | None = None
    rationale: str | None = None
    steps: str | None = None
    evidence: dict | None = None
    hash_key: str | None = None
    engine_version: str | None = None
    project_id: UUID
    job_run_id: UUID | None
