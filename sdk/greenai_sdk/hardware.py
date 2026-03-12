"""Hardware detection utilities — real power measurements where available."""
import subprocess
import threading
import time
from typing import Any, Dict, List, Optional


try:
    import psutil
    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False

try:
    import pynvml
    pynvml.nvmlInit()
    _PYNVML_AVAILABLE = True
except Exception:
    _PYNVML_AVAILABLE = False

# CPU TDP lookup table (watts) — used when psutil cannot read actual power draw
CPU_TDP_WATTS: Dict[str, float] = {
    "Intel Core i9": 125.0,
    "Intel Core i7": 95.0,
    "Intel Core i5": 65.0,
    "Intel Core i3": 65.0,
    "Intel Xeon Platinum": 205.0,
    "Intel Xeon Gold": 150.0,
    "Intel Xeon Silver": 85.0,
    "Intel Xeon": 120.0,
    "AMD EPYC": 225.0,
    "AMD Ryzen 9": 105.0,
    "AMD Ryzen 7": 65.0,
    "AMD Ryzen 5": 65.0,
    "Apple M": 15.0,
}


def detect_cpu() -> Dict[str, Any]:
    """Return CPU model and estimated TDP."""
    info: Dict[str, Any] = {}

    # Try py-cpuinfo first (best model name)
    try:
        import cpuinfo
        cpu = cpuinfo.get_cpu_info()
        brand = cpu.get("brand_raw", "")
        info["cpu_model"] = brand
        info["cpu_count"] = cpu.get("count", 1)
    except ImportError:
        pass

    # Fall back to psutil
    if not info and _PSUTIL_AVAILABLE:
        info["cpu_count"] = psutil.cpu_count(logical=True)

    # Estimate TDP from model name
    model = info.get("cpu_model", "")
    info["cpu_tdp_watts"] = _estimate_cpu_tdp(model)

    return info


def _estimate_cpu_tdp(model: str) -> float:
    """Estimate CPU TDP from model name string."""
    for key, tdp in CPU_TDP_WATTS.items():
        if key.lower() in model.lower():
            return tdp
    return 65.0  # safe default


def detect_gpu() -> Optional[Dict[str, Any]]:
    """Return GPU info and real-time power draw if available."""
    if _PYNVML_AVAILABLE:
        try:
            count = pynvml.nvmlDeviceGetCount()
            if count == 0:
                return None
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            name = pynvml.nvmlDeviceGetName(handle)
            if isinstance(name, bytes):
                name = name.decode("utf-8")
            power_mw = pynvml.nvmlDeviceGetPowerUsage(handle)
            return {
                "gpu_model": name,
                "gpu_count": count,
                "gpu_power_watts": power_mw / 1000.0,
            }
        except Exception:
            pass

    # Fall back to nvidia-smi subprocess
    model = _detect_nvidia_gpu_model()
    if model:
        return {"gpu_model": model, "gpu_count": 1, "gpu_power_watts": None}

    return None


def _detect_nvidia_gpu_model() -> Optional[str]:
    """Detect NVIDIA GPU model via nvidia-smi if available."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
        gpus = result.stdout.strip().splitlines()
        return gpus[0] if gpus else None
    except Exception:
        return None


def detect_hardware() -> Dict[str, Any]:
    """Return full hardware profile."""
    info: Dict[str, Any] = {}

    if _PSUTIL_AVAILABLE:
        info["cpu_count"] = psutil.cpu_count(logical=True)
        info["ram_gb"] = round(psutil.virtual_memory().total / (1024 ** 3), 2)

    cpu = detect_cpu()
    info.update(cpu)

    gpu = detect_gpu()
    if gpu:
        info.update(gpu)

    return info


def detect_cloud_region() -> str:
    """Auto-detect cloud region from instance metadata endpoints.

    Returns a region string like 'aws:us-east-1' or 'local' if not in cloud.
    """
    import urllib.request

    # AWS EC2 instance metadata
    try:
        req = urllib.request.Request(
            "http://169.254.169.254/latest/meta-data/placement/availability-zone",
            headers={"User-Agent": "greenai-sdk/0.1"},
        )
        with urllib.request.urlopen(req, timeout=1) as resp:
            az = resp.read().decode().strip()
            # az is like "us-east-1a", strip trailing letter for region
            region = az[:-1] if az and az[-1].isalpha() else az
            return f"aws:{region}"
    except Exception:
        pass

    # GCP instance metadata
    try:
        req = urllib.request.Request(
            "http://metadata.google.internal/computeMetadata/v1/instance/zone",
            headers={"Metadata-Flavor": "Google"},
        )
        with urllib.request.urlopen(req, timeout=1) as resp:
            zone = resp.read().decode().strip()
            # zone is "projects/123/zones/us-central1-a"
            region = "-".join(zone.split("/")[-1].split("-")[:-1])
            return f"gcp:{region}"
    except Exception:
        pass

    # Azure instance metadata
    try:
        req = urllib.request.Request(
            "http://169.254.169.254/metadata/instance/compute/location?api-version=2021-02-01&format=text",
            headers={"Metadata": "true"},
        )
        with urllib.request.urlopen(req, timeout=1) as resp:
            location = resp.read().decode().strip()
            return f"azure:{location}"
    except Exception:
        pass

    return "local"


class PowerSampler:
    """Background thread that samples GPU and CPU power draw every N seconds."""

    def __init__(self, interval: int = 15) -> None:
        self.interval = interval
        self._samples: List[float] = []
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._stop_event.clear()
        self._samples.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=self.interval + 2)

    def _run(self) -> None:
        while not self._stop_event.is_set():
            watts = sample_power()
            with self._lock:
                self._samples.append(watts)
            self._stop_event.wait(timeout=self.interval)

    def average_watts(self) -> float:
        """Return average power draw in watts across all samples."""
        with self._lock:
            if not self._samples:
                return sample_power()  # at least one reading
            return sum(self._samples) / len(self._samples)


def sample_power() -> float:
    """Return current total power draw in watts (GPU + CPU estimate)."""
    gpu_watts = _sample_gpu_power()
    cpu_watts = _sample_cpu_power()
    return gpu_watts + cpu_watts


def _sample_gpu_power() -> float:
    """Return GPU power in watts using pynvml, or 0 if not available."""
    if not _PYNVML_AVAILABLE:
        return 0.0
    try:
        total = 0.0
        count = pynvml.nvmlDeviceGetCount()
        for i in range(count):
            handle = pynvml.nvmlDeviceGetHandleByIndex(i)
            total += pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0
        return total
    except Exception:
        return 0.0


def _sample_cpu_power() -> float:
    """Estimate CPU power from utilization × TDP."""
    if not _PSUTIL_AVAILABLE:
        return 65.0 * 0.5  # assume 50% utilization at 65W TDP

    try:
        util_pct = psutil.cpu_percent(interval=0.1)
        cpu_info = detect_cpu()
        tdp = cpu_info.get("cpu_tdp_watts", 65.0)
        # Power scales roughly linearly with utilization
        return tdp * (util_pct / 100.0)
    except Exception:
        return 0.0


def sample_utilization() -> Dict[str, float]:
    """Sample CPU, memory, and GPU utilization as percentages."""
    result: Dict[str, float] = {}

    if _PSUTIL_AVAILABLE:
        result["cpu_percent"] = psutil.cpu_percent(interval=None)
        result["ram_percent"] = psutil.virtual_memory().percent

    if _PYNVML_AVAILABLE:
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            result["gpu_percent"] = float(util.gpu)
        except Exception:
            pass

    return result
