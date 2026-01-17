"""API key model."""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, text
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class ApiKey(UUIDMixin, TimestampMixin, Base):
    """API key scoped to project and user."""

    __tablename__ = "api_keys"

    name = Column(String, nullable=False)
    hashed_key = Column(String, nullable=False)
    key_prefix = Column(String(12), nullable=True, index=True)
    active = Column(Boolean, nullable=False, server_default=text("true"))

    # Scope to both project + organization for multi-tenant safety
    organization_id = Column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(ForeignKey("projects.id"), nullable=False)
    user_id = Column(ForeignKey("users.id"), nullable=True)

    scopes = Column(JSON, nullable=False, server_default=text("'[\"ingest\"]'::json"))
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    blocked_until = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="api_keys")
    user = relationship("User", back_populates="api_keys")
    # Backward-compatible alias (some modules import APIKey)
APIKey = ApiKey
