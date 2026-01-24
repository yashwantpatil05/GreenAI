# backend/app/models/organization.py

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    # Keep nullable to match existing DB state; validated by code during signup/bootstrap
    region_preference: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Subscription fields
    subscription_plan: Mapped[str | None] = mapped_column(String(50), nullable=True, default="starter")
    subscription_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="trial")
    subscription_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Usage limits
    job_runs_limit: Mapped[int | None] = mapped_column(Integer, nullable=True, default=10000)
    projects_limit: Mapped[int | None] = mapped_column(Integer, nullable=True, default=3)
    users_limit: Mapped[int | None] = mapped_column(Integer, nullable=True, default=2)

    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=text("now()"),
        nullable=False,
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=text("now()"),
        nullable=False,
    )

    members = relationship(
        "OrganizationMember",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization")
