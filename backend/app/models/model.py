"""ML model metadata."""
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class Model(UUIDMixin, TimestampMixin, Base):
    """Represents a registered ML model."""

    __tablename__ = "models"

    name = Column(String, nullable=False)
    project_id = Column(ForeignKey("projects.id"), nullable=False)

    project = relationship("Project", back_populates="models")
    versions = relationship("ModelVersion", back_populates="model")
