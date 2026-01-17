"""Job run and associated resource usage models."""
from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Float, UniqueConstraint, Text
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class JobRun(UUIDMixin, TimestampMixin, Base):
    """Represents a tracked ML job run."""

    __tablename__ = "job_runs"
    __table_args__ = (
        UniqueConstraint("project_id", "dedupe_key", name="ux_job_runs_project_dedupe"),
    )

    run_name = Column(String, nullable=False)
    job_type = Column(String, nullable=False)
    region = Column(String, nullable=False)
    status = Column(String, default="running")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    tags = Column(JSON, default=dict)
    run_metadata = Column("metadata", JSON, default=dict)
    dedupe_key = Column(String, nullable=False)
    external_run_id = Column(String, nullable=True)
    organization_id = Column(ForeignKey("organizations.id"), nullable=False)
    project_id = Column(ForeignKey("projects.id"), nullable=False)
    model_version_id = Column(ForeignKey("model_versions.id"), nullable=True)

    project = relationship("Project", back_populates="job_runs")
    model_version = relationship("ModelVersion", back_populates="job_runs")
    hardware = relationship("JobRunHardware", back_populates="job_run", uselist=False)
    energy = relationship("JobRunEnergy", back_populates="job_run", uselist=False)
    costs = relationship("JobRunCost", back_populates="job_run", uselist=False)
    suggestions = relationship("OptimizationSuggestion", back_populates="job_run")

    @property
    def energy_kwh(self) -> float | None:
        return self.energy.total_kwh if self.energy else None

    @property
    def carbon_kg_co2e(self) -> float | None:
        return self.energy.emissions_kg if self.energy else None


class JobRunHardware(UUIDMixin, TimestampMixin, Base):
    """Hardware profile captured for a job run."""

    __tablename__ = "job_run_hardware"

    job_run_id = Column(ForeignKey("job_runs.id"), nullable=False)
    cpu_count = Column(String, nullable=True)
    gpu_model = Column(String, nullable=True)
    ram_gb = Column(Float, nullable=True)
    details = Column(JSON, default=dict)

    job_run = relationship("JobRun", back_populates="hardware")


class JobRunEnergy(UUIDMixin, TimestampMixin, Base):
    """Energy readings aggregated for a job run."""

    __tablename__ = "job_run_energy"

    job_run_id = Column(ForeignKey("job_runs.id"), nullable=False)
    cpu_kwh = Column(Float, default=0.0)
    gpu_kwh = Column(Float, default=0.0)
    ram_kwh = Column(Float, default=0.0)
    total_kwh = Column(Float, default=0.0)
    emissions_kg = Column(Float, default=0.0)
    compute_status = Column(String, default="pending")
    compute_error = Column(Text, nullable=True)

    job_run = relationship("JobRun", back_populates="energy")


class JobRunCost(UUIDMixin, TimestampMixin, Base):
    """Cost estimates for a job run."""

    __tablename__ = "job_run_costs"

    job_run_id = Column(ForeignKey("job_runs.id"), nullable=False)
    amount_usd = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    breakdown = Column(JSON, default=dict)

    job_run = relationship("JobRun", back_populates="costs")
