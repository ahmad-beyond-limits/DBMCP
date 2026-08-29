import logging
from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_admin_user
from app.core.security import create_access_token, hash_password
from app.database.models import (
    AuditLog,
    FileRecord,
    MCPCredential,
    User,
    Workspace,
    WorkspaceMember,
)
from app.database.session import get_db
from app.storage.supabase_storage import get_storage_backend

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Master Admin Console"])


# Pydantic Schemas
class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_workspaces: int
    total_files: int
    total_credentials: int
    total_audit_logs: int


class AdminUserItem(BaseModel):
    id: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_superuser: bool
    is_active: bool
    created_at: datetime
    workspaces_count: int = 0
    files_count: int = 0


class AdminUserStatusUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)


class AdminWorkspaceItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    owner_username: str
    created_at: datetime
    files_count: int = 0
    credentials_count: int = 0


# Routes
@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate global platform metrics for master admin overview."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar_one() or 0
    total_workspaces = (await db.execute(select(func.count(Workspace.id)))).scalar_one() or 0
    total_files = (await db.execute(select(func.count(FileRecord.id)))).scalar_one() or 0
    total_credentials = (await db.execute(select(func.count(MCPCredential.id)))).scalar_one() or 0
    total_audit_logs = (await db.execute(select(func.count(AuditLog.id)))).scalar_one() or 0

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_workspaces=total_workspaces,
        total_files=total_files,
        total_credentials=total_credentials,
        total_audit_logs=total_audit_logs,
    )


@router.get("/users", response_model=List[AdminUserItem])
async def list_admin_users(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all registered users with workspace and file counts."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    user_items = []
    for u in users:
        # Get count of owned workspaces
        ws_count = (await db.execute(
            select(func.count(Workspace.id)).where(Workspace.owner_id == u.id)
        )).scalar_one() or 0

        # Get count of files across owned workspaces
        files_count = (await db.execute(
            select(func.count(FileRecord.id)).where(
                FileRecord.workspace_id.in_(
                    select(Workspace.id).where(Workspace.owner_id == u.id)
                )
            )
        )).scalar_one() or 0

        user_items.append(
            AdminUserItem(
                id=u.id,
                username=u.username,
                first_name=u.first_name,
                last_name=u.last_name,
                is_superuser=u.is_superuser,
                is_active=u.is_active,
                created_at=u.created_at,
                workspaces_count=ws_count,
                files_count=files_count,
            )
        )

    return user_items


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    data: AdminUserStatusUpdateRequest,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Suspend/activate user or toggle superadmin privileges."""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.id == admin.id and data.is_superuser is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove superadmin privileges from your own account.",
        )

    if data.is_active is not None:
        target_user.is_active = data.is_active
    if data.is_superuser is not None:
        target_user.is_superuser = data.is_superuser

    await db.commit()
    await db.refresh(target_user)
    return {
        "status": "success",
        "message": f"User '{target_user.username}' status updated successfully.",
        "is_active": target_user.is_active,
        "is_superuser": target_user.is_superuser,
    }


@router.post("/users/{user_id}/reset-password")
async def admin_reset_user_password(
    user_id: str,
    data: AdminResetPasswordRequest,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Force reset a user's password directly as administrator."""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target_user.password_hash = hash_password(data.new_password)
    await db.commit()

    return {
        "status": "success",
        "message": f"Password for user '{target_user.username}' has been reset successfully.",
    }


@router.post("/users/{user_id}/impersonate")
async def impersonate_user(
    user_id: str,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a ghost-mode scoped JWT session to log in as this user."""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Generate token for target user
    impersonation_token = create_access_token(
        target_user.id,
        {"username": target_user.username, "impersonated_by": admin.username},
    )

    return {
        "status": "success",
        "access_token": impersonation_token,
        "target_username": target_user.username,
        "target_user_id": target_user.id,
    }


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a customer account and wipe all their workspaces and files."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account from the admin console.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 1. Find all workspaces owned by this user
    ws_result = await db.execute(select(Workspace).where(Workspace.owner_id == target_user.id))
    owned_workspaces = ws_result.scalars().all()
    ws_ids = [ws.id for ws in owned_workspaces]

    # 2. Purge physical stored files associated with all owned workspaces
    if ws_ids:
        files_result = await db.execute(select(FileRecord).where(FileRecord.workspace_id.in_(ws_ids)))
        files = files_result.scalars().all()
        storage = get_storage_backend()
        for f in files:
            try:
                if f.storage_path:
                    await storage.delete(f.storage_path)
            except Exception:
                pass

    # 3. Delete user record (Cascades delete across all models)
    await db.delete(target_user)
    await db.commit()

    return {
        "status": "success",
        "message": f"User '{target_user.username}' and all associated workspaces have been deleted.",
    }


@router.get("/workspaces", response_model=List[AdminWorkspaceItem])
async def list_all_admin_workspaces(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces across the platform with owner details."""
    result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
    workspaces = result.scalars().all()

    ws_items = []
    for ws in workspaces:
        # Get owner username
        owner_result = await db.execute(select(User.username).where(User.id == ws.owner_id))
        owner_username = owner_result.scalar_one_or_none() or "Unknown"

        # Count files
        files_count = (await db.execute(
            select(func.count(FileRecord.id)).where(FileRecord.workspace_id == ws.id)
        )).scalar_one() or 0

        # Count credentials
        creds_count = (await db.execute(
            select(func.count(MCPCredential.id)).where(MCPCredential.workspace_id == ws.id)
        )).scalar_one() or 0

        ws_items.append(
            AdminWorkspaceItem(
                id=ws.id,
                name=ws.name,
                description=ws.description,
                owner_id=ws.owner_id,
                owner_username=owner_username,
                created_at=ws.created_at,
                files_count=files_count,
                credentials_count=creds_count,
            )
        )

    return ws_items
