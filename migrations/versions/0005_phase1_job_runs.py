"""Phase 1 job runs dedupe + metrics + api key prefix

Revision ID: 0005_phase1_job_runs
Revises: 0004_org_defaults
Create Date: 2025-12-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0005_phase1_job_runs"
down_revision = "0004_org_defaults"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if insp.has_table("job_runs"):
        op.add_column("job_runs", sa.Column("metadata", sa.JSON(), nullable=True, server_default=text("'{}'::jsonb")))
        op.add_column("job_runs", sa.Column("dedupe_key", sa.String(), nullable=True))
        op.add_column("job_runs", sa.Column("external_run_id", sa.String(), nullable=True))
        op.add_column("job_runs", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))

        # Backfill organization_id from projects
        op.execute(
            """
            UPDATE job_runs jr
            SET organization_id = p.organization_id
            FROM projects p
            WHERE jr.project_id = p.id AND jr.organization_id IS NULL
            """
        )

        # Backfill dedupe_key for existing rows
        op.execute(
            """
            UPDATE job_runs
            SET dedupe_key = COALESCE(
                external_run_id,
                run_name || ':' || COALESCE(to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SSOF'), '')
            )
            WHERE dedupe_key IS NULL
            """
        )

        op.alter_column("job_runs", "organization_id", nullable=False)
        op.alter_column("job_runs", "dedupe_key", nullable=False)
        op.create_foreign_key(
            "fk_job_runs_organization",
            source_table="job_runs",
            referent_table="organizations",
            local_cols=["organization_id"],
            remote_cols=["id"],
            ondelete="CASCADE",
        )
        op.create_index("ix_job_runs_org", "job_runs", ["organization_id"])
        op.create_unique_constraint("ux_job_runs_project_dedupe", "job_runs", ["project_id", "dedupe_key"])

    if insp.has_table("job_run_energy"):
        op.add_column(
            "job_run_energy",
            sa.Column("compute_status", sa.String(), nullable=True, server_default=text("'pending'")),
        )
        op.add_column("job_run_energy", sa.Column("compute_error", sa.Text(), nullable=True))

    if insp.has_table("api_keys"):
        op.add_column("api_keys", sa.Column("key_prefix", sa.String(length=12), nullable=True))
        op.create_index("ix_api_keys_key_prefix", "api_keys", ["key_prefix"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if insp.has_table("api_keys"):
        op.drop_index("ix_api_keys_key_prefix", table_name="api_keys")
        op.drop_column("api_keys", "key_prefix")

    if insp.has_table("job_run_energy"):
        op.drop_column("job_run_energy", "compute_error")
        op.drop_column("job_run_energy", "compute_status")

    if insp.has_table("job_runs"):
        op.drop_constraint("ux_job_runs_project_dedupe", "job_runs", type_="unique")
        op.drop_index("ix_job_runs_org", table_name="job_runs")
        op.drop_constraint("fk_job_runs_organization", "job_runs", type_="foreignkey")
        op.drop_column("job_runs", "organization_id")
        op.drop_column("job_runs", "external_run_id")
        op.drop_column("job_runs", "dedupe_key")
        op.drop_column("job_runs", "metadata")
