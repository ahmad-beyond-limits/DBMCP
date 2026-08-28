from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


# MCP Credential Management
class MCPCredentialCreateRequest(BaseModel):
    name: str = Field(default="Default AI Client", max_length=128)
    expires_in_days: Optional[int] = Field(default=30, ge=1, le=365)
    permissions: Optional[Dict[str, Any]] = Field(default_factory=dict)


class MCPCredentialUpdateRequest(BaseModel):
    name: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None


class MCPCredentialCreateResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    credential_prefix: str
    raw_token: str  # Revealed ONLY ONCE!
    warning: str = "This token grants access according to workspace policies. Store it securely. It will not be shown again."
    expires_at: Optional[datetime] = None
    created_at: datetime
    permissions: Optional[Dict[str, Any]] = None


class MCPCredentialListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    name: str
    credential_prefix: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    is_active: bool
    permissions: Optional[Dict[str, Any]] = None


# JSON-RPC 2.0 MCP Protocol Schemas
class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Union[str, int]] = 1
    method: str
    params: Optional[Dict[str, Any]] = None


class JSONRPCError(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None


class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Union[str, int]] = 1
    result: Optional[Any] = None
    error: Optional[JSONRPCError] = None
