"""Celery application configuration for async task processing."""
import os
from celery import Celery
import logging

logger = logging.getLogger(__name__)

# Sync compute mode (set to False to use Celery workers)
SYNC_COMPUTE = os.getenv("SYNC_COMPUTE", "true").lower() == "true"

# Redis configuration (placeholders - user will add later)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Celery app instance
celery_app = None

if not SYNC_COMPUTE:
    try:
        # Initialize Celery only if not in sync mode
        celery_app = Celery(
            "greenai",
            broker=CELERY_BROKER_URL,
            backend=CELERY_RESULT_BACKEND,
            include=["backend.app.workers.tasks"]
        )

        # Celery configuration
        celery_app.conf.update(
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
            timezone="UTC",
            enable_utc=True,
            task_track_started=True,
            task_acks_late=True,
            worker_prefetch_multiplier=1,
            task_routes={
                "backend.app.workers.tasks.compute_emissions_task": {"queue": "emissions"},
                "backend.app.workers.tasks.send_email_task": {"queue": "emails"},
                "backend.app.workers.tasks.generate_report_task": {"queue": "reports"},
            },
            task_time_limit=300,  # 5 minutes max per task
            task_soft_time_limit=240,  # 4 minutes soft limit
        )

        logger.info(f"✅ Celery initialized. Broker: {CELERY_BROKER_URL}")
    except Exception as e:
        logger.warning(f"⚠️  Failed to initialize Celery: {e}. Using sync mode.")
        SYNC_COMPUTE = True
        celery_app = None
else:
    logger.info("📍 Sync compute mode enabled (SYNC_COMPUTE=true)")


def is_async_mode() -> bool:
    """Check if async worker mode is enabled."""
    return not SYNC_COMPUTE and celery_app is not None
