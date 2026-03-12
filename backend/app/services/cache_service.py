"""Cache service with Redis support and in-memory fallback."""
import json
import logging
from datetime import timedelta
from functools import lru_cache
from typing import Any, Optional

import redis
from redis.exceptions import ConnectionError, RedisError

from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CacheService:
    """Cache service with Redis primary and in-memory LRU fallback."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.redis_available = False
        self._memory_cache = {}
        self._memory_cache_ttl = {}
        self._initialize_redis()

    def _initialize_redis(self):
        """Initialize Redis connection if available."""
        redis_url = getattr(settings, "redis_url", None)
        if not redis_url:
            logger.warning("Redis URL not configured, using in-memory cache only")
            return

        try:
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True,
                health_check_interval=30,
            )
            # Test connection
            self.redis_client.ping()
            self.redis_available = True
            logger.info("Redis cache initialized successfully")
        except (ConnectionError, RedisError) as e:
            logger.warning(f"Redis unavailable, falling back to in-memory cache: {e}")
            self.redis_client = None
            self.redis_available = False

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        try:
            if self.redis_available and self.redis_client:
                value = self.redis_client.get(key)
                if value:
                    try:
                        return json.loads(value)
                    except json.JSONDecodeError:
                        return value
                return None
        except (ConnectionError, RedisError) as e:
            logger.warning(f"Redis get failed for key {key}, falling back to memory: {e}")
            self.redis_available = False

        # Fallback to in-memory cache
        return self._memory_cache.get(key)

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """Set value in cache with optional TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Time to live in seconds (optional)

        Returns:
            True if successful
        """
        try:
            if self.redis_available and self.redis_client:
                serialized = json.dumps(value) if not isinstance(value, str) else value
                if ttl_seconds:
                    self.redis_client.setex(key, ttl_seconds, serialized)
                else:
                    self.redis_client.set(key, serialized)
                return True
        except (ConnectionError, RedisError, TypeError) as e:
            logger.warning(f"Redis set failed for key {key}, falling back to memory: {e}")
            self.redis_available = False

        # Fallback to in-memory cache (limited to 1000 items)
        if len(self._memory_cache) >= 1000:
            # Evict oldest entries
            keys_to_delete = list(self._memory_cache.keys())[:100]
            for k in keys_to_delete:
                del self._memory_cache[k]
                self._memory_cache_ttl.pop(k, None)

        self._memory_cache[key] = value
        if ttl_seconds:
            import time
            self._memory_cache_ttl[key] = time.time() + ttl_seconds
        return True

    def delete(self, key: str) -> bool:
        """Delete key from cache.

        Args:
            key: Cache key to delete

        Returns:
            True if deleted
        """
        try:
            if self.redis_available and self.redis_client:
                self.redis_client.delete(key)
        except (ConnectionError, RedisError) as e:
            logger.warning(f"Redis delete failed for key {key}: {e}")

        # Also delete from memory cache
        self._memory_cache.pop(key, None)
        self._memory_cache_ttl.pop(key, None)
        return True

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern.

        Args:
            pattern: Key pattern (e.g., "analytics:*")

        Returns:
            Number of keys deleted
        """
        deleted_count = 0
        try:
            if self.redis_available and self.redis_client:
                keys = self.redis_client.keys(pattern)
                if keys:
                    deleted_count = self.redis_client.delete(*keys)
        except (ConnectionError, RedisError) as e:
            logger.warning(f"Redis delete_pattern failed for pattern {pattern}: {e}")

        # Also delete from memory cache
        import fnmatch
        keys_to_delete = [
            k for k in self._memory_cache.keys()
            if fnmatch.fnmatch(k, pattern)
        ]
        for key in keys_to_delete:
            del self._memory_cache[key]
            self._memory_cache_ttl.pop(key, None)
            deleted_count += 1

        return deleted_count

    def clear_all(self) -> bool:
        """Clear all cache entries.

        Returns:
            True if successful
        """
        try:
            if self.redis_available and self.redis_client:
                self.redis_client.flushdb()
        except (ConnectionError, RedisError) as e:
            logger.warning(f"Redis flushdb failed: {e}")

        self._memory_cache.clear()
        self._memory_cache_ttl.clear()
        return True

    # Cache key helpers
    @staticmethod
    def analytics_summary_key(org_id: str) -> str:
        """Generate cache key for analytics summary."""
        return f"analytics:summary:{org_id}"

    @staticmethod
    def analytics_trends_key(org_id: str, project_id: Optional[str] = None) -> str:
        """Generate cache key for analytics trends."""
        if project_id:
            return f"analytics:trends:{org_id}:{project_id}"
        return f"analytics:trends:{org_id}"

    @staticmethod
    def billing_plans_key() -> str:
        """Generate cache key for billing plans."""
        return "billing:plans"

    @staticmethod
    def org_usage_key(org_id: str) -> str:
        """Generate cache key for organization usage stats."""
        return f"org:usage:{org_id}"

    @staticmethod
    def invalidate_org_analytics(cache: "CacheService", org_id: str):
        """Invalidate all analytics cache for an organization."""
        cache.delete_pattern(f"analytics:*:{org_id}*")

    @staticmethod
    def invalidate_org_usage(cache: "CacheService", org_id: str):
        """Invalidate organization usage cache."""
        cache.delete(CacheService.org_usage_key(org_id))


# Singleton instance
_cache_service: Optional[CacheService] = None


def get_cache() -> CacheService:
    """Get or create cache service singleton."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
