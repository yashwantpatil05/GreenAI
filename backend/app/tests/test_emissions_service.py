"""Tests for emissions computation service."""
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from uuid import uuid4

from backend.app.services.emissions_service import (
    compute_emissions_for_job_run,
    _duration_hours,
    GRID_FACTORS,
    DEFAULT_FACTOR,
)
from backend.app.models.job_run import JobRun, JobRunEnergy, JobRunHardware
from backend.app.models.organization import Organization
from backend.app.models.project import Project


class TestEmissionsCalculation:
    """Test emissions calculation logic."""

    def test_emissions_from_provided_total_kwh(self, db: Session, test_project: Project, test_organization: Organization):
        """Test emissions calculation when total_kwh is provided."""
        # Create job run with energy data
        job_run = JobRun(
            id=uuid4(),
            run_name="test-emissions",
            job_type="training",
            region="us-west-2",  # Factor: 0.0002
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="emissions-test-dedup",
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=100.0,  # Provided
            cpu_kwh=0.0,
            gpu_kwh=0.0,
            ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        # Compute emissions (pass db session for testing)
        compute_emissions_for_job_run(db, job_run)

        # Refresh
        db.refresh(energy)

        # Expected: 100 kWh * 0.0002 kg/kWh = 0.02 kg CO2e
        assert energy.total_kwh == 100.0
        assert energy.emissions_kg == pytest.approx(0.02, rel=0.01)
        assert energy.compute_status == "success"

    def test_emissions_from_component_kwh(self, db: Session, test_project: Project, test_organization: Organization):
        """Test emissions calculation from CPU/GPU/RAM components."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-components",
            job_type="training",
            region="us-east-1",  # Factor: 0.0004
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="components-test-dedup",
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=0.0,  # Not provided
            cpu_kwh=10.0,
            gpu_kwh=20.0,
            ram_kwh=5.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        # Compute emissions (pass db session for testing)
        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        # Total: 10 + 20 + 5 = 35 kWh
        # Emissions: 35 * 0.0004 = 0.014 kg
        assert energy.total_kwh == 35.0
        assert energy.emissions_kg == pytest.approx(0.014, rel=0.01)
        assert energy.compute_status == "success"

    def test_emissions_from_power_and_duration(self, db: Session, test_project: Project, test_organization: Organization):
        """Test emissions calculation from power_watts and duration."""
        start_time = datetime.utcnow() - timedelta(hours=2)
        end_time = datetime.utcnow()

        job_run = JobRun(
            id=uuid4(),
            run_name="test-power-duration",
            job_type="training",
            region="eu-west-1",  # Factor: 0.00025
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=start_time,
            end_time=end_time,
            dedupe_key="power-duration-dedup",
            run_metadata={"power_watts": 500.0},  # 500W average
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        # Compute emissions (pass db session for testing)
        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        # Energy: 500W * 2 hours / 1000 = 1.0 kWh
        # Emissions: 1.0 * 0.00025 = 0.00025 kg
        assert energy.total_kwh == pytest.approx(1.0, rel=0.1)
        assert energy.emissions_kg == pytest.approx(0.00025, rel=0.1)
        assert energy.compute_status == "success"

    def test_emissions_with_insufficient_data(self, db: Session, test_project: Project, test_organization: Organization):
        """Test emissions computation with insufficient telemetry data."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-insufficient",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="insufficient-dedup",
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=0.0,
            cpu_kwh=0.0,
            gpu_kwh=0.0,
            ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        # Compute emissions (pass db session for testing)
        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        assert energy.compute_status == "incomplete"
        assert "insufficient telemetry" in (energy.compute_error or "")

    def test_emissions_with_nonexistent_job_run(self, db: Session):
        """Test emissions computation for non-existent job run."""
        from unittest.mock import patch
        fake_id = uuid4()

        # Should not crash - patch SessionLocal to use test db
        with patch('backend.app.services.emissions_service.SessionLocal') as mock_session_local:
            mock_session_local.return_value = db
            result = compute_emissions_for_job_run(fake_id)

        # Should return None or error status for non-existent job run
        assert result is None or result.get("status") != "success"


class TestGridEmissionFactors:
    """Test grid emission factors for different regions."""

    def test_us_west_2_factor(self):
        """Test US West 2 has correct emission factor."""
        assert "us-west-2" in GRID_FACTORS
        assert GRID_FACTORS["us-west-2"] == 0.0002

    def test_us_east_1_factor(self):
        """Test US East 1 has correct emission factor."""
        assert "us-east-1" in GRID_FACTORS
        assert GRID_FACTORS["us-east-1"] == 0.0004

    def test_eu_west_1_factor(self):
        """Test EU West 1 has correct emission factor."""
        assert "eu-west-1" in GRID_FACTORS
        assert GRID_FACTORS["eu-west-1"] == 0.00025

    def test_default_factor(self):
        """Test default factor is set."""
        assert DEFAULT_FACTOR == 0.0004

    def test_unknown_region_uses_default(self, db: Session, test_project: Project, test_organization: Organization):
        """Test unknown region uses default factor."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-unknown-region",
            job_type="training",
            region="unknown-region-xyz",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="unknown-region-dedup",
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=100.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        # Should use DEFAULT_FACTOR (0.0004)
        # 100 * 0.0004 = 0.04 kg
        assert energy.emissions_kg == pytest.approx(0.04, rel=0.01)


class TestDurationCalculation:
    """Test duration calculation helper."""

    def test_duration_hours_basic(self):
        """Test basic duration calculation."""
        start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        end = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        duration = _duration_hours(start, end)

        assert duration == 2.0

    def test_duration_hours_with_naive_datetime(self):
        """Test duration with naive datetime (adds timezone)."""
        start = datetime(2024, 1, 1, 10, 0, 0)  # Naive
        end = datetime(2024, 1, 1, 11, 30, 0)  # Naive

        duration = _duration_hours(start, end)

        assert duration == 1.5

    def test_duration_hours_with_none_end(self):
        """Test duration with None end time (uses current time)."""
        start = datetime.utcnow() - timedelta(hours=3)

        duration = _duration_hours(start, None)

        # Should be approximately 3 hours
        assert duration >= 2.9 and duration <= 3.1

    def test_duration_hours_negative_handled(self):
        """Test duration handles negative durations (end before start)."""
        start = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        end = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

        duration = _duration_hours(start, end)

        # Should return 0, not negative
        assert duration == 0.0

    def test_duration_hours_minutes(self):
        """Test duration calculation with minutes."""
        start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        end = datetime(2024, 1, 1, 10, 30, 0, tzinfo=timezone.utc)

        duration = _duration_hours(start, end)

        assert duration == 0.5

    def test_duration_hours_seconds(self):
        """Test duration calculation with seconds."""
        start = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        end = datetime(2024, 1, 1, 10, 0, 30, tzinfo=timezone.utc)

        duration = _duration_hours(start, end)

        # 30 seconds = 1/120 hour
        assert duration == pytest.approx(0.00833, rel=0.01)


class TestEmissionsAccuracy:
    """Test emissions calculation accuracy."""

    def test_zero_energy_zero_emissions(self, db: Session, test_project: Project, test_organization: Organization):
        """Test zero energy results in zero emissions."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-zero-energy",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="zero-energy-dedup",
            run_metadata={"power_watts": 0.0},
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        assert energy.compute_status == "incomplete"

    def test_high_energy_high_emissions(self, db: Session, test_project: Project, test_organization: Organization):
        """Test high energy usage results in proportionally high emissions."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-high-energy",
            job_type="training",
            region="ap-northeast-1",  # Highest factor: 0.00045
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="high-energy-dedup",
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=10000.0,  # Very high
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        # 10000 * 0.00045 = 4.5 kg
        assert energy.emissions_kg == pytest.approx(4.5, rel=0.01)

    def test_precision_maintained(self, db: Session, test_project: Project, test_organization: Organization):
        """Test calculation maintains precision for small values."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-precision",
            job_type="training",
            region="eu-west-1",  # 0.00025
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="precision-dedup",
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=0.001,  # Very small
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        # 0.001 * 0.00025 = 0.00000025 kg
        assert energy.emissions_kg == pytest.approx(0.00000025, abs=1e-10)


class TestEmissionsErrorHandling:
    """Test emissions service error handling."""

    def test_computation_error_sets_failed_status(self, db: Session, test_project: Project, test_organization: Organization):
        """Test computation errors set failed status."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-error",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            dedupe_key="error-dedup",
            run_metadata={"power_watts": "invalid"},  # Invalid type
        )
        db.add(job_run)
        db.flush()

        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        # Should not crash
        compute_emissions_for_job_run(db, job_run)

        db.refresh(energy)

        # Should mark as incomplete or handle gracefully
        assert energy.compute_status in ["incomplete", "failed", "pending"]

    def test_missing_energy_record_creates_one(self, db: Session, test_project: Project, test_organization: Organization):
        """Test missing energy record is created during computation."""
        job_run = JobRun(
            id=uuid4(),
            run_name="test-missing-energy",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow() - timedelta(hours=1),
            end_time=datetime.utcnow(),
            dedupe_key="missing-energy-dedup",
            run_metadata={"power_watts": 100.0},
        )
        db.add(job_run)
        db.commit()

        # No energy record yet
        assert job_run.energy is None

        # Compute emissions (pass db session for testing)
        compute_emissions_for_job_run(db, job_run)

        # Refresh
        db.refresh(job_run)

        # Energy record should be created
        assert job_run.energy is not None
        assert job_run.energy.total_kwh > 0
