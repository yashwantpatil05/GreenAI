"""Tests for billing service and subscription management."""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session
from uuid import uuid4

from backend.app.services.billing_service import (
    PLANS,
    get_plans,
    get_plan,
    calculate_overage,
    create_order,
    verify_payment,
    activate_subscription,
    get_usage_stats,
)
from backend.app.models.organization import Organization
from backend.app.models.project import Project
from backend.app.models.job_run import JobRun, JobRunEnergy


class TestSubscriptionPlans:
    """Test subscription plan definitions and retrieval."""

    def test_all_plans_exist(self):
        """Test all expected plans are defined."""
        assert "starter" in PLANS
        assert "pro" in PLANS
        assert "enterprise" in PLANS

    def test_plan_structure(self):
        """Test each plan has required fields."""
        for plan_id, plan in PLANS.items():
            assert "id" in plan
            assert "name" in plan
            assert "price" in plan
            assert "currency" in plan
            assert "job_runs_limit" in plan
            assert "projects_limit" in plan
            assert "users_limit" in plan
            assert "overage_rate" in plan
            assert "features" in plan
            assert isinstance(plan["features"], list)

    def test_get_plan_starter(self):
        """Test retrieving starter plan details."""
        plan = get_plan("starter")

        assert plan is not None
        assert plan["name"] == "Starter"
        assert plan["job_runs_limit"] == 10000
        assert plan["projects_limit"] == 3
        assert plan["users_limit"] == 2
        assert plan["price"] == 299900  # ₹2,999 in paise

    def test_get_plan_pro(self):
        """Test retrieving pro plan details."""
        plan = get_plan("pro")

        assert plan is not None
        assert plan["name"] == "Pro"
        assert plan["job_runs_limit"] == 100000
        assert plan["projects_limit"] == 10
        assert plan["users_limit"] == 10
        assert plan["price"] == 999900  # ₹9,999 in paise

    def test_get_plan_enterprise(self):
        """Test retrieving enterprise plan details."""
        plan = get_plan("enterprise")

        assert plan is not None
        assert plan["name"] == "Enterprise"
        assert plan["job_runs_limit"] == -1  # Unlimited
        assert plan["price"] == 0  # Custom pricing

    def test_get_plan_invalid(self):
        """Test retrieving non-existent plan returns None."""
        plan = get_plan("invalid-plan")
        assert plan is None

    def test_get_plans_list(self):
        """Test getting all plans as a list."""
        plans = get_plans()
        assert isinstance(plans, list)
        assert len(plans) == 3
        plan_ids = [p["id"] for p in plans]
        assert "starter" in plan_ids
        assert "pro" in plan_ids
        assert "enterprise" in plan_ids


class TestOverageCalculation:
    """Test overage calculation for exceeded limits."""

    def test_overage_calculation_exceeded(
        self, db: Session, test_organization: Organization, test_project: Project
    ):
        """Test overage calculation when limits are exceeded."""
        # Set organization to starter plan with 10,000 limit
        test_organization.subscription_plan = "starter"
        test_organization.job_runs_limit = 10000
        db.commit()

        # Create 10,012 job runs (exceeds by 12)
        for i in range(10012):
            job_run = JobRun(
                id=uuid4(),
                run_name=f"overage-run-{i:05d}",
                job_type="training",
                region="us-west-2",
                project_id=test_project.id,
                organization_id=test_organization.id,
                status="success",
                start_time=datetime.utcnow() - timedelta(hours=i % 100),
                dedupe_key=f"overage-{i:05d}",
            )
            db.add(job_run)
            if i % 1000 == 0:
                db.flush()  # Flush periodically for performance
        db.commit()

        # Calculate overage
        overage = calculate_overage(test_organization.id, db)

        assert overage["exceeded"] is True
        assert overage["current_usage"] == 10012
        assert overage["limit"] == 10000
        assert overage["overage_runs"] == 12  # Exceeds by 12 runs
        # Starter overage rate: ₹0.50 per run (50 paise)
        # 12 runs * 50 paise = 600 paise
        assert overage["overage_amount"] == 600

    def test_overage_calculation_within_limit(
        self, db: Session, test_organization: Organization, test_project: Project
    ):
        """Test overage calculation when within limits."""
        # Set organization to starter plan
        test_organization.subscription_plan = "starter"
        test_organization.job_runs_limit = 10000
        db.commit()

        # Create 5 job runs (well within limit)
        for i in range(5):
            job_run = JobRun(
                id=uuid4(),
                run_name=f"within-limit-run-{i}",
                job_type="training",
                region="us-west-2",
                project_id=test_project.id,
                organization_id=test_organization.id,
                status="success",
                start_time=datetime.utcnow(),
                dedupe_key=f"within-{i}",
            )
            db.add(job_run)
        db.commit()

        # Calculate overage
        overage = calculate_overage(test_organization.id, db)

        assert overage["exceeded"] is False
        assert overage["current_usage"] == 5
        assert overage["overage_runs"] == 0
        assert overage["overage_amount"] == 0

    def test_overage_calculation_unlimited(
        self, db: Session, test_organization: Organization, test_project: Project
    ):
        """Test overage calculation for enterprise (unlimited) plan."""
        # Set organization to enterprise plan
        test_organization.subscription_plan = "enterprise"
        test_organization.job_runs_limit = -1  # Unlimited
        db.commit()

        # Create 100 job runs
        for i in range(100):
            job_run = JobRun(
                id=uuid4(),
                run_name=f"enterprise-run-{i:03d}",
                job_type="training",
                region="us-west-2",
                project_id=test_project.id,
                organization_id=test_organization.id,
                status="success",
                start_time=datetime.utcnow(),
                dedupe_key=f"enterprise-{i:03d}",
            )
            db.add(job_run)
        db.commit()

        # Calculate overage
        overage = calculate_overage(test_organization.id, db)

        # Should never exceed with unlimited plan
        assert overage["exceeded"] is False
        assert overage["overage_runs"] == 0
        assert overage["overage_amount"] == 0


