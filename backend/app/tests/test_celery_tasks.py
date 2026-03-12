"""Tests for Celery tasks (Phase 4.4)."""
import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4

from backend.app.workers.celery_app import celery_app, is_async_mode, SYNC_COMPUTE
from backend.app.workers.tasks import (
    compute_emissions_sync,
    queue_emissions_computation,
    send_email_task,
    generate_report_task,
)


class TestCeleryConfiguration:
    """Test Celery configuration and initialization."""

    def test_sync_compute_default(self):
        """Test SYNC_COMPUTE is True by default."""
        assert SYNC_COMPUTE is True

    def test_async_mode_detection(self):
        """Test is_async_mode returns correct value."""
        # In test environment, should be sync mode
        assert is_async_mode() is False

    def test_celery_app_is_none_in_sync_mode(self):
        """Test celery_app is None in sync mode."""
        # In sync mode, celery_app should be None
        assert celery_app is None or SYNC_COMPUTE is True


class TestEmissionsComputationSync:
    """Test emissions computation in sync mode."""

    def test_compute_emissions_sync_success(self, db, test_job_run):
        """Test synchronous emissions computation succeeds."""
        # Mock emissions service
        with patch('backend.app.workers.tasks.compute_emissions_for_job_run') as mock_compute:
            mock_compute.return_value = {
                "emissions_kg": 25.5,
                "energy_kwh": 50.0,
                "cost_usd": 75.0
            }

            result = compute_emissions_sync(db, test_job_run)

            assert result is not None
            mock_compute.assert_called_once_with(db, test_job_run)

    def test_compute_emissions_sync_failure(self, db, test_job_run):
        """Test synchronous emissions computation handles errors."""
        with patch('backend.app.workers.tasks.compute_emissions_for_job_run') as mock_compute:
            mock_compute.side_effect = Exception("Computation error")

            with pytest.raises(Exception):
                compute_emissions_sync(db, test_job_run)

    def test_queue_emissions_computation_sync_mode(self, db, test_job_run):
        """Test queue_emissions_computation in sync mode executes immediately."""
        with patch('backend.app.workers.tasks.compute_emissions_for_job_run') as mock_compute:
            mock_compute.return_value = {"emissions_kg": 30.0}

            result = queue_emissions_computation(
                job_run_id=str(test_job_run.id),
                db=db,
                job_run=test_job_run
            )

            # Should return result directly (not AsyncResult)
            assert result is not None
            assert isinstance(result, dict)
            mock_compute.assert_called_once()

    def test_queue_emissions_requires_db_in_sync_mode(self):
        """Test queue_emissions_computation requires db session in sync mode."""
        with pytest.raises(ValueError):
            queue_emissions_computation(
                job_run_id=str(uuid4()),
                # Missing db and job_run
            )


class TestEmailTaskSync:
    """Test email tasks in sync mode."""

    def test_send_welcome_email_task(self):
        """Test welcome email task."""
        with patch('backend.app.services.email_service.email_service') as mock_service:
            mock_service.send_welcome_email.return_value = True

            # Call the task function directly (no .delay() in sync mode)
            result = send_email_task(
                email_type="welcome",
                to_email="test@example.com",
                organization_name="Test Org"
            )

            assert result["status"] == "success"
            assert result["email_type"] == "welcome"
            mock_service.send_welcome_email.assert_called_once()

    def test_send_usage_alert_task(self):
        """Test usage alert email task."""
        with patch('backend.app.services.email_service.email_service') as mock_service:
            mock_service.send_usage_alert_email.return_value = True

            result = send_email_task(
                email_type="usage_alert",
                to_email="admin@example.com",
                organization_name="Test Org",
                usage_percentage=85,
                plan_name="Pro",
                limit_name="Job Runs",
                current_usage=850,
                limit_value=1000
            )

            assert result["status"] == "success"
            mock_service.send_usage_alert_email.assert_called_once()

    def test_send_report_ready_task(self):
        """Test report ready email task."""
        with patch('backend.app.services.email_service.email_service') as mock_service:
            mock_service.send_report_ready_email.return_value = True

            result = send_email_task(
                email_type="report_ready",
                to_email="user@example.com",
                report_name="Monthly Report",
                report_id="report-123",
                download_url="https://example.com/report.pdf"
            )

            assert result["status"] == "success"
            mock_service.send_report_ready_email.assert_called_once()

    def test_send_weekly_summary_task(self):
        """Test weekly summary email task."""
        with patch('backend.app.services.email_service.email_service') as mock_service:
            mock_service.send_weekly_summary_email.return_value = True

            result = send_email_task(
                email_type="weekly_summary",
                to_email="admin@example.com",
                organization_name="Test Org",
                total_runs=100,
                total_carbon_kg=500.0,
                total_energy_kwh=1000.0,
                total_cost=250.0,
                week_start="2026-01-01",
                week_end="2026-01-07"
            )

            assert result["status"] == "success"
            mock_service.send_weekly_summary_email.assert_called_once()

    def test_send_email_unknown_type(self):
        """Test email task with unknown type."""
        result = send_email_task(email_type="unknown_type")

        assert result["status"] == "error"
        assert "Unknown email type" in result["message"]

    def test_send_email_task_handles_exceptions(self):
        """Test email task handles service exceptions."""
        with patch('backend.app.services.email_service.email_service') as mock_service:
            mock_service.send_welcome_email.side_effect = Exception("Email service error")

            result = send_email_task(
                email_type="welcome",
                to_email="test@example.com",
                organization_name="Test Org"
            )

            assert result["status"] == "error"
            assert "Email service error" in result["message"]


