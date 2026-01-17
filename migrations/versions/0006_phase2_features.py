"""Phase 2 features: comparison/suggestions/report extensions and region factors

Revision ID: 0006_phase2_features
Revises: 0005_phase1_job_runs
Create Date: 2025-12-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "0006_phase2_features"
down_revision = "0005_phase1_job_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    # region emission factors
    if not insp.has_table("region_emission_factors"):
        op.create_table(
            "region_emission_factors",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=text("now()"), nullable=False),
            sa.Column("region", sa.String(), nullable=False),
            sa.Column("factor_kg_co2e_per_kwh", sa.Float(), nullable=False),
            sa.Column("source", sa.String(), nullable=True),
            sa.Column("version", sa.String(), nullable=False, server_default=text("'v1'")),
            sa.UniqueConstraint("region", "version", name="ux_region_factor_region_version"),
        )
        op.execute(
            """
            INSERT INTO region_emission_factors (id, created_at, updated_at, region, factor_kg_co2e_per_kwh, source, version)
            VALUES
            (gen_random_uuid(), now(), now(), 'us-east-1', 0.0004, 'default', 'v1'),
            (gen_random_uuid(), now(), now(), 'us-west-2', 0.0002, 'default', 'v1'),
            (gen_random_uuid(), now(), now(), 'eu-west-1', 0.00025, 'default', 'v1'),
            (gen_random_uuid(), now(), now(), 'ap-south-1', 0.00055, 'default', 'v1')
            ON CONFLICT DO NOTHING;
            """
        )

    # suggestions extensions
    if insp.has_table("optimization_suggestions"):
        new_cols = [
            sa.Column("severity", sa.String(), nullable=True),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("estimated_cost_usd", sa.Float(), nullable=True),
            sa.Column("feedback", sa.Text(), nullable=True),
            sa.Column("rationale", sa.Text(), nullable=True),
            sa.Column("steps", sa.Text(), nullable=True),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("hash_key", sa.String(), nullable=True),
            sa.Column("engine_version", sa.String(), nullable=True, server_default=text("'v1'")),
            sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True, server_default=text("now()")),
        ]
        for col in new_cols:
            try:
                op.add_column("optimization_suggestions", col)
            except Exception:
                pass
        try:
            op.create_index("ix_suggestions_hash_key", "optimization_suggestions", ["hash_key"])
        except Exception:
            pass

    # reports extensions
    if insp.has_table("reports"):
        for col in [
            sa.Column("file_path", sa.String(), nullable=True),
            sa.Column("report_type", sa.String(), nullable=True),
            sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("target_id", sa.String(), nullable=True),
            sa.Column("from_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("to_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("metadata", sa.JSON(), nullable=True),
        ]:
            try:
                op.add_column("reports", col)
            except Exception:
                pass
        op.execute(
            """
            UPDATE reports r
            SET organization_id = p.organization_id
            FROM projects p
            WHERE r.project_id = p.id AND r.organization_id IS NULL
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if insp.has_table("reports"):
        for col in ("metadata", "to_date", "from_date", "target_id", "organization_id", "report_type", "file_path"):
            try:
                op.drop_column("reports", col)
            except Exception:
                pass

    if insp.has_table("optimization_suggestions"):
        try:
            op.drop_index("ix_suggestions_hash_key", table_name="optimization_suggestions")
        except Exception:
            pass
        for col in (
            "generated_at",
            "engine_version",
            "hash_key",
            "evidence",
            "steps",
            "rationale",
            "feedback",
            "estimated_cost_usd",
            "confidence",
            "severity",
        ):
            try:
                op.drop_column("optimization_suggestions", col)
            except Exception:
                pass

    if insp.has_table("region_emission_factors"):
        op.drop_table("region_emission_factors")
