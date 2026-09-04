import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Workspace, WorkspaceMember

logger = logging.getLogger(__name__)

async def reconcile_workspace_memberships(db: AsyncSession) -> int:
    """
    Ensures every workspace has a corresponding WorkspaceMember row for its owner.
    Repairs legacy or orphaned workspaces so they are fully visible and accessible.
    """
    try:
        workspaces = (await db.execute(select(Workspace))).scalars().all()
        repaired_count = 0
        for ws in workspaces:
            if not ws.owner_id:
                continue
            mem_stmt = select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == ws.owner_id,
            )
            existing = (await db.execute(mem_stmt)).scalar_one_or_none()
            if not existing:
                member = WorkspaceMember(
                    workspace_id=ws.id,
                    user_id=ws.owner_id,
                    role="OWNER",
                )
                db.add(member)
                repaired_count += 1
        if repaired_count > 0:
            await db.commit()
            logger.info(f"Reconciled {repaired_count} orphaned workspace membership(s).")
        return repaired_count
    except Exception as e:
        logger.warning(f"Failed to reconcile workspace memberships: {e}")
        return 0
