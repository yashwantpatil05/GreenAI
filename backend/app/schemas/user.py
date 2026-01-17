"""User schemas."""
from uuid import UUID
from pydantic import BaseModel, EmailStr, constr

from backend.app.schemas.base import ORMBase


class UserCreate(BaseModel):
    """Payload for creating a user."""

    email: EmailStr
    password: constr(max_length=72)
    organization_name: str


class UserLogin(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


class UserRead(ORMBase):
    """User representation."""

    email: EmailStr
    role: str
    organization_id: UUID
