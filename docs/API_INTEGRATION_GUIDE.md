# GreenAI API Integration Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Job Run Ingestion](#job-run-ingestion)
5. [Analytics & Reporting](#analytics--reporting)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Rate Limits](#rate-limits)

---

## Getting Started

### Base URL
```
Production: https://api.greenai.dev
Staging: https://api-staging.greenai.dev
```

### Quick Start

1. **Sign up** at https://greenai.dev
2. **Create a project** in the dashboard
3. **Generate an API key** for your project
4. **Start tracking** your ML job carbon footprint

---

## Authentication

### API Key Authentication

All API requests require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: gai_live_abc123xyz..." \
     https://api.greenai.dev/api/job-runs
```

### Generate API Key

1. Navigate to your project in the dashboard
2. Click "API Keys" → "Generate New Key"
3. Copy the key (it's only shown once!)
4. Store it securely (use environment variables)

```bash
# .env file
GREENAI_API_KEY=gai_live_abc123xyz...
```

---

## Core Endpoints

### Health Check

```bash
GET /health
```

Check if the API is operational.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-02-12T10:30:00Z"
}
```

### List Projects

```bash
GET /api/projects
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "ML Training Pipeline",
      "description": "Production training jobs",
      "created_at": "2026-01-15T10:00:00Z",
      "organization_id": "org_xyz789"
    }
  ]
}
```

---

## Job Run Ingestion

### Ingest Job Run

Track the carbon footprint of your ML job:

```bash
POST /api/ingest/job-run
X-API-Key: gai_live_abc123xyz...
Content-Type: application/json
```

**Request Body:**
```json
{
  "run_id": "unique-run-id-123",
  "run_name": "bert-finetuning-epoch-10",
  "project_id": "proj_abc123",
  "status": "success",
  "start_time": "2026-02-12T10:00:00Z",
  "end_time": "2026-02-12T12:30:00Z",
  "duration_seconds": 9000,
  "hardware": {
    "gpu_count": 4,
    "gpu_model": "NVIDIA A100",
    "cpu_count": 32,
    "cpu_model": "Intel Xeon",
    "memory_gb": 128
  },
  "energy": {
    "total_kwh": 12.5,
    "gpu_kwh": 10.0,
    "cpu_kwh": 2.0,
    "ram_kwh": 0.5
  },
  "region": "us-west-2",
  "cloud_provider": "aws",
  "model_version_id": "bert-base-v2.1",
  "job_type": "training",
  "metrics": {
    "final_loss": 0.023,
    "accuracy": 0.94,
    "f1_score": 0.92
  },
  "metadata": {
    "dataset_size": "1.2GB",
    "batch_size": 32,
    "learning_rate": 0.001,
    "framework": "pytorch",
    "framework_version": "2.1.0"
  }
}
```

**Response (201 Created):**
```json
{
  "job_run_id": "run_def456",
  "status": "ingested",
  "emissions_kg": 5.0,
  "message": "Job run ingested successfully"
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | string | Unique identifier for your job |
| `run_name` | string | Human-readable name |
| `project_id` | string | Your GreenAI project ID |
| `status` | enum | `success`, `failed`, `running`, `queued` |
| `start_time` | datetime | ISO 8601 format |
| `hardware` | object | At least one of gpu/cpu/memory |
| `region` | string | Cloud region code |

### Optional But Recommended

- `energy`: Precise energy measurements (kWh)
- `metrics`: ML model performance metrics
- `metadata`: Additional context (framework, dataset, etc.)

---

## Analytics & Reporting

### Get Analytics Summary

```bash
GET /api/analytics/summary
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "total_runs": 1250,
  "total_energy_kwh": 15680.5,
  "total_emissions_kg": 6272.2,
  "equivalents": {
    "miles_driven": 15643.2,
    "trees_planted": 93,
    "smartphones_charged": 605234
  },
  "period": "all_time"
}
```

### Get Monthly Trends

```bash
GET /api/analytics/trends
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "monthly_trends": [
    {
      "month": "2026-01-01",
      "total_kwh": 5234.5,
      "total_emissions_kg": 2093.8,
      "job_runs": 420
    },
    {
      "month": "2026-02-01",
      "total_kwh": 6180.3,
      "total_emissions_kg": 2472.1,
      "job_runs": 485
    }
  ]
}
```

### Get Top Emitting Jobs

```bash
GET /api/analytics/hotspots
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "hotspots": [
    {
      "run_name": "gpt-pretraining-run-42",
      "energy_kwh": 1250.5,
      "emissions_kg": 500.2,
      "percentage_of_total": 18.5
    }
  ]
}
```

### Export Data

#### Export as JSON

```bash
GET /api/exports/analytics
Authorization: Bearer <your-jwt-token>
```

#### Export as CSV

```bash
GET /api/exports/job-runs/csv?start_date=2026-01-01&end_date=2026-02-01
Authorization: Bearer <your-jwt-token>
```

Downloads a CSV file with all job runs in the specified date range.

---

## Code Examples

### Python

```python
import requests
from datetime import datetime
import os

