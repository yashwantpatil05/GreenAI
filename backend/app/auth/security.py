"""Security utilities (Phase 0: Supabase Auth + internal JWT)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.app.core.config import get_settings


logger = logging.getLogger(__name__)
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _now_utc() -> datetime:
    return datetime.utcnow()


def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """Verify and decode a Supabase JWT (HS256). Returns claims or raises JWTError."""
    secret = settings.supabase_jwt_secret.get_secret_value()
    if not secret:
        raise JWTError("SUPABASE_JWT_SECRET is missing")

    options = {
        "verify_signature": True,
        "verify_aud": bool(settings.supabase_jwt_audience),
        "verify_iss": bool(settings.supabase_jwt_issuer),
        "verify_exp": True,
    }

    claims = jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience=settings.supabase_jwt_audience,
        issuer=settings.supabase_jwt_issuer,
        options=options,
    )

    if not claims.get("sub"):
        raise JWTError("Token missing 'sub'")
    return claims


def decode_internal_token(token: str) -> Dict[str, Any]:
    """Decode backend-issued JWTs for RBAC."""
    return jwt.decode(
        token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
    )


def decode_token(token: str) -> Optional[str]:
    """Compatibility helper returning user_id (sub) when token is valid."""
    try:
        claims = decode_internal_token(token)
        return str(claims.get("sub"))
    except JWTError:
        return None


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Issue a signed JWT for internal API auth."""
    to_encode: Dict[str, Any] = {"sub": str(subject)}
    if additional_claims:
        to_encode.update(additional_claims)

    expire = _now_utc() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode["exp"] = expire

    token = jwt.encode(
        to_encode,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )
    return token


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Compare plaintext vs hashed password (bcrypt)."""
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        logger.exception("Password verification failed")
        return False


def get_password_hash(password: str) -> str:
    """Hash a secret using bcrypt."""
    return pwd_context.hash(password)
