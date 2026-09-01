from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class NoteCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title or summary of the note")
    content: str = Field("", description="Markdown or text content of the note")
    tags: Optional[List[str]] = Field(default_factory=list, description="Categorization tags")
    referenced_file_ids: Optional[List[str]] = Field(default_factory=list, description="IDs of workspace files referenced by this note")


class NoteUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, description="Full replacement content")
    append_content: Optional[str] = Field(None, description="Text to append to the end of existing note")
    tags: Optional[List[str]] = Field(None, description="Updated tags")
    referenced_file_ids: Optional[List[str]] = Field(None, description="Updated IDs of workspace files referenced by this note")


class NoteAttachedFileResponse(BaseModel):
    id: str
    workspace_id: str
    note_id: Optional[str] = None
    original_filename: str
    file_type: str
    file_size: int
    content_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class NoteResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    content: str
    tags: Optional[List[str]] = []
    referenced_file_ids: Optional[List[str]] = []
    referenced_files: Optional[List[NoteAttachedFileResponse]] = []
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    files: Optional[List[NoteAttachedFileResponse]] = []

    class Config:
        from_attributes = True


class NoteListResponse(BaseModel):
    notes: List[NoteResponse]
    total: int

