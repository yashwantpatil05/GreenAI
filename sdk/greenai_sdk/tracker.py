"""Primary tracker used by SDK and CLI."""
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterator, Optional

from .config import SDKConfig
from .hardware import detect_hardware, PowerSampler, sample_utilization
from .regions import get_carbon_intensity
from .telemetry import send_payload, flush_cache


class GreenAITracker:
    """Collects real hardware power samples and sends telemetry."""

    def __init__(
        self,
        api_key: str,
        project_id: str,
        model_name: str = "",
        model_version: str = "",
        job_type: str = "training",
        region: str = "local",
        tags: Optional[Dict[str, Any]] = None,
        api_base: Optional[str] = None,
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
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.hardware = detect_hardware()
        self._sampler = PowerSampler(interval=sample_interval)

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
        self._sampler.start()

    def stop(self) -> None:
        """Stop sampling, compute energy from real readings, and send payload."""
        self.end_time = datetime.utcnow()
        self._sampler.stop()
        energy = self._compute_energy()
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
        """Take a single utilization sample (manual use)."""
        sample_utilization()

    def _compute_energy(self) -> Dict[str, float]:
        """Compute kWh from real average watts × duration."""
        if not self.start_time:
            return {}
        end = self.end_time or datetime.utcnow()
        duration_hours = (end - self.start_time).total_seconds() / 3600

        avg_watts = self._sampler.average_watts()

        # Split watts into GPU and CPU+RAM portions for reporting
        gpu_watts = 0.0
        if self.hardware.get("gpu_power_watts") is not None:
            gpu_watts = min(avg_watts, self.hardware.get("gpu_power_watts", 0.0))

        total_kwh = (avg_watts * duration_hours) / 1000.0
        gpu_kwh = (gpu_watts * duration_hours) / 1000.0
        cpu_kwh = total_kwh - gpu_kwh
        ram_kwh = 0.003 * duration_hours  # ~3W RAM baseline

        intensity = get_carbon_intensity(self.region)
        emissions_kg = total_kwh * intensity

        return {
            "cpu_kwh": round(cpu_kwh, 6),
            "gpu_kwh": round(gpu_kwh, 6),
            "ram_kwh": round(ram_kwh, 6),
            "total_kwh": round(total_kwh, 6),
            "emissions_kg": round(emissions_kg, 6),
            "avg_watts": round(avg_watts, 2),
            "measurement_method": "sampled" if avg_watts > 0 else "estimated",
        }
