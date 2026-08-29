from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.router import get_current_user
from app.database.models import User, Workspace, WorkspaceMember
from app.database.session import get_db
from app.workspaces.schemas import (
    WorkspaceCreateRequest,
    WorkspaceMemberAddRequest,
    WorkspaceMemberResponse,
    WorkspaceResponse,
    WorkspaceUpdateRequest,
)
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces the authenticated user belongs to (as owner or member)."""
    # Workspaces where user is owner or member
    stmt = (
        select(Workspace, WorkspaceMember.role)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user.id)
        .order_by(Workspace.created_at.desc())
    )
    results = (await db.execute(stmt)).all()

    workspaces_out = []
    for ws, role in results:
        counts = await WorkspaceService.get_workspace_counts(db, ws.id)
        workspaces_out.append(
            WorkspaceResponse(
                id=ws.id,
                name=ws.name,
                description=ws.description,
                owner_id=ws.owner_id,
                is_active=ws.is_active,
                role=role,
                files_count=counts["files_count"],
                policies_count=counts["policies_count"],
                credentials_count=counts["credentials_count"],
                created_at=ws.created_at,
                updated_at=ws.updated_at,
            )
        )
    return workspaces_out


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace and make the authenticated user OWNER."""
    new_ws = Workspace(
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        owner_id=user.id,
    )
    db.add(new_ws)
    await db.flush()

    # Add owner membership
    membership = WorkspaceMember(
        workspace_id=new_ws.id,
        user_id=user.id,
        role="OWNER",
    )
    db.add(membership)
    await db.commit()
    await db.refresh(new_ws)

    return WorkspaceResponse(
        id=new_ws.id,
        name=new_ws.name,
        description=new_ws.description,
        owner_id=new_ws.owner_id,
        is_active=new_ws.is_active,
        role="OWNER",
        files_count=0,
        policies_count=0,
        credentials_count=0,
        created_at=new_ws.created_at,
        updated_at=new_ws.updated_at,
    )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a specific workspace if user is a member."""
    ws, role = await WorkspaceService.verify_access(db, workspace_id, user.id)
    counts = await WorkspaceService.get_workspace_counts(db, ws.id)

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        description=ws.description,
        owner_id=ws.owner_id,
        is_active=ws.is_active,
        role=role,
        files_count=counts["files_count"],
        policies_count=counts["policies_count"],
        credentials_count=counts["credentials_count"],
        created_at=ws.created_at,
        updated_at=ws.updated_at,
    )


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update workspace details (OWNER only)."""
    ws, role = await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    if data.name is not None:
        ws.name = data.name.strip()
    if data.description is not None:
        ws.description = data.description.strip() if data.description else None
    if data.is_active is not None:
        ws.is_active = data.is_active

    await db.commit()
    await db.refresh(ws)
    counts = await WorkspaceService.get_workspace_counts(db, ws.id)

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        description=ws.description,
        owner_id=ws.owner_id,
        is_active=ws.is_active,
        role=role,
        files_count=counts["files_count"],
        policies_count=counts["policies_count"],
        credentials_count=counts["credentials_count"],
        created_at=ws.created_at,
        updated_at=ws.updated_at,
    )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete workspace and all associated files/policies (OWNER only)."""
    ws, _ = await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)
    await db.delete(ws)
    await db.commit()
    return None


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
async def list_workspace_members(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List members of a workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = (
        select(WorkspaceMember, User.username)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.created_at.asc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        WorkspaceMemberResponse(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            username=uname,
            role=member.role,
            created_at=member.created_at,
        )
        for member, uname in rows
    ]


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_workspace_member(
    workspace_id: str,
    data: WorkspaceMemberAddRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to workspace by username (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    user_result = await db.execute(select(User).where(User.username == data.username.strip()))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{data.username}' not found",
        )

    # Check if already a member
    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == target_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace",
        )

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=target_user.id,
        role=data.role,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return WorkspaceMemberResponse(
        id=member.id,
        workspace_id=member.workspace_id,
        user_id=member.user_id,
        username=target_user.username,
        role=member.role,
        created_at=member.created_at,
    )


@router.delete("/{workspace_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_workspace_member(
    workspace_id: str,
    member_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a workspace (OWNER only, cannot remove owner)."""
    ws, _ = await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.id == member_id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.user_id == ws.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove workspace owner")

    await db.delete(member)
    await db.commit()
    return None
