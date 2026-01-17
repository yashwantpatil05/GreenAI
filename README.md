# GreenAI Audit Platform

End-to-end scaffold for the GreenAI Audit SaaS: FastAPI backend, Next.js dashboard, Python SDK/CLI, worker, Postgres, Redis, and MinIO storage.

## Quickstart (Docker)

```bash
docker-compose up --build
```

Services:
- API: http://localhost:8000
- Frontend: http://localhost:3000
- Postgres: localhost:5432 (`greenai`/`greenai`)
- Redis: localhost:6379
- MinIO: http://localhost:9000 (console http://localhost:9001)

## Backend (FastAPI)

Main app at `backend/app/main.py`. Key features:
- JWT auth with `/api/auth/signup` and `/api/auth/token`
- Multi-tenant org + role model
- Projects and API key management (hashed keys)
- Job run ingestion via `/api/job-runs` using `X-API-Key`
- Aggregations `/api/analytics/overview`, `/analytics/trends`, `/analytics/hotspots`, `/analytics/project/{id}/breakdown`
- Suggestions engine rules + report generation endpoints
- Org settings `/api/organization/me`

### Migrations
```bash
alembic upgrade head
```

## Worker
- RQ worker defined in `backend/app/workers/worker.py`
- Tasks in `backend/app/workers/tasks.py` compute energy/CO₂ and suggestions.

## Frontend (Next.js)
- App Router pages under `frontend/app`
- Tailwind theme with Green AI palette (#1A936F, #2EC4B6, #F7F9F7)
- Sample dashboard, projects, job runs, suggestions, reports, API keys pages

Dev:
```bash
cd frontend
npm install
npm run dev
```
Pages: login/signup, projects, project dashboard, job runs + detail, suggestions Kanban, reports (generate), API keys, org settings.

## Python SDK + CLI
`sdk/greenai_sdk` contains:
- `GreenAITracker` context manager for telemetry
- Hardware detection via psutil + nvidia-smi
- Carbon intensity heuristics and energy estimation
- Offline cache/retry for telemetry
- CLI entrypoint `greenai-cli` wrapping commands; configure defaults with `greenai-cli configure --project-id ... --api-key ...`

Install locally:
```bash
cd sdk
pip install -e .
greenai-cli run --project-id proj_1 --api-key sk_test --model-name demo --cmd "python train.py"
```

## TODO
- Persist SDK offline cache and retries
- Enforce role-based authorization on endpoints
- Expand suggestion engine rules and scoring
- Add CI/CD pipeline and production-grade logging/observability
