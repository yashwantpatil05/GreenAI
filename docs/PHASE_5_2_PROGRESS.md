# Phase 5.2: Test Fixes & Coverage Improvement - IN PROGRESS

**Started:** February 9, 2026
**Current Status:** 🟡 70% Coverage Achieved (Target: 80%+)

---

## Progress Summary

### Current Metrics

| Metric | Before (Phase 5.1) | After (Phase 5.2) | Improvement |
|--------|-------------------|------------------|-------------|
| **Total Tests** | 195 | 195 | - |
| **Passing Tests** | 107 (55%) | **125 (64%)** | **+18 tests** ✅ |
| **Failing Tests** | 88 (45%) | **70 (36%)** | **-18 tests** ✅ |
| **Code Coverage** | 68% | **70%** | **+2%** ✅ |
| **Total Lines** | 4,952 | 4,982 | +30 |
| **Covered Lines** | 3,378 | 3,497 | +119 ✅ |

---

## Phase 5.2.1: Authentication Middleware Fixed ✅

### Problems Identified

1. **Missing `organization_members` table** - Table wasn't being created in test database
2. **JWT token using email instead of user_id** - Authentication lookup failed
3. **Missing organization membership records** - No OrganizationMember created for test users
4. **Database session mismatch** - Auth code using different DB session than tests
5. **PostgreSQL `date_trunc` function** - SQLite doesn't support this function

### Solutions Implemented

#### 1. Import OrganizationMember Model
```python
# conftest.py
import backend.app.models  # noqa: F401
from backend.app.models.organization_member import OrganizationMember
```

#### 2. Create Organization Membership in Tests
```python
@pytest.fixture
def test_user(db: Session, test_organization: Organization) -> User:
    user = User(...)
    db.add(user)
    db.flush()

    # Create organization membership (required for authentication)
    membership = OrganizationMember(
        id=uuid4(),
        user_id=user.id,
        organization_id=test_organization.id,
        role="owner",
    )
    db.add(membership)
    db.commit()
    return user
```

#### 3. Fix JWT Token to Include Organization Claims
```python
@pytest.fixture
def auth_headers(test_user: User, test_organization: Organization) -> dict:
    # Include org_id and role in token to avoid DB lookup
    token = create_access_token(
        subject=str(test_user.id),  # Use ID, not email
        additional_claims={
            "email": test_user.email,
            "organization_id": str(test_organization.id),
            "role": test_user.role,
        }
    )
    return {"Authorization": f"Bearer {token}"}
```

#### 4. Add SQLite `date_trunc` Function
```python
def sqlite_date_trunc(precision, date_value):
    """Emulate PostgreSQL date_trunc for SQLite."""
    if precision == 'day':
        return date_obj.strftime('%Y-%m-%d')
    elif precision == 'month':
        return date_obj.strftime('%Y-%m-01')
    # ... more precision levels

@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    if hasattr(dbapi_conn, 'create_function'):  # SQLite only
        dbapi_conn.create_function("date_trunc", 2, sqlite_date_trunc)
```

### Results

✅ **18 analytics API tests now passing**
✅ **Authentication 401 errors resolved**
✅ **SQLite date_trunc compatibility achieved**
✅ **2% coverage increase** (68% → 70%)

---

## Remaining Issues (70 Failing Tests)

### By Category

| Category | Failing Tests | Root Cause |
|----------|---------------|------------|
| **Emissions Service** | 11 tests | Service implementation gaps, missing DB session |
| **Job Runs API** | 17 tests | Schema mismatches, missing fields |
| **Billing/Usage** | 11 tests | Service not using test DB, implementation gaps |
| **Celery Tasks** | 10 tests | Mock configuration, async execution |
| **Email Service** | 5 tests | SendGrid mock timing |
| **Storage/GCS** | 8 tests | GCS mock configuration |
| **Analytics (remaining)** | 6 tests | Missing endpoints/features |
| **Export API** | 1 test | Minor schema issue |
| **Other** | 1 test | Various |

---

## Phase 5.2.2: Refine External Service Mocks (In Progress)

### Remaining Mock Issues

#### 1. Emissions Service Tests (11 failures)
**Problem:** `compute_emissions_for_job_run` creates new DB session
**Solution:** Modify service to accept `db` parameter for testing

#### 2. Job Runs Ingestion Tests (17 failures)
**Problem:** Schema validation failures, missing fields
**Solution:** Update test payloads to match actual schemas

#### 3. Billing Service Tests (11 failures)
**Problem:** Service functions not using test database
**Solution:** Pass `db` session to service functions

#### 4. Celery Task Tests (10 failures)
**Problem:** Task execution not properly mocked
**Solution:** Better mock configuration for task.apply_async()

