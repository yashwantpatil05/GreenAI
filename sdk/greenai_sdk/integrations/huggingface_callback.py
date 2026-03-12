"""HuggingFace Trainer callback for GreenAI tracking."""
from __future__ import annotations

import os
from typing import Any, Optional


class GreenAICallback:
    """HuggingFace TrainerCallback that tracks carbon footprint.

    Usage:
        from greenai.integrations.huggingface import GreenAICallback
        from transformers import Trainer, TrainingArguments

        trainer = Trainer(
            model=model,
            args=TrainingArguments(...),
            callbacks=[GreenAICallback(api_key="gai_xxx", project_id="proj_xxx")]
        )
        trainer.train()
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        project_id: Optional[str] = None,
        run_name: str = "hf-training",
        region: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("GREENAI_API_KEY", "")
        self.project_id = project_id or os.environ.get("GREENAI_PROJECT_ID", "")
        self.run_name = run_name
        self.region = region
        self._tracker = None

    def on_train_begin(self, args: Any = None, state: Any = None, control: Any = None, **kwargs: Any) -> None:
        """Start tracking when training begins."""
        import greenai_sdk as greenai
        greenai.init(
            api_key=self.api_key,
            project_id=self.project_id,
            job_type="training",
            region=self.region,
        )
        self._tracker = greenai._default_tracker
        self._tracker.start(self.run_name)

    def on_train_end(self, args: Any = None, state: Any = None, control: Any = None, **kwargs: Any) -> None:
        """Stop tracking when training ends."""
        if self._tracker:
            self._tracker.stop()
            self._tracker = None

    def on_epoch_end(self, args: Any = None, state: Any = None, control: Any = None, **kwargs: Any) -> None:
        """Called at end of each epoch."""
        pass
