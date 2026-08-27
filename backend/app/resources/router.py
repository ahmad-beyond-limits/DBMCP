from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_user
from app.core.rate_limit import rate_limit
from app.database.models import ExtractedContent, FileRecord, User
from app.database.session import get_db
from app.resources.schemas import ExtractedContentResponse, FileRecordResponse
from app.resources.service import ResourceService
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces/{workspace_id}/files", tags=["Files"])


@router.get("", response_model=List[FileRecordResponse])
async def list_workspace_files(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all files in the workspace (scoped by workspace_id)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = (
        select(FileRecord)
        .where(FileRecord.workspace_id == workspace_id)
        .order_by(FileRecord.created_at.desc())
    )
    files = (await db.execute(stmt)).scalars().all()
    return files


@router.post(
    "",
    response_model=FileRecordResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60, scope="file_upload"))],
)
async def upload_file(
    workspace_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process a file to the workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    return await ResourceService.upload_and_process(db, workspace_id, user.id, file)


@router.get("/{file_id}", response_model=FileRecordResponse)
async def get_file_metadata(
    workspace_id: str,
    file_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve metadata of a file within the workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = select(FileRecord).where(
        FileRecord.id == file_id,
        FileRecord.workspace_id == workspace_id,
    )
    record = (await db.execute(stmt)).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return record


@router.get("/{file_id}/content", response_model=ExtractedContentResponse)
async def get_file_content(
    workspace_id: str,
    file_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve extracted content and detected entities for a file."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = select(ExtractedContent).where(
        ExtractedContent.file_id == file_id,
        ExtractedContent.workspace_id == workspace_id,
    )
    content = (await db.execute(stmt)).scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extracted content not found")
    return content


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    workspace_id: str,
    file_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a file from the workspace (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)
    await ResourceService.delete_file(db, workspace_id, file_id, user.id)
    return None
