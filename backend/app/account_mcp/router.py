import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.account_mcp.schemas import (
    AccountActivityResponse,
    AccountMCPResponse,
    CreateAccountMCPRequest,
    CreatedAccountMCPResponse,
)
from app.audit.service import AuditService
from app.auth.router import get_current_user
from app.core.security import hash_mcp_token
from app.database.models import AuditLog, MCPCredential, User, ensure_utc, utc_now
from app.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["Account MCP Management"])


@router.get("/mcp-credentials", response_model=List[AccountMCPResponse])
async def list_account_credentials(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all Account-Level Master MCP credentials created for the current user."""
    stmt = (
        select(MCPCredential)
        .where(
            MCPCredential.user_id == current_user.id,
            MCPCredential.scope_type == "ACCOUNT",
        )
        .order_by(desc(MCPCredential.created_at))
    )
    result = await db.execute(stmt)
    creds = result.scalars().all()

    now = utc_now()
    response = []
    for c in creds:
        is_active = (
            c.revoked_at is None
            and (c.expires_at is None or ensure_utc(c.expires_at) > now)
        )
        response.append(
            AccountMCPResponse(
                id=c.id,
                name=c.name,
                credential_prefix=c.credential_prefix,
                scope_type=c.scope_type or "ACCOUNT",
                permissions=c.permissions or {},
                created_at=c.created_at,
                expires_at=c.expires_at,
                revoked_at=c.revoked_at,
                last_used_at=c.last_used_at,
                is_active=is_active,
            )
        )
    return response


@router.post("/mcp-credentials", response_model=CreatedAccountMCPResponse, status_code=status.HTTP_201_CREATED)
async def create_account_credential(
    payload: CreateAccountMCPRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a new Account-Level Master MCP credential.
    Returns the one-time reveal raw_token.
    """
    raw_prefix = secrets.token_hex(6)
    credential_prefix = f"mcp_live_acc_{raw_prefix}"
    secret_part = secrets.token_urlsafe(32)
    raw_token = f"{credential_prefix}_{secret_part}"

    secret_hash = hash_mcp_token(raw_token)

    now = utc_now()
    expires_at = None
    if payload.expires_in_days:
        expires_at = now + timedelta(days=payload.expires_in_days)

    perms_dict = payload.permissions.model_dump() if payload.permissions else {
        "manage_workspaces": True,
        "upload_files": True,
        "read_data": True,
        "query_dataset": True,
        "edit_dataset": False,
        "delete_files": False,
        "manage_mcp_keys": True,
    }

    cred = MCPCredential(
        user_id=current_user.id,
        workspace_id=None,
        scope_type="ACCOUNT",
        credential_prefix=credential_prefix,
        secret_hash=secret_hash,
        name=payload.name.strip() or "Claude Account Operator",
        permissions=perms_dict,
        created_at=now,
        expires_at=expires_at,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    # Log audit event
    await AuditService.log_event(
        db=db,
        user_id=current_user.id,
        workspace_id=None,
        operation="CREATE_ACCOUNT_MCP_KEY",
        actor_type="USER",
        credential_id=cred.id,
        decision="ALLOW",
        reason=f"User @{current_user.username} created Account Master MCP Key '{cred.name}'",
        request_metadata={"name": cred.name, "permissions": perms_dict, "expires_at": str(expires_at)},
    )

    return CreatedAccountMCPResponse(
        id=cred.id,
        name=cred.name,
        credential_prefix=cred.credential_prefix,
        scope_type="ACCOUNT",
        permissions=cred.permissions or {},
        created_at=cred.created_at,
        expires_at=cred.expires_at,
        revoked_at=cred.revoked_at,
        last_used_at=cred.last_used_at,
        is_active=True,
        raw_token=raw_token,
    )


@router.post("/mcp-credentials/{credential_id}/rotate", response_model=CreatedAccountMCPResponse)
async def rotate_account_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rotates an existing Account MCP credential.
    Revokes the old token and issues a new active raw token with the same permissions.
    """
    stmt = select(MCPCredential).where(
        MCPCredential.id == credential_id,
        MCPCredential.user_id == current_user.id,
        MCPCredential.scope_type == "ACCOUNT",
    )
    cred = (await db.execute(stmt)).scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Account MCP credential not found")

    now = utc_now()
    # Revoke old credential
    cred.revoked_at = now

    # Create replacement credential
    raw_prefix = secrets.token_hex(6)
    new_prefix = f"mcp_live_acc_{raw_prefix}"
    secret_part = secrets.token_urlsafe(32)
    new_raw_token = f"{new_prefix}_{secret_part}"
    new_hash = hash_mcp_token(new_raw_token)

    new_cred = MCPCredential(
        user_id=current_user.id,
        workspace_id=None,
        scope_type="ACCOUNT",
        credential_prefix=new_prefix,
        secret_hash=new_hash,
        name=f"{cred.name} (Rotated)",
        permissions=cred.permissions or {},
        created_at=now,
        expires_at=cred.expires_at,
    )
    db.add(new_cred)
    await db.commit()
    await db.refresh(new_cred)

    await AuditService.log_event(
        db=db,
        user_id=current_user.id,
        workspace_id=None,
        operation="ROTATE_ACCOUNT_MCP_KEY",
        actor_type="USER",
        credential_id=new_cred.id,
        decision="ALLOW",
        reason=f"User rotated Account MCP key {cred.credential_prefix} -> {new_prefix}",
        request_metadata={"old_credential_id": cred.id, "new_credential_id": new_cred.id},
    )

    return CreatedAccountMCPResponse(
        id=new_cred.id,
        name=new_cred.name,
        credential_prefix=new_cred.credential_prefix,
        scope_type="ACCOUNT",
        permissions=new_cred.permissions or {},
        created_at=new_cred.created_at,
        expires_at=new_cred.expires_at,
        revoked_at=None,
        last_used_at=None,
        is_active=True,
        raw_token=new_raw_token,
    )


@router.delete("/mcp-credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_account_credential(
    credential_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revokes an Account MCP credential."""
    stmt = select(MCPCredential).where(
        MCPCredential.id == credential_id,
        MCPCredential.user_id == current_user.id,
        MCPCredential.scope_type == "ACCOUNT",
    )
    cred = (await db.execute(stmt)).scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Account MCP credential not found")

    cred.revoked_at = utc_now()
    await db.commit()

    await AuditService.log_event(
        db=db,
        user_id=current_user.id,
        workspace_id=None,
        operation="REVOKE_ACCOUNT_MCP_KEY",
        actor_type="USER",
        credential_id=cred.id,
        decision="ALLOW",
        reason=f"User revoked Account MCP key '{cred.name}' ({cred.credential_prefix})",
    )


@router.get("/mcp-activity", response_model=List[AccountActivityResponse])
async def get_account_activity(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the activity log for Account-Level Master MCP keys."""
    # Find all account credential IDs for this user
    creds_stmt = select(MCPCredential.id).where(
        MCPCredential.user_id == current_user.id,
        MCPCredential.scope_type == "ACCOUNT",
    )
    cred_ids = (await db.execute(creds_stmt)).scalars().all()

    conditions = [AuditLog.user_id == current_user.id]
    if cred_ids:
        conditions.append(AuditLog.credential_id.in_(cred_ids))

    stmt = (
        select(AuditLog)
        .where(or_(*conditions))
        .order_by(desc(AuditLog.timestamp))
        .limit(limit)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()

    return [
        AccountActivityResponse(
            id=l.id,
            timestamp=l.timestamp,
            operation=l.operation,
            actor_type=l.actor_type,
            credential_id=l.credential_id,
            workspace_id=l.workspace_id,
            decision=l.decision,
            reason=l.reason,
            request_metadata=l.request_metadata or {},
        )
        for l in logs
    ]
