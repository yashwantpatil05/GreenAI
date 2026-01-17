"""Audit log model."""
from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, synonym

from backend.app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    organization_id = Column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    actor_user_id = Column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_type = Column(String(20), nullable=False)
    actor_api_key_id = Column(ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(80), nullable=False)
    resource_type = Column(String(60), nullable=True)
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String(20), nullable=False, server_default=text("'success'"))
    ip = Column(String(80), nullable=True)
    user_agent = Column(String, nullable=True)
    request_id = Column(String(80), nullable=True)
    audit_metadata = Column("metadata", JSON, nullable=False, server_default=text("'{}'::jsonb"))

    organization = relationship("Organization")
    actor_user = relationship("User")
    actor_api_key = relationship("ApiKey")
