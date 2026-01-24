# 🌱 GreenAI - Complete Usage Guide

## Overview
GreenAI is a **Carbon Footprint Tracking Platform** for AI/ML workloads. It helps organizations track, monitor, and reduce the environmental impact of their machine learning operations.

## 🎯 Who Should Use This?
- **ML Engineers** tracking carbon emissions from model training
- **Data Scientists** optimizing AI workload efficiency
- **DevOps Teams** managing sustainable ML infrastructure
- **Sustainability Officers** reporting on AI carbon footprint
- **Companies** wanting to meet ESG (Environmental, Social, Governance) goals

---

## 📊 How It Works

### Step 1: Sign Up & Create Organization
1. Go to https://greenai-fix.preview.emergentagent.com/signup
2. Create an account:
   - **Organization Name**: Your company name (e.g., "Acme AI Labs")
   - **Email**: Your work email
   - **Password**: Secure password
3. You'll be redirected to the Projects page

### Step 2: Create a Project
Projects organize your ML workloads (e.g., "GPT Fine-tuning", "Image Classification", "Recommendation Engine")

1. Go to **Projects** page
2. Click **Create Project**
3. Fill in:
   - **Name**: "My First AI Project"
   - **Description**: "Testing carbon tracking for model training"
4. Click **Create**

### Step 3: Generate API Key
API Keys allow you to send telemetry data from your ML code.

1. Go to **API Keys** page
2. Click **Create API Key**
3. Fill in:
   - **Name**: "Production Key" or "Development Key"
   - **Project**: Select your project
   - **Scopes**: Select "ingest" (to send data)
