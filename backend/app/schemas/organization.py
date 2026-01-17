"""Organization schemas."""
from uuid import UUID
from pydantic import BaseModel

from backend.app.schemas.base import ORMBase


class OrganizationCreate(BaseModel):
    """Payload for creating organization."""

    name: str

class OrganizationUpdate(BaseModel):
    """Update organization payload."""

    name: str | None = None
    region_preference: str | None = None


class OrganizationRead(ORMBase):
    """Organization representation."""

    name: str


class ProjectCreate(BaseModel):
    """Create project payload."""

    name: str
    description: str | None = None


class ProjectRead(ORMBase):
    """Project representation."""

    name: str
    description: str | None = None
    organization_id: UUID
