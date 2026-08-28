import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.core.security import hash_mcp_token, verify_mcp_token
from app.database.models import MCPCredential, Workspace, ensure_utc, utc_now

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedMCPContext:
    workspace_id: str
    credential_id: str
    credential_prefix: str
    workspace_name: str
    authenticated: bool = True
    policy_version: int = 1
    permissions: Optional[dict] = None


class MCPAuthService:
    @classmethod
    async def validate_credential(
        cls,
        db: AsyncSession,
        raw_token: str,
    ) -> AuthenticatedMCPContext:
        """
        Validates raw MCP bearer token against hashed database credentials.
        Returns AuthenticatedMCPContext strictly derived from the verified token.
        Never reveals specific failure details to caller to prevent enumeration.
        """
        clean_token = raw_token.strip()
        generic_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unauthorized MCP credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        if not clean_token.startswith("mcp_live_"):
            logger.warning("MCP auth failure: Malformed token structure")
            raise generic_error

        # Format: mcp_live_<prefix>_<secret>
        parts = clean_token.split("_")
        if len(parts) < 4:
            logger.warning("MCP auth failure: Invalid token format")
            raise generic_error

        prefix = f"{parts[0]}_{parts[1]}_{parts[2]}"

        # Look up by prefix
        stmt = select(MCPCredential).where(MCPCredential.credential_prefix == prefix)
        cred = (await db.execute(stmt)).scalar_one_or_none()

        if not cred:
            logger.warning(f"MCP auth failure: Prefix {prefix} not found")
            raise generic_error

        # Check revocation
        if cred.revoked_at is not None:
            await AuditService.log_event(
                db=db,
                workspace_id=cred.workspace_id,
                operation="MCP_AUTH_FAILURE",
                actor_type="MCP_CLIENT",
                credential_id=cred.id,
                decision="DENY",
                reason="Credential has been revoked",
            )
            logger.warning(f"MCP auth failure: Credential {cred.id} is revoked")
            raise generic_error

        # Check expiration
        now = utc_now()
        if cred.expires_at is not None and ensure_utc(cred.expires_at) < now:
            await AuditService.log_event(
                db=db,
                workspace_id=cred.workspace_id,
                operation="MCP_AUTH_FAILURE",
                actor_type="MCP_CLIENT",
                credential_id=cred.id,
                decision="DENY",
                reason="Credential has expired",
            )
            logger.warning(f"MCP auth failure: Credential {cred.id} has expired")
            raise generic_error

        # Verify hash
        if not verify_mcp_token(clean_token, cred.secret_hash):
            await AuditService.log_event(
                db=db,
                workspace_id=cred.workspace_id,
                operation="MCP_AUTH_FAILURE",
                actor_type="MCP_CLIENT",
                credential_id=cred.id,
                decision="DENY",
                reason="Cryptographic signature verification failed",
            )
            logger.warning(f"MCP auth failure: Hash mismatch for credential {cred.id}")
            raise generic_error

        # Fetch workspace to verify it is active
        ws_stmt = select(Workspace).where(Workspace.id == cred.workspace_id)
        ws = (await db.execute(ws_stmt)).scalar_one_or_none()
        if not ws or not ws.is_active:
            logger.warning(f"MCP auth failure: Workspace {cred.workspace_id} is inactive or deleted")
            raise generic_error

        # Update last_used_at
        cred.last_used_at = now
        await db.commit()

        # Audit successful authentication
        await AuditService.log_event(
            db=db,
            workspace_id=cred.workspace_id,
            operation="MCP_AUTH_SUCCESS",
            actor_type="MCP_CLIENT",
            credential_id=cred.id,
            decision="ALLOW",
            reason="Authenticated with valid workspace MCP credential",
            request_metadata={"credential_prefix": cred.credential_prefix},
        )

        return AuthenticatedMCPContext(
            workspace_id=ws.id,
            credential_id=cred.id,
            credential_prefix=cred.credential_prefix,
            workspace_name=ws.name,
            authenticated=True,
            permissions=cred.permissions or {},
        )