#### 5. Email Service Tests (5 failures)
**Problem:** SendGrid mock not intercepting all calls
**Solution:** Improve monkeypatch timing and scope

#### 6. Storage/GCS Tests (8 failures)
**Problem:** GCS client mock not properly configured
**Solution:** Enhanced MockStorageClient with all methods

---

## Coverage Breakdown (70% Overall)

### High Coverage (90-100%) ✅

- **Models:** 95-100% (Organization, JobRun, User, etc.)
- **Schemas:** 82-100% (JobRun, ApiKey, AuditLog, etc.)
- **Export Service:** 96%
- **Storage Service:** 96% (in tests)
- **Test Analytics:** 93%
- **Test Email:** 93%
- **Test Export:** 98%

### Medium Coverage (50-89%) ⚠️

- **Email Service:** 59%
- **Billing Service:** 56%
- **Storage Service:** 52% (actual)
- **Job Service:** 51%
- **Rate Limit Service:** 48%
- **Test Conftest:** 67%
- **Report Service:** 68%
- **Celery App:** 62%
- **Worker Tasks:** 62%

### Low Coverage (<50%) ⚠️

- **Emissions Service:** 41%
- **Subscription Limits:** 39%
- **ESG Service:** 36%
- **Project Service:** 32%
- **Suggestion Service:** 26%

---

## Next Steps for Phase 5.2

### Priority 1: Fix Service Database Session Issues
**Impact:** +15 tests, +3% coverage
**Tasks:**
- Modify `compute_emissions_for_job_run` to accept `db` parameter
- Update billing service functions to use injected DB session
- Fix job service to use test database

### Priority 2: Fix Schema Validation in Job Runs Tests
**Impact:** +17 tests, +2% coverage
**Tasks:**
- Update test payloads to match actual JobRunCreate schema
- Add missing required fields (hardware, energy)
- Fix field type mismatches

### Priority 3: Improve External Service Mocks
**Impact:** +20 tests, +2% coverage
**Tasks:**
- Enhance Celery mock with proper async behavior
- Fix SendGrid mock scope and timing
- Complete GCS mock implementation

### Priority 4: Add Integration Tests
**Impact:** +5% coverage
**Tasks:**
- End-to-end job run ingestion → emissions → analytics flow
- Multi-project organization scenarios
- Rate limiting under load

### Priority 5: Performance Benchmarking
**Impact:** Validate scalability
**Tasks:**
- Load test with 1,000 concurrent job ingestions
- Analytics query performance with 100K runs
- Database connection pool stress test

---

## Estimated Completion

| Task | Tests Fixed | Coverage Gain | Time Estimate |
|------|-------------|---------------|---------------|
| **Service DB Sessions** | +15 | +3% | 2-3 hours |
| **Schema Fixes** | +17 | +2% | 1-2 hours |
| **Mock Improvements** | +20 | +2% | 2-3 hours |
| **Integration Tests** | +10 | +5% | 3-4 hours |
| **Performance Tests** | - | - | 2 hours |
| **Documentation** | - | - | 1 hour |

**Total Estimated Time:** 11-15 hours
**Expected Final Coverage:** **82-85%**
**Expected Final Pass Rate:** **92-95%**

---

## Files Modified in Phase 5.2.1

### ✅ backend/app/tests/conftest.py
**Changes:**
- Added `import backend.app.models` to ensure all models loaded
- Created `OrganizationMember` record in `test_user` fixture
- Updated `auth_headers` to include organization claims in JWT
- Added SQLite `date_trunc` function emulation
- Registered custom SQL functions on connection

**Lines Changed:** ~50 lines added/modified

---

## Test Execution

### Run All Tests
```bash
set PYTHONPATH=backend
python -m pytest backend/app/tests/ -v
```

### Run with Coverage
```bash
set PYTHONPATH=backend
python -m pytest backend/app/tests/ --cov=backend/app --cov-report=html --cov-report=term
```

### View HTML Coverage Report
```bash
start backend/htmlcov/index.html
```

---

## Success Metrics (Current vs Target)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Coverage** | 70% | 80%+ | 🟡 87% to goal |
| **Passing Tests** | 125 (64%) | 175 (90%+) | 🟡 71% to goal |
| **Failing Tests** | 70 (36%) | <20 (10%) | 🟡 Progress made |

---

**Status:** Phase 5.2 is **70% complete** toward 80%+ coverage goal. Strong progress on authentication fixes. Remaining work focuses on service mocking and schema alignment.

**Next Session:** Continue with Priority 1-3 tasks to reach 80%+ coverage.
