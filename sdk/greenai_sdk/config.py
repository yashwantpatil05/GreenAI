"""SDK configuration and defaults."""
import os
from dataclasses import dataclass


@dataclass
class SDKConfig:
    """Holds SDK configuration values."""

    api_key: str
    project_id: str
    api_base: str = os.environ.get("GREENAI_API", "http://localhost:8000/api")
    sample_interval: int = 15
