"""GreenAI SDK — Track carbon footprint of ML jobs in 3 lines.

Quick start:
    import greenai
    greenai.init(api_key="gai_xxx", project_id="proj_xxx")
    with greenai.track("bert-finetuning"):
        model.fit(X_train, y_train)

Auto-config from env vars (set GREENAI_API_KEY and GREENAI_PROJECT_ID):
    import greenai
    with greenai.track("my-run"):
        model.fit(X_train, y_train)
"""
from __future__ import annotations

import functools
import os
from contextlib import contextmanager
from typing import Any, Callable, Dict, Generator, Optional

from .tracker import GreenAITracker

__version__ = "0.1.3"
__all__ = ["init", "track", "track_function", "validate", "GreenAITracker"]

# Module-level default tracker (populated by init())
_default_tracker: Optional[GreenAITracker] = None


def init(
    api_key: Optional[str] = None,
    project_id: Optional[str] = None,
    job_type: str = "training",
    region: Optional[str] = None,
    api_base: Optional[str] = None,
    sample_interval: int = 15,
) -> GreenAITracker:
    """Configure the default tracker. Call once before track().

    Args:
        api_key: Your GreenAI API key (or set GREENAI_API_KEY env var)
        project_id: Your project ID (or set GREENAI_PROJECT_ID env var)
        job_type: 'training', 'inference', or 'data_processing'
        region: Cloud region e.g. 'aws:us-east-1'. Auto-detected if omitted.
        api_base: Override API base URL
        sample_interval: Seconds between power samples (default 15)
    """
    global _default_tracker

    resolved_key = api_key or os.environ.get("GREENAI_API_KEY", "")
    resolved_project = project_id or os.environ.get("GREENAI_PROJECT_ID", "")

    if not resolved_key:
        raise ValueError(
            "API key required. Pass api_key= or set GREENAI_API_KEY env var."
        )
    if not resolved_project:
        raise ValueError(
            "Project ID required. Pass project_id= or set GREENAI_PROJECT_ID env var."
        )

    if not region:
        from .hardware import detect_cloud_region
        region = detect_cloud_region()

    _default_tracker = GreenAITracker(
        api_key=resolved_key,
        project_id=resolved_project,
        job_type=job_type,
        region=region,
        api_base=api_base,
        sample_interval=sample_interval,
    )
    return _default_tracker


@contextmanager
def track(
    run_name: str,
    api_key: Optional[str] = None,
    project_id: Optional[str] = None,
    job_type: str = "training",
    region: Optional[str] = None,
) -> Generator[GreenAITracker, None, None]:
    """Context manager to track a job run.

    Uses the default tracker if init() was called, otherwise creates one
    from env vars or the provided arguments.

    Example:
        with greenai.track("training-run-1"):
            model.fit(X, y)
    """
    global _default_tracker

    if _default_tracker is None:
        _default_tracker = init(
            api_key=api_key,
            project_id=project_id,
            job_type=job_type,
            region=region,
        )

    with _default_tracker.track_run(run_name):
        yield _default_tracker


def track_function(
    api_key: Optional[str] = None,
    project_id: Optional[str] = None,
    job_type: str = "training",
    region: Optional[str] = None,
    run_name: Optional[str] = None,
) -> Callable:
    """Decorator to track a function as a job run.

    Example:
        @greenai.track_function(api_key="gai_xxx", project_id="proj_xxx")
        def train_model():
            model.fit(X, y)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            name = run_name or func.__name__
            with track(name, api_key=api_key, project_id=project_id, job_type=job_type, region=region):
                return func(*args, **kwargs)
        return wrapper
    return decorator


def validate(api_key: Optional[str] = None, project_id: Optional[str] = None) -> Dict[str, Any]:
    """Validate API key and return account info.

    Returns dict with keys: valid, project, organization, plan, job_runs_remaining
    """
    import requests

    resolved_key = api_key or os.environ.get("GREENAI_API_KEY", "")
    if not resolved_key:
        return {"valid": False, "error": "No API key provided"}

    api_base = os.environ.get("GREENAI_API", "http://localhost:8000/api")
    try:
        resp = requests.post(
            f"{api_base}/job-runs/validate",
            headers={"X-API-Key": resolved_key},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
        return {"valid": False, "error": resp.json().get("detail", "Invalid key")}
    except Exception as exc:
        return {"valid": False, "error": str(exc)}