class GreenAIClient:
    def __init__(self, api_key: str, base_url: str = "https://api.greenai.dev"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {"X-API-Key": api_key}

    def ingest_job_run(self, run_data: dict) -> dict:
        """Ingest a job run to track carbon footprint."""
        response = requests.post(
            f"{self.base_url}/api/ingest/job-run",
            json=run_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def get_analytics_summary(self) -> dict:
        """Get overall analytics summary."""
        # This requires JWT token, not API key
        # Use authenticated session
        response = requests.get(
            f"{self.base_url}/api/analytics/summary",
            headers={"Authorization": f"Bearer {self.jwt_token}"}
        )
        response.raise_for_status()
        return response.json()

# Usage
client = GreenAIClient(api_key=os.getenv("GREENAI_API_KEY"))

job_data = {
    "run_id": "training-run-001",
    "run_name": "ResNet50 Training",
    "project_id": "proj_abc123",
    "status": "success",
    "start_time": datetime.utcnow().isoformat() + "Z",
    "end_time": datetime.utcnow().isoformat() + "Z",
    "duration_seconds": 3600,
    "hardware": {
        "gpu_count": 2,
        "gpu_model": "NVIDIA V100",
        "cpu_count": 16,
        "memory_gb": 64
    },
    "energy": {
        "total_kwh": 5.2
    },
    "region": "us-east-1",
    "cloud_provider": "aws"
}

result = client.ingest_job_run(job_data)
print(f"Emissions: {result['emissions_kg']} kg CO2e")
```

### Node.js

```javascript
const axios = require('axios');

class GreenAIClient {
  constructor(apiKey, baseURL = 'https://api.greenai.dev') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async ingestJobRun(runData) {
    try {
      const response = await this.client.post('/api/ingest/job-run', runData);
      return response.data;
    } catch (error) {
      console.error('Failed to ingest job run:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAnalyticsSummary(jwtToken) {
    try {
      const response = await axios.get(`${this.baseURL}/api/analytics/summary`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get analytics:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Usage
const client = new GreenAIClient(process.env.GREENAI_API_KEY);

const jobData = {
  run_id: 'training-run-001',
  run_name: 'BERT Fine-tuning',
  project_id: 'proj_abc123',
  status: 'success',
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  duration_seconds: 7200,
  hardware: {
    gpu_count: 4,
    gpu_model: 'NVIDIA A100',
    cpu_count: 32,
    memory_gb: 128
  },
  energy: {
    total_kwh: 10.5
  },
  region: 'us-west-2',
  cloud_provider: 'gcp'
};

client.ingestJobRun(jobData)
  .then(result => console.log(`Emissions: ${result.emissions_kg} kg CO2e`))
  .catch(error => console.error(error));
```

### cURL

```bash
#!/bin/bash

API_KEY="gai_live_abc123xyz..."
BASE_URL="https://api.greenai.dev"

# Ingest a job run
curl -X POST "$BASE_URL/api/ingest/job-run" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "training-run-001",
    "run_name": "GPT-2 Fine-tuning",
    "project_id": "proj_abc123",
    "status": "success",
    "start_time": "2026-02-12T10:00:00Z",
    "end_time": "2026-02-12T14:30:00Z",
    "duration_seconds": 16200,
    "hardware": {
      "gpu_count": 8,
      "gpu_model": "NVIDIA A100",
      "cpu_count": 64,
      "memory_gb": 256
    },
    "energy": {
      "total_kwh": 22.5
    },
    "region": "us-central1",
    "cloud_provider": "gcp",
    "model_version_id": "gpt2-medium",
    "job_type": "training"
  }'
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request body |
| 401 | Unauthorized | Invalid or missing API key |
| 402 | Payment Required | Subscription limit exceeded |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate run_id |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Maintenance mode |

### Error Response Format

```json
{
  "detail": "Job run with run_id 'training-run-001' already exists",
  "error_code": "DUPLICATE_RUN_ID",
  "field": "run_id"
}
```

### Common Errors

#### Duplicate Run ID

```json
{
  "detail": "Job run with this run_id already exists",
  "error_code": "DUPLICATE_RUN_ID"
}
```

**Solution**: Use a unique `run_id` for each job run, or check if it already exists.

#### Invalid API Key

```json
{
  "detail": "Invalid or expired API key",
  "error_code": "INVALID_API_KEY"
}
```

**Solution**: Verify your API key is correct and not revoked.

#### Subscription Limit Exceeded

```json
{
  "detail": "Monthly job run limit exceeded. Upgrade your plan to continue tracking.",
  "error_code": "LIMIT_EXCEEDED",
  "upgrade_url": "https://greenai.dev/billing/upgrade"
}
```

**Solution**: Upgrade your subscription plan or wait until next billing period.

---

## Rate Limits

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/ingest/job-run` | 100 requests | per minute |
| `/api/analytics/*` | 60 requests | per minute |
| `/api/projects` | 60 requests | per minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1676123456
```

### Handling Rate Limits

```python
import time

def ingest_with_retry(client, job_data, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.ingest_job_run(job_data)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                reset_time = int(e.response.headers.get('X-RateLimit-Reset', 0))
                wait_seconds = reset_time - int(time.time()) + 1
                print(f"Rate limited. Waiting {wait_seconds}s...")
                time.sleep(wait_seconds)
            else:
                raise
    raise Exception("Max retries exceeded")
```

---

## Best Practices

### 1. Batch Ingestion

For bulk ingestion, batch your requests:

```python
from concurrent.futures import ThreadPoolExecutor

def ingest_batch(client, jobs):
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(client.ingest_job_run, jobs)
    return list(results)
```

### 2. Idempotent Requests

Use unique `run_id` values to ensure idempotency:

```python
import uuid

job_data["run_id"] = f"training-{uuid.uuid4()}"
```

### 3. Error Logging

Log all API errors for debugging:

```python
import logging

try:
    result = client.ingest_job_run(job_data)
except Exception as e:
    logging.error(f"Failed to ingest job run: {e}", exc_info=True)
    # Optionally: save to local file for retry
```

### 4. Secure API Key Storage

Never hardcode API keys:

```python
# ❌ Bad
api_key = "gai_live_abc123xyz..."

# ✅ Good
import os
api_key = os.getenv("GREENAI_API_KEY")
```

---

## SDK Libraries

### Official SDKs

- **Python**: `pip install greenai-python` (coming soon)
- **Node.js**: `npm install @greenai/sdk` (coming soon)

### Community SDKs

Check https://greenai.dev/integrations for community-contributed SDKs in other languages.

---

## Support

### Resources
- **API Reference**: https://api.greenai.dev/docs
- **Dashboard**: https://greenai.dev/dashboard
- **Status Page**: https://status.greenai.dev

### Get Help
- **Email**: support@greenai.dev
- **Slack**: https://greenai-community.slack.com
- **GitHub Issues**: https://github.com/greenai/issues

---

**Last Updated**: 2026-02-12
**API Version**: v1
**Document Version**: 1.0
