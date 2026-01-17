"""Project and API key services."""
import secrets
from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.security import get_password_hash
from backend.app.models.api_key import ApiKey
from backend.app.models.project import Project
from backend.app.schemas.api_key import ApiKeyCreate
from backend.app.schemas.organization import ProjectCreate


def create_project(db: Session, org_id, payload: ProjectCreate) -> Project:
    """Create project under organization."""
    project = Project(
        name=payload.name, description=payload.description, organization_id=org_id
    )
    db.add(project)
    db.flush()
    return project


def list_projects(db: Session, org_id) -> List[Project]:
    """Return projects for organization."""
    return db.query(Project).filter(Project.organization_id == org_id).all()


def create_api_key(db: Session, user_id, org_id, payload: ApiKeyCreate) -> tuple[ApiKey, str]:
    """Create hashed API key scoped to the caller's organization and return plaintext once."""
    project = (
        db.query(Project)
        .filter(Project.id == payload.project_id, Project.organization_id == org_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_key = f"gai_{secrets.token_urlsafe(24)}"
    key_prefix = raw_key[:12]
    api_key = ApiKey(
        name=payload.name,
        hashed_key=get_password_hash(raw_key),
        key_prefix=key_prefix,
        organization_id=project.organization_id,
        project_id=project.id,
        user_id=user_id,
        active=True,
    )
    db.add(api_key)
    db.flush()
    return api_key, raw_key


def validate_api_key(db: Session, project_id, token: str) -> bool:
    """Validate hashed API key for ingestion endpoints."""
    api_keys = (
        db.query(ApiKey)
        .filter(
            ApiKey.project_id == project_id,
            ApiKey.active.is_(True),
            ApiKey.revoked_at.is_(None),
        )
        .all()
    )
    from backend.app.auth.security import verify_password

    return any(verify_password(token, key.hashed_key) for key in api_keys)


def list_api_keys_for_org(db: Session, org_id) -> List[ApiKey]:
    """List API keys for all projects within organization."""
    return db.query(ApiKey).filter(ApiKey.organization_id == org_id).all()


def unblock_api_key(db: Session, org_id, api_key_id) -> ApiKey:
    key = (
        db.query(ApiKey)
        .filter(ApiKey.id == api_key_id, ApiKey.organization_id == org_id)
        .first()
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.blocked_until = None
    db.flush()
    return key
