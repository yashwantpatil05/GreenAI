"""Structured logging middleware."""
import json
import time
import logging
from datetime import datetime
from fastapi import Request

from backend.app.core.config import get_settings
from backend.app.observability.metrics import request_counter, request_latency

# Use dedicated logger to avoid uvicorn's AccessFormatter expectations
logger = logging.getLogger("greenai.request")
settings = get_settings()


async def logging_middleware(request: Request, call_next):
    start = time.time()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        latency_ms = int((time.time() - start) * 1000)
        status_code = getattr(response, "status_code", 500) if response else 500
        payload = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "level": "info" if response is None or status_code < 400 else "warning",
            "request_id": getattr(request.state, "request_id", None),
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "client_ip": request.client.host if request.client else None,
        }
        if settings.log_json:
            logger.info(json.dumps(payload))
        else:
            logger.info(
                "%s %s %s (%sms) req=%s",
                payload["method"],
                payload["path"],
                payload["status_code"],
                payload["latency_ms"],
                payload["request_id"],
            )
        try:
            request_counter.labels(route=payload["path"], method=payload["method"], status=str(payload["status_code"])).inc()
            request_latency.labels(route=payload["path"], method=payload["method"], status=str(payload["status_code"])).observe(latency_ms)
        except Exception:
            # best effort metrics
            pass
