"""Shared metrics registry and counters."""
from prometheus_client import CollectorRegistry, Counter, Histogram

registry = CollectorRegistry()
request_counter = Counter("greenai_request_count", "request count", ["route", "method", "status"], registry=registry)
request_latency = Histogram("greenai_request_latency_ms", "request latency", ["route", "method", "status"], registry=registry)
