"""Report model representing generated PDF summaries."""
from sqlalchemy import Column, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class Report(UUIDMixin, TimestampMixin, Base):
    """Generated ESG report stored locally or in object storage."""

    __tablename__ = "reports"

    name = Column(String, nullable=False)
    period = Column(String, nullable=False)
    s3_path = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    report_type = Column(String, nullable=False, default="project")
    project_id = Column(ForeignKey("projects.id"), nullable=True)
    organization_id = Column(ForeignKey("organizations.id"), nullable=True)
    target_id = Column(String, nullable=True)  # job_run_id or project_id as string for flexibility
    from_date = Column(DateTime(timezone=True), nullable=True)
    to_date = Column(DateTime(timezone=True), nullable=True)
    # Use non-reserved attribute name while keeping column name "metadata"
    report_metadata = Column("metadata", JSON, nullable=True)

    project = relationship("Project")