class TestUsageStats:
    """Test usage statistics retrieval."""

    def test_get_usage_stats_basic(
        self, db: Session, test_organization: Organization, test_project: Project
    ):
        """Test retrieving basic usage statistics."""
        # Set organization plan
        test_organization.subscription_plan = "starter"
        test_organization.job_runs_limit = 10000
        test_organization.projects_limit = 3
        test_organization.users_limit = 2
        db.commit()

        # Create some job runs
        for i in range(5):
            job_run = JobRun(
                id=uuid4(),
                run_name=f"stats-run-{i}",
                job_type="training",
                region="us-west-2",
                project_id=test_project.id,
                organization_id=test_organization.id,
                status="success",
                start_time=datetime.utcnow(),
                dedupe_key=f"stats-{i}",
            )
            db.add(job_run)
            db.flush()

            # Add energy data
            energy = JobRunEnergy(
                id=uuid4(),
                job_run_id=job_run.id,
                total_kwh=10.0 + i,
                emissions_kg=5.0 + i,
            )
            db.add(energy)
        db.commit()

        # Get usage stats
        stats = get_usage_stats(test_organization.id, db)

        assert stats["current_period"]["job_runs"] == 5
        assert stats["limits"]["job_runs_limit"] == 10000
        assert stats["limits"]["projects_limit"] == 3
        assert stats["limits"]["users_limit"] == 2
        assert stats["usage_percentage"]["job_runs"] == pytest.approx(0.05, rel=0.01)  # 5/10000 = 0.05%

    def test_get_usage_stats_with_energy(
        self, db: Session, test_organization: Organization, test_project: Project
    ):
        """Test usage stats include energy and emissions totals."""
        # Create job runs with energy data
        total_energy = 0.0
        total_emissions = 0.0

        for i in range(3):
            job_run = JobRun(
                id=uuid4(),
                run_name=f"energy-stats-run-{i}",
                job_type="training",
                region="us-west-2",
                project_id=test_project.id,
                organization_id=test_organization.id,
                status="success",
                start_time=datetime.utcnow(),
                dedupe_key=f"energy-stats-{i}",
            )
            db.add(job_run)
            db.flush()

            energy_val = 20.0 + i * 5
            emissions_val = 10.0 + i * 2
            total_energy += energy_val
            total_emissions += emissions_val

            energy = JobRunEnergy(
                id=uuid4(),
                job_run_id=job_run.id,
                total_kwh=energy_val,
                emissions_kg=emissions_val,
            )
            db.add(energy)
        db.commit()

        stats = get_usage_stats(test_organization.id, db)

        assert stats["current_period"]["total_energy_kwh"] == pytest.approx(total_energy, rel=0.01)
        assert stats["current_period"]["total_emissions_kg"] == pytest.approx(total_emissions, rel=0.01)


