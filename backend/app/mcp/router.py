from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.auth.router import get_current_user
from app.core.rate_limit import rate_limit
from app.core.security import generate_mcp_token
from app.database.models import MCPCredential, User, ensure_utc, utc_now
from app.database.session import get_db
from app.mcp.auth import AuthenticatedMCPContext, MCPAuthService
from app.mcp.schemas import (
    JSONRPCError,
    JSONRPCRequest,
    JSONRPCResponse,
    MCPCredentialCreateRequest,
    MCPCredentialCreateResponse,
    MCPCredentialListItem,
)
from app.mcp.server import MCPServer
from app.workspaces.service import WorkspaceService

router = APIRouter(tags=["MCP"])


# ==============================================================================
# 1. MCP Credential Management (User / Workspace Owner Authenticated)
# ==============================================================================

@router.get("/workspaces/{workspace_id}/mcp-credentials", response_model=List[MCPCredentialListItem])
async def list_mcp_credentials(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all MCP credentials for a workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = (
        select(MCPCredential)
        .where(MCPCredential.workspace_id == workspace_id)
        .order_by(MCPCredential.created_at.desc())
    )
    creds = (await db.execute(stmt)).scalars().all()
    now = utc_now()

    return [
        MCPCredentialListItem(
            id=c.id,
            workspace_id=c.workspace_id,
            name=c.name,
            credential_prefix=c.credential_prefix,
            created_at=c.created_at,
            expires_at=c.expires_at,
            revoked_at=c.revoked_at,
            last_used_at=c.last_used_at,
            is_active=(c.revoked_at is None) and (c.expires_at is None or ensure_utc(c.expires_at) > now),
        )
        for c in creds
    ]


@router.post(
    "/workspaces/{workspace_id}/mcp-credentials",
    response_model=MCPCredentialCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_mcp_credential(
    workspace_id: str,
    data: MCPCredentialCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new high-entropy private MCP credential (OWNER only).
    The raw token is displayed ONCE and never stored or returned again.
    """
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    raw_token, prefix, secret_hash = generate_mcp_token()
    now = utc_now()
    expires_at = now + timedelta(days=data.expires_in_days or 30)

    cred = MCPCredential(
        workspace_id=workspace_id,
        name=data.name.strip(),
        credential_prefix=prefix,
        secret_hash=secret_hash,
        expires_at=expires_at,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    await AuditService.log_event(
        db=db,
        workspace_id=workspace_id,
        operation="MCP_TOKEN_CREATED",
        actor_type="USER",
        user_id=user.id,
        credential_id=cred.id,
        decision="ALLOW",
        reason="MCP credential created",
        request_metadata={"credential_prefix": prefix, "name": cred.name},
    )

    return MCPCredentialCreateResponse(
        id=cred.id,
        workspace_id=cred.workspace_id,
        name=cred.name,
        credential_prefix=prefix,
        raw_token=raw_token,
        expires_at=expires_at,
        created_at=cred.created_at,
    )


@router.post("/workspaces/{workspace_id}/mcp-credentials/{credential_id}/rotate", response_model=MCPCredentialCreateResponse)
async def rotate_mcp_credential(
    workspace_id: str,
    credential_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rotate an existing MCP credential (OWNER only).
    Immediately revokes the previous credential and creates a new one.
    """
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(MCPCredential).where(
        MCPCredential.id == credential_id,
        MCPCredential.workspace_id == workspace_id,
    )
    old_cred = (await db.execute(stmt)).scalar_one_or_none()
    if not old_cred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    # Invalidate previous immediately
    now = utc_now()
    old_cred.revoked_at = now

    # Generate new
    raw_token, prefix, secret_hash = generate_mcp_token()
    days_left = 30
    if old_cred.expires_at and ensure_utc(old_cred.expires_at) > now:
        days_left = max(1, (ensure_utc(old_cred.expires_at) - now).days)
    new_expires_at = now + timedelta(days=days_left)

    new_cred = MCPCredential(
        workspace_id=workspace_id,
        name=f"{old_cred.name} (Rotated)",
        credential_prefix=prefix,
        secret_hash=secret_hash,
        expires_at=new_expires_at,
    )
    db.add(new_cred)
    await db.commit()
    await db.refresh(new_cred)

    await AuditService.log_event(
        db=db,
        workspace_id=workspace_id,
        operation="MCP_TOKEN_ROTATED",
        actor_type="USER",
        user_id=user.id,
        credential_id=new_cred.id,
        decision="ALLOW",
        reason=f"Previous credential {old_cred.credential_prefix} invalidated and rotated",
        request_metadata={"old_prefix": old_cred.credential_prefix, "new_prefix": prefix},
    )

    return MCPCredentialCreateResponse(
        id=new_cred.id,
        workspace_id=new_cred.workspace_id,
        name=new_cred.name,
        credential_prefix=prefix,
        raw_token=raw_token,
        expires_at=new_expires_at,
        created_at=new_cred.created_at,
    )


@router.post("/workspaces/{workspace_id}/mcp-credentials/{credential_id}/revoke", status_code=status.HTTP_200_OK)
async def revoke_mcp_credential(
    workspace_id: str,
    credential_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Immediately revokes an MCP credential (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(MCPCredential).where(
        MCPCredential.id == credential_id,
        MCPCredential.workspace_id == workspace_id,
    )
    cred = (await db.execute(stmt)).scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    cred.revoked_at = utc_now()
    await db.commit()

    await AuditService.log_event(
        db=db,
        workspace_id=workspace_id,
        operation="MCP_TOKEN_REVOKED",
        actor_type="USER",
        user_id=user.id,
        credential_id=cred.id,
        decision="ALLOW",
        reason="Credential explicitly revoked by workspace owner",
        request_metadata={"credential_prefix": cred.credential_prefix},
    )

    return {"status": "success", "message": f"Credential {cred.credential_prefix} revoked"}


# ==============================================================================
# 2. MCP JSON-RPC Gateway Endpoint (MCP Client Authenticated via Bearer Token)
# ==============================================================================

async def get_mcp_context(
    authorization: Optional[str] = Header(None),
    x_mcp_token: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedMCPContext:
    """Extracts and validates private MCP token. Derives workspace context."""
    token = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        else:
            token = authorization
    elif x_mcp_token:
        token = x_mcp_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing MCP authorization credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await MCPAuthService.validate_credential(db, token)


@router.post(
    "/mcp",
    response_model=JSONRPCResponse,
    dependencies=[Depends(rate_limit(max_requests=100, window_seconds=60, scope="mcp_gateway"))],
)
async def handle_mcp_rpc(
    rpc_req: JSONRPCRequest,
    context: AuthenticatedMCPContext = Depends(get_mcp_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Standard MCP JSON-RPC 2.0 Protocol Gateway.
    Evaluates every request within context.workspace_id and against workspace policies.
    """
    method = rpc_req.method
    params = rpc_req.params or {}

    # Initialize
    if method == "initialize":
        return JSONRPCResponse(
            id=rpc_req.id,
            result={
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False},
                },
                "serverInfo": {
                    "name": "DBMCP Policy-Enforced Gateway",
                    "version": "1.0.0",
                },
            },
        )

    # List Tools
    elif method in ["tools/list", "list_tools"]:
        tools = await MCPServer.list_tools()
        return JSONRPCResponse(id=rpc_req.id, result={"tools": tools})

    # Call Tool
    elif method in ["tools/call", "call_tool"]:
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        if not tool_name:
            return JSONRPCResponse(
                id=rpc_req.id,
                error=JSONRPCError(code=-32602, message="Missing tool name in params"),
            )
        call_res = await MCPServer.call_tool(db, context, tool_name, arguments)
        return JSONRPCResponse(id=rpc_req.id, result=call_res)

    # Direct tool method invocation fallback
    known_tool_names = [t["name"] for t in await MCPServer.list_tools()]
    if method in known_tool_names:
        call_res = await MCPServer.call_tool(db, context, method, params)
        return JSONRPCResponse(id=rpc_req.id, result=call_res)

    return JSONRPCResponse(
        id=rpc_req.id,
        error=JSONRPCError(code=-32601, message=f"Method '{method}' not found"),
    )
