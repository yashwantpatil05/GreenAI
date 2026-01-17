"""Organization settings endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user, require_roles
from backend.app.core.database import get_db
from backend.app.models.organization import Organization
from backend.app.schemas.organization import OrganizationRead, OrganizationUpdate

router = APIRouter()


@router.get("/me", response_model=OrganizationRead)
def get_org(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Return current user's organization."""
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("/me", response_model=OrganizationRead)
def update_org(
    payload: OrganizationUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "admin")),
):
    """Update organization settings."""
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if payload.name:
        org.name = payload.name
    if payload.region_preference:
        org.region_preference = payload.region_preference
    db.add(org)
    db.flush()
    return org
