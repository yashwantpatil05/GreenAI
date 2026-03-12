"""API key schemas."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from backend.app.schemas.base import ORMBase


class ApiKeyCreate(BaseModel):
    """API key creation payload."""

    name: str
    project_id: UUID
    scopes: list[str] = ["ingest"]


class ApiKeyRead(ORMBase):
    """API key representation."""

    name: str
    active: bool
    project_id: UUID
    user_id: UUID
    organization_id: UUID | None = None
    key_prefix: str | None = None
    scopes: list[str] | None = None
    revoked_at: datetime | None = None
    raw_key: str | None = None
