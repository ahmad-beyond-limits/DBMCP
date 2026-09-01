from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128, description="Workspace name")
    description: Optional[str] = Field(None, max_length=255, description="One line workspace description")


class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class WorkspaceMemberAddRequest(BaseModel):
    username: str
    role: str = Field(default="MEMBER", pattern="^(OWNER|MEMBER)$")


class WorkspaceMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    user_id: str
    username: Optional[str] = None
    role: str
    created_at: datetime


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    is_active: bool
    role: Optional[str] = "OWNER"
    files_count: Optional[int] = 0
    policies_count: Optional[int] = 0
    credentials_count: Optional[int] = 0
    notes_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
