"""Rate limiting with Redis primary and Postgres fallback."""
from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass
from typing import Optional, Tuple

import redis
from fastapi import HTTPException, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.api_key import ApiKey
from backend.app.auth.context import RequestContext
from backend.app.services.audit_service import audit_log, AuditEvent

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class RateLimitResult:
    limit: int
    remaining: int
    reset_seconds: int
    blocked: bool = False


class RateLimiter:
    def __init__(self):
        self._redis = None
        try:
            self._redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)
            self._redis.ping()
        except Exception:
            self._redis = None
            logger.info("Redis not available, using Postgres rate limit fallback")

    def _window(self, now: dt.datetime, size_sec: int = 60) -> Tuple[dt.datetime, int]:
        ts = int(now.timestamp())
        start = ts - (ts % size_sec)
        return dt.datetime.fromtimestamp(start, tz=dt.timezone.utc), start + size_sec

    def _redis_check(self, key: str, limit: int, burst: int) -> RateLimitResult:
        now = dt.datetime.utcnow()
        window_start, window_end = self._window(now)
        ttl = window_end - int(now.timestamp())
        pipe = self._redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl)
        count, _ = pipe.execute()
        allowed = limit * burst
        remaining = max(0, allowed - int(count))
        reset = ttl
        if count > allowed:
            return RateLimitResult(limit=limit, remaining=0, reset_seconds=reset, blocked=True)
        return RateLimitResult(limit=limit, remaining=remaining, reset_seconds=reset, blocked=False)

    def _pg_check(self, db: Session, key: str, limit: int, burst: int) -> RateLimitResult:
        now = dt.datetime.utcnow()
        window_start, window_end = self._window(now)
        allowed = limit * burst
        # upsert-like behavior; use nested transaction if caller already in a transaction
        try:
            if db.in_transaction():
                ctx_mgr = db.begin_nested()
            else:
                ctx_mgr = db.begin()
            with ctx_mgr:
                row = db.execute(
                    text(
                        """
                        INSERT INTO rate_limit_counters (key, window_start, count, last_updated)
                        VALUES (:key, :ws, 1, now())
                        ON CONFLICT (key) DO UPDATE
                        SET count = rate_limit_counters.count + 1,
                            last_updated = now()
                        RETURNING count
                        """
                    ),
                    {"key": key, "ws": window_start},
                ).scalar()
        except Exception:
            db.rollback()
            raise
        remaining = max(0, allowed - int(row))
        reset = int(window_end - int(now.timestamp()))
        if row > allowed:
            return RateLimitResult(limit=limit, remaining=0, reset_seconds=reset, blocked=True)
        # cleanup old windows occasionally
        try:
            db.execute(text("DELETE FROM rate_limit_counters WHERE window_start < now() - interval '1 day'"))
            db.commit()
        except Exception:
            db.rollback()
        return RateLimitResult(limit=limit, remaining=remaining, reset_seconds=reset, blocked=False)

    def check(self, *, key: str, scope: str, limit: int, burst: int, db: Session, context: RequestContext) -> RateLimitResult:
        if self._redis:
            result = self._redis_check(f"rl:{scope}:{key}", limit, burst)
        else:
            result = self._pg_check(db, f"rl:{scope}:{key}", limit, burst)
        if result.blocked:
            # Abuse tracking for API key
            if context.api_key:
                self._handle_abuse(db, context.api_key, context, scope)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "Retry-After": str(result.reset_seconds),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": str(result.remaining),
                    "X-RateLimit-Reset": str(result.reset_seconds),
                },
            )
        return result

    def _handle_abuse(self, db: Session, api_key: ApiKey, context: RequestContext, scope: str):
        window_minutes = 10
        threshold = 20
        now = dt.datetime.utcnow()
        if self._redis:
            abuse_key = f"abuse:{api_key.id}"
            count = self._redis.incr(abuse_key)
            self._redis.expire(abuse_key, window_minutes * 60)
        else:
            window_start = now - dt.timedelta(minutes=window_minutes)
            try:
                if db.in_transaction():
                    txn = db.begin_nested()
                else:
                    txn = db.begin()
                with txn:
                    count = (
                        db.execute(
                            text(
                                """
                                INSERT INTO rate_limit_counters (key, window_start, count, last_updated)
                                VALUES (:key, :ws, 1, now())
                                ON CONFLICT (key) DO UPDATE
                                SET count = rate_limit_counters.count + 1,
                                    last_updated = now()
                                RETURNING count
                                """
                            ),
                            {"key": f"abuse:{api_key.id}", "ws": window_start},
                        )
                        .scalar()
                    )
            except Exception:
                db.rollback()
                raise
            db.commit()
        if count and int(count) > threshold:
            blocked_until = now + dt.timedelta(minutes=10)
            api_key.blocked_until = blocked_until
            try:
                db.commit()
            except Exception:
                db.rollback()
            audit_log(
                AuditEvent(
                    organization_id=api_key.organization_id,
                    actor_type="system",
                    actor_api_key_id=api_key.id,
                    action="rate_limit.block",
                    status="failure",
                    resource_type="api_key",
                    resource_id=api_key.id,
                    request_id=context.request_id,
                    metadata={"scope": scope, "blocked_until": blocked_until.isoformat()},
                ),
                db,
            )


rate_limiter = RateLimiter()
