"""Hardware detection utilities."""
import json
import subprocess
from typing import Dict, Any

import psutil


def detect_hardware() -> Dict[str, Any]:
    """Return CPU/GPU/RAM information."""
    info: Dict[str, Any] = {
        "cpu_count": psutil.cpu_count(logical=True),
        "ram_gb": round(psutil.virtual_memory().total / (1024**3), 2),
    }
    gpu_info = _detect_nvidia_gpu()
    if gpu_info:
        info["gpu_model"] = gpu_info
    return info


def _detect_nvidia_gpu() -> str | None:
    """Detect NVIDIA GPU model via nvidia-smi if available."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            check=True,
            capture_output=True,
            text=True,
        )
        gpu = result.stdout.strip().splitlines()
        return gpu[0] if gpu else None
    except Exception:
        return None


def sample_utilization() -> Dict[str, float]:
    """Sample CPU and memory utilization as percentages."""
    return {
        "cpu_percent": psutil.cpu_percent(interval=None),
        "ram_percent": psutil.virtual_memory().percent,
    }
