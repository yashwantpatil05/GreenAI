"""Centralized audit logging (best-effort, non-blocking)."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


@dataclass
class AuditEvent:
    organization_id: UUID
    action: str
    status: str = "success"
    actor_type: str = "system"
    actor_user_id: Optional[UUID] = None
    actor_api_key_id: Optional[UUID] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def audit_log(event: AuditEvent, db: Session) -> None:
    """Persist audit log without raising exceptions."""
    try:
        safe_meta = event.metadata or {}
        db.add(
            AuditLog(
                organization_id=event.organization_id,
                actor_user_id=event.actor_user_id,
                actor_type=event.actor_type,
                actor_api_key_id=event.actor_api_key_id,
                action=event.action[:80],
                resource_type=event.resource_type[:60] if event.resource_type else None,
                resource_id=event.resource_id,
                status=event.status[:20] if event.status else "success",
                ip=event.ip[:80] if event.ip else None,
                user_agent=event.user_agent,
                request_id=event.request_id,
                metadata=safe_meta,
            )
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Audit log persist failed (action=%s)", event.action)
    except Exception:
        logger.exception("Audit log unexpected failure (action=%s)", event.action)
