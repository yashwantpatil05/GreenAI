"""Ensure organization defaults for uuid/timestamps

Revision ID: 0004_org_defaults
Revises: 0003_phase0_alignment
Create Date: 2025-12-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "0004_org_defaults"
down_revision = "0003_phase0_alignment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if not insp.has_table("organizations"):
        return

    # Ensure gen_random_uuid exists
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    # Backfill null ids/timestamps (legacy tables created without defaults)
    op.execute(
        """
        UPDATE organizations
        SET id = gen_random_uuid()
        WHERE id IS NULL
        """
    )
    op.execute(
        """
        UPDATE organizations
        SET created_at = now()
        WHERE created_at IS NULL
        """
    )
    op.execute(
        """
        UPDATE organizations
        SET updated_at = now()
        WHERE updated_at IS NULL
        """
    )

    # Set server defaults going forward
    op.alter_column(
        "organizations",
        "id",
        server_default=sa.text("gen_random_uuid()"),
        existing_type=sa.dialects.postgresql.UUID(),
    )
    op.alter_column(
        "organizations",
        "created_at",
        server_default=sa.text("now()"),
        existing_type=sa.DateTime(timezone=True),
    )
    op.alter_column(
        "organizations",
        "updated_at",
        server_default=sa.text("now()"),
        existing_type=sa.DateTime(timezone=True),
    )


def downgrade() -> None:
    # Safe to remove defaults; keep data intact
    op.alter_column(
        "organizations",
        "updated_at",
        server_default=None,
        existing_type=sa.DateTime(timezone=True),
    )
    op.alter_column(
        "organizations",
        "created_at",
        server_default=None,
        existing_type=sa.DateTime(timezone=True),
    )
    op.alter_column(
        "organizations",
        "id",
        server_default=None,
        existing_type=sa.dialects.postgresql.UUID(),
    )
