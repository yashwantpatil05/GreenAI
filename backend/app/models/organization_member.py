"""Organization membership linking users to orgs."""
from sqlalchemy import Column, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import relationship

from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDMixin


class OrganizationMember(UUIDMixin, TimestampMixin, Base):
    """Membership with per-org role."""

    __tablename__ = "organization_members"

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="ux_org_members_org_user"),
        Index("ix_org_members_user", "user_id"),
    )

    user_id = Column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    # Always non-null, both ORM-side + DB-side default
    role = Column(String(20), nullable=False, server_default=text("'viewer'"))

    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="members")
