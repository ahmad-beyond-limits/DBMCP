from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import (
    FileRecord,
    MCPCredential,
    ResourcePolicy,
    User,
    Workspace,
    WorkspaceMember,
)


class WorkspaceService:
    @staticmethod
    async def get_user_workspace_role(
        db: AsyncSession, workspace_id: str, user_id: str
    ) -> Optional[str]:
        """Returns the user's role in the workspace (OWNER, MEMBER) or None if not a member."""
        # Direct check on workspace_members
        result = await db.execute(
            select(WorkspaceMember.role).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        role = result.scalar_one_or_none()
        if role:
            return role

        # Fallback check on workspace.owner_id
        ws_result = await db.execute(
            select(Workspace.owner_id).where(Workspace.id == workspace_id)
        )
        owner_id = ws_result.scalar_one_or_none()
        if owner_id == user_id:
            return "OWNER"
        return None

    @classmethod
    async def verify_access(
        cls,
        db: AsyncSession,
        workspace_id: str,
        user_id: str,
        require_owner: bool = False,
    ) -> Tuple[Workspace, str]:
        """
        Verify that a user has access to the given workspace.
        Raises 404 (or 403) to prevent unauthorized access and cross-workspace inspection.
        """
        result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
        workspace = result.scalar_one_or_none()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )

        role = await cls.get_user_workspace_role(db, workspace_id, user_id)
        if not role:
            # Do not leak workspace existence to unauthorized users
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )

        if require_owner and role != "OWNER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Action requires OWNER role in this workspace",
            )

        return workspace, role

    @staticmethod
    async def get_workspace_counts(db: AsyncSession, workspace_id: str) -> dict:
        """Fetch summary counts for files, policies, credentials."""
        files_q = await db.execute(
            select(func.count(FileRecord.id)).where(FileRecord.workspace_id == workspace_id)
        )
        policies_q = await db.execute(
            select(func.count(ResourcePolicy.id)).where(ResourcePolicy.workspace_id == workspace_id)
        )
        creds_q = await db.execute(
            select(func.count(MCPCredential.id)).where(
                MCPCredential.workspace_id == workspace_id,
                MCPCredential.revoked_at.is_(None),
            )
        )
        return {
            "files_count": files_q.scalar() or 0,
            "policies_count": policies_q.scalar() or 0,
            "credentials_count": creds_q.scalar() or 0,
        }
