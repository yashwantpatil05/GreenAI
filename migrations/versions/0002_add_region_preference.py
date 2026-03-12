"""Add region_preference to organizations.

Revision ID: 0002
Revises: 0001
Create Date: 2025-12-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("organizations", sa.Column("region_preference", sa.String(), nullable=True))


def downgrade():
    op.drop_column("organizations", "region_preference")
