"""Model version metadata."""
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class ModelVersion(UUIDMixin, TimestampMixin, Base):
    """Represents a version of a model."""

    __tablename__ = "model_versions"

    version = Column(String, nullable=False)
    model_id = Column(ForeignKey("models.id"), nullable=False)

    model = relationship("Model", back_populates="versions")
    job_runs = relationship("JobRun", back_populates="model_version")
