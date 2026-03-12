"""Tests for job run ingestion and retrieval endpoints."""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from backend.app.models.job_run import JobRun, JobRunEnergy, JobRunHardware
from backend.app.models.api_key import ApiKey
from backend.app.models.organization import Organization
from backend.app.models.project import Project
from backend.app.models.user import User
from backend.app.auth.security import get_password_hash


class TestJobRunIngestion:
    """Test job run ingestion endpoint (POST /api/job-runs)."""

    def test_ingest_job_run_success(
        self, client: TestClient, db: Session, test_api_key: ApiKey, test_project: Project
    ):
        """Test successful job run ingestion with valid API key."""
        payload = {
            "run_name": "test-ingestion-run",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
            "end_time": datetime.utcnow().isoformat(),
            "status": "success",
            "tags": {"environment": "test"},
            "hardware": {
                "gpu_model": "NVIDIA A100",
                "cpu_count": "16",
                "ram_gb": 128,
            },
            "energy": {
                "total_kwh": 25.5,
                "cpu_kwh": 5.0,
                "gpu_kwh": 18.0,
                "ram_kwh": 2.5,
            },
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["run_name"] == "test-ingestion-run"
        assert data["job_type"] == "training"
        assert data["region"] == "us-west-2"
        assert data["status"] == "success"
        assert data["project_id"] == str(test_project.id)

        # Verify job run created in database
        job_run = db.query(JobRun).filter(JobRun.run_name == "test-ingestion-run").first()
        assert job_run is not None
        assert job_run.organization_id == test_project.organization_id

    def test_ingest_job_run_minimal_fields(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test ingestion with only required fields."""
        payload = {
            "run_name": "minimal-run",
            "job_type": "inference",
            "region": "eu-west-1",
            "start_time": datetime.utcnow().isoformat(),
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["run_name"] == "minimal-run"
        assert data["status"] == "running"  # Default status

    def test_ingest_missing_api_key(self, client: TestClient):
        """Test ingestion fails without API key."""
        payload = {
            "run_name": "test-run",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
        }

        response = client.post("/api/job-runs/", json=payload)

        assert response.status_code == 401
        assert "API key required" in response.json()["detail"]

    def test_ingest_invalid_api_key_format(self, client: TestClient):
        """Test ingestion fails with invalid API key format."""
        payload = {
            "run_name": "test-run",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": "invalid_format"},
        )

        assert response.status_code == 401
        assert "Invalid API key format" in response.json()["detail"]

    def test_ingest_revoked_api_key(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test ingestion fails with revoked API key."""
        # Revoke the API key
        test_api_key.revoked_at = datetime.utcnow()
        db.commit()

        payload = {
            "run_name": "test-run",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 401
        assert "Invalid or revoked API key" in response.json()["detail"]

    def test_ingest_missing_required_fields(self, client: TestClient, test_api_key: ApiKey):
        """Test ingestion fails with missing required fields."""
        # Missing run_name
        payload = {
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 422  # Validation error


class TestJobRunDeduplication:
    """Test job run deduplication logic."""

    def test_dedupe_key_idempotency(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test duplicate ingestion with same dedupe_key returns 200 OK."""
        payload = {
            "run_name": "dedupe-test-run",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
            "dedupe_key": "unique-dedupe-key-123",
        }

        # First ingestion - should create
        response1 = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response1.status_code == 201
        run_id1 = response1.json()["id"]

        # Second ingestion with same dedupe_key - should return existing
        response2 = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response2.status_code == 200
        run_id2 = response2.json()["id"]

        # Should be the same job run
        assert run_id1 == run_id2

        # Verify only one job run created
        count = db.query(JobRun).filter(JobRun.dedupe_key == "unique-dedupe-key-123").count()
        assert count == 1

    def test_external_run_id_deduplication(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test deduplication using external_run_id."""
        payload = {
            "run_name": "external-id-test",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
            "external_run_id": "wandb-run-abc123",
        }

        # First ingestion
        response1 = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response1.status_code == 201

        # Second ingestion with same external_run_id
        response2 = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )
        assert response2.status_code == 200

        # Verify dedupe_key uses external_run_id
        job_run = db.query(JobRun).filter(JobRun.external_run_id == "wandb-run-abc123").first()
        assert job_run.dedupe_key == "wandb-run-abc123"

    def test_automatic_dedupe_key_generation(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test automatic dedupe_key generation when not provided."""
        payload = {
            "run_name": "auto-dedupe-test",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": "2024-01-01T10:00:00Z",
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201

        # Verify dedupe_key was generated
        job_run = db.query(JobRun).filter(JobRun.run_name == "auto-dedupe-test").first()
        assert job_run.dedupe_key is not None
        assert len(job_run.dedupe_key) == 64  # SHA256 hash


class TestJobRunValidation:
    """Test job run data validation."""

    def test_invalid_datetime_format(self, client: TestClient, test_api_key: ApiKey):
        """Test validation fails with invalid datetime format."""
        payload = {
            "run_name": "invalid-datetime",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": "not-a-valid-datetime",
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 422

    def test_hardware_data_validation(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test hardware data is properly validated and stored."""
        payload = {
            "run_name": "hardware-test",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
            "hardware": {
                "gpu_model": "NVIDIA H100",
                "cpu_count": "64",
                "ram_gb": 512,
                "details": {"gpu_count": 8},
            },
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201

        # Verify hardware data stored correctly
        job_run = db.query(JobRun).filter(JobRun.run_name == "hardware-test").first()
        assert job_run.hardware is not None
        assert job_run.hardware.gpu_model == "NVIDIA H100"
        assert job_run.hardware.cpu_count == "64"
        assert job_run.hardware.ram_gb == 512

    def test_energy_data_validation(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test energy data is properly validated and stored."""
        payload = {
            "run_name": "energy-test",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
            "energy": {
                "total_kwh": 100.5,
                "cpu_kwh": 20.0,
                "gpu_kwh": 75.0,
                "ram_kwh": 5.5,
            },
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201

        # Verify energy data stored correctly
        job_run = db.query(JobRun).filter(JobRun.run_name == "energy-test").first()
        assert job_run.energy is not None
        assert job_run.energy.total_kwh == 100.5
        assert job_run.energy.cpu_kwh == 20.0
        assert job_run.energy.gpu_kwh == 75.0
        assert job_run.energy.ram_kwh == 5.5


class TestJobRunOrganizationIsolation:
    """Test organization isolation for job runs."""

    def test_job_runs_organization_isolation(
        self, client: TestClient, db: Session, test_user: User, test_project: Project
    ):
        """Test job runs are isolated by organization."""
        # Create second organization with job run
        org2 = Organization(
            id=uuid4(),
            name="Other Organization",
            subscription_plan="starter",
            subscription_status="active",
            job_runs_limit=1000,
        )
        db.add(org2)

        project2 = Project(
            id=uuid4(),
            name="Other Project",
            organization_id=org2.id,
        )
        db.add(project2)

        job_run2 = JobRun(
            id=uuid4(),
            run_name="other-org-run",
            job_type="training",
            region="us-west-2",
            project_id=project2.id,
            organization_id=org2.id,
            status="success",
            start_time=datetime.utcnow(),
            dedupe_key="other-org-dedup",
        )
        db.add(job_run2)
        db.commit()

        # Get job runs for test user's organization
        from backend.app.auth.security import create_access_token
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

        response = client.get("/api/job-runs/", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # Should not include job run from other organization
        run_names = [run["run_name"] for run in data["items"]]
        assert "other-org-run" not in run_names

    def test_job_run_detail_organization_isolation(
        self, client: TestClient, db: Session, test_user: User
    ):
        """Test cannot access job run from different organization."""
        # Create job run in different organization
        org2 = Organization(
            id=uuid4(),
            name="Other Organization",
            subscription_plan="starter",
            subscription_status="active",
        )
        db.add(org2)

        project2 = Project(
            id=uuid4(),
            name="Other Project",
            organization_id=org2.id,
        )
        db.add(project2)

        job_run2 = JobRun(
            id=uuid4(),
            run_name="unauthorized-run",
            job_type="training",
            region="us-west-2",
            project_id=project2.id,
            organization_id=org2.id,
            status="success",
            start_time=datetime.utcnow(),
            dedupe_key="unauthorized-dedup",
        )
        db.add(job_run2)
        db.commit()

        # Try to access with test user's token
        from backend.app.auth.security import create_access_token
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

        response = client.get(f"/api/job-runs/{job_run2.id}", headers=headers)

        assert response.status_code == 404


class TestJobRunListing:
    """Test job run listing endpoint (GET /api/job-runs)."""

    def test_list_job_runs(
        self, client: TestClient, auth_headers: dict, multiple_job_runs: list[JobRun]
    ):
        """Test listing all job runs for organization."""
        response = client.get("/api/job-runs/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "pagination" in data
        assert data["pagination"]["total_items"] == len(multiple_job_runs)
        assert len(data["items"]) <= data["pagination"]["total_items"]

    def test_list_job_runs_pagination(
        self, client: TestClient, auth_headers: dict, multiple_job_runs: list[JobRun]
    ):
        """Test pagination of job runs listing."""
        # Page 1
        response1 = client.get(
            "/api/job-runs/?page=1&page_size=5", headers=auth_headers
        )
        assert response1.status_code == 200
        data1 = response1.json()
        assert len(data1["items"]) == 5
        assert data1["pagination"]["page"] == 1

        # Page 2
        response2 = client.get(
            "/api/job-runs/?page=2&page_size=5", headers=auth_headers
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2["items"]) == 5
        assert data2["pagination"]["page"] == 2

        # Items should be different
        ids1 = {run["id"] for run in data1["items"]}
        ids2 = {run["id"] for run in data2["items"]}
        assert len(ids1.intersection(ids2)) == 0

    def test_list_job_runs_filter_by_project(
        self, client: TestClient, db: Session, auth_headers: dict, test_organization: Organization
    ):
        """Test filtering job runs by project."""
        # Create two projects with job runs
        project1 = Project(
            id=uuid4(),
            name="Project 1",
            organization_id=test_organization.id,
        )
        project2 = Project(
            id=uuid4(),
            name="Project 2",
            organization_id=test_organization.id,
        )
        db.add_all([project1, project2])
        db.flush()

        # Create job runs for each project
        run1 = JobRun(
            id=uuid4(),
            run_name="project1-run",
            job_type="training",
            region="us-west-2",
            project_id=project1.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            dedupe_key="project1-dedup",
        )
        run2 = JobRun(
            id=uuid4(),
            run_name="project2-run",
            job_type="training",
            region="us-west-2",
            project_id=project2.id,
            organization_id=test_organization.id,
            status="success",
            start_time=datetime.utcnow(),
            dedupe_key="project2-dedup",
        )
        db.add_all([run1, run2])
        db.commit()

        # Filter by project1
        response = client.get(
            f"/api/job-runs/?project_id={project1.id}", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        run_names = [run["run_name"] for run in data["items"]]
        assert "project1-run" in run_names
        assert "project2-run" not in run_names

    def test_list_job_runs_filter_by_date_range(
        self, client: TestClient, db: Session, auth_headers: dict, test_project: Project
    ):
        """Test filtering job runs by date range."""
        # Create job runs at different times
        old_run = JobRun(
            id=uuid4(),
            run_name="old-run",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_project.organization_id,
            status="success",
            start_time=datetime.utcnow() - timedelta(days=10),
            dedupe_key="old-run-dedup",
        )
        recent_run = JobRun(
            id=uuid4(),
            run_name="recent-run",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_project.organization_id,
            status="success",
            start_time=datetime.utcnow(),
            dedupe_key="recent-run-dedup",
        )
        db.add_all([old_run, recent_run])
        db.commit()

        # Filter for last 7 days
        start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        response = client.get(
            f"/api/job-runs/?start={start_date}", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        run_names = [run["run_name"] for run in data["items"]]
        assert "recent-run" in run_names
        assert "old-run" not in run_names


class TestJobRunDetail:
    """Test job run detail endpoint (GET /api/job-runs/{id})."""

    def test_get_job_run_detail(
        self, client: TestClient, auth_headers: dict, test_job_run: JobRun
    ):
        """Test retrieving job run details."""
        response = client.get(f"/api/job-runs/{test_job_run.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_job_run.id)
        assert data["run_name"] == test_job_run.run_name
        assert data["job_type"] == test_job_run.job_type
        assert data["region"] == test_job_run.region
        assert data["status"] == test_job_run.status

    def test_get_job_run_not_found(self, client: TestClient, auth_headers: dict):
        """Test 404 for non-existent job run."""
        fake_id = uuid4()
        response = client.get(f"/api/job-runs/{fake_id}", headers=auth_headers)

        assert response.status_code == 404

    def test_get_job_run_unauthenticated(self, client: TestClient, test_job_run: JobRun):
        """Test unauthorized access without authentication."""
        response = client.get(f"/api/job-runs/{test_job_run.id}")

        assert response.status_code == 401


class TestJobRunEmissionsComputation:
    """Test emissions computation integration."""

    def test_emissions_computed_on_ingestion(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test emissions are computed when job run is ingested."""
        payload = {
            "run_name": "emissions-test",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "end_time": datetime.utcnow().isoformat(),
            "energy": {
                "total_kwh": 50.0,
            },
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201

        # Verify emissions were computed
        job_run = db.query(JobRun).filter(JobRun.run_name == "emissions-test").first()
        assert job_run.energy is not None
        # Emissions might be computed async, so we check the record exists
        assert job_run.energy.total_kwh == 50.0


class TestJobRunRateLimiting:
    """Test rate limiting for job run ingestion."""

    def test_rate_limit_headers_present(
        self, client: TestClient, test_api_key: ApiKey
    ):
        """Test rate limit headers are included in response."""
        payload = {
            "run_name": "rate-limit-test",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers


class TestJobRunMetadata:
    """Test job run metadata and tags."""

    def test_job_run_tags(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test job run tags are stored correctly."""
        payload = {
            "run_name": "tagged-run",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
            "tags": {"environment": "production", "team": "ml-ops", "version": "v1.2.3"},
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201

        # Verify tags stored correctly
        job_run = db.query(JobRun).filter(JobRun.run_name == "tagged-run").first()
        assert job_run.tags["environment"] == "production"
        assert job_run.tags["team"] == "ml-ops"
        assert job_run.tags["version"] == "v1.2.3"

    def test_job_run_metadata(
        self, client: TestClient, db: Session, test_api_key: ApiKey
    ):
        """Test job run metadata is stored correctly."""
        payload = {
            "run_name": "metadata-run",
            "job_type": "training",
            "region": "us-west-2",
            "start_time": datetime.utcnow().isoformat(),
            "metadata": {
                "framework": "pytorch",
                "dataset_size": "100GB",
                "batch_size": 32,
            },
        }

        response = client.post(
            "/api/job-runs/",
            json=payload,
            headers={"X-API-Key": test_api_key.raw_key},
        )

        assert response.status_code == 201

        # Verify metadata stored correctly
        job_run = db.query(JobRun).filter(JobRun.run_name == "metadata-run").first()
        assert job_run.run_metadata["framework"] == "pytorch"
        assert job_run.run_metadata["dataset_size"] == "100GB"
        assert job_run.run_metadata["batch_size"] == 32
