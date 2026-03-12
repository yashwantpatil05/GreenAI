"""Phase 0 alignment for Supabase tenancy/auth

Revision ID: 0003_phase0_alignment
Revises: 173900bf0502
Create Date: 2025-12-28
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect, text
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0003_phase0_alignment"
down_revision = "173900bf0502"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    def has_table(table: str) -> bool:
        return insp.has_table(table)

    def has_col(table: str, col: str) -> bool:
        return has_table(table) and any(c["name"] == col for c in insp.get_columns(table))

    def has_index(table: str, idx: str) -> bool:
        return has_table(table) and any(i["name"] == idx for i in insp.get_indexes(table))

    def has_unique(table: str, name: str) -> bool:
        return has_table(table) and any(c["name"] == name for c in insp.get_unique_constraints(table))

    def has_unique_on(table: str, columns: list[str]) -> bool:
        if not has_table(table):
            return False
        normalized = set(columns)
        for constraint in insp.get_unique_constraints(table):
            cols = set(constraint.get("column_names") or [])
            if cols == normalized:
                return True
        return False

    def has_unique(table: str, name: str) -> bool:
        return has_table(table) and any(c["name"] == name for c in insp.get_unique_constraints(table))

    # -----------------------------
    # users
    # -----------------------------
    if has_table("users"):
        if not has_col("users", "full_name"):
            op.add_column("users", sa.Column("full_name", sa.String(length=200), nullable=True))

        if not has_col("users", "auth_provider"):
            op.add_column(
                "users",
                sa.Column("auth_provider", sa.String(length=50), nullable=True, server_default=sa.text("'supabase'")),
            )
        else:
            op.alter_column(
                "users",
                "auth_provider",
                existing_type=sa.String(length=50),
                nullable=True,
                server_default=sa.text("'supabase'"),
            )

        if not has_col("users", "hashed_password"):
            op.add_column(
                "users",
                sa.Column("hashed_password", sa.String(), nullable=True, server_default=sa.text("'SUPABASE_MANAGED'")),
            )
        else:
            op.alter_column(
                "users",
                "hashed_password",
                existing_type=sa.String(),
                nullable=True,
                server_default=sa.text("'SUPABASE_MANAGED'"),
            )

        if not has_col("users", "role"):
            op.add_column(
                "users",
                sa.Column("role", sa.String(length=20), nullable=False, server_default=sa.text("'member'")),
            )
        else:
            op.alter_column(
                "users",
                "role",
                existing_type=sa.String(length=20),
                nullable=False,
                server_default=sa.text("'member'"),
            )

        if not has_col("users", "organization_id"):
            op.add_column("users", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))

        if not has_index("users", "ix_users_email"):
            op.create_index("ix_users_email", "users", ["email"], unique=False)

    # -----------------------------
    # organizations
    # -----------------------------
    if has_table("organizations"):
        if not has_index("organizations", "ix_organizations_name"):
            op.create_index("ix_organizations_name", "organizations", ["name"], unique=False)
        if not (has_unique("organizations", "uq_organizations_name") or has_unique_on("organizations", ["name"])):
            try:
                op.create_unique_constraint("uq_organizations_name", "organizations", ["name"])
            except Exception:
                # If a differently named unique constraint already exists, keep it
                pass

    # -----------------------------
    # organization_members
    # -----------------------------
    if has_table("organization_members"):
        if not has_col("organization_members", "updated_at"):
            op.add_column(
                "organization_members",
                sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            )

        op.alter_column(
            "organization_members",
            "role",
            existing_type=sa.String(length=20),
            nullable=False,
            server_default=sa.text("'viewer'"),
        )

        if not has_index("organization_members", "ix_org_members_user"):
            op.create_index("ix_org_members_user", "organization_members", ["user_id"], unique=False)
        if not (has_index("organization_members", "ux_org_members_org_user") or has_unique("organization_members", "ux_org_members_org_user")):
            op.create_index(
                "ux_org_members_org_user",
                "organization_members",
                ["organization_id", "user_id"],
                unique=True,
            )

    # -----------------------------
    # projects
    # -----------------------------
    if has_table("projects"):
        if not has_col("projects", "default_cloud_provider"):
            op.add_column("projects", sa.Column("default_cloud_provider", sa.String(length=50), nullable=True))
        if not has_col("projects", "default_region"):
            op.add_column("projects", sa.Column("default_region", sa.String(length=80), nullable=True))
        if not has_index("projects", "ix_projects_org"):
            op.create_index("ix_projects_org", "projects", ["organization_id"], unique=False)

    # -----------------------------
    # api_keys
    # -----------------------------
    if has_table("api_keys"):
        # Column name alignment
        if has_col("api_keys", "key_hash") and not has_col("api_keys", "hashed_key"):
            op.alter_column("api_keys", "key_hash", new_column_name="hashed_key")

        if not has_col("api_keys", "hashed_key"):
            op.add_column("api_keys", sa.Column("hashed_key", sa.String(length=200), nullable=False))
        else:
            op.alter_column(
                "api_keys",
                "hashed_key",
                existing_type=sa.String(length=200),
                nullable=False,
            )

        if not has_col("api_keys", "active"):
            op.add_column("api_keys", sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")))

        if not has_col("api_keys", "organization_id"):
            op.add_column("api_keys", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
            op.execute(
                """
                UPDATE api_keys ak
                SET organization_id = p.organization_id
                FROM projects p
                WHERE ak.project_id = p.id AND ak.organization_id IS NULL
                """
            )
            try:
                op.alter_column("api_keys", "organization_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
            except Exception:
                # If legacy rows still null, keep nullable to avoid migration failure
                pass

        if not has_col("api_keys", "user_id"):
            op.add_column("api_keys", sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True))

        if not has_col("api_keys", "scopes"):
            op.add_column(
                "api_keys",
                sa.Column("scopes", sa.JSON(), nullable=False, server_default=sa.text("'[\"ingest\"]'::json")),
            )

        if not has_col("api_keys", "revoked_at"):
            op.add_column("api_keys", sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))

        if not has_col("api_keys", "created_at"):
            op.add_column("api_keys", sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")))

        if not has_col("api_keys", "updated_at"):
            op.add_column("api_keys", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")))

        if not has_index("api_keys", "ix_api_keys_org"):
            op.create_index("ix_api_keys_org", "api_keys", ["organization_id"], unique=False)
        if not has_index("api_keys", "ix_api_keys_project"):
            op.create_index("ix_api_keys_project", "api_keys", ["project_id"], unique=False)
        if not has_index("api_keys", "ux_api_keys_org_name"):
            try:
                op.create_index("ux_api_keys_org_name", "api_keys", ["organization_id", "name"], unique=True)
            except Exception:
                pass


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    def has_table(table: str) -> bool:
        return insp.has_table(table)

    def has_col(table: str, col: str) -> bool:
        return has_table(table) and any(c["name"] == col for c in insp.get_columns(table))

    def has_index(table: str, idx: str) -> bool:
        return has_table(table) and any(i["name"] == idx for i in insp.get_indexes(table))

    if has_table("api_keys"):
        for idx in ("ux_api_keys_org_name", "ix_api_keys_project", "ix_api_keys_org"):
            if has_index("api_keys", idx):
                op.drop_index(idx, table_name="api_keys")

        for col in ("revoked_at", "scopes", "user_id", "organization_id", "active"):
            if has_col("api_keys", col):
                op.drop_column("api_keys", col)

    if has_table("projects"):
        for col in ("default_region", "default_cloud_provider"):
            if has_col("projects", col):
                op.drop_column("projects", col)
        if has_index("projects", "ix_projects_org"):
            op.drop_index("ix_projects_org", table_name="projects")

    if has_table("organization_members"):
        if has_index("organization_members", "ux_org_members_org_user"):
            op.drop_index("ux_org_members_org_user", table_name="organization_members")
        if has_index("organization_members", "ix_org_members_user"):
            op.drop_index("ix_org_members_user", table_name="organization_members")
        if has_col("organization_members", "updated_at"):
            op.drop_column("organization_members", "updated_at")

    if has_table("organizations"):
        if has_index("organizations", "ix_organizations_name"):
            op.drop_index("ix_organizations_name", table_name="organizations")
        if has_unique("organizations", "uq_organizations_name"):
            op.drop_constraint("uq_organizations_name", "organizations", type_="unique")

    if has_table("users"):
        if has_index("users", "ix_users_email"):
            op.drop_index("ix_users_email", table_name="users")
        for col in ("organization_id", "role", "hashed_password", "auth_provider", "full_name"):
            if has_col("users", col):
                op.drop_column("users", col)
