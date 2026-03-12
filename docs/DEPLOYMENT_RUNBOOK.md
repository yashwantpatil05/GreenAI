# GreenAI Production Deployment Runbook

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Steps](#deployment-steps)
4. [Database Migrations](#database-migrations)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Access & Credentials
- [x] Google Cloud Platform (GCP) project access
- [x] Vercel account with deployment permissions
- [x] Supabase project credentials
- [x] GitHub repository admin access
- [x] Production database access

### Required Tools
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init

# Install Vercel CLI
npm install -g vercel

# Install Docker
# Follow: https://docs.docker.com/get-docker/

# Install PostgreSQL client (for migrations)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client
```

---

## Environment Setup

### 1. GCP Secret Manager Setup

Store all sensitive credentials in GCP Secret Manager:

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID

# Create secrets
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create JWT_SECRET_KEY --data-file=-
echo -n "your-supabase-jwt-secret" | gcloud secrets create SUPABASE_JWT_SECRET --data-file=-
echo -n "your-supabase-service-key" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
echo -n "your-supabase-anon-key" | gcloud secrets create SUPABASE_ANON_KEY --data-file=-
echo -n "redis://your-redis-url" | gcloud secrets create REDIS_URL --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding DATABASE_URL \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets
```

### 2. GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

```
GCP_SA_KEY              # GCP service account JSON key
GCP_PROJECT_ID          # Your GCP project ID
DATABASE_URL            # Production database connection string
VERCEL_TOKEN            # Vercel deployment token
VERCEL_ORG_ID           # Vercel organization ID
VERCEL_PROJECT_ID       # Vercel project ID
```

### 3. Vercel Environment Variables

Configure in Vercel dashboard:

```bash
NEXT_PUBLIC_API_URL=https://greenai-backend-production-xxxxx.a.run.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Deployment Steps

### Option 1: Automated Deployment (GitHub Actions)

**Recommended for production deployments**

1. **Navigate to GitHub Actions**
   - Go to: https://github.com/your-org/greenai/actions
   - Select "Deploy to Production" workflow

2. **Trigger Deployment**
   - Click "Run workflow"
   - Select branch: `main`
   - Choose environment: `production` or `staging`
   - Click "Run workflow"

3. **Monitor Deployment**
   - Watch the workflow progress
   - Review logs for each step
   - Wait for green checkmarks

4. **Verify Deployment**
   - Backend health: `https://your-backend-url.a.run.app/health`
   - Frontend: `https://greenai-production.vercel.app`

### Option 2: Manual Deployment

**For emergency deployments or debugging**

#### Backend Deployment

```bash
# 1. Build Docker image
cd backend
docker build -t gcr.io/$GCP_PROJECT_ID/greenai-backend:$(git rev-parse --short HEAD) .

# 2. Push to Google Container Registry
docker push gcr.io/$GCP_PROJECT_ID/greenai-backend:$(git rev-parse --short HEAD)

# 3. Deploy to Cloud Run
gcloud run deploy greenai-backend-production \
  --image gcr.io/$GCP_PROJECT_ID/greenai-backend:$(git rev-parse --short HEAD) \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest" \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 2 \
  --memory 2Gi \
  --timeout 300

# 4. Verify deployment
BACKEND_URL=$(gcloud run services describe greenai-backend-production \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)')

curl -f $BACKEND_URL/health || echo "Health check failed!"
```

#### Frontend Deployment

```bash
# 1. Install dependencies
cd frontend
npm ci

# 2. Build
npm run build

# 3. Deploy to Vercel
vercel --prod

# 4. Verify
curl -f https://greenai-production.vercel.app || echo "Deployment failed!"
```

---

## Database Migrations

### Pre-Deployment Checklist
- [ ] Review migration scripts in `backend/alembic/versions/`
- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Schedule maintenance window if downtime is required

### Running Migrations

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Set database URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 3. Check current migration version
cd backend
alembic current

# 4. Review pending migrations
alembic heads
alembic history

# 5. Run migrations
alembic upgrade head

# 6. Verify migration success
alembic current
```

### Creating New Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of change"

# Review generated migration file in alembic/versions/
# Edit if necessary

# Test migration
alembic upgrade head
alembic downgrade -1  # Test rollback
alembic upgrade head  # Re-apply
```

---

## Rollback Procedures

### Scenario 1: Bad Deployment (Code Issues)

```bash
# Backend rollback to previous version
gcloud run services update-traffic greenai-backend-production \
  --to-revisions=greenai-backend-production-00042-abc=100

# Frontend rollback via Vercel dashboard
# Or via CLI:
vercel rollback https://greenai-production.vercel.app
```

### Scenario 2: Database Migration Issues

```bash
# 1. Identify current version
alembic current

# 2. Downgrade to previous version
alembic downgrade -1

# 3. Restore from backup if necessary
psql $DATABASE_URL < backup_20260212_100000.sql

# 4. Verify application functionality
curl -f $BACKEND_URL/health
```

### Scenario 3: Complete System Failure

```bash
# 1. Switch to last known good deployment
# Backend
gcloud run services update-traffic greenai-backend-production \
  --to-revisions=PREVIOUS_GOOD_REVISION=100

# Frontend
vercel rollback https://greenai-production.vercel.app

# 2. Restore database from backup
psql $DATABASE_URL < backup_latest.sql

# 3. Clear Redis cache
redis-cli FLUSHALL

# 4. Notify users via status page
# Post incident to: status.greenai.dev
```

---

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# Backend health
curl https://your-backend-url.a.run.app/health
# Expected: {"status": "healthy", "database": "connected", "redis": "connected"}

# Backend readiness
curl https://your-backend-url.a.run.app/ready
# Expected: 200 OK

# Backend metrics (Prometheus format)
curl https://your-backend-url.a.run.app/metrics
```

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate (requests/second)
   - Error rate (% of 5xx responses)
   - Response time (p50, p95, p99)
   - Active connections

2. **Database Metrics**
   - Connection pool utilization
   - Query latency
   - Slow queries (>1s)
   - Deadlocks

3. **Business Metrics**
   - Job runs ingested per hour
   - User signups per day
   - API key usage
   - Billing events

### Alerting Thresholds

Configure alerts for:
- Error rate > 1% for 5 minutes
- Response time p95 > 2 seconds for 5 minutes
- Database connection pool > 80% for 5 minutes
- Failed payments > 5 in 1 hour
- Disk usage > 85%

---

## Troubleshooting

### Backend Not Responding

```bash
# 1. Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# 2. Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# 3. Check Redis connectivity
redis-cli -u $REDIS_URL ping

# 4. Restart service
gcloud run services update greenai-backend-production --region us-central1
```

### Database Connection Issues

```bash
# 1. Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# 2. Kill idle connections
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'greenai_prod'
  AND state = 'idle'
  AND state_change < now() - interval '30 minutes'
"

# 3. Restart Cloud Run to reset pool
gcloud run services update greenai-backend-production --region us-central1
```

### Frontend Build Failures

```bash
# 1. Check Vercel build logs
vercel logs https://greenai-production.vercel.app

# 2. Test build locally
cd frontend
npm run build

# 3. Check environment variables
vercel env ls

# 4. Redeploy
vercel --prod --force
```

### Migration Failures

```bash
# 1. Check migration status
alembic current
alembic history

# 2. Manually fix schema if needed
psql $DATABASE_URL

# 3. Stamp database to specific version
alembic stamp head

# 4. Re-run migrations
alembic upgrade head
```

---

## Post-Deployment Checklist

After every production deployment:

- [ ] Verify health check endpoints return 200
- [ ] Test critical user flows:
  - [ ] User signup
  - [ ] User login
  - [ ] Create project
  - [ ] Generate API key
  - [ ] Ingest job run
  - [ ] View analytics dashboard
  - [ ] Export data (CSV/JSON)
- [ ] Monitor error rates for 1 hour
- [ ] Check logs for any warnings
- [ ] Update status page: https://status.greenai.dev
- [ ] Notify team in Slack #deployments channel

---

## Emergency Contacts

- **On-Call Engineer**: Check PagerDuty
- **DevOps Lead**: devops@greenai.dev
- **Database Admin**: dba@greenai.dev
- **Incident Channel**: #incidents on Slack

---

## Maintenance Windows

- **Regular Maintenance**: Every Sunday 2 AM - 4 AM UTC
- **Emergency Maintenance**: Notify users 30 minutes in advance via:
  - Status page
  - Email to all organization owners
  - In-app banner

---

**Last Updated**: 2026-02-12
**Document Owner**: DevOps Team
**Review Schedule**: Monthly
