"""Monthly usage tracking model for billing and overage calculations."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class MonthlyUsage(Base):
    """Track monthly usage metrics per organization for billing."""

    __tablename__ = "monthly_usage"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    organization_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    month = Column(String(7), nullable=False, index=True)  # Format: YYYY-MM
    job_runs_count = Column(Integer, nullable=False, default=0)
    overage_amount = Column(Integer, nullable=False, default=0)  # Amount in paise
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    organization = relationship("Organization", back_populates="monthly_usages")

    # Unique constraint: one record per organization per month
    __table_args__ = (
        UniqueConstraint("organization_id", "month", name="ux_monthly_usage_org_month"),
    )

    def __repr__(self) -> str:
        return (
            f"<MonthlyUsage(id={self.id}, org={self.organization_id}, "
            f"month={self.month}, runs={self.job_runs_count})>"
        )
