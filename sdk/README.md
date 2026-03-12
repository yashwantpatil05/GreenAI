# greenai-tracker

**Track carbon footprint of ML training jobs — 3 lines of code.**

```bash
pip install greenai-tracker
```

## Quick Start

```python
import greenai

greenai.init(api_key="gai_live_xxx", project_id="proj_xxx")

with greenai.track("bert-finetuning"):
    model.fit(X_train, y_train)
```

That's it. GreenAI automatically:
- Measures real GPU power draw (via NVIDIA NVML if GPU present)
- Estimates CPU power from utilization × TDP
- Detects your cloud region (AWS/GCP/Azure)
- Computes CO₂ emissions using region-specific grid intensity
- Sends everything to your GreenAI dashboard

## Install

```bash
# Basic install (CPU tracking)
pip install greenai-tracker

# With GPU support (reads real watts from NVIDIA GPUs)
pip install greenai-tracker[gpu]

# Full install (GPU + better CPU model detection)
pip install greenai-tracker[full]
```

## Usage Patterns

### Option 1: Init once, track many runs

```python
import greenai

greenai.init(
    api_key="gai_live_xxx",
    project_id="proj_xxx",
    job_type="training",          # or "inference", "data_processing"
    region="aws:us-east-1",       # auto-detected if omitted
)

# Run 1
with greenai.track("training-epoch-1"):
    model.fit(X_train, y_train)

# Run 2
with greenai.track("training-epoch-2"):
    model.fit(X_train, y_train)
```

### Option 2: Environment variables (no code change)

```bash
export GREENAI_API_KEY=gai_live_xxx
export GREENAI_PROJECT_ID=proj_xxx
```

```python
import greenai

# Works without any arguments!
with greenai.track("my-training-run"):
    model.fit(X_train, y_train)
```

### Option 3: Decorator

```python
@greenai.track_function(api_key="gai_live_xxx", project_id="proj_xxx")
def train_model():
    model.fit(X_train, y_train)

train_model()  # Tracked automatically
```

### Option 4: Validate your API key

```python
import greenai
result = greenai.validate(api_key="gai_live_xxx")
print(result)
# {'valid': True, 'project': 'My ML Pipeline', 'plan': 'starter', 'job_runs_remaining': 9750}
```

## Framework Integrations

### PyTorch Lightning

```python
from greenai_sdk.integrations.pytorch import GreenAICallback
import pytorch_lightning as pl

trainer = pl.Trainer(
    callbacks=[GreenAICallback(api_key="gai_live_xxx", project_id="proj_xxx")]
)
trainer.fit(model)
```

### HuggingFace Transformers

```python
from greenai_sdk.integrations.huggingface import GreenAICallback
from transformers import Trainer, TrainingArguments

trainer = Trainer(
    model=model,
    args=TrainingArguments(output_dir="./results"),
    callbacks=[GreenAICallback(api_key="gai_live_xxx", project_id="proj_xxx")]
)
trainer.train()
```

### Scikit-learn

```python
from greenai_sdk.integrations.sklearn import track_fit
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier()
model = track_fit(model, api_key="gai_live_xxx", project_id="proj_xxx")
model.fit(X_train, y_train)  # Tracked automatically
```

## How It Works

| Measurement | Method |
|-------------|--------|
| GPU power | `nvidia-ml-py` reads real watts from NVIDIA GPU |
| CPU power | `psutil` utilization × CPU TDP from model name |
| Region | Auto-detect from EC2/GCP/Azure metadata endpoints |
| CO₂ | Watts × duration × regional grid intensity (kg CO₂e/kWh) |

**Supported regions**: 80+ regions across AWS, GCP, and Azure including Mumbai (ap-south-1), Tokyo, Sydney, Frankfurt, and more.

**Graceful fallback**: Works without NVIDIA GPU (CPU-only estimate). Works offline (caches payloads and retries).

## Requirements

- Python 3.8+
- `requests`, `psutil` (auto-installed)
- Optional: `nvidia-ml-py` for real GPU readings (`pip install greenai-tracker[gpu]`)
- Optional: `py-cpuinfo` for better CPU model detection (`pip install greenai-tracker[full]`)

## Sign Up

Get your API key at [greenai.dev](https://greenai.dev) — free tier includes 10,000 job runs/month.

## Links

- [Dashboard](https://greenai.dev/dashboard)
- [Documentation](https://docs.greenai.dev)
- [API Reference](https://api.greenai.dev/docs)
- [Issues](https://github.com/greenai/greenai-python/issues)

## License

MIT
