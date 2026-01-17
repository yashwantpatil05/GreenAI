"""supabase tenant core

Revision ID: 0001_supabase_tenant_core
Revises:
Create Date: 2025-12-27
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "0001_supabase_tenant_core"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    def has_table(t: str) -> bool:
        return insp.has_table(t)

    def has_col(t: str, c: str) -> bool:
        if not has_table(t):
            return False
        return any(col["name"] == c for col in insp.get_columns(t))

    def has_index(t: str, idx: str) -> bool:
        if not has_table(t):
            return False
        return any(i["name"] == idx for i in insp.get_indexes(t))

    # Enable useful extensions (Supabase usually has these, safe to ensure)
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

    # users (profile) keyed by Supabase auth user id (uuid)
    if not has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
            sa.Column("email", sa.String(length=320), nullable=True),
            sa.Column("full_name", sa.String(length=200), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    if not has_index("users", "ix_users_email"):
        op.create_index("ix_users_email", "users", ["email"], unique=False)

    # organizations
    if not has_table("organizations"):
        op.create_table(
            "organizations",
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    if not has_index("organizations", "ix_organizations_name"):
        op.create_index("ix_organizations_name", "organizations", ["name"], unique=False)

    # organization_members (RBAC)
    if not has_table("organization_members"):
        op.create_table(
            "organization_members",
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
            sa.Column("organization_id", sa.UUID(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("role", sa.String(length=20), nullable=False),  # owner|admin|engineer|viewer
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    if not has_index("organization_members", "ux_org_members_org_user"):
        op.create_index("ux_org_members_org_user", "organization_members", ["organization_id", "user_id"], unique=True)
    if not has_index("organization_members", "ix_org_members_user"):
        op.create_index("ix_org_members_user", "organization_members", ["user_id"], unique=False)

    # projects
    if not has_table("projects"):
        op.create_table(
            "projects",
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
            sa.Column("organization_id", sa.UUID(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("default_cloud_provider", sa.String(length=50), nullable=True),
            sa.Column("default_region", sa.String(length=80), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
    if not has_index("projects", "ix_projects_org"):
        op.create_index("ix_projects_org", "projects", ["organization_id"], unique=False)
    if not has_index("projects", "ux_projects_org_name"):
        op.create_index("ux_projects_org_name", "projects", ["organization_id", "name"], unique=True)

    # api_keys (store only hash)
    if not has_table("api_keys"):
        op.create_table(
            "api_keys",
            sa.Column("id", sa.UUID(), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()")),
            sa.Column("organization_id", sa.UUID(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("project_id", sa.UUID(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("key_hash", sa.String(length=200), nullable=False),
            sa.Column("scopes", sa.JSON(), nullable=False, server_default=sa.text("'[\"ingest\"]'::json")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        )

    # If api_keys table already exists from other migration runs, ensure columns exist before indexing
    if has_table("api_keys"):
        if not has_col("api_keys", "organization_id"):
            op.add_column("api_keys", sa.Column("organization_id", sa.UUID(), nullable=True))
        if not has_col("api_keys", "project_id"):
            op.add_column("api_keys", sa.Column("project_id", sa.UUID(), nullable=True))
        if not has_col("api_keys", "name"):
            op.add_column("api_keys", sa.Column("name", sa.String(length=200), nullable=True))
        if not has_col("api_keys", "key_hash"):
            op.add_column("api_keys", sa.Column("key_hash", sa.String(length=200), nullable=True))
        if not has_col("api_keys", "scopes"):
            op.add_column("api_keys", sa.Column("scopes", sa.JSON(), nullable=True))
        if not has_col("api_keys", "created_at"):
            op.add_column("api_keys", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
        if not has_col("api_keys", "revoked_at"):
            op.add_column("api_keys", sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))

        # Indexes (idempotent)
        if not has_index("api_keys", "ix_api_keys_org"):
            op.create_index("ix_api_keys_org", "api_keys", ["organization_id"], unique=False)
        if not has_index("api_keys", "ix_api_keys_project"):
            op.create_index("ix_api_keys_project", "api_keys", ["project_id"], unique=False)

        # Unique index needs required columns; create only if both exist
        if has_col("api_keys", "organization_id") and has_col("api_keys", "name"):
            if not has_index("api_keys", "ux_api_keys_org_name"):
                op.create_index("ux_api_keys_org_name", "api_keys", ["organization_id", "name"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    def has_table(t: str) -> bool:
        return insp.has_table(t)

    def has_index(t: str, idx: str) -> bool:
        if not has_table(t):
            return False
        return any(i["name"] == idx for i in insp.get_indexes(t))

    # Drop in reverse order, guard everything
    if has_table("api_keys"):
        if has_index("api_keys", "ux_api_keys_org_name"):
            op.drop_index("ux_api_keys_org_name", table_name="api_keys")
        if has_index("api_keys", "ix_api_keys_project"):
            op.drop_index("ix_api_keys_project", table_name="api_keys")
        if has_index("api_keys", "ix_api_keys_org"):
            op.drop_index("ix_api_keys_org", table_name="api_keys")
        op.drop_table("api_keys")

    if has_table("projects"):
        if has_index("projects", "ux_projects_org_name"):
            op.drop_index("ux_projects_org_name", table_name="projects")
        if has_index("projects", "ix_projects_org"):
            op.drop_index("ix_projects_org", table_name="projects")
        op.drop_table("projects")

    if has_table("organization_members"):
        if has_index("organization_members", "ix_org_members_user"):
            op.drop_index("ix_org_members_user", table_name="organization_members")
        if has_index("organization_members", "ux_org_members_org_user"):
            op.drop_index("ux_org_members_org_user", table_name="organization_members")
        op.drop_table("organization_members")

    if has_table("organizations"):
        if has_index("organizations", "ix_organizations_name"):
            op.drop_index("ix_organizations_name", table_name="organizations")
        op.drop_table("organizations")

    if has_table("users"):
        if has_index("users", "ix_users_email"):
            op.drop_index("ix_users_email", table_name="users")
        op.drop_table("users")
