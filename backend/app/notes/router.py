from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_user
from app.core.rate_limit import rate_limit
from app.database.models import FileRecord, User
from app.database.session import get_db
from app.notes.schemas import (
    NoteAttachedFileResponse,
    NoteCreateRequest,
    NoteListResponse,
    NoteResponse,
    NoteUpdateRequest,
)
from app.notes.service import NoteService
from app.resources.schemas import FileRecordResponse
from app.resources.service import ResourceService
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces/{workspace_id}/notes", tags=["Notes"])


@router.get("", response_model=NoteListResponse)
async def list_workspace_notes(
    workspace_id: str,
    tag: Optional[str] = Query(None, description="Filter by tag"),
    search: Optional[str] = Query(None, description="Search keyword in title/content"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List and search all notes in the specified workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    notes, total = await NoteService.list_notes(
        db=db,
        workspace_id=workspace_id,
        tag=tag,
        search=search,
        limit=limit,
        offset=offset,
    )
    return NoteListResponse(
        notes=[NoteResponse.model_validate(n) for n in notes],
        total=total,
    )


@router.post(
    "",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60, scope="note_create"))],
)
async def create_workspace_note(
    workspace_id: str,
    data: NoteCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new note in the workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    note = await NoteService.create_note(
        db=db,
        workspace_id=workspace_id,
        title=data.title,
        content=data.content,
        tags=data.tags,
        referenced_file_ids=data.referenced_file_ids,
        user_id=user.id,
    )
    return NoteResponse.model_validate(note)


@router.get("/{note_id}", response_model=NoteResponse)
async def get_workspace_note(
    workspace_id: str,
    note_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch details of a specific note."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    note = await NoteService.get_note(db, workspace_id, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found in this workspace",
        )
    return NoteResponse.model_validate(note)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_workspace_note(
    workspace_id: str,
    note_id: str,
    data: NoteUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update or append content to a note."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    note = await NoteService.update_note(
        db=db,
        workspace_id=workspace_id,
        note_id=note_id,
        title=data.title,
        content=data.content,
        append_content=data.append_content,
        tags=data.tags,
        referenced_file_ids=data.referenced_file_ids,
    )
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found in this workspace",
        )
    return NoteResponse.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_note(
    workspace_id: str,
    note_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a note from the workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    deleted = await NoteService.delete_note(db, workspace_id, note_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found in this workspace",
        )
    return None


@router.post(
    "/{note_id}/files",
    response_model=FileRecordResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60, scope="note_file_upload"))],
)
async def upload_note_file(
    workspace_id: str,
    note_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and attach a file/image to a specific note with isolated storage partitioning."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    note = await NoteService.get_note(db, workspace_id, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found in this workspace",
        )
    return await ResourceService.upload_and_process(
        db=db,
        workspace_id=workspace_id,
        user_id=user.id,
        upload_file=file,
        note_id=note.id,
    )


@router.get("/{note_id}/files", response_model=List[FileRecordResponse])
async def list_note_files(
    workspace_id: str,
    note_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all files attached to a specific note."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    note = await NoteService.get_note(db, workspace_id, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found in this workspace",
        )
    stmt = select(FileRecord).where(
        FileRecord.workspace_id == workspace_id,
        FileRecord.note_id == note.id,
    )
    files = (await db.execute(stmt)).scalars().all()
    return list(files)


@router.delete("/{note_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note_file(
    workspace_id: str,
    note_id: str,
    file_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a file attached to a note."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)
    note = await NoteService.get_note(db, workspace_id, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found in this workspace",
        )
    stmt = select(FileRecord).where(
        FileRecord.id == file_id,
        FileRecord.workspace_id == workspace_id,
        FileRecord.note_id == note.id,
    )
    record = (await db.execute(stmt)).scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attached file not found for this note",
        )
    await ResourceService.delete_file(db, workspace_id, user.id, file_id)
    return None

