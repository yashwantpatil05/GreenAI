"""Telemetry sender with simple offline cache."""
import json
import os
from typing import Dict, Any, List
import requests

CACHE_PATH = os.path.expanduser("~/.greenai/cache.json")


def _load_cache() -> List[Dict[str, Any]]:
    if not os.path.exists(CACHE_PATH):
        return []
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_cache(items: List[Dict[str, Any]]) -> None:
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f)


def flush_cache(api_base: str, api_key: str) -> None:
    """Send cached payloads."""
    cached = _load_cache()
    remaining = []
    for item in cached:
        try:
            send_payload(api_base, api_key, item, cache_on_fail=False)
        except Exception:
            remaining.append(item)
    _save_cache(remaining)


def send_payload(api_base: str, api_key: str, payload: Dict[str, Any], cache_on_fail: bool = True) -> None:
    """Send telemetry payload to backend with optional caching."""
    headers = {"Content-Type": "application/json", "X-API-Key": api_key}
    try:
        requests.post(f"{api_base}/job-runs", headers=headers, data=json.dumps(payload), timeout=10)
    except Exception:
        if cache_on_fail:
            cached = _load_cache()
            cached.append(payload)
            _save_cache(cached)
