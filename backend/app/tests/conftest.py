"""Test configuration and fixtures."""
import os
import pytest
from typing import Generator
from uuid import uuid4, UUID
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Set test environment variables before imports
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["EMAIL_CONSOLE_MODE"] = "true"
os.environ["GCS_LOCAL_MODE"] = "true"
os.environ["SYNC_COMPUTE"] = "true"

from backend.app.core.database import Base, get_db
from backend.app.main import app
# Import all models to ensure tables are created
import backend.app.models  # noqa: F401
from backend.app.models.user import User
from backend.app.models.organization import Organization
from backend.app.models.organization_member import OrganizationMember
from backend.app.models.project import Project
from backend.app.models.job_run import JobRun, JobRunHardware, JobRunEnergy, JobRunCost
from backend.app.models.api_key import ApiKey
from backend.app.auth.security import create_access_token
from backend.app.auth.security import get_password_hash


# Test database engine
TEST_DATABASE_URL = "sqlite:///:memory:"

# Register UUID type handler for SQLite
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String, TypeDecorator
import uuid as uuid_module

class GUID(TypeDecorator):
    """Platform-independent GUID type for testing."""
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid_module.UUID):
            return str(value)
        return str(uuid_module.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid_module.UUID):
            return uuid_module.UUID(value)
        return value

# Monkey-patch PostgreSQL UUID to use GUID for SQLite tests
from sqlalchemy import event
from sqlalchemy.dialects import sqlite

@event.listens_for(Base.metadata, "before_create")
def receive_before_create(target, connection, **kw):
    """Replace PostgreSQL UUID with String for SQLite and remove server defaults."""
    if connection.dialect.name == 'sqlite':
        for table in target.tables.values():
            for column in table.columns:
                # Replace PostgreSQL UUID type with String
                if isinstance(column.type, PG_UUID):
                    column.type = String(36)
                # Remove PostgreSQL-specific server defaults
                if column.server_default is not None:
                    server_default_text = str(column.server_default.arg)
                    if any(func in server_default_text for func in ['gen_random_uuid()', 'now()', 'CURRENT_TIMESTAMP', '::json', '::jsonb']):
                        column.server_default = None

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Register UUID adapter for SQLite
import sqlite3

def adapt_uuid(value):
    """Convert UUID to string for SQLite."""
    return str(value)

def convert_uuid(value):
    """Convert string back to UUID from SQLite."""
    return uuid_module.UUID(value.decode() if isinstance(value, bytes) else value)

sqlite3.register_adapter(uuid_module.UUID, adapt_uuid)
sqlite3.register_converter("UUID", convert_uuid)
sqlite3.register_converter("VARCHAR", convert_uuid)  # For our string-based UUIDs

# Register date_trunc function for SQLite (emulates PostgreSQL date_trunc)
def sqlite_date_trunc(precision, date_value):
    """Emulate PostgreSQL date_trunc for SQLite."""
    if not date_value:
        return None

    # Parse date string if needed
    if isinstance(date_value, str):
        try:
            from dateutil import parser
            date_obj = parser.parse(date_value)
        except:
            return date_value
    else:
        date_obj = date_value

    if precision == 'day':
        return date_obj.strftime('%Y-%m-%d')
    elif precision == 'month':
        return date_obj.strftime('%Y-%m-01')
    elif precision == 'year':
        return date_obj.strftime('%Y-01-01')
    elif precision == 'hour':
        return date_obj.strftime('%Y-%m-%d %H:00:00')
    else:
        return str(date_obj)

# Create a custom SQLite connection with date_trunc function
from sqlalchemy import event
from sqlalchemy.pool import Pool

@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Register custom functions when SQLite connection is created."""
    if hasattr(dbapi_conn, 'create_function'):  # SQLite only
        dbapi_conn.create_function("date_trunc", 2, sqlite_date_trunc)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function", autouse=True)
def patch_session_local(monkeypatch):
    """Patch SessionLocal to use test database for all services."""
    # Override SessionLocal to return test sessions
    from backend.app.core import database
    monkeypatch.setattr(database, "SessionLocal", TestSessionLocal)

@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a test database session."""
    # Create tables
    Base.metadata.create_all(bind=test_engine)

    # Create session
    session = TestSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# Factory fixtures for test data
