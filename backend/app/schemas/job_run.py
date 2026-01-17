"""Job run schemas."""
from datetime import datetime
from typing import Any, Dict
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.base import ORMBase


class JobRunCreate(BaseModel):
    """Incoming telemetry to create or update a job run."""

    run_name: str
    job_type: str
    region: str
    start_time: datetime
    end_time: datetime | None = None
    status: str | None = None
    tags: Dict[str, Any] | None = None
    metadata: Dict[str, Any] | None = None
    project_id: UUID | None = None
    organization_id: UUID | None = None
    model_version_id: UUID | None = None
    hardware: Dict[str, Any] | None = None
    energy: Dict[str, Any] | None = None
    costs: Dict[str, Any] | None = None
    dedupe_key: str | None = None
    external_run_id: str | None = None


class JobRunRead(ORMBase):
    """Job run representation."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    run_name: str
    job_type: str
    region: str
    status: str
    start_time: datetime
    end_time: datetime | None
    project_id: UUID
    organization_id: UUID
    model_version_id: UUID | None
    dedupe_key: str
    external_run_id: str | None
    tags: Dict[str, Any] | None
    metadata: Dict[str, Any] | None = Field(default=None, alias="run_metadata")
    energy_kwh: float | None = None
    carbon_kg_co2e: float | None = None


class JobRunHardwareRead(BaseModel):
    """Hardware snapshot schema."""

    cpu_count: str | None
    gpu_model: str | None
    ram_gb: float | None
    details: Dict[str, Any] | None = None


class JobRunEnergyRead(BaseModel):
    """Energy summary schema."""

    model_config = ConfigDict(from_attributes=True)

    cpu_kwh: float
    gpu_kwh: float
    ram_kwh: float
    total_kwh: float
    emissions_kg: float
    compute_status: str | None = None
    compute_error: str | None = None


class JobRunCostRead(BaseModel):
    """Cost summary schema."""

    model_config = ConfigDict(from_attributes=True)

    amount_usd: float
    currency: str
    breakdown: Dict[str, Any] | None = None


class JobRunDetail(JobRunRead):
    """Full job run detail including hardware/energy and suggestions."""

    hardware: JobRunHardwareRead | None = None
    energy: JobRunEnergyRead | None = None
    costs: JobRunCostRead | None = None
    suggestions: list[Dict[str, Any]] | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
