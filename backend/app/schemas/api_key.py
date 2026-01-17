"""API key schemas."""
from uuid import UUID
from pydantic import BaseModel

from backend.app.schemas.base import ORMBase


class ApiKeyCreate(BaseModel):
    """API key creation payload."""

    name: str
    project_id: UUID


class ApiKeyRead(ORMBase):
    """API key representation."""

    name: str
    active: bool
    project_id: UUID
    user_id: UUID
    raw_key: str | None = None
