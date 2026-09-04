from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm.attributes import flag_modified

from app.audit.service import AuditService
from app.auth.router import get_current_user
from app.core.rate_limit import rate_limit
from app.core.security import generate_mcp_token
from app.database.models import AIGuidancePlaybook, MCPCredential, User, ensure_utc, utc_now
from app.database.session import get_db
from app.mcp.auth import AuthenticatedMCPContext, MCPAuthService
from app.mcp.schemas import (
    JSONRPCError,
    JSONRPCRequest,
    JSONRPCResponse,
    MCPCredentialCreateRequest,
    MCPCredentialCreateResponse,
    MCPCredentialListItem,
    MCPCredentialUpdateRequest,
)
from app.mcp.server import MCPServer
from app.mcp.skills import ABOX_AI_SKILLS_GUIDE
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
            permissions=c.permissions or {
                "read_resource": True,
                "search": True,
                "query_dataset": True,
                "edit_dataset": True,
                "read_notes": True,
                "create_note": True,
                "update_note": True,
                "delete_note": False,
            },
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
    Generate a new high-entropy private MCP credential (OWNER only) with specific tool permissions.
    The raw token is displayed ONCE and never stored or returned again.
    """
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    raw_token, prefix, secret_hash = generate_mcp_token()
    now = utc_now()
    expires_at = now + timedelta(days=data.expires_in_days or 30)

    default_permissions = {
        "read_resource": True,
        "search": True,
        "query_dataset": True,
        "edit_dataset": True,
        "read_notes": True,
        "create_note": True,
        "update_note": True,
        "delete_note": False,
    }
    assigned_permissions = dict(data.permissions) if data.permissions else default_permissions

    cred = MCPCredential(
        workspace_id=workspace_id,
        name=data.name.strip(),
        credential_prefix=prefix,
        secret_hash=secret_hash,
        expires_at=expires_at,
        permissions=assigned_permissions,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    # Capture attributes to avoid expired-attribute reload
    cred_id = cred.id
    cred_workspace_id = cred.workspace_id
    cred_name = cred.name
    cred_created_at = cred.created_at
    cred_permissions = dict(cred.permissions) if cred.permissions else {}

    await AuditService.log_event(
        db=db,
        workspace_id=workspace_id,
        operation="MCP_TOKEN_CREATED",
        actor_type="USER",
        user_id=user.id,
        credential_id=cred_id,
        decision="ALLOW",
        reason=f"MCP credential created with permissions: {assigned_permissions}",
        request_metadata={"credential_prefix": prefix, "name": cred_name, "permissions": assigned_permissions},
    )

    return MCPCredentialCreateResponse(
        id=cred_id,
        workspace_id=cred_workspace_id,
        name=cred_name,
        credential_prefix=prefix,
        raw_token=raw_token,
        expires_at=expires_at,
        created_at=cred_created_at,
        permissions=cred_permissions,
    )


@router.patch("/workspaces/{workspace_id}/mcp-credentials/{credential_id}", response_model=MCPCredentialListItem)
async def update_mcp_credential(
    workspace_id: str,
    credential_id: str,
    data: MCPCredentialUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update permissions or label of an existing MCP credential (OWNER only).
    """
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(MCPCredential).where(
        MCPCredential.id == credential_id,
        MCPCredential.workspace_id == workspace_id,
    )
    cred = (await db.execute(stmt)).scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    if data.name is not None and data.name.strip():
        cred.name = data.name.strip()
    if data.permissions is not None:
        cred.permissions = dict(data.permissions)
        flag_modified(cred, "permissions")

    await db.commit()
    await db.refresh(cred)

    cred_id = cred.id
    cred_workspace_id = cred.workspace_id
    cred_name = cred.name
    cred_prefix = cred.credential_prefix
    cred_created_at = cred.created_at
    cred_expires_at = cred.expires_at
    cred_revoked_at = cred.revoked_at
    cred_last_used_at = cred.last_used_at
    cred_permissions = dict(cred.permissions) if cred.permissions else {}

    await AuditService.log_event(
        db=db,
        workspace_id=workspace_id,
        operation="MCP_PERMISSIONS_UPDATED",
        actor_type="USER",
        user_id=user.id,
        credential_id=cred_id,
        decision="ALLOW",
        reason=f"Permissions updated for MCP credential {cred_prefix}",
        request_metadata={"permissions": cred_permissions, "name": cred_name},
    )

    now = utc_now()
    return MCPCredentialListItem(
        id=cred_id,
        workspace_id=cred_workspace_id,
        name=cred_name,
        credential_prefix=cred_prefix,
        created_at=cred_created_at,
        expires_at=cred_expires_at,
        revoked_at=cred_revoked_at,
        last_used_at=cred_last_used_at,
        is_active=(cred_revoked_at is None) and (cred_expires_at is None or ensure_utc(cred_expires_at) > now),
        permissions=cred_permissions,
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
    Immediately revokes the previous credential and creates a new one with same permissions.
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
        permissions=old_cred.permissions or {},
    )
    db.add(new_cred)
    await db.commit()
    await db.refresh(new_cred)

    new_cred_id = new_cred.id
    new_cred_workspace_id = new_cred.workspace_id
    new_cred_name = new_cred.name
    new_cred_created_at = new_cred.created_at
    new_cred_permissions = dict(new_cred.permissions) if new_cred.permissions else {}

    await AuditService.log_event(
        db=db,
        workspace_id=workspace_id,
        operation="MCP_TOKEN_ROTATED",
        actor_type="USER",
        user_id=user.id,
        credential_id=new_cred_id,
        decision="ALLOW",
        reason=f"Previous credential {old_cred.credential_prefix} invalidated and rotated",
        request_metadata={"old_prefix": old_cred.credential_prefix, "new_prefix": prefix},
    )

    return MCPCredentialCreateResponse(
        id=new_cred_id,
        workspace_id=new_cred_workspace_id,
        name=new_cred_name,
        credential_prefix=prefix,
        raw_token=raw_token,
        expires_at=new_expires_at,
        created_at=new_cred_created_at,
        permissions=new_cred_permissions,
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


@router.delete("/workspaces/{workspace_id}/mcp-credentials/{credential_id}", status_code=status.HTTP_200_OK)
async def delete_mcp_credential(
    workspace_id: str,
    credential_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently deletes a revoked or inactive MCP credential from the workspace (OWNER only).
    """
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(MCPCredential).where(
        MCPCredential.id == credential_id,
        MCPCredential.workspace_id == workspace_id,
    )
    cred = (await db.execute(stmt)).scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    prefix = cred.credential_prefix
    await db.delete(cred)
    await db.commit()

    await AuditService.log_event(
        db=db,
        workspace_id=workspace_id,
        operation="MCP_TOKEN_DELETED",
        actor_type="USER",
        user_id=user.id,
        decision="ALLOW",
        reason=f"MCP credential {prefix} permanently deleted by workspace owner",
    )

    return {"status": "success", "message": f"Credential {prefix} permanently deleted"}


# ==============================================================================
# 2. MCP JSON-RPC Gateway Endpoint (MCP Client Authenticated via Bearer Token)
# ==============================================================================

async def get_mcp_context(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_mcp_token: Optional[str] = Header(None),
    token: Optional[str] = None,
    key: Optional[str] = None,
    api_key: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Optional[AuthenticatedMCPContext]:
    """Extracts and validates private MCP token from Authorization header, custom header, or URL query param."""
    raw_token = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            raw_token = parts[1]
        else:
            raw_token = authorization
    elif x_mcp_token:
        raw_token = x_mcp_token
    elif token:
        raw_token = token
    elif key:
        raw_token = key
    elif api_key:
        raw_token = api_key
    elif "token" in request.query_params:
        raw_token = request.query_params["token"]
    elif "key" in request.query_params:
        raw_token = request.query_params["key"]

    if not raw_token:
        return None

    # If a token was provided, validate it strictly (raises 401 if expired, revoked, or wrong secret)
    return await MCPAuthService.validate_credential(db, raw_token)


@router.get("/mcp")
async def get_mcp_info(
    request: Request,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Probes MCP server info and protocol compatibility for Claude and remote clients."""
    return {
        "status": "ready",
        "protocol": "MCP JSON-RPC 2.0",
        "transport": "Streamable HTTP",
        "endpoint": "/mcp",
        "server": "POAIS (Policy-Oriented AI Space) Gateway",
        "skills_guide_endpoint": "/mcp/skills",
        "instructions": ABOX_AI_SKILLS_GUIDE,
    }


@router.get("/mcp/skills")
@router.get("/workspaces/{workspace_id}/skills-guide")
async def get_mcp_skills_guide():
    """Returns the standardized POAIS AI Agent skills file and operational instructions."""
    return {
        "title": "POAIS AI Agent Skills & Operational Guide",
        "version": "2024-11-05",
        "content": ABOX_AI_SKILLS_GUIDE,
        "verification_rule": "MANDATORY: Always call query_dataset immediately after calling edit_dataset to verify and confirm persisted data in storage before replying to the user.",
    }


@router.post(
    "/mcp",
    response_model=JSONRPCResponse,
    dependencies=[Depends(rate_limit(max_requests=100, window_seconds=60, scope="mcp_gateway"))],
)
async def handle_mcp_rpc(
    rpc_req: JSONRPCRequest,
    context: Optional[AuthenticatedMCPContext] = Depends(get_mcp_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Standard MCP JSON-RPC 2.0 Protocol Gateway.
    Evaluates every request within context.workspace_id and against workspace policies.
    Permits initialize, tools/list, resources/list, and prompts/list for client handshakes (e.g. Claude Remote Connectors).
    """
    method = rpc_req.method
    params = rpc_req.params or {}

    # 1. Initialize Handshake (Allowed without credentials to verify server capabilities)
    if method == "initialize":
        return JSONRPCResponse(
            id=rpc_req.id,
            result={
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False, "listChanged": False},
                    "prompts": {"listChanged": False},
                },
                "serverInfo": {
                    "name": "POAIS Policy-Oriented Gateway",
                    "version": "2.0.0",
                },
                "instructions": ABOX_AI_SKILLS_GUIDE,
            },
        )

    # 2. List Tools (Allowed without credentials to advertise available capabilities, customizes if account token)
    elif method in ["tools/list", "list_tools"]:
        tools = await MCPServer.list_tools(context)
        return JSONRPCResponse(id=rpc_req.id, result={"tools": tools})

    # 3. List Resources (Permits AI clients to discover data and skills guide)
    elif method in ["resources/list", "list_resources"]:
        if context:
            res = await MCPServer.call_tool(db, context, "list_resources", {})
            return JSONRPCResponse(id=rpc_req.id, result=res)
        else:
            return JSONRPCResponse(
                id=rpc_req.id,
                result={
                    "resources": [
                        {
                            "uri": "poais://skills/workflow-guide",
                            "name": "POAIS Agent Skills & Operational Guide",
                            "mimeType": "text/markdown",
                            "description": "Mandatory operating rules, verification protocols, and tool usage guide for AI agents",
                        }
                    ]
                },
            )

    # 4. Read Resource (Permits reading files or the built-in skills guide)
    elif method in ["resources/read", "read_resource"]:
        uri = params.get("uri") or params.get("resource_id") or ""
        clean_uri = uri.strip().lower()
        if clean_uri in [
            "poais://skills/workflow-guide",
            "poais://skills/guide",
            "poais://instructions",
            "poais_agent_skills.md",
            "abox://skills/workflow-guide",
            "abox://skills/guide",
            "abox://instructions",
            "skills",
            "skills.md",
            "abox_agent_skills.md",
            "instructions",
        ]:
            return JSONRPCResponse(
                id=rpc_req.id,
                result={
                    "contents": [
                        {
                            "uri": "poais://skills/workflow-guide",
                            "mimeType": "text/markdown",
                            "text": ABOX_AI_SKILLS_GUIDE,
                        }
                    ]
                },
            )
        if not context:
            return JSONRPCResponse(
                id=rpc_req.id,
                result={
                    "isError": True,
                    "content": [{"type": "text", "text": "Authentication Error: A valid DBMCP token is required to read workspace files."}],
                },
            )
        res = await MCPServer.call_tool(db, context, "read_resource", {"resource_id": uri})
        return JSONRPCResponse(id=rpc_req.id, result=res)

    # 5. Prompts List & Get (Serves skills guide & active AI Guidance Playbooks)
    elif method in ["prompts/list", "list_prompts"]:
        prompts_list = [
            {
                "name": "poais_agent_skills",
                "description": "POAIS AI Agent Skills, Verification Directives & Operational Guide",
                "arguments": [],
            }
        ]
        try:
            stmt = select(AIGuidancePlaybook).where(AIGuidancePlaybook.is_active == True).order_by(AIGuidancePlaybook.title.asc())
            playbooks = (await db.execute(stmt)).scalars().all()
            for pb in playbooks:
                # Normalize prompt name (lowercase alphanumeric with underscores)
                norm_name = "".join(c if c.isalnum() else "_" for c in pb.title.lower()).strip("_")
                prompts_list.append({
                    "name": norm_name,
                    "description": f"[{pb.category.upper()}] {pb.trigger_condition}",
                    "arguments": [],
                })
        except Exception as e:
            logger.warning(f"Could not load dynamic prompts: {e}")

        return JSONRPCResponse(id=rpc_req.id, result={"prompts": prompts_list})

    elif method in ["prompts/get", "get_prompt"]:
        prompt_name = params.get("name") or ""
        clean_name = prompt_name.strip().lower()

        # Check for matching active guidance playbook
        if clean_name not in ["poais_agent_skills", "abox_agent_skills", "skills"]:
            try:
                stmt = select(AIGuidancePlaybook).where(AIGuidancePlaybook.is_active == True)
                playbooks = (await db.execute(stmt)).scalars().all()
                for pb in playbooks:
                    norm_name = "".join(c if c.isalnum() else "_" for c in pb.title.lower()).strip("_")
                    if clean_name in [norm_name, pb.id.lower(), pb.title.lower()]:
                        prompt_instructions = pb.prompt_template or ""
                        args_passed = params.get("arguments") or {}
                        if isinstance(args_passed, dict):
                            for k, v in args_passed.items():
                                prompt_instructions = prompt_instructions.replace(f"{{{k}}}", str(v))

                        full_prompt_text = (
                            f"# AI Guidance Playbook: {pb.title}\n"
                            f"**Category:** {pb.category}\n"
                            f"**Trigger:** {pb.trigger_condition}\n\n"
                            f"## Instructions & Role Guidance\n"
                            f"{prompt_instructions}\n\n"
                            f"## Strict Mandatory Rules (Zero-Tolerance)\n"
                            + "\n".join(f"- {rule}" for rule in (pb.strict_rules or [])) + "\n\n"
                            f"## Style & Formatting Guidelines\n"
                            f"{pb.style_guide or 'Adhere to clean, structured markdown.'}\n"
                        )
                        return JSONRPCResponse(
                            id=rpc_req.id,
                            result={
                                "description": f"{pb.title} - {pb.summary}",
                                "messages": [
                                    {
                                        "role": "user",
                                        "content": {
                                            "type": "text",
                                            "text": full_prompt_text,
                                        },
                                    }
                                ],
                            },
                        )
            except Exception as e:
                logger.warning(f"Error fetching dynamic prompt: {e}")

        # Default standard skills guide
        return JSONRPCResponse(
            id=rpc_req.id,
            result={
                "description": "POAIS AI Agent Skills & Operational Protocol",
                "messages": [
                    {
                        "role": "user",
                        "content": {
                            "type": "text",
                            "text": ABOX_AI_SKILLS_GUIDE,
                        },
                    }
                ],
            },
        )

    # 6. Call Tool (Strictly requires valid context)
    elif method in ["tools/call", "call_tool"]:
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        if not tool_name:
            return JSONRPCResponse(
                id=rpc_req.id,
                error=JSONRPCError(code=-32602, message="Missing tool name in params"),
            )

        # Fallback: check if token was passed in tool arguments
        active_context = context
        if not active_context and "token" in arguments:
            try:
                active_context = await MCPAuthService.validate_credential(db, arguments["token"])
            except Exception:
                active_context = None

        if not active_context:
            return JSONRPCResponse(
                id=rpc_req.id,
                result={
                    "isError": True,
                    "content": [
                        {
                            "type": "text",
                            "text": "Authentication Error: A valid DBMCP token is required to execute tools. Pass it via URL '?token=mcp_live_...' or Authorization header.",
                        }
                    ],
                },
            )

        call_res = await MCPServer.call_tool(db, active_context, tool_name, arguments)
        return JSONRPCResponse(id=rpc_req.id, result=call_res)

    # 7. Direct tool method invocation fallback
    known_tool_names = [t["name"] for t in await MCPServer.list_tools()]
    if method in known_tool_names:
        if not context:
            return JSONRPCResponse(
                id=rpc_req.id,
                result={
                    "isError": True,
                    "content": [
                        {
                            "type": "text",
                            "text": "Authentication Error: A valid DBMCP token is required. Pass it via URL '?token=mcp_live_...'",
                        }
                    ],
                },
            )
        call_res = await MCPServer.call_tool(db, context, method, params)
        return JSONRPCResponse(id=rpc_req.id, result=call_res)

    return JSONRPCResponse(
        id=rpc_req.id,
        error=JSONRPCError(code=-32601, message=f"Method '{method}' not found"),
    )
