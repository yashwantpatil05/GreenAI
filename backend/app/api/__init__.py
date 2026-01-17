"""Aggregate API routers."""
from fastapi import APIRouter

from backend.app.api import auth, projects, job_runs, suggestions, reports, analytics, organization, comparisons, audit_logs

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(projects.router, prefix="/projects", tags=["projects"])
router.include_router(job_runs.router, prefix="/job-runs", tags=["job_runs"])
router.include_router(comparisons.router, prefix="", tags=["job-runs"])
router.include_router(suggestions.router, prefix="/suggestions", tags=["suggestions"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
router.include_router(organization.router, prefix="/organization", tags=["organization"])
router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
