"""Audit log schemas."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.base import ORMBase


class AuditLogRead(ORMBase):
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime
    organization_id: UUID
    actor_user_id: UUID | None = None
    actor_type: str
    actor_api_key_id: UUID | None = None
    action: str
    resource_type: str | None = None
    resource_id: UUID | None = None
    status: str
    ip: str | None = None
    user_agent: str | None = None
    request_id: str | None = None
    metadata: dict = Field(default_factory=dict, alias="audit_metadata")


class AuditLogQuery(BaseModel):
    action: Optional[str] = None
    actor_user_id: Optional[UUID] = None
    actor_type: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    status: Optional[str] = None
    from_ts: Optional[datetime] = None
    to_ts: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=200)
    cursor: Optional[str] = None  # encoded created_at|id tuple for stable pagination
