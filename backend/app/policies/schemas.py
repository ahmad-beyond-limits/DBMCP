from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ResourcePolicyCreate(BaseModel):
    resource_id: Optional[str] = Field(None, description="Target file UUID or None for workspace-wide default")
    operation: str = Field(default="read_resource", description="Protected operation name")
    decision: str = Field(..., pattern="^(ALLOW|DENY)$", description="ALLOW or DENY")


class OperationPolicyCreate(BaseModel):
    operation: str = Field(..., description="Operation name (e.g. list_resources, search, read_resource, query_dataset)")
    decision: str = Field(..., pattern="^(ALLOW|DENY)$", description="ALLOW or DENY")


class AnonymisationRuleCreate(BaseModel):
    entity_type: str = Field(..., description="Entity type: email, phone, ssn, person_name, or column name")
    field_name: Optional[str] = Field(None, description="Optional column/field name for CSV/JSON")
    transformation: str = Field(..., pattern="^(ALLOW|REMOVE|REDACT|MASK|PSEUDONYMIZE|DENY)$")


class PolicyResponse(BaseModel):
    id: str
    workspace_id: str
    type: str  # resource, operation, anonymisation
    name: str
    details: Dict[str, str]
    created_at: datetime


class PolicyDecision(BaseModel):
    allowed: bool
    decision: str  # ALLOW, DENY, ALLOW_WITH_TRANSFORMATION
    transformations: Dict[str, str] = {}
    denied_fields: List[str] = []
    reason: Optional[str] = None
    policy_version: int = 1
