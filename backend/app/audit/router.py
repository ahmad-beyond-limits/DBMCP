from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_user
from app.database.models import AuditLog, User
from app.database.session import get_db
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces/{workspace_id}/audit-logs", tags=["Audit Logs"])


@router.get("")
async def get_audit_logs(
    workspace_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    operation: Optional[str] = None,
    decision: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve audit logs for a workspace (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(AuditLog).where(AuditLog.workspace_id == workspace_id)
    if operation:
        stmt = stmt.where(AuditLog.operation == operation)
    if decision:
        stmt = stmt.where(AuditLog.decision == decision.upper())

    stmt = stmt.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)
    logs = (await db.execute(stmt)).scalars().all()

    return [
        {
            "id": log.id,
            "workspace_id": log.workspace_id,
            "actor_type": log.actor_type,
            "credential_id": log.credential_id,
            "user_id": log.user_id,
            "operation": log.operation,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "decision": log.decision,
            "reason": log.reason,
            "policy_version": log.policy_version,
            "request_metadata": log.request_metadata,
            "timestamp": log.timestamp,
        }
        for log in logs
    ]
