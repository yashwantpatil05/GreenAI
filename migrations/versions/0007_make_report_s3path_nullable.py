"""Make reports.s3_path nullable (local file storage support).

Revision ID: 0007_make_report_s3path_nullable
Revises: 0006_phase2_features
Create Date: 2026-01-02
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0007_make_report_s3path_nullable"
down_revision = "0006_phase2_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    try:
        op.alter_column("reports", "s3_path", existing_type=sa.String(), nullable=True)
    except Exception:
        # If column already nullable, ignore
        pass


def downgrade() -> None:
    try:
        op.alter_column("reports", "s3_path", existing_type=sa.String(), nullable=False)
    except Exception:
        pass
