"""Primary tracker used by SDK and CLI."""
import time
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterator

import psutil

from .carbon import carbon_intensity
from .config import SDKConfig
from .hardware import detect_hardware, sample_utilization
from .telemetry import send_payload, flush_cache


class GreenAITracker:
    """Collects utilization samples and sends telemetry."""

    def __init__(
        self,
        api_key: str,
        project_id: str,
        model_name: str,
        model_version: str,
        job_type: str,
        region: str,
        tags: Dict[str, Any] | None = None,
        api_base: str | None = None,
        sample_interval: int = 15,
    ) -> None:
        self.config = SDKConfig(
            api_key=api_key,
            project_id=project_id,
            api_base=api_base or SDKConfig.api_base,
            sample_interval=sample_interval,
        )
        self.model_name = model_name
        self.model_version = model_version
        self.job_type = job_type
        self.region = region
        self.tags = tags or {}
        self.samples: list[Dict[str, float]] = []
        self.start_time: datetime | None = None
        self.end_time: datetime | None = None
        self.hardware = detect_hardware()

    @contextmanager
    def track_run(self, run_name: str) -> Iterator[None]:
        """Context manager wrapping a job."""
        self.start(run_name)
        try:
            yield
        finally:
            self.stop()

    def start(self, run_name: str) -> None:
        """Begin sampling."""
        self.run_name = run_name
        self.start_time = datetime.utcnow()

    def stop(self) -> None:
        """Stop sampling and send payload."""
        self.end_time = datetime.utcnow()
        energy = self._estimate_energy()
        payload = {
            "run_name": self.run_name,
            "job_type": self.job_type,
            "region": self.region,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "tags": self.tags,
            "project_id": self.config.project_id,
            "hardware": self.hardware,
            "energy": energy,
        }
        flush_cache(self.config.api_base, self.config.api_key)
        send_payload(self.config.api_base, self.config.api_key, payload)

    def sample(self) -> None:
        """Take a single utilization sample."""
        self.samples.append(sample_utilization())

    def loop_sampling(self) -> None:
        """Run a sampling loop until stop is called."""
        self.start_time = datetime.utcnow()
        while self.end_time is None:
            self.sample()
            time.sleep(self.config.sample_interval)

    def _estimate_energy(self) -> Dict[str, float]:
        """Estimate kWh and emissions using coarse heuristics."""
        if not self.start_time:
            return {}
        duration_hours = (
            (self.end_time or datetime.utcnow()) - self.start_time
        ).total_seconds() / 3600
        cpu_power = 0.05  # kW placeholder
        gpu_power = 0.2 if self.hardware.get("gpu_model") else 0.0
        cpu_kwh = cpu_power * duration_hours
        gpu_kwh = gpu_power * duration_hours
        ram_kwh = 0.01 * duration_hours
        total_kwh = cpu_kwh + gpu_kwh + ram_kwh
        emissions_kg = total_kwh * carbon_intensity(self.region)
        return {
            "cpu_kwh": cpu_kwh,
            "gpu_kwh": gpu_kwh,
            "ram_kwh": ram_kwh,
            "total_kwh": total_kwh,
            "emissions_kg": emissions_kg,
        }
