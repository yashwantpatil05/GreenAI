"""Optimization suggestion model."""
from sqlalchemy import Column, String, ForeignKey, Float, JSON, Text, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class OptimizationSuggestion(UUIDMixin, TimestampMixin, Base):
    """Rule-based suggestion attached to a job run or project."""

    __tablename__ = "optimization_suggestions"
    __table_args__ = (
        UniqueConstraint("hash_key", name="ux_suggestions_hash"),
    )

    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False, default="medium")
    confidence = Column(Float, nullable=False, default=0.5)
    impact_kwh = Column(Float, default=0.0)
    impact_co2 = Column(Float, default=0.0)
    estimated_cost_usd = Column(Float, default=0.0)
    priority = Column(Float, default=0.0)
    status = Column(String, default="proposed")
    feedback = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    steps = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=True)
    hash_key = Column(String, nullable=False)
    engine_version = Column(String, nullable=False, default="v1")
    generated_at = Column(DateTime(timezone=True), nullable=False)
    project_id = Column(ForeignKey("projects.id"), nullable=False)
    job_run_id = Column(ForeignKey("job_runs.id"), nullable=True)

    project = relationship("Project")
    job_run = relationship("JobRun", back_populates="suggestions")
