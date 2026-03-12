"""Add performance indexes for scalability.

Revision ID: 0009_add_performance_indexes
Revises: 106db2df079a_add_org_billing_fields
Create Date: 2026-02-03
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0009_add_performance_indexes"
down_revision = "106db2df079a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add performance indexes for frequently queried columns."""
    from sqlalchemy import inspect

    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    # job_runs.start_time - for analytics trends
    if "job_runs" in existing_tables:
        try:
            op.create_index(
                "ix_job_runs_start_time",
                "job_runs",
                ["start_time"],
                unique=False,
                postgresql_using="btree"
            )
        except Exception as e:
            print(f"Skipping ix_job_runs_start_time: {e}")

    # job_runs(organization_id, created_at) - composite for monthly counting
    if "job_runs" in existing_tables:
        try:
            op.create_index(
                "ix_job_runs_org_created",
                "job_runs",
                ["organization_id", "created_at"],
                unique=False,
                postgresql_using="btree"
            )
        except Exception as e:
            print(f"Skipping ix_job_runs_org_created: {e}")

    # rate_limit_counters(key, window_start) - composite for rate limiting lookups
    if "rate_limit_counters" in existing_tables:
        try:
            op.create_index(
                "ix_rate_limit_key_window",
                "rate_limit_counters",
                ["key", "window_start"],
                unique=False,
                postgresql_using="btree"
            )
        except Exception as e:
            print(f"Skipping ix_rate_limit_key_window: {e}")

    # suggestions(project_id, status) - for filtering suggestions
    if "optimization_suggestions" in existing_tables:
        try:
            op.create_index(
                "ix_suggestions_project_status",
                "optimization_suggestions",
                ["project_id", "status"],
                unique=False,
                postgresql_using="btree"
            )
        except Exception as e:
            print(f"Skipping ix_suggestions_project_status: {e}")


def downgrade() -> None:
    """Remove performance indexes."""
    try:
        op.drop_index("ix_suggestions_project_status", table_name="optimization_suggestions")
    except Exception:
        pass

    try:
        op.drop_index("ix_rate_limit_key_window", table_name="rate_limit_counters")
    except Exception:
        pass

    try:
        op.drop_index("ix_job_runs_org_created", table_name="job_runs")
    except Exception:
        pass

    try:
        op.drop_index("ix_job_runs_start_time", table_name="job_runs")
    except Exception:
        pass
