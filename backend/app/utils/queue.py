"""Queue helper for RQ."""
import redis
from rq import Queue

from backend.app.core.config import get_settings


settings = get_settings()
redis_conn = redis.from_url(settings.redis_url)
default_queue = Queue("default", connection=redis_conn)
