"""Project management routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user, require_roles
from backend.app.core.database import get_db
from backend.app.schemas.api_key import ApiKeyCreate, ApiKeyRead
from backend.app.schemas.organization import ProjectCreate, ProjectRead
from backend.app.services.project_service import (
    create_api_key,
    create_project,
    list_projects,
    list_api_keys_for_org,
    unblock_api_key,
)
from backend.app.services.audit_service import audit_log, AuditEvent
from backend.app.auth.context import get_request_context


router = APIRouter()


@router.post("/", response_model=ProjectRead)
def create_project_endpoint(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "admin")),
    ctx=Depends(get_request_context),
):
    """Create a project for the current organization."""
    project = create_project(db, user.organization_id, payload)
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="project.create",
            resource_type="project",
            resource_id=project.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return project


@router.get("/", response_model=list[ProjectRead])
def list_project_endpoint(
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """List projects for the organization."""
    return list_projects(db, user.organization_id)


@router.post("/api-keys", response_model=ApiKeyRead)
def create_api_key_endpoint(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "admin", "engineer")),
    ctx=Depends(get_request_context),
):
    """Create API key."""
    api_key, raw_key = create_api_key(db, user.id, user.organization_id, payload)
    api_key.raw_key = raw_key  # type: ignore[attr-defined]
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="api_key.create",
            resource_type="api_key",
            resource_id=api_key.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return api_key


@router.get("/api-keys", response_model=list[ApiKeyRead])
def list_api_keys_endpoint(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """List API keys for the organization."""
    return list_api_keys_for_org(db, user.organization_id)


@router.post("/api-keys/{api_key_id}/unblock", response_model=ApiKeyRead)
def unblock_api_key_endpoint(
    api_key_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "admin")),
    ctx=Depends(get_request_context),
):
    """Unblock an API key after abuse protection."""
    key = unblock_api_key(db, user.organization_id, api_key_id)
    audit_log(
        AuditEvent(
            organization_id=user.organization_id,
            actor_type="user",
            actor_user_id=user.id,
            action="api_key.unblock",
            resource_type="api_key",
            resource_id=key.id,
            request_id=ctx.request_id,
        ),
        db,
    )
    return key
