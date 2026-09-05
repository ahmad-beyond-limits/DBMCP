from typing import List
from urllib.parse import quote
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_user
from app.core.rate_limit import rate_limit
from app.database.models import ExtractedContent, FileRecord, User
from app.database.session import get_db
from app.resources.schemas import ExtractedContentResponse, FileRecordResponse, ImportLinkRequest
from app.resources.service import ResourceService
from app.storage.supabase_storage import get_storage_backend
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces/{workspace_id}/files", tags=["Files"])


@router.get("", response_model=List[FileRecordResponse])
async def list_workspace_files(
    workspace_id: str,
    include_notes: bool = Query(False, description="Include note-attached files"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all files in the workspace (scoped by workspace_id). Excludes note attachments by default."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = select(FileRecord).where(FileRecord.workspace_id == workspace_id)
    if not include_notes:
        stmt = stmt.where(FileRecord.note_id.is_(None))

    stmt = stmt.order_by(FileRecord.created_at.desc())
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


@router.post(
    "/import-link",
    response_model=FileRecordResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60, scope="file_import"))],
)
async def import_cloud_link(
    workspace_id: str,
    data: ImportLinkRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import and extract a file from Google Drive, Dropbox, or direct URL into workspace MCP."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    return await ResourceService.import_from_cloud_link(
        db=db,
        workspace_id=workspace_id,
        user_id=user.id,
        url=data.url,
        custom_name=data.custom_name,
    )


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


@router.get("/{file_id}/download")
async def download_file(
    workspace_id: str,
    file_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download raw binary file from storage with attachment disposition."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = select(FileRecord).where(
        FileRecord.id == file_id,
        FileRecord.workspace_id == workspace_id,
    )
    record = (await db.execute(stmt)).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    storage = get_storage_backend()
    try:
        content = await storage.download(record.storage_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found in storage")

    filename = record.original_filename or "download"
    encoded_filename = quote(filename)
    return Response(
        content=content,
        media_type=record.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"; filename*=UTF-8\'\'{encoded_filename}',
        },
    )


@router.get("/{file_id}/raw")
async def get_raw_file(
    workspace_id: str,
    file_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream raw file inline (for image viewing, vectors, or direct browser preview)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    stmt = select(FileRecord).where(
        FileRecord.id == file_id,
        FileRecord.workspace_id == workspace_id,
    )
    record = (await db.execute(stmt)).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    storage = get_storage_backend()
    try:
        content = await storage.download(record.storage_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found in storage")

    filename = record.original_filename or "preview"
    encoded_filename = quote(filename)
    return Response(
        content=content,
        media_type=record.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"; filename*=UTF-8\'\'{encoded_filename}',
        },
    )


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