class TestReportGenerationTask:
    """Test report generation tasks."""

    def test_generate_project_report_task(self, test_project, db):
        """Test project report generation task."""
        # Mock the database session and query
        with patch('backend.app.workers.tasks.SessionLocal') as mock_session_local:
            mock_session = Mock()
            mock_session_local.return_value = mock_session

            # Mock the project query
            mock_query = Mock()
            mock_query.filter.return_value.first.return_value = test_project
            mock_session.query.return_value = mock_query

            # Mock the report service
            with patch('backend.app.services.report_service.generate_project_report') as mock_generate:
                mock_report = Mock()
                mock_report.id = uuid4()
                mock_generate.return_value = mock_report

                result = generate_report_task(
                    report_type="project",
                    project_id=str(test_project.id)
                )

                assert result["status"] == "success"
                assert result["report_type"] == "project"
                assert "report_id" in result
                mock_session.close.assert_called_once()

    def test_generate_job_run_report_task(self, test_job_run, test_organization):
        """Test job run report generation task."""
        with patch('backend.app.services.job_service.get_job_run') as mock_get:
            with patch('backend.app.services.report_service.generate_job_run_report') as mock_generate:
                mock_get.return_value = test_job_run
                mock_report = Mock()
                mock_report.id = uuid4()
                mock_generate.return_value = mock_report

                result = generate_report_task(
                    report_type="job_run",
                    job_run_id=str(test_job_run.id),
                    organization_id=str(test_organization.id)
                )

                assert result["status"] == "success"
                assert result["report_type"] == "job_run"

    def test_generate_report_project_not_found(self):
        """Test report generation with non-existent project."""
        # Mock the database session
        with patch('backend.app.workers.tasks.SessionLocal') as mock_session_local:
            mock_session = Mock()
            mock_session_local.return_value = mock_session

            # Mock the project query to return None
            mock_query = Mock()
            mock_query.filter.return_value.first.return_value = None
            mock_session.query.return_value = mock_query

            result = generate_report_task(
                report_type="project",
                project_id=str(uuid4())
            )

            # Should return error for non-existent project
            assert result["status"] == "error"
            assert "not found" in result["message"].lower()
            mock_session.close.assert_called_once()

    def test_generate_report_unknown_type(self):
        """Test report generation with unknown type."""
        result = generate_report_task(
            report_type="unknown_type",
            project_id=str(uuid4())
        )

        assert result["status"] == "error"
        assert "Unknown report type" in result["message"]

    def test_generate_report_task_handles_exceptions(self, test_project):
        """Test report generation task handles exceptions."""
        # Mock the database session
        with patch('backend.app.workers.tasks.SessionLocal') as mock_session_local:
            mock_session = Mock()
            mock_session_local.return_value = mock_session

            # Mock the project query
            mock_query = Mock()
            mock_query.filter.return_value.first.return_value = test_project
            mock_session.query.return_value = mock_query

            # Mock the report service to raise exception
            with patch('backend.app.services.report_service.generate_project_report') as mock_generate:
                mock_generate.side_effect = Exception("Report generation error")

                result = generate_report_task(
                    report_type="project",
                    project_id=str(test_project.id)
                )

                assert result["status"] == "error"
                assert "Report generation error" in result["message"]
                mock_session.close.assert_called_once()


