"""IP-based rate limiting middleware for authentication endpoints."""
import logging
from typing import Callable
from datetime import datetime, timedelta, timezone

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.core.config import get_settings


logger = logging.getLogger(__name__)
settings = get_settings()


# In-memory store for rate limiting (production should use Redis)
# Format: {ip_address: {endpoint: [(timestamp, count), ...]}}
_rate_limit_store: dict[str, dict[str, list[tuple[datetime, int]]]] = {}


class IPRateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limit requests by IP address for sensitive endpoints.

    Protects authentication endpoints from brute force attacks by limiting
    the number of requests per IP address within a time window.
    """

    # Endpoints to protect with their limits
    PROTECTED_ENDPOINTS = {
        "/api/auth/login": {"limit": 10, "window_minutes": 15},
        "/api/auth/token": {"limit": 10, "window_minutes": 15},
        "/api/auth/signup": {"limit": 5, "window_minutes": 15},
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check rate limit before processing request."""
        # Check if this endpoint is protected
        path = request.url.path
        if path not in self.PROTECTED_ENDPOINTS:
            # Not a protected endpoint, proceed normally
            return await call_next(request)

        # Get client IP address
        client_ip = self._get_client_ip(request)
        if not client_ip:
            logger.warning("Could not determine client IP, allowing request")
            return await call_next(request)

        # Check rate limit
        limit_config = self.PROTECTED_ENDPOINTS[path]
        is_allowed, retry_after = self._check_rate_limit(
            client_ip=client_ip,
            endpoint=path,
            limit=limit_config["limit"],
            window_minutes=limit_config["window_minutes"]
        )

        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on {path}. "
                f"Retry after {retry_after} seconds"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "retry_after": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )

        # Rate limit OK, proceed with request
        return await call_next(request)

    def _get_client_ip(self, request: Request) -> str | None:
        """Extract client IP from request headers.

        In production behind GCP Cloud Run, the client IP is in X-Forwarded-For.
        For local development, use the client.host directly.
        """
        # Check X-Forwarded-For header (GCP Cloud Run, nginx, etc.)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
            # The first one is the original client
            return forwarded_for.split(",")[0].strip()

        # Check X-Real-IP header (alternative proxy header)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

        # Fall back to direct connection IP
        if request.client:
            return request.client.host

        return None

    def _check_rate_limit(
        self,
        client_ip: str,
        endpoint: str,
        limit: int,
        window_minutes: int
    ) -> tuple[bool, int]:
        """Check if the IP has exceeded the rate limit.

        Args:
            client_ip: Client IP address
            endpoint: Endpoint path (e.g., "/api/auth/login")
            limit: Maximum number of requests allowed
            window_minutes: Time window in minutes

        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=window_minutes)

        # Initialize storage for this IP if needed
        if client_ip not in _rate_limit_store:
            _rate_limit_store[client_ip] = {}

        if endpoint not in _rate_limit_store[client_ip]:
            _rate_limit_store[client_ip][endpoint] = []

        # Clean up old entries outside the window
        _rate_limit_store[client_ip][endpoint] = [
            (ts, count) for ts, count in _rate_limit_store[client_ip][endpoint]
            if ts > window_start
        ]

        # Count requests in current window
        request_count = sum(
            count for ts, count in _rate_limit_store[client_ip][endpoint]
        )

        if request_count >= limit:
            # Rate limit exceeded
            # Calculate retry_after based on oldest request in window
            if _rate_limit_store[client_ip][endpoint]:
                oldest_ts = _rate_limit_store[client_ip][endpoint][0][0]
                retry_after = int((oldest_ts + timedelta(minutes=window_minutes) - now).total_seconds())
                retry_after = max(1, retry_after)  # At least 1 second
            else:
                retry_after = window_minutes * 60

            return False, retry_after

        # Increment counter
        _rate_limit_store[client_ip][endpoint].append((now, 1))

        return True, 0

    @classmethod
    def cleanup_old_entries(cls) -> None:
        """Cleanup old entries from the in-memory store.

        Should be called periodically (e.g., every hour) to prevent memory leaks.
        In production, Redis with TTL would handle this automatically.
        """
        now = datetime.now(timezone.utc)
        max_window = max(config["window_minutes"] for config in cls.PROTECTED_ENDPOINTS.values())
        cutoff_time = now - timedelta(minutes=max_window * 2)

        # Remove old entries
        for ip in list(_rate_limit_store.keys()):
            for endpoint in list(_rate_limit_store[ip].keys()):
                _rate_limit_store[ip][endpoint] = [
                    (ts, count) for ts, count in _rate_limit_store[ip][endpoint]
                    if ts > cutoff_time
                ]

                # Remove endpoint if no entries
                if not _rate_limit_store[ip][endpoint]:
                    del _rate_limit_store[ip][endpoint]

            # Remove IP if no endpoints
            if not _rate_limit_store[ip]:
                del _rate_limit_store[ip]

        logger.debug(f"Cleaned up rate limit store. Current size: {len(_rate_limit_store)} IPs")