class TestRazorpayIntegration:
    """Test Razorpay payment integration (mocked)."""

    @pytest.fixture
    def mock_razorpay_client(self, monkeypatch):
        """Mock Razorpay client for testing."""
        mock_client = MagicMock()
        mock_client.order.create.return_value = {
            "id": "order_test123",
            "amount": 299900,
            "currency": "INR",
            "status": "created",
        }
        mock_client.utility.verify_payment_signature.return_value = True

        monkeypatch.setattr(
            "backend.app.services.billing_service.razorpay_client",
            mock_client
        )
        return mock_client

    def test_create_order_starter(
        self, db: Session, test_organization: Organization, mock_razorpay_client
    ):
        """Test creating Razorpay order for starter plan."""
        order = create_order(test_organization.id, "starter", db)

        assert order["order_id"] == "order_test123"
        assert order["amount"] == 299900
        assert order["currency"] == "INR"
        assert order["plan"]["id"] == "starter"

        # Verify Razorpay API was called correctly
        mock_razorpay_client.order.create.assert_called_once()

    def test_create_order_invalid_plan(
        self, db: Session, test_organization: Organization, mock_razorpay_client
    ):
        """Test creating order fails for invalid plan."""
        with pytest.raises(ValueError, match="Invalid plan"):
            create_order(test_organization.id, "invalid-plan", db)

    def test_create_order_enterprise_fails(
        self, db: Session, test_organization: Organization, mock_razorpay_client
    ):
        """Test enterprise plan requires custom pricing."""
        with pytest.raises(ValueError, match="Enterprise plan requires custom pricing"):
            create_order(test_organization.id, "enterprise", db)

    def test_verify_payment_success(
        self, db: Session, test_organization: Organization, mock_razorpay_client
    ):
        """Test successful payment verification."""
        result = verify_payment(
            razorpay_order_id="order_123",
            razorpay_payment_id="pay_123",
            razorpay_signature="sig_123",
        )

        assert result is True
        mock_razorpay_client.utility.verify_payment_signature.assert_called_once()


class TestSubscriptionActivation:
    """Test subscription activation."""

    def test_activate_subscription_starter(
        self, db: Session, test_organization: Organization
    ):
        """Test activating starter subscription."""
        # Set initial state to inactive
        test_organization.subscription_status = "trial"
        test_organization.subscription_plan = None
        db.commit()

        # Activate subscription
        activate_subscription(
            organization_id=test_organization.id,
            plan_id="starter",
            payment_id="pay_test123",
            db=db,
        )

        # Verify activation
        db.refresh(test_organization)
        assert test_organization.subscription_plan == "starter"
        assert test_organization.subscription_status == "active"
        assert test_organization.job_runs_limit == 10000
        assert test_organization.projects_limit == 3
        assert test_organization.users_limit == 2
        assert test_organization.razorpay_payment_id == "pay_test123"
        assert test_organization.subscription_started_at is not None

    def test_activate_subscription_pro(
        self, db: Session, test_organization: Organization
    ):
        """Test activating pro subscription."""
        activate_subscription(
            organization_id=test_organization.id,
            plan_id="pro",
            payment_id="pay_pro_123",
            db=db,
        )

        db.refresh(test_organization)
        assert test_organization.subscription_plan == "pro"
        assert test_organization.job_runs_limit == 100000
        assert test_organization.projects_limit == 10
        assert test_organization.users_limit == 10

    def test_activate_subscription_invalid_plan(
        self, db: Session, test_organization: Organization
    ):
        """Test activation fails for invalid plan."""
        with pytest.raises(ValueError, match="Invalid plan"):
            activate_subscription(
                organization_id=test_organization.id,
                plan_id="invalid-plan",
                payment_id="pay_123",
                db=db,
            )


class TestBillingEdgeCases:
    """Test edge cases in billing logic."""

    def test_overage_calculation_no_plan(
        self, db: Session, test_organization: Organization
    ):
        """Test overage calculation when organization has no plan."""
        # Remove subscription plan
        test_organization.subscription_plan = None
        test_organization.job_runs_limit = None
        db.commit()

        overage = calculate_overage(test_organization.id, db)

        # Should handle gracefully
        assert "exceeded" in overage
        assert "current_usage" in overage

    def test_usage_stats_no_job_runs(
        self, db: Session, test_organization: Organization
    ):
        """Test usage stats with no job runs."""
        stats = get_usage_stats(test_organization.id, db)

        assert stats["current_period"]["job_runs"] == 0
        assert stats["current_period"]["total_energy_kwh"] == 0.0
        assert stats["current_period"]["total_emissions_kg"] == 0.0
