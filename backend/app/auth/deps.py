"""Auth dependencies (Phase 0: Supabase Auth).

- Validates Authorization: Bearer <supabase_jwt>
- Exposes robust primitives:
  - get_current_user_id()
  - get_current_principal()

Compatibility:
- Provides legacy exports expected by existing routes:
  - get_current_user  (alias -> get_current_principal)
  - require_roles     (temporary RBAC stub; real RBAC added after DB schema)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable, Optional, Sequence

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from backend.app.auth.security import decode_internal_token, decode_supabase_jwt
from backend.app.models.organization_member import OrganizationMember


logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    user_id: str
    organization_id: Optional[str]
    email: Optional[str]
    role: Optional[str] = None

    @property
    def id(self) -> str:
        return self.user_id


def _get_bearer_token(creds: Optional[HTTPAuthorizationCredentials]) -> str:
    if not creds or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    return creds.credentials


def _decode_claims(token: str):
    try:
        return decode_internal_token(token)
    except JWTError as internal_error:
        try:
            return decode_supabase_jwt(token)
        except JWTError:
            logger.debug("Token decode failed: %s", internal_error)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )


def _fetch_org_role(user_id: str) -> tuple[Optional[str], Optional[str]]:
    """Lookup a user's primary organization + role from memberships."""
    from backend.app.core.database import get_db_session
    
    with get_db_session() as session:
        try:
            membership = (
                session.query(OrganizationMember)
                .filter(OrganizationMember.user_id == user_id)
                .order_by(OrganizationMember.created_at.asc())
                .first()
            )
            if membership:
                return str(membership.organization_id), membership.role
        except Exception:
            logger.exception("Failed to fetch organization membership for %s", user_id)
    return None, None


def get_current_user_id(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    token = _get_bearer_token(creds)
    claims = _decode_claims(token)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")
    return str(user_id)


def get_current_principal(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Principal:
    token = _get_bearer_token(creds)
    claims = _decode_claims(token)

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    org_id = claims.get("org") or claims.get("organization_id")
    role = claims.get("role")

    if not org_id or not role:
        org_id_lookup, role_lookup = _fetch_org_role(str(user_id))
        org_id = org_id or org_id_lookup
        role = role or role_lookup

    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Organization context missing for user",
        )

    email = (
        claims.get("email")
        or claims.get("user_metadata", {}).get("email")
        or claims.get("app_metadata", {}).get("email")
    )

    return Principal(user_id=str(user_id), organization_id=str(org_id), email=email, role=role)


def get_current_user(
    principal: Principal = Depends(get_current_principal),
) -> Principal:
    return principal


def require_roles(*roles: str) -> Callable:
    """Simple RBAC guard using organization_members.role from the token or DB."""

    allowed: Sequence[str] = roles or ()

    def _guard(principal: Principal = Depends(get_current_principal)) -> Principal:
        if allowed and (principal.role is None or principal.role not in allowed):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return principal

    return _guard
