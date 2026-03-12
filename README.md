# GreenAI Audit Platform

End-to-end carbon tracking and ESG reporting platform for ML/AI workloads: FastAPI backend, Next.js dashboard, Python SDK/CLI, Supabase Auth + DB.

## Features

- **Job Run Tracking**: Ingest energy and carbon metrics from ML training jobs
- **Dashboard Analytics**: Real-time charts and aggregations
- **ESG Reports**: Generate compliance-ready emission reports per project
- **Run Comparison**: Compare carbon footprint between different runs
- **Optimization Suggestions**: AI-powered recommendations for reducing emissions
- **Multi-tenant**: Organization-based isolation with role-based access
- **API Keys**: Project-scoped keys for SDK/CLI telemetry ingestion

## Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **SDK/CLI**: Python SDK with automatic telemetry

---

## Quickstart

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account (or local Postgres)

### 1. Clone & Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations (if using Alembic)
alembic upgrade head

# Start server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Build for production
yarn build

# Start server
yarn start
```

---

## Docker Deployment (GCP)

### Build Images

```bash
# Build backend
docker build -f services/backend/Dockerfile -t greenai-backend .

# Build frontend
docker build -f services/frontend/Dockerfile -t greenai-frontend .
```

### Docker Compose (Development)

```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Postgres: localhost:5432
- Redis: localhost:6379
- MinIO: http://localhost:9000

### GCP Cloud Run Deployment

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build & Push Backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/greenai-backend services/backend

# Build & Push Frontend  
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/greenai-frontend services/frontend

# Deploy Backend
gcloud run deploy greenai-backend \
  --image gcr.io/YOUR_PROJECT_ID/greenai-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=...,JWT_SECRET_KEY=...,SUPABASE_URL=..."

# Deploy Frontend
gcloud run deploy greenai-frontend \
  --image gcr.io/YOUR_PROJECT_ID/greenai-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_BASE=https://greenai-backend-xxx.run.app/api"
```

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Projects
- `GET /api/projects/` - List projects
- `POST /api/projects/` - Create project
- `GET /api/projects/{id}` - Get project details

### API Keys
- `GET /api/projects/api-keys` - List API keys
- `POST /api/projects/api-keys` - Create API key
- `POST /api/projects/api-keys/{id}/revoke` - Revoke key

### Job Runs (requires API Key)
- `POST /api/job-runs` - Ingest job run (X-API-Key header)
- `GET /api/job-runs` - List job runs
- `GET /api/job-runs/{id}` - Get run details
- `GET /api/job-runs/compare?run_a=&run_b=` - Compare two runs

### Reports
- `GET /api/reports/` - List reports
- `POST /api/reports/{project_id}` - Generate report

### Health
- `GET /api/healthz` - Health check
- `GET /api/readyz` - Readiness check

---

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
REDIS_URL=redis://localhost:6379/0
ENVIRONMENT=production
```

### Frontend (.env)
```bash
NEXT_PUBLIC_API_BASE=https://your-backend-url/api
```

---

## SDK Usage

```python
from greenai_sdk import GreenAITracker

with GreenAITracker(
    project_id="proj_xxx",
    api_key="sk_xxx",
    run_name="training-v1",
    job_type="ml-training"
) as tracker:
    # Your ML training code here
    model.fit(X, y)
```

---

## Development

### Code Structure
```
/app
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, auth
│   │   ├── models/    # SQLAlchemy models
│   │   └── main.py    # App entry point
│   └── requirements.txt
├── frontend/          # Next.js frontend
│   ├── app/           # App Router pages
│   ├── components/    # React components
│   └── lib/           # Utilities
├── services/          # Docker configs
└── docker-compose.yml
```

### Running Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
yarn test
```

---

## License

MIT License - see LICENSE file for details.
