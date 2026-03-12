"""Scikit-learn wrapper for GreenAI tracking."""
from __future__ import annotations

import os
from typing import Any, Optional


def track_fit(
    estimator: Any,
    api_key: Optional[str] = None,
    project_id: Optional[str] = None,
    run_name: Optional[str] = None,
    region: Optional[str] = None,
) -> Any:
    """Wrap a scikit-learn estimator to track its fit() method.

    Usage:
        from greenai.integrations.sklearn import track_fit
        from sklearn.ensemble import RandomForestClassifier

        model = RandomForestClassifier()
        tracked_model = track_fit(model, api_key="gai_xxx", project_id="proj_xxx")
        tracked_model.fit(X_train, y_train)
    """
    resolved_key = api_key or os.environ.get("GREENAI_API_KEY", "")
    resolved_project = project_id or os.environ.get("GREENAI_PROJECT_ID", "")
    name = run_name or f"{type(estimator).__name__}-fit"

    original_fit = estimator.fit

    def tracked_fit(*args: Any, **kwargs: Any) -> Any:
        import greenai_sdk as greenai
        with greenai.track(name, api_key=resolved_key, project_id=resolved_project, region=region):
            return original_fit(*args, **kwargs)

    estimator.fit = tracked_fit
    return estimator
