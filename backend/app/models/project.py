"""Project model."""
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class Project(UUIDMixin, TimestampMixin, Base):
    """Project under an organization."""

    __tablename__ = "projects"

    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    default_cloud_provider = Column(String, nullable=True)
    default_region = Column(String, nullable=True)
    organization_id = Column(ForeignKey("organizations.id"), nullable=False)

    organization = relationship("Organization", back_populates="projects")
    models = relationship("Model", back_populates="project")
    api_keys = relationship("ApiKey", back_populates="project")
    job_runs = relationship("JobRun", back_populates="project")
