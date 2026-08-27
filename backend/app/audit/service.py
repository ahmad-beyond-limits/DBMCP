import logging
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    @staticmethod
    def _sanitize_metadata(metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Strip raw secrets, passwords, or full document content from metadata."""
        if not metadata:
            return {}
        sanitized = {}
        sensitive_keys = {
            "password", "secret", "token", "raw_token", "jwt", "key", "authorization",
            "plain_text", "content", "file_content", "credential"
        }
        for k, v in metadata.items():
            if any(s in k.lower() for s in sensitive_keys):
                sanitized[k] = "[REDACTED_FROM_AUDIT]"
            elif isinstance(v, dict):
                sanitized[k] = AuditService._sanitize_metadata(v)
            else:
                sanitized[k] = str(v)[:255]
        return sanitized

    @classmethod
    async def log_event(
        cls,
        db: AsyncSession,
        workspace_id: str,
        operation: str,
        actor_type: str,  # USER, MCP_CLIENT, SYSTEM
        decision: str,    # ALLOW, DENY, ALLOW_WITH_TRANSFORMATION
        credential_id: Optional[str] = None,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        reason: Optional[str] = None,
        policy_version: int = 1,
        request_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Create and persist an audit event securely."""
        clean_metadata = cls._sanitize_metadata(request_metadata)

        log_entry = AuditLog(
            workspace_id=workspace_id,
            actor_type=actor_type,
            credential_id=credential_id,
            user_id=user_id,
            operation=operation,
            resource_type=resource_type,
            resource_id=resource_id,
            decision=decision,
            reason=reason,
            policy_version=policy_version,
            request_metadata=clean_metadata,
        )
        db.add(log_entry)
        try:
            await db.commit()
            await db.refresh(log_entry)
        except Exception as e:
            logger.error(f"Failed to persist audit log: {e}")
            await db.rollback()
        return log_entry