@pytest.fixture
def test_organization(db: Session) -> Organization:
    """Create a test organization."""
    org = Organization(
        id=uuid4(),
        name="Test Organization",
        subscription_plan="starter",
        subscription_status="active",
        job_runs_limit=1000,
        projects_limit=10,
        users_limit=5,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture
def test_user(db: Session, test_organization: Organization) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        hashed_password=get_password_hash("testpassword"),
        organization_id=test_organization.id,
        role="owner",
    )
    db.add(user)
    db.flush()

    # Create organization membership (required for authentication)
    membership = OrganizationMember(
        id=uuid4(),
        user_id=user.id,
        organization_id=test_organization.id,
        role="owner",
    )
    db.add(membership)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_project(db: Session, test_organization: Organization) -> Project:
    """Create a test project."""
    project = Project(
        id=uuid4(),
        name="Test Project",
        description="Test project description",
        organization_id=test_organization.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def test_api_key(db: Session, test_project: Project, test_user: User, test_organization: Organization) -> ApiKey:
    """Create a test API key."""
    raw_key = f"gai_test_{uuid4().hex[:32]}"
    api_key = ApiKey(
        id=uuid4(),
        name="Test API Key",
        hashed_key=get_password_hash(raw_key),
        key_prefix=raw_key[:8],
        organization_id=test_organization.id,
        project_id=test_project.id,
        user_id=test_user.id,
        active=True,
        scopes=["ingest"],
    )
    api_key.raw_key = raw_key  # Store for testing
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key


@pytest.fixture
def test_job_run(db: Session, test_project: Project, test_organization: Organization) -> JobRun:
    """Create a test job run with related data."""
    job_run = JobRun(
        id=uuid4(),
        run_name="test-run-001",
        job_type="training",
        region="us-west-2",
        project_id=test_project.id,
        organization_id=test_organization.id,
        status="success",
        start_time=datetime.utcnow() - timedelta(hours=1),
        end_time=datetime.utcnow(),
        dedupe_key="test-run-001-dedup",
    )
    db.add(job_run)
    db.flush()

    # Add hardware info
    hardware = JobRunHardware(
        id=uuid4(),
        job_run_id=job_run.id,
        gpu_model="NVIDIA A100",
        cpu_count="32",
        ram_gb=256,
    )
    db.add(hardware)

    # Add energy info
    energy = JobRunEnergy(
        id=uuid4(),
        job_run_id=job_run.id,
        total_kwh=45.5,
        cpu_kwh=12.5,
        gpu_kwh=30.0,
        ram_kwh=3.0,
        emissions_kg=21.47,
    )
    db.add(energy)

    # Add cost info
    cost = JobRunCost(
        id=uuid4(),
        job_run_id=job_run.id,
        amount_usd=139.25,
        currency="USD",
        breakdown={"compute_cost": 120.50, "energy_cost": 18.75},
    )
    db.add(cost)

    db.commit()
    db.refresh(job_run)
    return job_run


@pytest.fixture
def auth_headers(test_user: User, test_organization: Organization) -> dict:
    """Generate authentication headers for test user."""
    # Use user.id as JWT subject and include org/role to avoid DB lookup
    token = create_access_token(
        subject=str(test_user.id),
        additional_claims={
            "email": test_user.email,
            "organization_id": str(test_organization.id),
            "role": test_user.role,
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def multiple_job_runs(db: Session, test_project: Project, test_organization: Organization) -> list[JobRun]:
    """Create multiple job runs for testing analytics."""
    job_runs = []

    for i in range(10):
        job_run = JobRun(
            id=uuid4(),
            run_name=f"test-run-{i:03d}",
            job_type="training",
            region="us-west-2",
            project_id=test_project.id,
            organization_id=test_organization.id,
            status="success" if i % 2 == 0 else "failed",
            start_time=datetime.utcnow() - timedelta(hours=i+1),
            end_time=datetime.utcnow() - timedelta(hours=i),
            dedupe_key=f"test-run-{i:03d}-dedup",
        )
        db.add(job_run)
        db.flush()

        # Add energy data
        energy = JobRunEnergy(
            id=uuid4(),
            job_run_id=job_run.id,
            total_kwh=10.0 + i,
            cpu_kwh=3.0 + i * 0.3,
            gpu_kwh=6.0 + i * 0.6,
            ram_kwh=1.0 + i * 0.1,
            emissions_kg=5.0 + i,
        )
        db.add(energy)

        # Add cost data
        cost = JobRunCost(
            id=uuid4(),
            job_run_id=job_run.id,
            amount_usd=50.0 + i * 10,
            currency="USD",
            breakdown={"compute_cost": 40.0 + i * 8, "energy_cost": 10.0 + i * 2},
        )
        db.add(cost)

        job_runs.append(job_run)

    db.commit()
    return job_runs


# Mock fixtures for external services
@pytest.fixture
def mock_sendgrid(monkeypatch):
    """Mock SendGrid email service."""
    class MockSendGrid:
        def __init__(self, api_key):
            self.api_key = api_key

        def send(self, message):
            # Mock successful response
            class MockResponse:
                status_code = 202
            return MockResponse()

    monkeypatch.setattr("sendgrid.SendGridAPIClient", MockSendGrid)
    return MockSendGrid


@pytest.fixture
def mock_gcs(monkeypatch):
    """Mock Google Cloud Storage."""
    class MockBlob:
        def __init__(self, name):
            self.name = name

        def upload_from_filename(self, filename, content_type=None):
            pass

        def delete(self):
            pass

        def exists(self):
            return True

        def generate_signed_url(self, version=None, expiration=None, method=None):
            return f"https://storage.googleapis.com/test-bucket/{self.name}?signed=true"

    class MockBucket:
        def __init__(self, name):
            self.name = name

        def blob(self, name):
            return MockBlob(name)

    class MockStorageClient:
        @classmethod
        def from_service_account_json(cls, path, project=None):
            return cls()

        def bucket(self, name):
            return MockBucket(name)

    monkeypatch.setattr("google.cloud.storage.Client", MockStorageClient)
    return MockStorageClient


@pytest.fixture
def mock_celery(monkeypatch):
    """Mock Celery task execution."""
    class MockAsyncResult:
        def __init__(self, task_id):
            self.task_id = task_id
            self.status = "SUCCESS"
            self.result = {"status": "success"}

    class MockTask:
        def apply_async(self, args=None, kwargs=None):
            return MockAsyncResult(str(uuid4()))

    return MockTask


@pytest.fixture
def mock_redis(monkeypatch):
    """Mock Redis client."""
    class MockRedis:
        def __init__(self):
            self.data = {}

        def get(self, key):
            return self.data.get(key)

        def set(self, key, value, ex=None):
            self.data[key] = value
            return True

        def delete(self, key):
            if key in self.data:
                del self.data[key]
            return True

        def ping(self):
            return True

    return MockRedis()


# Utility functions for tests
def create_test_job_run_data() -> dict:
    """Create test job run ingestion payload."""
    return {
        "run_name": f"test-run-{uuid4().hex[:8]}",
        "run_id": f"run-{uuid4()}",
        "status": "success",
        "start_time": datetime.utcnow().isoformat(),
        "end_time": datetime.utcnow().isoformat(),
        "duration_seconds": 3600,
        "hardware": {
            "gpu_model": "NVIDIA A100",
            "gpu_count": 2,
            "cpu_count": "32",
            "ram_gb": 256,
            "region": "us-west-2",
        },
        "tags": ["test", "ci"],
    }


def assert_response_success(response, expected_status=200):
    """Assert API response is successful."""
    assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}: {response.text}"


def assert_response_error(response, expected_status=400):
    """Assert API response is an error."""
    assert response.status_code == expected_status
    assert "detail" in response.json()