4. **IMPORTANT**: Copy the generated key immediately (starts with `gai_...`)
   - Store it securely (you won't see it again!)

---

## 🔧 Integrating with Your ML Code

### Method 1: Using Python SDK (Recommended)

```python
import requests
import time
from datetime import datetime

# Your GreenAI configuration
API_KEY = "gai_your_key_here"  # Replace with your actual key
API_URL = "https://greenai-fix.preview.emergentagent.com/api"
PROJECT_ID = "your-project-id"  # Get from Projects page

def track_ml_run(
    run_name: str,
    model_name: str,
    duration_seconds: float,
    energy_kwh: float = None,
    gpu_hours: float = None,
    region: str = "us-east-1"
):
    """
    Track a machine learning run in GreenAI.
    
    Args:
        run_name: Unique identifier for this run (e.g., "bert-finetune-v3")
        model_name: Model being used (e.g., "gpt-4", "bert-base")
        duration_seconds: How long the job ran
        energy_kwh: Energy consumed (if known)
        gpu_hours: GPU hours used (if known)
        region: Cloud region (affects carbon intensity)
    """
    
    payload = {
        "project_id": PROJECT_ID,
        "run_name": run_name,
        "job_type": "training",  # or "inference"
        "start_time": datetime.utcnow().isoformat(),
        "duration_seconds": duration_seconds,
        "model_name": model_name,
        "region": region,
        "status": "completed"
    }
    
    # Add optional metrics if available
    if energy_kwh is not None:
        payload["energy_consumed_kwh"] = energy_kwh
    if gpu_hours is not None:
        payload["gpu_hours"] = gpu_hours
    
    # Send to GreenAI
    response = requests.post(
        f"{API_URL}/job-runs",
        json=payload,
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"✅ Tracked run: {run_name}")
        print(f"   Carbon: {data.get('carbon_emissions_kg', 'N/A')} kg CO2e")
        return data
    else:
        print(f"❌ Failed to track: {response.text}")
        return None

# Example usage:
if __name__ == "__main__":
    # Example: Track a model training run
    track_ml_run(
        run_name="bert-sentiment-analysis-v1",
        model_name="bert-base-uncased",
        duration_seconds=3600,  # 1 hour
        gpu_hours=1.0,  # 1 GPU for 1 hour
        region="us-west-2"
    )
```

### Method 2: Manual Testing (cURL)

For testing, you can send data directly via cURL:

```bash
curl -X POST https://greenai-fix.preview.emergentagent.com/api/job-runs \
  -H "X-API-Key: gai_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "run_name": "test-run-1",
    "job_type": "training",
    "start_time": "2026-01-24T12:00:00Z",
    "duration_seconds": 1800,
    "model_name": "gpt-3.5-turbo",
    "region": "us-east-1",
    "gpu_hours": 0.5,
    "status": "completed"
  }'
```

---

## 📈 Viewing Your Data

### Dashboard
After sending job runs, visit the **Dashboard** to see:
- **Total Carbon Emissions** (kg CO2e)
- **Total Energy Consumption** (kWh)
- **Carbon Trends** over time
- **Top Projects** by emissions
- **Recent Runs**

### Job Runs Page
View all your tracked ML runs:
- Filter by project, date range
- See carbon emissions per run
- Click a run to see detailed metrics

### Reports Page
Generate comprehensive reports:
- Carbon footprint by project
- Time-based analysis
- Export for compliance/ESG reporting

### Suggestions Page
Get AI-powered optimization recommendations:
- "Switch to region X to reduce carbon by 20%"
- "Use spot instances to save 30% emissions"
- "Optimize batch size for better efficiency"

---

## 🎓 Example Use Cases

### Use Case 1: Training a Language Model
```python
# Track GPT fine-tuning job
track_ml_run(
    run_name="gpt-customer-support-v2",
    model_name="gpt-4",
    duration_seconds=7200,  # 2 hours
    gpu_hours=8.0,  # 4 GPUs x 2 hours
    region="eu-west-1"
)
```

### Use Case 2: Batch Inference
```python
# Track batch prediction job
track_ml_run(
    run_name="daily-recommendations-batch",
    model_name="recommendation-engine-v3",
    duration_seconds=1800,  # 30 minutes
    gpu_hours=0.5,
    region="us-west-2"
)
```

### Use Case 3: Hyperparameter Tuning
```python
# Track each trial in hyperparameter search
for trial in range(20):
    track_ml_run(
        run_name=f"hyperparam-trial-{trial}",
        model_name="resnet-50",
        duration_seconds=600,  # 10 minutes per trial
        gpu_hours=0.17,
        region="us-east-1"
    )
```

---

## 💰 Billing & Subscriptions

Visit the **Billing** page to:
1. See available plans (Starter, Pro, Enterprise)
2. Upgrade your subscription
3. View usage limits
4. Track job run quotas

**Plans:**
- **Starter**: 10,000 job runs/month, 3 projects, ₹2,999/month
- **Pro**: 100,000 job runs/month, 10 projects, ₹9,999/month
- **Enterprise**: Unlimited, custom pricing

---

## 🔍 Understanding the Metrics

### Carbon Emissions (kg CO2e)
- Calculated based on:
  - **Energy consumed** (kWh)
  - **Region carbon intensity** (varies by power grid)
  - **GPU/CPU usage**
  - **Duration**

### Energy Consumption (kWh)
- Based on:
  - GPU model and hours
  - CPU usage
  - Memory operations

### Efficiency Score
- Compares your emissions to industry benchmarks
- Higher score = more efficient

---

## 🚀 Advanced Features

### Compare Feature
- Compare carbon footprint across different:
  - Projects
  - Models
  - Regions
  - Time periods

### API Keys Management
- Create multiple keys for different environments
- Revoke compromised keys
- Set scopes (read, write, admin)

### Audit Logs
- Track all actions in your organization
- See who created/modified projects
- Monitor API key usage

---

## 📱 Demo Workflow (Try This!)

1. **Sign up** at /signup
2. **Create a project** called "Demo ML Project"
3. **Generate an API key**
4. **Run this test script**:

```bash
# Replace with your actual values
API_KEY="gai_your_key_here"
PROJECT_ID="your-project-id"

# Send 3 test runs
for i in 1 2 3; do
  curl -X POST https://greenai-fix.preview.emergentagent.com/api/job-runs \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"project_id\": \"$PROJECT_ID\",
      \"run_name\": \"demo-run-$i\",
      \"job_type\": \"training\",
      \"start_time\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"duration_seconds\": $((1800 + RANDOM % 3600)),
      \"model_name\": \"test-model\",
      \"region\": \"us-east-1\",
      \"gpu_hours\": $(echo "scale=2; $RANDOM / 32768 * 2" | bc),
      \"status\": \"completed\"
    }"
  echo ""
  sleep 1
done
```

5. **Visit Dashboard** - You should now see:
   - Total emissions
   - Charts with your data
   - Recent runs

6. **View Job Runs** page to see all 3 runs
7. **Generate a Report** on the Reports page
8. **Check Suggestions** for optimization tips

---

## ❓ FAQ

**Q: What if I don't know the exact energy consumption?**
A: Provide `gpu_hours` and `duration_seconds`. GreenAI will estimate energy based on typical GPU power consumption.

**Q: Which regions have lower carbon intensity?**
A: Generally:
- **Lowest**: eu-north-1 (Sweden), eu-west-3 (France) - renewable energy
- **Medium**: us-west-2 (Oregon), us-east-1 (Virginia)
- **Higher**: ap-southeast-1 (Singapore), me-south-1 (Middle East)

**Q: Can I import historical data?**
A: Yes! Just set the `start_time` to past dates in your API calls.

**Q: How accurate are the carbon calculations?**
A: Based on:
- Official regional carbon intensity data
- Hardware power consumption specs
- Industry-standard emission factors

**Q: Can I integrate with MLflow/Weights & Biases?**
A: Yes! Add GreenAI tracking to your MLflow callbacks:

```python
import mlflow

# After mlflow.end_run()
run = mlflow.get_run(run_id)
duration = run.info.end_time - run.info.start_time

track_ml_run(
    run_name=run.info.run_name,
    model_name="my-model",
    duration_seconds=duration / 1000,
    ...
)
```

---

## 📞 Support

For issues or questions:
1. Check the Dashboard for status indicators
2. Review Audit Logs for debugging
3. Contact support (email in Settings page)

---

## 🎉 You're Ready!

Start tracking your AI carbon footprint today and contribute to sustainable AI development! 🌍
