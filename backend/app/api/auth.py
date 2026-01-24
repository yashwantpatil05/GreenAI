"""Authentication endpoints (Supabase Auth + local tenant bootstrap)."""

from __future__ import annotations

import logging
from typing import Any, Dict
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.auth.security import create_access_token
from backend.app.auth.context import get_request_context
from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.models.organization import Organization
from backend.app.models.organization_member import OrganizationMember
from backend.app.models.user import User
from backend.app.schemas.auth import Token
from backend.app.schemas.user import UserCreate, UserRead
from backend.app.services.rate_limit_service import rate_limiter
from backend.app.services.audit_service import audit_log, AuditEvent

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


def _supabase_url() -> str:
    url = (settings.supabase_url or "").rstrip("/")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL is not set",
        )
    return url


def _supabase_service_key() -> str:
    key = settings.supabase_service_role_key.get_secret_value()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_SERVICE_ROLE_KEY is not set",
        )
    return key


def _supabase_anon_key_fallback() -> str:
    # used only for password login if anon key exists; else service role (dev fallback)
    anon = settings.supabase_anon_key.get_secret_value() if settings.supabase_anon_key else None
    return anon or _supabase_service_key()


def _httpx_request(
    url: str,
    headers: Dict[str, str],
    payload: Dict[str, Any],
    method: str = "post",
) -> Dict[str, Any]:
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.request(method=method, url=url, headers=headers, json=payload)
    except httpx.HTTPError:
        logger.exception("Supabase request failed")
        raise HTTPException(status_code=502, detail="Supabase Auth unreachable")

    # Supabase errors usually return JSON
    if r.status_code >= 400:
        try:
            j = r.json()
            msg = (
                j.get("msg")
                or j.get("message")
                or j.get("error_description")
                or j.get("error")
                or r.text
                or f"status {r.status_code}"
            )
        except Exception:
            msg = r.text or f"status {r.status_code}"
        status_code = (
            status.HTTP_401_UNAUTHORIZED
            if r.status_code in (401, 403)
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=f"Supabase error: {msg}")

    try:
        return r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Supabase returned non-JSON response")


def _supabase_admin_create_user(email: str, password: str) -> UUID:
    """
    Robust backend signup: uses Supabase Admin API (service role key)
    and always returns a user id (no 'missing user id' issues).
    """
    base = _supabase_url()
    service_key = _supabase_service_key()

    endpoint = f"{base}/auth/v1/admin/users"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    data = _httpx_request(
        endpoint,
        headers=headers,
        payload={
            "email": email,
            "password": password,
            "email_confirm": True,
            # Auto-confirm to prevent Supabase password login from blocking on email confirmation
        },
    )

    user_id = data.get("id") or (data.get("user") or {}).get("id")
    if not user_id:
        raise HTTPException(status_code=502, detail="Supabase admin create user returned no user id")
    try:
        return UUID(str(user_id))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Supabase returned invalid user id: {exc}")


def _supabase_password_login(email: str, password: str) -> Dict[str, Any]:
    base = _supabase_url()
    key = _supabase_anon_key_fallback()
    if not key:
        raise HTTPException(status_code=500, detail="SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set")

    endpoint = f"{base}/auth/v1/token?grant_type=password"
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    return _httpx_request(endpoint, headers=headers, payload={"email": email, "password": password})


def _supabase_admin_confirm_user(user_id: UUID) -> None:
    """
    Force-confirm a Supabase user via Admin API.
    Used as a recovery for "Email not confirmed" during backend bootstrap flows.
    """
    base = _supabase_url()
    service_key = _supabase_service_key()
    endpoint = f"{base}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    # Best-effort; errors propagate to caller
    _httpx_request(endpoint, headers=headers, payload={"email_confirm": True, "phone_confirm": True}, method="put")


def _issue_internal_token(user_id: UUID, organization_id: UUID, role: str, email: str | None) -> str:
    claims: Dict[str, Any] = {"org": str(organization_id), "role": role}
    if email:
        claims["email"] = email
    return create_access_token(subject=str(user_id), additional_claims=claims)


