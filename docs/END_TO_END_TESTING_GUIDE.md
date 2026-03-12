# GreenAI End-to-End Testing Guide

This guide helps you test all features of GreenAI before onboarding real users. Follow these steps to ensure everything works correctly.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [Core Feature Testing](#core-feature-testing)
4. [Integration Testing](#integration-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [User Acceptance Testing](#user-acceptance-testing)

---

## Prerequisites

### Tools Required
- Web browser (Chrome/Firefox recommended)
- cURL or Postman for API testing
- Python 3.8+ (for integration testing)
- PostgreSQL client (for database verification)

### Test Accounts
Create test accounts for different roles:
- Admin user: admin@test-greenai.com
- Regular user: user@test-greenai.com
- Viewer user: viewer@test-greenai.com

---

## Test Environment Setup

### 1. Start Local Environment

```bash
# Start backend
cd backend
source .venv/Scripts/activate  # Windows
# source .venv/bin/activate    # Linux/Mac
uvicorn app.main:app --reload --port 8000

# Start frontend (in new terminal)
cd frontend
npm run dev
```

### 2. Verify Services

```bash
# Backend health check
curl http://localhost:8000/health
# Expected: {"status":"healthy","database":"connected"}

# Frontend
# Open: http://localhost:3000
# Expected: Login page loads
```

### 3. Database Setup

```bash
# Run migrations
cd backend
alembic upgrade head

# Verify tables exist
psql $DATABASE_URL -c "\dt"
# Expected: List of all tables (users, organizations, projects, etc.)
```

---

## Core Feature Testing

### Test 1: User Registration & Login

**Objective**: Verify users can sign up and log in

**Steps**:
1. Navigate to http://localhost:3000
2. Click "Sign Up"
3. Fill in:
   - Email: test1@greenai-test.com
   - Password: TestPassword123!
   - Organization: Test Org 1
4. Click "Create Account"

**Expected Result**:
- ✅ Account created successfully
- ✅ Redirected to dashboard
- ✅ Welcome email sent (check logs)

**Verification**:
```bash
# Check user in database
psql $DATABASE_URL -c "SELECT email, organization_id FROM users WHERE email='test1@greenai-test.com';"
```

**Test Login**:
1. Log out
2. Click "Log In"
3. Enter: test1@greenai-test.com / TestPassword123!
4. Click "Log In"

**Expected Result**:
- ✅ Logged in successfully
- ✅ Redirected to dashboard

---

### Test 2: Project Creation

**Objective**: Verify project creation and management

**Steps**:
1. Navigate to "Projects" page
2. Click "New Project"
3. Fill in:
   - Name: Test ML Pipeline
   - Description: Integration testing project
4. Click "Create"

**Expected Result**:
- ✅ Project created
- ✅ Shows in project list
- ✅ Can navigate to project dashboard

**Verification**:
```bash
# Check project in database
psql $DATABASE_URL -c "SELECT name, organization_id FROM projects WHERE name='Test ML Pipeline';"
```

---

### Test 3: API Key Generation

**Objective**: Verify API key creation and management

**Steps**:
1. Navigate to project "Test ML Pipeline"
2. Click "API Keys" tab
3. Click "Generate New Key"
4. Fill in:
   - Name: Test API Key
   - Scopes: ingest, read
5. Click "Generate"
6. **Copy the key** (starts with `gai_`)

**Expected Result**:
- ✅ Key generated successfully
- ✅ Key shows in list
- ✅ Can copy key to clipboard

**Verification**:
```bash
# Check API key in database (hashed)
psql $DATABASE_URL -c "SELECT name, prefix, active FROM api_keys WHERE name='Test API Key';"
```

**Test Key Revocation**:
1. Find the key in the list
2. Click "Revoke"
3. Confirm revocation

**Expected Result**:
- ✅ Key marked as inactive
- ✅ Cannot be used for API calls

---

### Test 4: Job Run Ingestion

**Objective**: Verify job runs can be ingested via API

**Preparation**:
- Use the API key generated in Test 3
- Get your project ID from the project dashboard

**Test Script** (save as `test_ingest.py`):
```python
import requests
import json
from datetime import datetime, timedelta
import random

API_KEY = "gai_xxxxxxxxxxxxx"  # Your generated API key
PROJECT_ID = "proj_xxxxxxxxxxxxx"  # Your project ID
BASE_URL = "http://localhost:8000"

def ingest_test_job():
    """Ingest a test job run."""
    run_id = f"test-run-{random.randint(1000, 9999)}"
    start_time = datetime.utcnow() - timedelta(hours=2)
    end_time = datetime.utcnow()

    payload = {
        "run_id": run_id,
        "run_name": f"Test Training Run {run_id}",
        "project_id": PROJECT_ID,
        "status": "success",
        "start_time": start_time.isoformat() + "Z",
        "end_time": end_time.isoformat() + "Z",
        "duration_seconds": 7200,
        "hardware": {
            "gpu_count": 2,
            "gpu_model": "NVIDIA A100",
            "cpu_count": 16,
            "cpu_model": "Intel Xeon",
            "memory_gb": 64
        },
        "energy": {
            "total_kwh": 5.5,
            "gpu_kwh": 4.0,
            "cpu_kwh": 1.0,
            "ram_kwh": 0.5
        },
        "region": "us-west-2",
        "cloud_provider": "aws",
        "model_version_id": "bert-base-uncased",
        "job_type": "training",
        "metrics": {
            "final_loss": 0.25,
            "accuracy": 0.92
        }
    }

    response = requests.post(
        f"{BASE_URL}/api/ingest/job-run",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        },
        json=payload
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    result = response.json()
    assert "job_run_id" in result
    assert "emissions_kg" in result
    print(f"✅ Job ingested successfully! Emissions: {result['emissions_kg']} kg CO2e")

    return result

if __name__ == "__main__":
    # Ingest 5 test jobs
    for i in range(5):
        print(f"\nIngesting job {i+1}/5...")
        result = ingest_test_job()

    print("\n✅ All jobs ingested successfully!")
```

**Run the test**:
```bash
python test_ingest.py
```

**Expected Result**:
- ✅ All 5 jobs ingested (201 status)
- ✅ Each returns `job_run_id` and `emissions_kg`
- ✅ No errors or rate limiting

**Verification**:
```bash
# Check jobs in database
psql $DATABASE_URL -c "SELECT run_name, status, created_at FROM job_runs ORDER BY created_at DESC LIMIT 5;"

# Check energy records
psql $DATABASE_URL -c "SELECT total_kwh, emissions_kg FROM job_run_energy ORDER BY created_at DESC LIMIT 5;"
```

---

### Test 5: Dashboard Analytics

**Objective**: Verify dashboard displays correct metrics

**Steps**:
1. Navigate to Dashboard (home page)
2. Verify metrics are displayed:
   - Total emissions
   - Total energy
   - Job runs count
   - Equivalents (miles driven, trees, etc.)

**Expected Result**:
- ✅ Metrics match ingested data
- ✅ Charts/graphs render correctly
- ✅ Recent activity shows latest jobs

**Verification**:
```bash
# Calculate expected totals
psql $DATABASE_URL -c "
SELECT
    COUNT(*) as job_count,
    SUM(e.total_kwh) as total_energy,
    SUM(e.emissions_kg) as total_emissions
FROM job_runs jr
JOIN job_run_energy e ON e.job_run_id = jr.id
WHERE jr.project_id IN (
    SELECT id FROM projects WHERE organization_id = (
        SELECT organization_id FROM users WHERE email='test1@greenai-test.com'
    )
);
"
```

Compare these totals with dashboard display.

---

### Test 6: Analytics Pages

**Objective**: Verify all analytics features work

**Test Summary Page**:
1. Navigate to "Analytics" → "Summary"
2. Verify displays:
   - Total emissions
   - Total energy
   - Job runs count
   - Time period selector

**Test Trends Page**:
1. Navigate to "Analytics" → "Trends"
2. Verify:
   - Monthly trend chart displays
   - Can toggle between energy/emissions
   - Data matches expected values

**Test Hotspots Page**:
1. Navigate to "Analytics" → "Hotspots"
2. Verify:
   - Top 10 emitting jobs displayed
   - Can click for details
   - Percentage of total shown

**Expected Result**: All analytics pages load and display correct data

---

### Test 7: Data Export

**Objective**: Verify data can be exported

**Test CSV Export**:
1. Navigate to "Job Runs" page
2. Click "Export" → "CSV"
3. Select date range: Last 7 days
4. Click "Download"

**Expected Result**:
- ✅ CSV file downloads
- ✅ Contains all job runs
- ✅ All fields present (run_name, status, energy, emissions, etc.)

**Test JSON Export**:
1. Navigate to "Analytics" page
2. Click "Export" → "JSON"
3. Click "Download"

**Expected Result**:
- ✅ JSON file downloads
- ✅ Contains analytics summary
- ✅ Valid JSON format

---

### Test 8: Reports Generation

**Objective**: Verify PDF reports can be generated

**Steps**:
1. Navigate to "Reports" page
2. Click "Generate Report"
3. Select:
   - Type: Summary
   - Period: Last 30 days
   - Projects: All
4. Click "Generate"

**Expected Result**:
- ✅ Report generation starts
- ✅ Status shows "Generating..."
- ✅ Within 30 seconds, status changes to "Ready"
- ✅ Can download PDF
- ✅ PDF opens correctly with all data

**Verification**:
```bash
# Check report in database
psql $DATABASE_URL -c "SELECT report_type, status, created_at FROM reports ORDER BY created_at DESC LIMIT 1;"
```

---

### Test 9: Billing & Subscription

**Objective**: Verify billing features work

**Test Usage Display**:
1. Navigate to "Billing" page
2. Verify displays:
   - Current plan
   - Usage statistics (job runs, projects, users)
   - Usage percentage bars

**Expected Result**:
- ✅ Current plan shown (Starter)
- ✅ Job runs: 5 / 10,000 (0.05%)
- ✅ Projects: 1 / 3
- ✅ Users: 1 / 2

**Test Plan Upgrade Flow**:
1. Click "Upgrade Plan"
2. Select "Professional" plan
3. Click "Continue to Payment"
4. **Do NOT complete payment** (test mode)

**Expected Result**:
- ✅ Razorpay payment dialog opens
- ✅ Shows correct amount (₹49)
- ✅ Can cancel without charges

---

### Test 10: User Management

**Objective**: Verify multi-user features

**Test Invite User**:
1. Navigate to "Settings" → "Team"
2. Click "Invite User"
3. Enter:
   - Email: teammate@greenai-test.com
   - Role: Member
4. Click "Send Invitation"

**Expected Result**:
- ✅ Invitation sent
- ✅ Email sent to user (check logs)
- ✅ Shows in pending invitations

**Test Accept Invitation**:
1. Check email logs for invitation link
2. Open link in incognito/private window
3. Create password
4. Log in

**Expected Result**:
- ✅ User can access organization
- ✅ Can see shared projects
- ✅ Cannot modify billing (Member role)

---

## Integration Testing

### Test API Rate Limiting

**Objective**: Verify rate limits are enforced

**Test Script** (save as `test_rate_limit.py`):
```python
import requests
import time

API_KEY = "gai_xxxxxxxxxxxxx"
BASE_URL = "http://localhost:8000"

def test_rate_limit():
    """Test rate limiting by sending rapid requests."""
    requests_sent = 0
    rate_limited = False

    for i in range(150):  # Exceed 100/min limit
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer YOUR_JWT_TOKEN"}
        )
        requests_sent += 1

        if response.status_code == 429:
            rate_limited = True
            print(f"✅ Rate limited after {requests_sent} requests")
            print(f"Headers: {response.headers}")
            break

        time.sleep(0.1)  # Small delay

    assert rate_limited, "Rate limiting not working!"
    print("✅ Rate limiting test passed")

if __name__ == "__main__":
    test_rate_limit()
```

**Expected Result**:
- ✅ Rate limited after ~100 requests
- ✅ Returns 429 status code
- ✅ Headers include rate limit info

---

### Test Duplicate Job Detection

**Objective**: Verify duplicate run_id is rejected

**Test Script**:
```python
import requests

API_KEY = "gai_xxxxxxxxxxxxx"
PROJECT_ID = "proj_xxxxxxxxxxxxx"
BASE_URL = "http://localhost:8000"

def test_duplicate_detection():
    """Test that duplicate run_id is rejected."""
    payload = {
        "run_id": "duplicate-test-run",
        "run_name": "Duplicate Test",
        "project_id": PROJECT_ID,
        "status": "success",
        "start_time": "2026-02-12T10:00:00Z",
        "end_time": "2026-02-12T11:00:00Z",
        "duration_seconds": 3600,
        "hardware": {"gpu_count": 1, "gpu_model": "T4"},
        "energy": {"total_kwh": 1.0},
        "region": "us-west-2"
    }

    # First request should succeed
    response1 = requests.post(
        f"{BASE_URL}/api/ingest/job-run",
        headers={"X-API-Key": API_KEY},
        json=payload
    )
    assert response1.status_code == 201
    print("✅ First request succeeded")

    # Second request with same run_id should fail
    response2 = requests.post(
        f"{BASE_URL}/api/ingest/job-run",
        headers={"X-API-Key": API_KEY},
        json=payload
    )
    assert response2.status_code == 409  # Conflict
    assert "already exists" in response2.json()["detail"].lower()
    print("✅ Duplicate correctly rejected")

if __name__ == "__main__":
    test_duplicate_detection()
```

**Expected Result**:
- ✅ First request: 201 Created
- ✅ Second request: 409 Conflict

---

## Performance Testing

### Test Dashboard Load Time

**Objective**: Verify dashboard loads quickly

**Test**:
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh dashboard page
4. Measure "Load" time

**Expected Result**:
- ✅ Page load < 2 seconds
- ✅ API calls complete < 500ms
- ✅ No console errors

---

### Test High-Volume Ingestion

**Objective**: Verify system handles bulk ingestion

**Test Script** (save as `test_bulk_ingest.py`):
```python
import requests
import concurrent.futures
from datetime import datetime
import random

API_KEY = "gai_xxxxxxxxxxxxx"
PROJECT_ID = "proj_xxxxxxxxxxxxx"
BASE_URL = "http://localhost:8000"

def ingest_single_job(i):
    """Ingest a single job."""
    payload = {
        "run_id": f"bulk-test-{i}",
        "run_name": f"Bulk Test {i}",
        "project_id": PROJECT_ID,
        "status": "success",
        "start_time": datetime.utcnow().isoformat() + "Z",
        "end_time": datetime.utcnow().isoformat() + "Z",
        "duration_seconds": random.randint(1800, 7200),
        "hardware": {"gpu_count": 1, "gpu_model": "T4"},
        "energy": {"total_kwh": random.uniform(1.0, 5.0)},
        "region": "us-west-2"
    }

    response = requests.post(
        f"{BASE_URL}/api/ingest/job-run",
        headers={"X-API-Key": API_KEY},
        json=payload
    )
    return response.status_code == 201

def test_bulk_ingestion():
    """Test ingesting 100 jobs in parallel."""
    print("Ingesting 100 jobs in parallel...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(ingest_single_job, i) for i in range(100)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    success_count = sum(results)
    print(f"✅ {success_count}/100 jobs ingested successfully")
    assert success_count >= 95, "Too many failures!"

if __name__ == "__main__":
    test_bulk_ingestion()
```

**Run the test**:
```bash
python test_bulk_ingest.py
```

**Expected Result**:
- ✅ At least 95/100 jobs succeed
- ✅ Completes within 60 seconds
- ✅ Database not overloaded

---

## Security Testing

### Test 1: Invalid API Key

```bash
# Test with invalid API key
curl -X POST http://localhost:8000/api/ingest/job-run \
  -H "X-API-Key: invalid_key" \
  -H "Content-Type: application/json" \
  -d '{"run_id":"test"}'
```

**Expected Result**:
- ✅ Returns 401 Unauthorized
- ✅ Error message: "Invalid or expired API key"

---

### Test 2: Missing Authentication

```bash
# Test without API key
curl -X POST http://localhost:8000/api/ingest/job-run \
  -H "Content-Type: application/json" \
  -d '{"run_id":"test"}'
```

**Expected Result**:
- ✅ Returns 401 Unauthorized
- ✅ Error message about missing authentication

---

### Test 3: SQL Injection Prevention

```bash
# Test SQL injection in run_name
curl -X POST http://localhost:8000/api/ingest/job-run \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "sql-test",
    "run_name": "test'; DROP TABLE job_runs; --",
    "project_id": "'$PROJECT_ID'",
    "status": "success",
    "start_time": "2026-02-12T10:00:00Z",
    "end_time": "2026-02-12T11:00:00Z",
    "hardware": {"gpu_count": 1},
    "region": "us-west-2"
  }'
```

**Expected Result**:
- ✅ Request succeeds (SQL injection escaped)
- ✅ Table not dropped
- ✅ Run name stored with quotes escaped

---

## User Acceptance Testing

### Scenario 1: New User Onboarding

**As a new user**, I want to:
1. ✅ Create an account easily
2. ✅ Understand what the platform does
3. ✅ Create my first project
4. ✅ Generate an API key
5. ✅ See example code for integration
6. ✅ Ingest my first job run
7. ✅ See results in the dashboard

**Test this scenario** with a new test account and verify all steps work smoothly.

---

### Scenario 2: Data Analysis

**As a data scientist**, I want to:
1. ✅ View emissions trends over time
2. ✅ Identify my most carbon-intensive jobs
3. ✅ Compare different experiments
4. ✅ Export data for further analysis
5. ✅ Generate a report for my manager

**Test this scenario** by navigating through all analytics features.

---

### Scenario 3: Team Collaboration

**As a team lead**, I want to:
1. ✅ Invite team members
2. ✅ Share projects with my team
3. ✅ Control access permissions
4. ✅ View team activity
5. ✅ Generate team-wide reports

**Test this scenario** with multiple test accounts.

---

## Final Checklist

Before declaring the system ready for production:

### Functionality
- [ ] All core features work (signup, login, projects, API keys, ingestion)
- [ ] Analytics display correct data
- [ ] Reports generate successfully
- [ ] Exports work (CSV, JSON, PDF)
- [ ] Billing page displays usage correctly

### Performance
- [ ] Dashboard loads < 2 seconds
- [ ] API endpoints respond < 500ms
- [ ] Can handle 100+ concurrent ingestions
- [ ] Database queries optimized (no N+1 issues)

### Security
- [ ] Authentication works correctly
- [ ] Authorization prevents unauthorized access
- [ ] API keys can be revoked
- [ ] Rate limiting enforced
- [ ] SQL injection prevented
- [ ] XSS prevention working

### User Experience
- [ ] UI is intuitive and responsive
- [ ] Error messages are helpful
- [ ] Loading states show clearly
- [ ] Forms validate input properly
- [ ] Mobile view works (if applicable)

### Monitoring
- [ ] Health checks pass
- [ ] Logs are readable and useful
- [ ] Errors are captured (Sentry)
- [ ] Metrics are tracked (Prometheus)

---

## Troubleshooting Common Issues

### Issue: Jobs not showing in dashboard

**Solution**:
1. Check job was ingested successfully (201 status)
2. Verify project_id matches
3. Check organization_id is correct
4. Refresh dashboard

### Issue: Emissions calculation seems wrong

**Solution**:
1. Verify energy values are in kWh (not Wh)
2. Check region emission factor is correct
3. Review hardware power consumption estimates

### Issue: API key not working

**Solution**:
1. Verify key was copied correctly (no spaces)
2. Check key is active (not revoked)
3. Verify key has correct scopes
4. Check rate limits not exceeded

---

## Next Steps

After completing all tests:

1. ✅ Document any issues found
2. ✅ Fix critical bugs
3. ✅ Re-test failed scenarios
4. ✅ Deploy to staging environment
5. ✅ Run tests on staging
6. ✅ Get stakeholder approval
7. ✅ Deploy to production
8. ✅ Monitor for 48 hours
9. ✅ Onboard first real users

---

**Testing Completed By**: _____________
**Date**: _____________
**All Tests Passed**: ☐ Yes ☐ No
**Ready for Production**: ☐ Yes ☐ No

---

**Last Updated**: 2026-02-12
**Version**: 1.0
