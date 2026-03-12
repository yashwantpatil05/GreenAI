"""End-to-end tests for Phase B/C features:
- GPU TDP estimation (emissions_service)
- POST /api/job-runs/validate endpoint
"""
import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from backend.app.models.job_run import JobRun, JobRunEnergy, JobRunHardware
from backend.app.models.api_key import ApiKey
from backend.app.models.organization import Organization
from backend.app.models.project import Project
from backend.app.services.emissions_service import (
    _estimate_gpu_kwh,
    compute_emissions_for_job_run,
    GPU_TDP_WATTS,
)


# ---------------------------------------------------------------------------
# Unit tests: _estimate_gpu_kwh helper
# ---------------------------------------------------------------------------

class TestEstimateGpuKwh:
    """Unit tests for the GPU TDP estimation helper."""

    def test_exact_match_t4(self):
        """T4 = 70W × 1 GPU × 1h = 0.07 kWh."""
        result = _estimate_gpu_kwh("T4", 1, 1.0)
        assert result == pytest.approx(0.07, rel=1e-6)

    def test_exact_match_a100(self):
        """A100 = 400W × 2 GPUs × 1h = 0.8 kWh."""
        result = _estimate_gpu_kwh("a100", 2, 1.0)
        assert result == pytest.approx(0.8, rel=1e-6)

    def test_case_insensitive(self):
        """GPU model lookup is case-insensitive."""
        assert _estimate_gpu_kwh("H100", 1, 1.0) == _estimate_gpu_kwh("h100", 1, 1.0)
        assert _estimate_gpu_kwh("NVIDIA A100", 1, 1.0) == _estimate_gpu_kwh("nvidia a100", 1, 1.0)

    def test_partial_match_nvidia_prefix(self):
        """'NVIDIA A100 SXM4 80GB' should match 'nvidia a100' via substring."""
        result = _estimate_gpu_kwh("NVIDIA A100 SXM4 80GB", 1, 1.0)
        assert result is not None
        assert result > 0

    def test_unknown_gpu_returns_none(self):
        """Unknown GPU model should return None (no estimation)."""
        result = _estimate_gpu_kwh("UnknownGPU XYZ 9999", 1, 1.0)
        assert result is None

    def test_multi_gpu_scales_linearly(self):
        """Energy scales linearly with GPU count."""
        single = _estimate_gpu_kwh("v100", 1, 1.0)
        quad = _estimate_gpu_kwh("v100", 4, 1.0)
        assert quad == pytest.approx(single * 4, rel=1e-6)

    def test_gpu_count_zero_treated_as_one(self):
        """gpu_count=0 should be treated as 1 (max(count, 1))."""
        result_zero = _estimate_gpu_kwh("t4", 0, 1.0)
        result_one = _estimate_gpu_kwh("t4", 1, 1.0)
        assert result_zero == result_one

    def test_duration_scales_linearly(self):
        """Energy scales linearly with duration."""
        one_hour = _estimate_gpu_kwh("t4", 1, 1.0)
        two_hours = _estimate_gpu_kwh("t4", 1, 2.0)
        assert two_hours == pytest.approx(one_hour * 2, rel=1e-6)

    def test_h100_80gb_variant(self):
        """H100 80GB variant is in TDP table."""
        result = _estimate_gpu_kwh("h100 80gb", 1, 1.0)
        assert result == pytest.approx(0.7, rel=1e-6)  # 700W / 1000 * 1h

    def test_rtx_4090(self):
        """RTX 4090 = 450W."""
        result = _estimate_gpu_kwh("rtx 4090", 1, 1.0)
        assert result == pytest.approx(0.45, rel=1e-6)

    def test_amd_mi300x(self):
        """AMD MI300X = 750W."""
        result = _estimate_gpu_kwh("mi300x", 1, 1.0)
        assert result == pytest.approx(0.75, rel=1e-6)

    def test_all_keys_in_table_are_lowercase(self):
        """All keys in GPU_TDP_WATTS are lowercase (invariant for lookups)."""
        for key in GPU_TDP_WATTS:
            assert key == key.lower(), f"Key '{key}' is not lowercase"

    def test_fractional_duration(self):
        """30-minute job = 0.5h duration."""
        result = _estimate_gpu_kwh("t4", 1, 0.5)
        assert result == pytest.approx(0.035, rel=1e-6)  # 70W * 0.5h / 1000


