"""Add monthly usage tracking table for billing and overage calculations.

Revision ID: 0010_add_monthly_usage_tracking
Revises: 0009_add_performance_indexes
Create Date: 2026-02-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0010_add_monthly_usage_tracking"
down_revision = "0009_add_performance_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create monthly_usage table for tracking organization usage per month."""
    from sqlalchemy import inspect

    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    # Skip if table already exists
    if "monthly_usage" in existing_tables:
        print("monthly_usage table already exists, skipping creation")
        return

    op.create_table(
        "monthly_usage",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False
        ),
        sa.Column("month", sa.String(length=7), nullable=False),  # Format: YYYY-MM
        sa.Column("job_runs_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overage_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()")
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()")
        ),
    )

    # Create indexes
    op.create_index(
        "ix_monthly_usage_organization_id",
        "monthly_usage",
        ["organization_id"],
        unique=False
    )
    op.create_index(
        "ix_monthly_usage_month",
        "monthly_usage",
        ["month"],
        unique=False
    )

    # Create unique constraint: one record per organization per month
    op.create_unique_constraint(
        "ux_monthly_usage_org_month",
        "monthly_usage",
        ["organization_id", "month"]
    )


def downgrade() -> None:
    """Remove monthly_usage table."""
    from sqlalchemy import inspect

    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "monthly_usage" not in existing_tables:
        return

    try:
        op.drop_constraint("ux_monthly_usage_org_month", "monthly_usage", type_="unique")
    except Exception:
        pass

    try:
        op.drop_index("ix_monthly_usage_month", table_name="monthly_usage")
    except Exception:
        pass

    try:
        op.drop_index("ix_monthly_usage_organization_id", table_name="monthly_usage")
    except Exception:
        pass

    try:
        op.drop_table("monthly_usage")
    except Exception:
        pass
