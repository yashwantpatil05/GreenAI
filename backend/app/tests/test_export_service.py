"""Tests for export service (Phase 4.1)."""
import pytest
import csv
import json
import io
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.app.services.export_service import (
    export_job_runs_to_csv,
    export_job_runs_to_json,
    export_analytics_to_json,
)
from backend.app.models.job_run import JobRun
from backend.app.models.organization import Organization
from backend.app.models.project import Project


class TestCSVExport:
    """Test CSV export functionality."""

    def test_export_csv_basic(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test basic CSV export with multiple job runs."""
        csv_data = export_job_runs_to_csv(db, test_organization.id)

        # Parse CSV
        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)

        # Verify headers are present
        assert len(rows) > 0
        first_row = rows[0]
        expected_headers = [
            "Run Name", "Job Type", "Status", "Region", "Start Time", "End Time",
            "Duration (hours)", "GPU Model", "CPU Count", "RAM (GB)",
            "Energy (kWh)", "Carbon Emissions (kg)", "Compute Cost ($)",
            "Energy Cost ($)", "Total Cost ($)", "Project ID", "Created At"
        ]
        for header in expected_headers:
            assert header in first_row

        # Verify data matches job runs
        assert len(rows) == len(multiple_job_runs)

    def test_export_csv_filtered_by_project(self, db: Session, multiple_job_runs: list[JobRun], test_project: Project, test_organization: Organization):
        """Test CSV export filtered by project."""
        csv_data = export_job_runs_to_csv(
            db,
            test_organization.id,
            project_id=test_project.id
        )

        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)

        # All rows should belong to test_project
        for row in rows:
            assert row["Project ID"] == str(test_project.id)

    def test_export_csv_filtered_by_date_range(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test CSV export filtered by date range."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=5)

        csv_data = export_job_runs_to_csv(
            db,
            test_organization.id,
            start_date=start_date,
            end_date=end_date
        )

        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)

        # Should have fewer rows than total
        assert len(rows) <= len(multiple_job_runs)
        assert len(rows) > 0

    def test_export_csv_filtered_by_status(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test CSV export filtered by status."""
        csv_data = export_job_runs_to_csv(
            db,
            test_organization.id,
            status="success"
        )

        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)

        # All rows should have success status
        for row in rows:
            assert row["Status"] == "success"

        # Should have fewer rows than total (some are failed)
        assert len(rows) < len(multiple_job_runs)
        assert len(rows) > 0

    def test_export_csv_empty_dataset(self, db: Session, test_organization: Organization):
        """Test CSV export with no data returns headers only."""
        # Create org with no job runs
        csv_data = export_job_runs_to_csv(db, test_organization.id)

        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)

        # Should have headers but no data rows
        assert len(rows) == 0

    def test_export_csv_data_accuracy(self, db: Session, test_job_run: JobRun, test_organization: Organization):
        """Test CSV export data accuracy."""
        csv_data = export_job_runs_to_csv(db, test_organization.id)

        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)

        assert len(rows) == 1
        row = rows[0]

        # Verify specific field values
        assert row["Run Name"] == test_job_run.run_name
        assert row["Status"] == test_job_run.status
        assert float(row["Energy (kWh)"]) == test_job_run.energy.total_kwh
        assert float(row["Carbon Emissions (kg)"]) == test_job_run.energy.emissions_kg
        assert float(row["Total Cost ($)"]) == test_job_run.costs.amount_usd

    def test_export_csv_handles_missing_related_data(self, db: Session, test_project: Project, test_organization: Organization):
        """Test CSV export handles job runs with missing hardware/energy/cost data."""
        # Create job run without related data
        job_run = JobRun(
            run_name="minimal-run",
            job_type="training",
            region="us-west-1",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="minimal-001-dedup",
        )
        db.add(job_run)
        db.commit()

        csv_data = export_job_runs_to_csv(db, test_organization.id)

        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)

        # Should still export with empty/zero values
        minimal_row = [r for r in rows if r["Run Name"] == "minimal-run"][0]
        assert minimal_row["GPU Model"] == ""
        assert minimal_row["Energy (kWh)"] == "0.00"
        assert minimal_row["Total Cost ($)"] == "0.00"


