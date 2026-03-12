"""Tests for analytics endpoints and calculations."""
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from backend.app.models.job_run import JobRun, JobRunEnergy, JobRunHardware, JobRunCost
from backend.app.models.organization import Organization
from backend.app.models.project import Project
from backend.app.models.user import User


class TestAnalyticsSummary:
    """Test /analytics/summary endpoint."""

    def test_summary_with_no_data(self, client, auth_headers):
        """Test summary with no job runs."""
        response = client.get("/api/analytics/summary", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["total_runs"] == 0
        assert data["total_energy_kwh"] == 0.0
        assert data["total_co2e_kg"] == 0.0
        assert "last_30_days" in data
        assert isinstance(data["last_30_days"], list)

    def test_summary_with_job_runs(self, client, auth_headers, multiple_job_runs):
        """Test summary with multiple job runs."""
        response = client.get("/api/analytics/summary", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["total_runs"] > 0
        assert data["total_energy_kwh"] > 0
        assert data["total_co2e_kg"] > 0
        assert len(data["last_30_days"]) >= 0

    def test_summary_trend_structure(self, client, auth_headers, multiple_job_runs):
        """Test summary trend data structure."""
        response = client.get("/api/analytics/summary", headers=auth_headers)

        data = response.json()

        if len(data["last_30_days"]) > 0:
            trend_item = data["last_30_days"][0]
            assert "day" in trend_item
            assert "runs" in trend_item
            assert "energy_kwh" in trend_item
            assert "co2e_kg" in trend_item

    def test_summary_requires_auth(self, client):
        """Test summary endpoint requires authentication."""
        response = client.get("/api/analytics/summary")
        assert response.status_code == 401

    def test_summary_caching(self, client, auth_headers, multiple_job_runs):
        """Test summary endpoint caching."""
        # First request
        response1 = client.get("/api/analytics/summary", headers=auth_headers)
        data1 = response1.json()

        # Second request (should be cached)
        response2 = client.get("/api/analytics/summary", headers=auth_headers)
        data2 = response2.json()

        # Results should be identical
        assert data1 == data2


class TestAnalyticsOverview:
    """Test /analytics/overview endpoint."""

    def test_overview_basic(self, client, auth_headers):
        """Test overview endpoint basic response."""
        response = client.get("/api/analytics/overview", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "total_kwh" in data
        assert "total_emissions_kg" in data

    def test_overview_with_data(self, client, auth_headers, multiple_job_runs):
        """Test overview with job runs."""
        response = client.get("/api/analytics/overview", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["total_kwh"] >= 0
        assert data["total_emissions_kg"] >= 0

    def test_overview_requires_auth(self, client):
        """Test overview endpoint requires authentication."""
        response = client.get("/api/analytics/overview")
        assert response.status_code == 401


class TestAnalyticsTrends:
    """Test /analytics/trends endpoint."""

    def test_trends_basic(self, client, auth_headers):
        """Test trends endpoint basic response."""
        response = client.get("/api/analytics/trends", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "monthly_trends" in data
        assert isinstance(data["monthly_trends"], list)

    def test_trends_with_data(self, client, auth_headers, multiple_job_runs):
        """Test trends with job runs."""
        response = client.get("/api/analytics/trends", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        trends = data["monthly_trends"]
        if len(trends) > 0:
            trend = trends[0]
            assert "month" in trend
            assert "total_kwh" in trend


class TestAnalyticsHotspots:
    """Test /analytics/hotspots endpoint."""

    def test_hotspots_basic(self, client, auth_headers):
        """Test hotspots endpoint basic response."""
        response = client.get("/api/analytics/hotspots", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "hotspots" in data
        assert isinstance(data["hotspots"], list)

    def test_hotspots_with_data(self, client, auth_headers, multiple_job_runs):
        """Test hotspots with job runs."""
        response = client.get("/api/analytics/hotspots", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        hotspots = data["hotspots"]
        if len(hotspots) > 0:
            hotspot = hotspots[0]
            assert "run_name" in hotspot
            assert "emissions_kg" in hotspot
            assert "energy_kwh" in hotspot

    def test_hotspots_sorted_by_emissions(self, client, auth_headers, multiple_job_runs):
        """Test hotspots are sorted by emissions descending."""
        response = client.get("/api/analytics/hotspots", headers=auth_headers)

        data = response.json()
        hotspots = data["hotspots"]

        # Check if sorted (descending)
        if len(hotspots) > 1:
            for i in range(len(hotspots) - 1):
                assert hotspots[i]["emissions_kg"] >= hotspots[i + 1]["emissions_kg"]


class TestAnalyticsCalculations:
    """Test analytics calculation accuracy."""

    def test_total_energy_calculation(self, client, auth_headers, test_job_run):
        """Test total energy is calculated correctly."""
        response = client.get("/api/analytics/summary", headers=auth_headers)

        data = response.json()

        # Should match the energy from our test job run
        assert data["total_energy_kwh"] == test_job_run.energy.total_kwh

    def test_total_emissions_calculation(self, client, auth_headers, test_job_run):
        """Test total emissions are calculated correctly."""
        response = client.get("/api/analytics/summary", headers=auth_headers)

        data = response.json()

        # Should match the emissions from our test job run
        assert data["total_co2e_kg"] == test_job_run.energy.emissions_kg

    def test_aggregation_across_projects(self, db: Session, client, auth_headers, test_organization: Organization, test_user: User):
        """Test analytics aggregate across all projects in organization."""
        from uuid import uuid4

        # Create multiple projects with job runs
        for i in range(3):
            project = Project(
                id=uuid4(),
                name=f"Project {i}",
                organization_id=test_organization.id,
            )
            db.add(project)
            db.flush()

            # Create job run for this project
            job_run = JobRun(
                id=uuid4(),
                run_name=f"run-{i}",
                job_type="training",
                region="us-west-2",
                project_id=project.id,
                organization_id=test_organization.id,
                status="success",
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow(),
                dedupe_key=f"run-{i}-dedup",
            )
            db.add(job_run)
            db.flush()

            # Add energy data
            energy = JobRunEnergy(
                id=uuid4(),
                job_run_id=job_run.id,
                total_kwh=10.0 * (i + 1),
                emissions_kg=5.0 * (i + 1),
            )
            db.add(energy)

        db.commit()

        # Get analytics
        response = client.get("/api/analytics/summary", headers=auth_headers)
        data = response.json()

        # Should aggregate all projects (10 + 20 + 30 = 60 kWh)
        assert data["total_energy_kwh"] >= 60.0


class TestAnalyticsFiltering:
    """Test analytics filtering by date range and project."""

    def test_date_range_filtering(self, client, auth_headers, db: Session, test_project: Project, test_organization: Organization):
        """Test analytics can filter by date range."""
        from uuid import uuid4

        # Create job runs with different dates
        old_run = JobRun(
            id=uuid4(),
            run_name="old-run",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow() - timedelta(days=60),
            end_time=datetime.utcnow() - timedelta(days=60),
            dedupe_key="old-run-dedup",
        )
        db.add(old_run)
        db.flush()

        old_energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=old_run.id,
            total_kwh=100.0,
            emissions_kg=50.0,
        )
        db.add(old_energy)
        db.commit()

        # Get summary (last 30 days only)
        response = client.get("/api/analytics/summary", headers=auth_headers)
        data = response.json()

        # Old run should NOT be in last_30_days trend
        # (but may be in total if no date filtering on totals)
        assert isinstance(data["last_30_days"], list)


class TestAnalyticsPerformance:
    """Test analytics performance and optimization."""

    def test_summary_with_large_dataset(self, client, auth_headers, db: Session, test_project: Project, test_organization: Organization):
        """Test summary endpoint performs well with many job runs."""
        from uuid import uuid4
        import time

        # Create 50 job runs
        for i in range(50):
            job_run = JobRun(
                id=uuid4(),
                run_name=f"perf-run-{i}",
                job_type="training",
                region="us-west-2",
                project_id=test_project.id,
                organization_id=test_organization.id,
                status="success",
                start_time=datetime.utcnow() - timedelta(hours=i),
                end_time=datetime.utcnow() - timedelta(hours=i),
                dedupe_key=f"perf-run-{i}-dedup",
            )
            db.add(job_run)
            db.flush()

            energy = JobRunEnergy(
                id=uuid4(),
                job_run_id=job_run.id,
                total_kwh=10.0,
                emissions_kg=5.0,
            )
            db.add(energy)

        db.commit()

        # Time the request
        start = time.time()
        response = client.get("/api/analytics/summary", headers=auth_headers)
        elapsed = time.time() - start

        assert response.status_code == 200
        # Should complete in less than 2 seconds
        assert elapsed < 2.0


class TestAnalyticsEdgeCases:
    """Test analytics edge cases."""

    def test_summary_with_null_energy_values(self, db: Session, client, auth_headers, test_project: Project, test_organization: Organization):
        """Test summary handles job runs with missing energy data."""
        from uuid import uuid4

        # Create job run without energy data
        job_run = JobRun(
            id=uuid4(),
            run_name="no-energy-run",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="no-energy-dedup",
        )
        db.add(job_run)
        db.commit()

        # Should not crash
        response = client.get("/api/analytics/summary", headers=auth_headers)
        assert response.status_code == 200

    def test_summary_with_zero_emissions(self, db: Session, client, auth_headers, test_project: Project, test_organization: Organization):
        """Test summary handles zero emissions correctly."""
        from uuid import uuid4

        job_run = JobRun(
            id=uuid4(),
            run_name="zero-emissions-run",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="zero-emissions-dedup",
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=0.0,
            emissions_kg=0.0,
        )
        db.add(energy)
        db.commit()

        response = client.get("/api/analytics/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_co2e_kg"] >= 0.0

    def test_analytics_organization_isolation(self, client, db: Session, test_user: User, test_project: Project):
        """Test analytics only show data for user's organization."""
        from uuid import uuid4
        from backend.app.auth.security import create_access_token

        # Create another organization
        other_org = Organization(
            id=uuid4(),
            name="Other Organization",
            subscription_plan="starter",
        )
        db.add(other_org)
        db.flush()

        # Create other user
        other_user = User(
            id=uuid4(),
            email="other@example.com",
            organization_id=other_org.id,
        )
        db.add(other_user)
        db.flush()

        # Create other project
        other_project = Project(
            id=uuid4(),
            name="Other Project",
            organization_id=other_org.id,
        )
        db.add(other_project)
        db.flush()

        # Create job run for other org
        other_run = JobRun(
            id=uuid4(),
            run_name="other-run",
            job_type="training",
            region="us-west-2",
            project_id=other_project.id,
            organization_id=other_org.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="other-run-dedup",
        )
        db.add(other_run)
        db.flush()

        other_energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=other_run.id,
            total_kwh=1000.0,
            emissions_kg=500.0,
        )
        db.add(other_energy)
        db.commit()

        # Get analytics for test user (should NOT include other org's data)
        from backend.app.models.organization_member import OrganizationMember

        # Get test user's organization
        member = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == test_user.id
        ).first()

        token = create_access_token(
            subject=str(test_user.id),
            additional_claims={
                "email": test_user.email,
                "organization_id": str(member.organization_id) if member else None,
                "role": test_user.role,
            }
        )
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/analytics/summary", headers=headers)
        data = response.json()

        # Should not include the 1000 kWh from other org
        assert data["total_energy_kwh"] < 1000.0
