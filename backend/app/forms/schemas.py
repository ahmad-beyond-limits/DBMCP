from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FormFieldDefinition(BaseModel):
    name: str = Field(..., description="The dataset column name")
    label: str = Field(..., description="Clean, human-readable display label")
    type: str = Field(default="text", description="Input type: 'text', 'number', 'date', 'boolean', 'select'")
    options: Optional[List[str]] = Field(default=None, description="Preset options for select dropdowns if repeated categories exist")
    required: bool = Field(default=False, description="Whether the field is required")
    current_value: Optional[Any] = Field(default=None, description="Existing value when updating a record")
    placeholder: Optional[str] = Field(default=None, description="Sample placeholder text")


class FormSessionResponse(BaseModel):
    session_token: str
    workspace_id: str
    workspace_name: str
    file_id: str
    filename: str
    action: str = Field(..., description="'insert' (new row) or 'update' (modify row)")
    title: str = Field(..., description="Headline of the entry form")
    description: Optional[str] = None
    target_identifier: Optional[str] = Field(default=None, description="e.g. 'Student 3' or 'ID: 101'")
    fields: List[FormFieldDefinition] = Field(default_factory=list)
    prefilled_values: Dict[str, Any] = Field(default_factory=dict)
    expires_at: str


class FormSubmitRequest(BaseModel):
    session_token: str
    values: Dict[str, Any] = Field(..., description="Key-value mapping of column names to submitted values")


class FormSubmitResponse(BaseModel):
    status: str = "success"
    message: str
    action: str
    filename: str
    affected_records: int
    record: Dict[str, Any]
