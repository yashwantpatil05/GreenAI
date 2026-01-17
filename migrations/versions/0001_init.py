"""Initial schema.

Revision ID: 0001
Revises: 
Create Date: 2024-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(), nullable=False, unique=True),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
    )
    op.create_table(
        "organization_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("role", sa.String(), default="viewer"),
    )
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
    )
    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("hashed_key", sa.String(), nullable=False),
        sa.Column("active", sa.Boolean(), default=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
    )
    op.create_table(
        "models",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
    )
    op.create_table(
        "model_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.String(), nullable=False),
        sa.Column("model_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("models.id"), nullable=False),
    )
    op.create_table(
        "job_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("run_name", sa.String(), nullable=False),
        sa.Column("job_type", sa.String(), nullable=False),
        sa.Column("region", sa.String(), nullable=False),
        sa.Column("status", sa.String(), default="running"),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("tags", sa.JSON(), default=dict),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("model_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("model_versions.id"), nullable=True),
    )
    op.create_index("ix_job_runs_project_start_time", "job_runs", ["project_id", "start_time"])
    op.create_table(
        "job_run_hardware",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("job_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_runs.id"), nullable=False),
        sa.Column("cpu_count", sa.String(), nullable=True),
        sa.Column("gpu_model", sa.String(), nullable=True),
        sa.Column("ram_gb", sa.Float(), nullable=True),
        sa.Column("details", sa.JSON(), default=dict),
    )
    op.create_table(
        "job_run_energy",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("job_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_runs.id"), nullable=False),
        sa.Column("cpu_kwh", sa.Float(), default=0.0),
        sa.Column("gpu_kwh", sa.Float(), default=0.0),
        sa.Column("ram_kwh", sa.Float(), default=0.0),
        sa.Column("total_kwh", sa.Float(), default=0.0),
        sa.Column("emissions_kg", sa.Float(), default=0.0),
    )
    op.create_table(
        "job_run_costs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("job_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_runs.id"), nullable=False),
        sa.Column("amount_usd", sa.Float(), default=0.0),
        sa.Column("currency", sa.String(), default="USD"),
        sa.Column("breakdown", sa.JSON(), default=dict),
    )
    op.create_table(
        "optimization_suggestions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("effort", sa.String(), nullable=True),
        sa.Column("impact_kwh", sa.Float(), default=0.0),
        sa.Column("impact_co2", sa.Float(), default=0.0),
        sa.Column("priority", sa.Float(), default=0.0),
        sa.Column("status", sa.String(), default="open"),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("job_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_runs.id"), nullable=True),
    )
    op.create_index("ix_suggestions_project_status", "optimization_suggestions", ["project_id", "status"])
    op.create_table(
        "job_run_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("job_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_runs.id"), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.String(), nullable=False),
    )
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("s3_path", sa.String(), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
    )


def downgrade():
    op.drop_table("job_run_tags")
    op.drop_table("reports")
    op.drop_index("ix_suggestions_project_status", table_name="optimization_suggestions")
    op.drop_table("optimization_suggestions")
    op.drop_table("job_run_costs")
    op.drop_table("job_run_energy")
    op.drop_table("job_run_hardware")
    op.drop_index("ix_job_runs_project_start_time", table_name="job_runs")
    op.drop_table("job_runs")
    op.drop_table("model_versions")
    op.drop_table("models")
    op.drop_table("api_keys")
    op.drop_table("projects")
    op.drop_table("organization_members")
    op.drop_table("users")
    op.drop_table("organizations")
