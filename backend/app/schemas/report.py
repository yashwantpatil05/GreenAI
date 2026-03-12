"""Report schemas."""
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from backend.app.schemas.base import ORMBase


class ReportRead(ORMBase):
    """Report representation."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    period: str
    s3_path: str | None = None
    file_path: str | None = None
    report_type: str | None = None
    project_id: UUID | None = None
    organization_id: UUID | None = None
    target_id: str | None = None
