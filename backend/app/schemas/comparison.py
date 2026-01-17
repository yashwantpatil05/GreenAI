"""Comparison response schemas."""
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class Delta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    a: float | None
    b: float | None
    delta: float | None
    percent: float | None


class ComparisonResult(BaseModel):
    run_a: UUID
    run_b: UUID
    metrics: dict
    meta: dict
    explanation: list[str]
