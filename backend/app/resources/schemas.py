from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class FileRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    original_filename: str
    content_type: str
    file_size: int
    file_type: str
    status: str
    uploaded_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ExtractedContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_id: str
    workspace_id: str
    plain_text: str
    structured_data: Optional[Dict[str, Any]] = None
    detected_entities: Optional[List[Dict[str, Any]]] = None
    summary: Optional[str] = None
    created_at: datetime
