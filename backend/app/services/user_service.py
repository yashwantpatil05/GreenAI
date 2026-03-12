# backend/app/services/user_service.py
from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.organization import Organization
from backend.app.models.organization_member import OrganizationMember
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate, UserLogin

logger = logging.getLogger(__name__)
settings = get_settings()


def _supabase_admin_create_user(email: str, password: str) -> UUID:
    """
    Creates user in Supabase Auth using Admin API (service role key).
    Returns Supabase Auth user UUID.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Supabase env vars not configured")

    url = settings.supabase_url.rstrip("/") + "/auth/v1/admin/users"
    service_key = settings.supabase_service_role_key.get_secret_value()
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }
    payload = {"email": email, "password": password, "email_confirm": True}

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=20)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supabase auth request failed: {type(e).__name__}")

    # Try to extract a useful error message from Supabase
    err_msg = ""
    try:
        j = resp.json() if resp.text else {}
        err_msg = (
            j.get("msg")
            or j.get("message")
            or j.get("error_description")
            or j.get("error")
            or str(j)
        )
    except Exception:
        err_msg = resp.text[:500] if resp.text else ""

    if resp.status_code >= 400:
        # IMPORTANT: Return the actual Supabase error in response so you can see it in Swagger/curl
        raise HTTPException(
            status_code=502,
            detail=f"Supabase admin create user failed ({resp.status_code}): {err_msg}",
        )

    try:
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Supabase returned invalid JSON response")

    user_id = data.get("id") or (data.get("user") or {}).get("id")
    if not user_id:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase create user missing id. Response keys={list(data.keys())}",
        )

    return UUID(user_id)



def create_user(db: Session, payload: UserCreate) -> User:
    """
    Creates:
    1) Supabase Auth user (source of truth for password)
    2) Local user profile + org + membership
    """
    # safety: block duplicates locally
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    supabase_user_id = _supabase_admin_create_user(payload.email, payload.password)

    try:
        org = Organization(name=payload.organization_name)
        db.add(org)
        db.flush()  # org.id

        user = User(
            id=supabase_user_id,
            email=payload.email,
            full_name=None,
            organization_id=org.id,
            auth_provider="supabase",
            hashed_password="SUPABASE_MANAGED",
            role="owner",
        )
        db.add(user)
        db.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role="owner",
        )
        db.add(member)

        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Local DB create_user failed after Supabase user creation")
        raise HTTPException(status_code=500, detail="Failed to create user locally")


def authenticate_user(db: Session, payload: UserLogin) -> Optional[str]:
    """
    If you're using Supabase Auth, login should happen via Supabase /token endpoint.
    Keeping placeholder for now so code doesn't break.
    """
    raise HTTPException(status_code=501, detail="Use Supabase login endpoint (not implemented yet)")
