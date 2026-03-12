"""Phase 3: audit logs, api key blocking, rate limit counters.

Revision ID: 0008_phase3_audit_and_rate_limit
Revises: 0007_make_report_s3path_nullable
Create Date: 2026-01-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0008_phase3_audit_and_rate_limit"
down_revision = "0007_make_report_s3path_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actor_type", sa.String(length=20), nullable=False),
        sa.Column("actor_api_key_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("resource_type", sa.String(length=60), nullable=True),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'success'")),
        sa.Column("ip", sa.String(length=80), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("request_id", sa.String(length=80), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("ix_audit_org_created", "audit_logs", ["organization_id", "created_at"], unique=False, postgresql_using="btree")
    op.create_index("ix_audit_org_action_created", "audit_logs", ["organization_id", "action", "created_at"], unique=False, postgresql_using="btree")
    op.create_index("ix_audit_org_actor_created", "audit_logs", ["organization_id", "actor_user_id", "created_at"], unique=False, postgresql_using="btree")
    op.create_index("ix_audit_org_resource", "audit_logs", ["organization_id", "resource_type", "resource_id"], unique=False, postgresql_using="btree")

    # api_keys.blocked_until
    try:
        op.add_column("api_keys", sa.Column("blocked_until", sa.DateTime(timezone=True), nullable=True))
        op.create_index("ix_api_keys_blocked_until", "api_keys", ["blocked_until"])
    except Exception:
        pass

    # Postgres fallback rate limit counters
    op.create_table(
        "rate_limit_counters",
        sa.Column("key", sa.String(length=120), primary_key=True),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    try:
        op.drop_table("rate_limit_counters")
    except Exception:
        pass
    try:
        op.drop_index("ix_api_keys_blocked_until", table_name="api_keys")
    except Exception:
        pass
    try:
        op.drop_column("api_keys", "blocked_until")
    except Exception:
        pass
    try:
        op.drop_index("ix_audit_org_resource", table_name="audit_logs")
        op.drop_index("ix_audit_org_actor_created", table_name="audit_logs")
        op.drop_index("ix_audit_org_action_created", table_name="audit_logs")
        op.drop_index("ix_audit_org_created", table_name="audit_logs")
        op.drop_table("audit_logs")
    except Exception:
        pass