def _get_or_create_org(db: Session, name: str) -> Organization:
    org = db.query(Organization).filter(Organization.name == name).first()
    if org:
        return org
    org = Organization(name=name)
    db.add(org)
    db.flush()  # ensures org.id is available (python default)
    return org


def _upsert_user_for_supabase(db: Session, user_id: UUID, email: str, org_id: UUID, role: str) -> User:
    u = db.query(User).filter(User.id == user_id).first()
    if u:
        u.email = email
        u.organization_id = org_id
        # ensure non-null constraints are satisfied
        if not u.hashed_password:
            u.hashed_password = "SUPABASE_MANAGED"
        if not u.auth_provider:
            u.auth_provider = "supabase"
        u.role = role or u.role or "member"
        return u

    u = User(
        id=user_id,
        email=email,
        organization_id=org_id,
        # satisfy NOT NULL constraints in existing schema
        hashed_password="SUPABASE_MANAGED",
        auth_provider="supabase",
        role=role or "member",
    )
    db.add(u)
    db.flush()
    return u


def _ensure_owner_membership(db: Session, org_id: UUID, user_id: UUID, role: str = "owner") -> OrganizationMember:
    existing = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == user_id)
        .first()
    )
    if existing:
        existing.role = role
        return existing
    m = OrganizationMember(organization_id=org_id, user_id=user_id, role=role)
    db.add(m)
    db.flush()
    return m


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db), ctx=Depends(get_request_context)):
    """
    1) Create Supabase user (Admin API)
    2) Create/attach Organization
    3) Create/attach local User row (non-null safe)
    4) Ensure OrganizationMember owner
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    try:
        rate_limiter.check(
            key=payload.email,
            scope="user",
            limit=settings.rate_limit_user_per_minute,
            burst=settings.rate_limit_burst_multiplier,
            db=db,
            context=ctx,
        )
        sb_user_id = _supabase_admin_create_user(payload.email, payload.password)

        org = _get_or_create_org(db, payload.organization_name)
        user = _upsert_user_for_supabase(db, sb_user_id, payload.email, org.id, role="owner")
        membership = _ensure_owner_membership(db, org.id, sb_user_id, role="owner")
        db.flush()
        db.refresh(user)

        # return dict to avoid any pydantic from_attributes mismatch
        result = {
            "id": user.id,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "email": user.email,
            "role": membership.role or user.role,
            "organization_id": user.organization_id or membership.organization_id,
        }
        audit_log(
            AuditEvent(
                organization_id=org.id,
                actor_type="user",
                actor_user_id=user.id,
                action="auth.signup",
                status="success",
                request_id=ctx.request_id,
                metadata={"email": payload.email},
            ),
            db,
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Signup failed")
        raise HTTPException(status_code=500, detail=f"Signup failed: {e}")


@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), ctx=Depends(get_request_context)):
    """
    Supabase password login -> internal JWT for backend authorization.
    """
    try:
        rate_limiter.check(
            key=form_data.username,
            scope="user",
            limit=settings.rate_limit_user_per_minute,
            burst=settings.rate_limit_burst_multiplier,
            db=db,
            context=ctx,
        )
        # Use local DB to locate user and org context first
        user = db.query(User).filter(User.email == form_data.username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not provisioned; complete signup")

        # Attempt Supabase password login; if email not confirmed, confirm via Admin API then retry once
        try:
            sb = _supabase_password_login(form_data.username, form_data.password)
        except HTTPException as exc:
            if "Email not confirmed" in str(exc.detail):
                _supabase_admin_confirm_user(user.id)
                sb = _supabase_password_login(form_data.username, form_data.password)
            else:
                raise

        user_id = None
        if isinstance(sb.get("user"), dict):
            user_id = sb["user"].get("id")
        if not user_id and isinstance(sb.get("session"), dict) and isinstance(sb["session"].get("user"), dict):
            user_id = sb["session"]["user"].get("id")

        if not user_id:
            raise HTTPException(status_code=502, detail="Supabase login returned no user id")

        try:
            user_uuid = UUID(str(user_id))
        except Exception:
            raise HTTPException(status_code=502, detail="Supabase login returned invalid user id")

        if user.id != user_uuid:
            # Sync Supabase -> local id to avoid mismatched accounts
            user.id = user_uuid

        sb_email = (sb.get("user") or {}).get("email") if isinstance(sb.get("user"), dict) else None
        if sb_email and sb_email != user.email:
            user.email = sb_email

        membership = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.user_id == user_uuid)
            .order_by(OrganizationMember.created_at.asc())
            .first()
        )
        if not membership:
            raise HTTPException(status_code=403, detail="User has no organization membership")

        if not user.organization_id:
            user.organization_id = membership.organization_id

        db.flush()

        token = _issue_internal_token(
            user_uuid,
            membership.organization_id,
            membership.role or user.role or "member",
            user.email,
        )
        audit_log(
            AuditEvent(
                organization_id=membership.organization_id,
                actor_type="user",
                actor_user_id=user_uuid,
                action="auth.login",
                status="success",
                request_id=ctx.request_id,
                metadata={"email": user.email},
            ),
            db,
        )
        db.commit()
        return Token(access_token=token)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Login failed")
        raise


@router.post("/oauth-exchange", response_model=Token)
def oauth_exchange(db: Session = Depends(get_db), ctx=Depends(get_request_context)):
    """
    Exchange a Supabase OAuth session token for our internal JWT.
    Frontend should send: Authorization: Bearer <supabase_access_token>
    """
    from fastapi import Header
    
    async def get_supabase_token(authorization: str = Header(None)) -> str:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization header")
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        return authorization.replace("Bearer ", "")
    
    # Get the token from the header
    import inspect
    frame = inspect.currentframe()
    try:
        if frame and frame.f_back:
            request = frame.f_back.f_locals.get('request')
            if request:
                auth_header = request.headers.get('Authorization', '')
                if not auth_header.startswith('Bearer '):
                    raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
                supabase_token = auth_header.replace('Bearer ', '')
            else:
                raise HTTPException(status_code=401, detail="Could not extract token")
        else:
            raise HTTPException(status_code=401, detail="Could not extract token")
    finally:
        del frame
    
    try:
        # Verify the Supabase token and get user info
        base = _supabase_url()
        service_key = _supabase_service_key()
        
        # Use Supabase Admin API to get user from access token
        with httpx.Client(timeout=20.0) as client:
            r = client.get(
                f"{base}/auth/v1/user",
                headers={
                    "apikey": service_key,
                    "Authorization": f"Bearer {supabase_token}",
                }
            )
        
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired Supabase token")
        
        user_data = r.json()
        user_id = UUID(user_data.get("id"))
        email = user_data.get("email")
        
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid user data from Supabase")
        
        # Check if user exists in our database
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            # Auto-provision user from OAuth login
            # Use email domain or email as org name
            org_name = email.split('@')[0] + "'s Organization"
            org = _get_or_create_org(db, org_name)
            user = _upsert_user_for_supabase(db, user_id, email, org.id, role="owner")
            _ensure_owner_membership(db, org.id, user_id, role="owner")
            db.flush()
        
        # Get user's organization membership
        membership = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.user_id == user_id)
            .order_by(OrganizationMember.created_at.asc())
            .first()
        )
        
        if not membership:
            raise HTTPException(status_code=403, detail="User has no organization membership")
        
        # Issue our internal JWT
        token = _issue_internal_token(
            user_id,
            membership.organization_id,
            membership.role or user.role or "member",
            email,
        )
        
        audit_log(
            AuditEvent(
                organization_id=membership.organization_id,
                actor_type="user",
                actor_user_id=user_id,
                action="auth.oauth_login",
                status="success",
                request_id=ctx.request_id,
                metadata={"email": email, "provider": "oauth"},
            ),
            db,
        )
        
        db.commit()
        return Token(access_token=token)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("OAuth exchange failed")
        raise HTTPException(status_code=500, detail=f"OAuth exchange failed: {str(e)}")
