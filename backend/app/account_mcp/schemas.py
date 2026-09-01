from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AccountMCPPermissions(BaseModel):
    manage_workspaces: bool = Field(True, description="Create, list, and modify workspaces")
    upload_files: bool = Field(True, description="Upload documents/images and convert Google Drive/Dropbox links")
    read_data: bool = Field(True, description="Read extracted content and documents across workspaces")
    query_dataset: bool = Field(True, description="Execute queries, filters, and aggregations on tabular datasets")
    edit_dataset: bool = Field(False, description="Insert, update, or delete rows in tabular datasets")
    delete_files: bool = Field(False, description="Delete files and resources from workspaces")
    manage_mcp_keys: bool = Field(True, description="Generate and revoke workspace-scoped MCP keys")
    read_notes: bool = Field(True, description="Search, list, and read structured notes across workspaces")
    create_note: bool = Field(True, description="Create structured notes and scratchpads with document mentions")
    update_note: bool = Field(True, description="Update, edit, or append to existing notes across workspaces")
    delete_note: bool = Field(False, description="Delete notes from workspaces")


class CreateAccountMCPRequest(BaseModel):
    name: str = Field("Claude Account Operator", min_length=1, max_length=128)
    permissions: Optional[AccountMCPPermissions] = None
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Days until expiration, null for never")


class AccountMCPResponse(BaseModel):
    id: str
    name: str
    credential_prefix: str
    scope_type: str = "ACCOUNT"
    permissions: Dict[str, Any]
    created_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    is_active: bool


class CreatedAccountMCPResponse(AccountMCPResponse):
    raw_token: str


class AccountActivityResponse(BaseModel):
    id: str
    timestamp: datetime
    operation: str
    actor_type: str
    credential_id: Optional[str] = None
    workspace_id: Optional[str] = None
    decision: str
    reason: Optional[str] = None
    request_metadata: Optional[Dict[str, Any]] = None
