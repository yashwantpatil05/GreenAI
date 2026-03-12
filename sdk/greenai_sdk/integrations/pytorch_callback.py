"""PyTorch Lightning / plain PyTorch callback for GreenAI tracking."""
from __future__ import annotations

import os
from typing import Any, Optional


class GreenAICallback:
    """Callback that tracks carbon footprint during PyTorch training.

    Usage with PyTorch Lightning:
        from greenai.integrations.pytorch import GreenAICallback
        trainer = pl.Trainer(callbacks=[GreenAICallback(api_key="gai_xxx", project_id="proj_xxx")])
        trainer.fit(model)

    Usage with plain training loop:
        cb = GreenAICallback(api_key="gai_xxx", project_id="proj_xxx")
        cb.on_train_begin()
        for epoch in range(epochs):
            train_one_epoch(model)
            cb.on_epoch_end(epoch, {"loss": loss})
        cb.on_train_end()
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        project_id: Optional[str] = None,
        run_name: str = "pytorch-training",
        region: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("GREENAI_API_KEY", "")
        self.project_id = project_id or os.environ.get("GREENAI_PROJECT_ID", "")
        self.run_name = run_name
        self.region = region
        self._tracker = None

    def on_train_begin(self, logs: Any = None) -> None:
        """Start tracking at training start."""
        import greenai_sdk as greenai
        greenai.init(
            api_key=self.api_key,
            project_id=self.project_id,
            job_type="training",
            region=self.region,
        )
        self._tracker = greenai._default_tracker
        self._tracker.start(self.run_name)

    def on_train_end(self, logs: Any = None) -> None:
        """Stop tracking at training end."""
        if self._tracker:
            self._tracker.stop()
            self._tracker = None

    def on_epoch_end(self, epoch: int, logs: Any = None) -> None:
        """Called at end of each epoch (optional, for progress)."""
        pass

    # PyTorch Lightning hooks
    def on_fit_start(self, trainer: Any, pl_module: Any) -> None:
        self.on_train_begin()

    def on_fit_end(self, trainer: Any, pl_module: Any) -> None:
        self.on_train_end()
