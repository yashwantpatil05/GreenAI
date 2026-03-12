"""Job run tags."""
from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class JobRunTag(UUIDMixin, TimestampMixin, Base):
    """Key/value tags for job runs."""

    __tablename__ = "job_run_tags"

    job_run_id = Column(ForeignKey("job_runs.id"), nullable=False)
    key = Column(String, nullable=False)
    value = Column(String, nullable=False)

    job_run = relationship("JobRun")
