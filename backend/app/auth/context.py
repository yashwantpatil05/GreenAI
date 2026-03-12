"""Request context extraction for audit/rate limiting."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, Request

from backend.app.auth.deps import Principal, get_current_user, bearer_scheme, _get_bearer_token, _decode_claims
from backend.app.models.api_key import ApiKey
from backend.app.auth.security import verify_password
from backend.app.core.database import get_db
from sqlalchemy.orm import Session
from fastapi import HTTPException, status


@dataclass
class RequestContext:
    request_id: str
    ip: str | None
    user_agent: str | None
    user: Optional[Principal] = None
    api_key: Optional[ApiKey] = None


def _extract_api_key(x_api_key: str, db: Session) -> ApiKey | None:
    if not x_api_key:
        return None
    prefix = x_api_key[:12]
    candidates = (
        db.query(ApiKey)
        .filter(ApiKey.revoked_at.is_(None), ApiKey.active.is_(True))
        .filter(ApiKey.key_prefix == prefix)
        .all()
    )
    if not candidates:
        candidates = db.query(ApiKey).filter(ApiKey.revoked_at.is_(None), ApiKey.active.is_(True)).all()
    for k in candidates:
        if verify_password(x_api_key, k.hashed_key):
            return k
    return None


async def get_request_context(
    request: Request,
    db: Session = Depends(get_db),
    x_api_key: str = Header(default="", alias="X-API-Key"),
) -> RequestContext:
    # request id from middleware or header
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    ip = request.client.host if request.client else None
    ua = request.headers.get("User-Agent")

    api_key_obj = _extract_api_key(x_api_key, db)
    user_obj = None

    # Try bearer token if present and no api key found
    if not api_key_obj:
        creds = await bearer_scheme(request)
        if creds and creds.credentials:
            try:
                token = _get_bearer_token(creds)
                claims = _decode_claims(token)
                # Build lightweight principal
                user_obj = Principal(
                    user_id=str(claims.get("sub")),
                    organization_id=str(claims.get("org") or claims.get("organization_id") or ""),
                    email=claims.get("email"),
                    role=claims.get("role"),
                )
            except HTTPException:
                pass

    return RequestContext(
        request_id=request_id,
        ip=ip,
        user_agent=ua,
        user=user_obj,
        api_key=api_key_obj,
    )