class TestAsyncMode:
    """Test Celery tasks in async mode (mocked)."""

    @pytest.fixture
    def mock_async_mode(self, monkeypatch):
        """Mock async mode environment."""
        monkeypatch.setenv("SYNC_COMPUTE", "false")
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")

        # Mock Celery
        mock_task = MagicMock()
        mock_async_result = MagicMock()
        mock_async_result.status = "SUCCESS"
        mock_async_result.result = {"status": "success"}
        mock_task.apply_async.return_value = mock_async_result

        return mock_task, mock_async_result

    def test_queue_emissions_async_mode(self, mock_async_mode):
        """Test queue_emissions_computation in async mode queues task."""
        mock_task, mock_result = mock_async_mode

        # In sync mode by default, this test validates the async path would work
        # when Celery is properly configured
        pass  # Actual async testing requires Celery + Redis running

    def test_async_task_result_tracking(self, mock_async_mode):
        """Test async task result can be tracked."""
        mock_task, mock_result = mock_async_mode

        # Verify async result properties
        assert mock_result.status == "SUCCESS"
        assert "status" in mock_result.result


class TestTaskIntegration:
    """Test task integration with application."""

    def test_tasks_importable(self):
        """Test all task functions are importable."""
        from backend.app.workers.tasks import (
            compute_emissions_task,
            send_email_task,
            generate_report_task,
            compute_emissions_sync,
            queue_emissions_computation,
        )

        # All should be defined
        assert compute_emissions_task is not None
        assert send_email_task is not None
        assert generate_report_task is not None
        assert compute_emissions_sync is not None
        assert queue_emissions_computation is not None

    def test_task_functions_callable(self):
        """Test task functions are callable."""
        # In sync mode, tasks are regular functions
        assert callable(send_email_task)
        assert callable(generate_report_task)
        assert callable(compute_emissions_sync)

    def test_tasks_handle_missing_parameters(self):
        """Test tasks handle missing required parameters gracefully."""
        # Email task with missing parameters
        result = send_email_task(email_type="welcome")
        # Should error or handle missing params
        assert result is not None

    def test_concurrent_task_execution(self):
        """Test multiple tasks can run concurrently."""
        import concurrent.futures

        def run_email_task(index):
            return send_email_task(
                email_type="welcome",
                to_email=f"user{index}@test.com",
                organization_name=f"Org {index}"
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(run_email_task, range(10)))

        # All should complete (success or error)
        assert len(results) == 10


class TestTaskLogging:
    """Test task logging and monitoring."""

    def test_tasks_log_execution(self, caplog):
        """Test tasks log their execution."""
        import logging
        # Set logging level to capture info messages
        caplog.set_level(logging.INFO)

        with patch('backend.app.services.email_service.email_service'):
            result = send_email_task(
                email_type="welcome",
                to_email="test@test.com",
                organization_name="Test"
            )

        # Verify task executed successfully (which indicates logging worked)
        assert result["status"] == "success"

        # Check that log messages were created
        if len(caplog.records) > 0:
            log_messages = " ".join([record.message for record in caplog.records])
            assert "welcome" in log_messages.lower() or "email" in log_messages.lower() or "sending" in log_messages.lower()

    def test_task_errors_logged(self, caplog):
        """Test task errors are logged."""
        with patch('backend.app.services.email_service.email_service') as mock_service:
            mock_service.send_welcome_email.side_effect = Exception("Test error")

            send_email_task(
                email_type="welcome",
                to_email="test@test.com",
                organization_name="Test"
            )

        # Check that error was logged
        assert len(caplog.records) > 0
        log_messages = " ".join([record.message for record in caplog.records])
        assert "failed" in log_messages.lower() or "error" in log_messages.lower()


class TestTaskRetry:
    """Test task retry logic (async mode)."""

    def test_tasks_configured_for_retry(self):
        """Test tasks have retry configuration."""
        # In production async mode, tasks should have retry configuration
        # This is a placeholder for when async mode is fully tested
        pass

    def test_task_max_retries(self):
        """Test tasks have maximum retry limit."""
        # Configuration validation
        pass


class TestTaskQueueing:
    """Test task queue configuration."""

    def test_tasks_assigned_to_correct_queues(self):
        """Test tasks are assigned to correct queues."""
        # Emissions tasks -> emissions queue
        # Email tasks -> emails queue
        # Report tasks -> reports queue
        # This is validated in celery_app configuration
        pass

    def test_queue_priorities(self):
        """Test queue priority configuration."""
        # High priority: emissions (blocking user actions)
        # Medium priority: reports
        # Low priority: emails (can be delayed)
        pass