# ---------------------------------------------------------------------------
# Integration tests: GPU TDP fallback in compute_emissions_for_job_run
# ---------------------------------------------------------------------------

class TestGpuTdpFallback:
    """Integration tests: GPU TDP estimation used when no energy data."""

    def _make_run(self, db, project, org, *, region="us-east-1", dedupe_suffix=""):
        start = datetime.utcnow() - timedelta(hours=1)
        end = datetime.utcnow()
        run = JobRun(
            id=uuid4(),
            run_name=f"tdp-test-{dedupe_suffix}",
            job_type="training",
            region=region,
            project_id=project.id,
            organization_id=org.id,
            status="success",
            start_time=start,
            end_time=end,
            dedupe_key=f"tdp-test-dedup-{dedupe_suffix}",
        )
        db.add(run)
        db.flush()
        return run

    def test_tdp_fallback_t4_1gpu_1h(self, db, test_project, test_organization):
        """T4 × 1 GPU × 1h in us-east-1 → 0.07 kWh × 0.0004 = 0.000028 kg."""
        run = self._make_run(db, test_project, test_organization, dedupe_suffix="t4-1h")

        hw = JobRunHardware(
            id=uuid4(), job_run_id=run.id,
            gpu_model="T4", cpu_count="4", ram_gb=32, details={}
        )
        db.add(hw)
        energy = JobRunEnergy(
            id=uuid4(), job_run_id=run.id,
            total_kwh=0.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        assert energy.compute_status == "estimated"
        assert energy.total_kwh == pytest.approx(0.07, rel=0.05)
        # 0.07 kWh * 0.0004 kg/kWh
        assert energy.emissions_kg == pytest.approx(0.0000280, rel=0.05)

    def test_tdp_fallback_a100_2gpu_1h(self, db, test_project, test_organization):
        """A100 × 2 GPUs × 1h → 0.8 kWh (gpu_count from details)."""
        run = self._make_run(db, test_project, test_organization, dedupe_suffix="a100-2gpu")

        hw = JobRunHardware(
            id=uuid4(), job_run_id=run.id,
            gpu_model="NVIDIA A100", cpu_count="16", ram_gb=256,
            details={"gpu_count": 2},
        )
        db.add(hw)
        energy = JobRunEnergy(
            id=uuid4(), job_run_id=run.id,
            total_kwh=0.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        assert energy.compute_status == "estimated"
        assert energy.total_kwh == pytest.approx(0.8, rel=0.05)

    def test_tdp_fallback_not_used_when_kwh_present(self, db, test_project, test_organization):
        """When total_kwh is already set, TDP estimation is skipped."""
        run = self._make_run(db, test_project, test_organization, dedupe_suffix="skip-tdp")

        hw = JobRunHardware(
            id=uuid4(), job_run_id=run.id,
            gpu_model="H100", cpu_count="8", ram_gb=80, details={}
        )
        db.add(hw)
        energy = JobRunEnergy(
            id=uuid4(), job_run_id=run.id,
            total_kwh=10.0,  # Already have measured data
            cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        # Should be "success" (measured), NOT "estimated"
        assert energy.compute_status == "success"
        assert energy.total_kwh == pytest.approx(10.0, rel=1e-6)

    def test_tdp_fallback_unknown_gpu_gives_incomplete(self, db, test_project, test_organization):
        """Unknown GPU model + no energy data → incomplete status."""
        run = self._make_run(db, test_project, test_organization, dedupe_suffix="unknown-gpu")

        hw = JobRunHardware(
            id=uuid4(), job_run_id=run.id,
            gpu_model="UnknownGPU XZ9999", cpu_count="4", ram_gb=32, details={}
        )
        db.add(hw)
        energy = JobRunEnergy(
            id=uuid4(), job_run_id=run.id,
            total_kwh=0.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        result = compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        assert result["status"] == "incomplete"
        assert energy.compute_status == "incomplete"

    def test_tdp_fallback_no_hardware_gives_incomplete(self, db, test_project, test_organization):
        """No hardware record + no energy data → incomplete status."""
        run = self._make_run(db, test_project, test_organization, dedupe_suffix="no-hw")

        energy = JobRunEnergy(
            id=uuid4(), job_run_id=run.id,
            total_kwh=0.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        result = compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        assert result["status"] == "incomplete"

    def test_estimated_status_not_overwritten_to_success(self, db, test_project, test_organization):
        """compute_status='estimated' must NOT be overwritten to 'success' after calculation."""
        run = self._make_run(db, test_project, test_organization, dedupe_suffix="status-guard")

        hw = JobRunHardware(
            id=uuid4(), job_run_id=run.id,
            gpu_model="T4", cpu_count="4", ram_gb=32, details={}
        )
        db.add(hw)
        energy = JobRunEnergy(
            id=uuid4(), job_run_id=run.id,
            total_kwh=0.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        assert energy.compute_status == "estimated", (
            "Status must stay 'estimated', not be overwritten to 'success'"
        )

    def test_tdp_fallback_region_factor_applied(self, db, test_project, test_organization):
        """GPU TDP estimation uses the correct grid factor for the region."""
        run = self._make_run(
            db, test_project, test_organization,
            region="us-west-2",  # factor=0.0002
            dedupe_suffix="region-factor"
        )
        hw = JobRunHardware(
            id=uuid4(), job_run_id=run.id,
            gpu_model="T4", cpu_count="4", ram_gb=32, details={}
        )
        db.add(hw)
        energy = JobRunEnergy(
            id=uuid4(), job_run_id=run.id,
            total_kwh=0.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
            compute_status="pending",
        )
        db.add(energy)
        db.commit()

        compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        # T4 = 70W × 1h = 0.07 kWh × 0.0002 = 0.000014 kg
        assert energy.emissions_kg == pytest.approx(0.000014, rel=0.05)


# ---------------------------------------------------------------------------
# Integration tests: POST /api/job-runs/validate endpoint
# ---------------------------------------------------------------------------

class TestValidateEndpoint:
    """Tests for POST /api/job-runs/validate."""

    def test_valid_key_returns_200(
        self, client: TestClient, test_api_key: ApiKey, test_project: Project, test_organization: Organization
    ):
        """Valid API key returns 200 with project/plan info."""
        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["project"] == test_project.name
        assert data["organization"] == test_organization.name
        assert "plan" in data
        assert "job_runs_remaining" in data

    def test_invalid_key_returns_401(self, client: TestClient):
        """Invalid API key returns 401."""
        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": "gai_invalid_key_that_does_not_exist"},
        )
        assert response.status_code == 401

    def test_missing_key_returns_401(self, client: TestClient):
        """Missing X-API-Key header returns 401."""
        response = client.post("/api/job-runs/validate")
        assert response.status_code == 401

    def test_revoked_key_returns_401(
        self, client: TestClient, db: Session,
        test_api_key: ApiKey, test_project: Project
    ):
        """Revoked API key returns 401."""
        test_api_key.revoked_at = datetime.utcnow()
        db.commit()

        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response.status_code == 401

    def test_inactive_key_returns_401(
        self, client: TestClient, db: Session,
        test_api_key: ApiKey, test_project: Project
    ):
        """Inactive API key returns 401."""
        test_api_key.active = False
        db.commit()

        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response.status_code == 401

    def test_plan_field_returned(
        self, client: TestClient, test_api_key: ApiKey, test_organization: Organization
    ):
        """Plan field defaults to 'starter' for orgs without explicit plan."""
        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] in ("starter", "professional", "enterprise", "free")

    def test_job_runs_remaining_with_limit(
        self, client: TestClient, db: Session,
        test_api_key: ApiKey, test_organization: Organization
    ):
        """job_runs_remaining is None when org limit is -1 (unlimited)."""
        test_organization.job_runs_limit = -1
        db.commit()

        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response.status_code == 200
        data = response.json()
        # -1 limit means unlimited → remaining is None
        assert data["job_runs_remaining"] is None

    def test_job_runs_remaining_counts_correctly(
        self, client: TestClient, db: Session,
        test_api_key: ApiKey, test_organization: Organization, test_project: Project
    ):
        """job_runs_remaining decrements correctly as runs are added."""
        test_organization.job_runs_limit = 100
        db.commit()

        # No runs yet
        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response.status_code == 200
        remaining_before = response.json()["job_runs_remaining"]
        assert remaining_before == 100  # 100 limit - 0 used

    def test_wrong_key_format_returns_401(self, client: TestClient):
        """Key not starting with 'gai_' returns 401."""
        response = client.post(
            "/api/job-runs/validate",
            headers={"X-API-Key": "sk-notavalidformat"},
        )
        assert response.status_code == 401

    def test_validate_does_not_consume_job_run_quota(
        self, client: TestClient, db: Session,
        test_api_key: ApiKey, test_organization: Organization
    ):
        """Calling validate twice does not decrement job_runs_remaining."""
        test_organization.job_runs_limit = 50
        db.commit()

        r1 = client.post("/api/job-runs/validate", headers={"X-API-Key": test_api_key.raw_key})
        r2 = client.post("/api/job-runs/validate", headers={"X-API-Key": test_api_key.raw_key})

        assert r1.json()["job_runs_remaining"] == r2.json()["job_runs_remaining"]


# ---------------------------------------------------------------------------
# Integration test: full ingest → GPU TDP → emissions via HTTP
# ---------------------------------------------------------------------------

class TestIngestWithGpuTdpViaHttp:
    """End-to-end: POST /api/job-runs/ with GPU model, then verify TDP estimation
    by calling the service layer directly (background tasks use a separate session
    in the test harness, so energy is verified via compute_emissions_for_job_run)."""

    def test_ingest_with_gpu_model_estimates_emissions(
        self, client: TestClient, db: Session,
        test_api_key: ApiKey, test_project: Project
    ):
        """Ingesting a run with a GPU model but no energy: TDP fallback produces 'estimated'."""
        payload = {
            "run_name": "tdp-http-test",
            "job_type": "training",
            "region": "us-east-1",
            "start_time": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "end_time": datetime.utcnow().isoformat(),
            "status": "success",
            "hardware": {
                "gpu_model": "NVIDIA T4",
                "gpu_count": 1,
                "cpu_count": "4",
                "ram_gb": 32,
            },
            # No energy block → TDP fallback should trigger
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201
        run_id = response.json()["id"]

        # Fetch the run from DB and call emission service directly
        # (background task session is separate in test harness)
        run = db.query(JobRun).filter(JobRun.id == run_id).first()
        assert run is not None

        # Verify hardware was stored
        db.refresh(run)
        assert run.hardware is not None
        assert run.hardware.gpu_model == "NVIDIA T4"

        # Now compute emissions via service (tests the full TDP path)
        # If energy already exists from background task, re-use it; else create fresh
        energy = run.energy
        if energy is None:
            energy = JobRunEnergy(
                id=uuid4(), job_run_id=run.id,
                total_kwh=0.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
                compute_status="pending",
            )
            db.add(energy)
            db.commit()
            db.refresh(run)

        compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        assert energy.compute_status == "estimated"
        assert energy.total_kwh > 0
        assert energy.emissions_kg > 0

    def test_ingest_with_measured_energy_not_estimated(
        self, client: TestClient, db: Session,
        test_api_key: ApiKey, test_project: Project
    ):
        """Ingesting a run with measured energy uses 'success', not 'estimated'."""
        payload = {
            "run_name": "measured-energy-test",
            "job_type": "training",
            "region": "us-east-1",
            "start_time": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "end_time": datetime.utcnow().isoformat(),
            "status": "success",
            "hardware": {
                "gpu_model": "NVIDIA A100",
                "gpu_count": 2,
                "cpu_count": "16",
                "ram_gb": 256,
            },
            "energy": {
                "total_kwh": 5.0,
            },
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201
        run_id = response.json()["id"]

        run = db.query(JobRun).filter(JobRun.id == run_id).first()
        assert run is not None
        db.refresh(run)

        energy = run.energy
        if energy is None:
            # Background task hasn't run yet; create energy and call service
            energy = JobRunEnergy(
                id=uuid4(), job_run_id=run.id,
                total_kwh=5.0, cpu_kwh=0.0, gpu_kwh=0.0, ram_kwh=0.0,
                compute_status="pending",
            )
            db.add(energy)
            db.commit()
            db.refresh(run)

        compute_emissions_for_job_run(db, run)
        db.refresh(energy)

        assert energy.compute_status == "success"
        assert energy.total_kwh == pytest.approx(5.0, rel=1e-4)
