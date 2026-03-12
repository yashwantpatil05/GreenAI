"""User model."""
from sqlalchemy import Column, ForeignKey, String, text
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    """Platform user belonging to an organization."""

    __tablename__ = "users"

    email = Column(String(320), nullable=False, unique=True, index=True)
    full_name = Column(String(200), nullable=True)

    # Supabase manages passwords; keep nullable + default to satisfy legacy NOT NULL expectations
    hashed_password = Column(String, nullable=True, server_default=text("'SUPABASE_MANAGED'"))
    auth_provider = Column(String(50), nullable=True, server_default=text("'supabase'"))

    # Legacy default role; per-organization roles live in OrganizationMember
    role = Column(String(20), nullable=False, server_default=text("'member'"))
    organization_id = Column(ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    organization = relationship("Organization", back_populates="users")
    api_keys = relationship("ApiKey", back_populates="user")
    memberships = relationship(
        "OrganizationMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