class TestJSONExport:
    """Test JSON export functionality."""

    def test_export_json_basic(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test basic JSON export."""
        json_data = export_job_runs_to_json(db, test_organization.id)

        data = json.loads(json_data)

        # Verify structure
        assert "job_runs" in data
        assert "export_metadata" in data
        assert isinstance(data["job_runs"], list)
        assert len(data["job_runs"]) == len(multiple_job_runs)

    def test_export_json_structure(self, db: Session, test_job_run: JobRun, test_organization: Organization):
        """Test JSON export structure."""
        json_data = export_job_runs_to_json(db, test_organization.id)

        data = json.loads(json_data)
        job_run = data["job_runs"][0]

        # Verify all expected fields are present
        expected_fields = [
            "id", "run_name", "job_type", "status", "region",
            "start_time", "end_time", "project_id", "created_at",
            "hardware", "energy", "costs"
        ]
        for field in expected_fields:
            assert field in job_run

    def test_export_json_nested_data(self, db: Session, test_job_run: JobRun, test_organization: Organization):
        """Test JSON export includes nested hardware/energy/cost data."""
        json_data = export_job_runs_to_json(db, test_organization.id)

        data = json.loads(json_data)
        job_run = data["job_runs"][0]

        # Verify hardware data
        assert job_run["hardware"]["gpu_model"] == "NVIDIA A100"
        assert job_run["hardware"]["ram_gb"] == 256

        # Verify energy data
        assert job_run["energy"]["total_kwh"] == 45.5
        assert job_run["energy"]["emissions_kg"] == 21.47

        # Verify cost data
        assert job_run["costs"]["amount_usd"] == 139.25
        assert "breakdown" in job_run["costs"]

    def test_export_json_metadata(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test JSON export metadata."""
        json_data = export_job_runs_to_json(db, test_organization.id)

        data = json.loads(json_data)
        metadata = data["export_metadata"]

        assert "exported_at" in metadata
        assert "total_records" in metadata
        assert "organization_id" in metadata
        assert metadata["total_records"] == len(multiple_job_runs)

    def test_export_json_filtered(self, db: Session, multiple_job_runs: list[JobRun], test_project: Project, test_organization: Organization):
        """Test JSON export with filters."""
        json_data = export_job_runs_to_json(
            db,
            test_organization.id,
            project_id=test_project.id,
            status="success"
        )

        data = json.loads(json_data)

        # All job runs should match filters
        for job_run in data["job_runs"]:
            assert job_run["project_id"] == str(test_project.id)
            assert job_run["status"] == "success"


class TestAnalyticsExport:
    """Test analytics summary export."""

    def test_export_analytics_basic(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test analytics summary export."""
        json_data = export_analytics_to_json(db, test_organization.id)

        data = json.loads(json_data)

        # Verify structure
        assert "export_metadata" in data
        assert "summary" in data
        assert "breakdown" in data

    def test_export_analytics_totals(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test analytics totals calculation."""
        json_data = export_analytics_to_json(db, test_organization.id)

        data = json.loads(json_data)
        summary = data["summary"]
        metadata = data["export_metadata"]

        assert "total_energy_kwh" in summary
        assert "total_carbon_kg" in summary
        assert "total_cost_usd" in summary
        assert metadata["total_job_runs"] == len(multiple_job_runs)

        assert summary["total_energy_kwh"] > 0
        assert summary["total_carbon_kg"] > 0
        assert summary["total_cost_usd"] > 0

    def test_export_analytics_breakdown(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test analytics breakdown by status, job_type, and region."""
        json_data = export_analytics_to_json(db, test_organization.id)

        data = json.loads(json_data)
        breakdown = data["breakdown"]

        # Should have breakdown categories
        assert "by_status" in breakdown
        assert "by_job_type" in breakdown
        assert "by_region" in breakdown

        # Status breakdown should have counts
        status_counts = breakdown["by_status"]
        assert isinstance(status_counts, dict)

    def test_export_analytics_averages(self, db: Session, multiple_job_runs: list[JobRun], test_organization: Organization):
        """Test analytics average calculations."""
        json_data = export_analytics_to_json(db, test_organization.id)

        data = json.loads(json_data)
        summary = data["summary"]

        # Should have average metrics
        assert "average_energy_per_run_kwh" in summary
        assert "average_carbon_per_run_kg" in summary
        assert "average_cost_per_run_usd" in summary

        # Averages should be positive
        assert summary["average_energy_per_run_kwh"] > 0
        assert summary["average_carbon_per_run_kg"] > 0
        assert summary["average_cost_per_run_usd"] > 0

    def test_export_analytics_filtered_by_project(self, db: Session, multiple_job_runs: list[JobRun], test_project: Project, test_organization: Organization):
        """Test analytics export filtered by project."""
        json_data = export_analytics_to_json(
            db,
            test_organization.id,
            project_id=test_project.id
        )

        data = json.loads(json_data)

        # Should include project filter in metadata
        assert data["export_metadata"]["project_id"] == str(test_project.id)

    def test_export_analytics_empty_dataset(self, db: Session, test_organization: Organization):
        """Test analytics export with no data."""
        json_data = export_analytics_to_json(db, test_organization.id)

        data = json.loads(json_data)

        # Should have structure with zero values
        assert data["export_metadata"]["total_job_runs"] == 0
        assert data["summary"]["total_energy_kwh"] == 0
        assert data["summary"]["total_carbon_kg"] == 0


class TestExportAPI:
    """Test export API endpoints."""

    def test_export_csv_endpoint(self, client, auth_headers, multiple_job_runs: list[JobRun]):
        """Test CSV export endpoint."""
        response = client.get("/api/exports/job-runs/csv", headers=auth_headers)

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]

        # Verify CSV content
        csv_data = response.text
        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)
        assert len(rows) == len(multiple_job_runs)

    def test_export_json_endpoint(self, client, auth_headers, multiple_job_runs: list[JobRun]):
        """Test JSON export endpoint."""
        response = client.get("/api/exports/job-runs/json", headers=auth_headers)

        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]
        assert "attachment" in response.headers["content-disposition"]

        # Verify JSON content
        data = response.json()
        assert "job_runs" in data
        assert len(data["job_runs"]) == len(multiple_job_runs)

    def test_export_analytics_endpoint(self, client, auth_headers, multiple_job_runs: list[JobRun]):
        """Test analytics export endpoint."""
        response = client.get("/api/exports/analytics", headers=auth_headers)

        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]

        data = response.json()
        assert "summary" in data
        assert "totals" in data

    def test_export_unauthorized(self, client):
        """Test export endpoints require authentication."""
        response = client.get("/api/exports/job-runs/csv")
        assert response.status_code == 401

    def test_export_with_filters(self, client, auth_headers, test_project: Project):
        """Test export endpoints with query parameters."""
        response = client.get(
            f"/api/exports/job-runs/csv?project_id={test_project.id}&status=success",
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_export_filename_format(self, client, auth_headers):
        """Test export filename format includes timestamp."""
        response = client.get("/api/exports/job-runs/csv", headers=auth_headers)

        disposition = response.headers["content-disposition"]
        assert "greenai_job_runs_" in disposition
        assert ".csv" in disposition
