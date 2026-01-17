"""Audit log endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.deps import require_roles
from backend.app.core.database import get_db
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.audit_log import AuditLogQuery, AuditLogRead

router = APIRouter(tags=["audit-logs"])


@router.get("/", response_model=list[AuditLogRead])
def list_audit_logs(
    query: AuditLogQuery = Depends(),
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "admin")),
):
    q = (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == user.organization_id)
    )
    if query.action:
        q = q.filter(AuditLog.action == query.action)
    if query.actor_user_id:
        q = q.filter(AuditLog.actor_user_id == query.actor_user_id)
    if query.actor_type:
        q = q.filter(AuditLog.actor_type == query.actor_type)
    if query.resource_type:
        q = q.filter(AuditLog.resource_type == query.resource_type)
    if query.resource_id:
        q = q.filter(AuditLog.resource_id == query.resource_id)
    if query.status:
        q = q.filter(AuditLog.status == query.status)
    if query.from_ts:
        q = q.filter(AuditLog.created_at >= query.from_ts)
    if query.to_ts:
        q = q.filter(AuditLog.created_at <= query.to_ts)

    q = q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(query.limit)
    return q.all()
