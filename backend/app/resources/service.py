import os
import uuid
from typing import Optional, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.core.config import settings
from app.database.models import ExtractedContent, FileRecord
from app.resources.extractor import ContentExtractor
from app.storage.supabase_storage import get_storage_backend

ALLOWED_EXTENSIONS = {
    ".pdf": "PDF",
    ".docx": "DOCX",
    ".txt": "TXT",
    ".csv": "CSV",
    ".json": "JSON",
}


class ResourceService:
    @staticmethod
    def get_extension_and_type(filename: str) -> Tuple[str, str]:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{ext}'. Allowed types: PDF, DOCX, TXT, CSV, JSON",
            )
        return ext, ALLOWED_EXTENSIONS[ext]

    @classmethod
    async def upload_and_process(
        cls,
        db: AsyncSession,
        workspace_id: str,
        user_id: str,
        upload_file: UploadFile,
    ) -> FileRecord:
        """Stores binary in storage backend, extracts content, and creates database records."""
        filename = upload_file.filename or "unknown"
        ext, file_type = cls.get_extension_and_type(filename)

        content = await upload_file.read()
        file_size = len(content)
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB",
            )

        storage = get_storage_backend()
        storage_filename = f"{workspace_id}/{uuid.uuid4()}{ext}"
        content_type = upload_file.content_type or "application/octet-stream"

        # 1. Save binary in storage backend
        stored_path = await storage.upload(storage_filename, content, content_type)

        # 2. Create FileRecord
        file_record = FileRecord(
            workspace_id=workspace_id,
            original_filename=filename,
            storage_path=stored_path,
            content_type=content_type,
            file_size=file_size,
            file_type=file_type,
            status="PROCESSING",
            uploaded_by=user_id,
        )
        db.add(file_record)
        await db.flush()

        # 3. Extract text and structured metadata
        try:
            plain_text, structured_data, detected_entities = ContentExtractor.extract(content, file_type)
            extracted = ExtractedContent(
                file_id=file_record.id,
                workspace_id=workspace_id,
                plain_text=plain_text,
                structured_data=structured_data,
                detected_entities=detected_entities,
                summary=f"Extracted {len(plain_text)} chars, {len(detected_entities)} entities detected.",
            )
            db.add(extracted)
            file_record.status = "READY"
        except Exception as e:
            file_record.status = "FAILED"

        await db.commit()
        await db.refresh(file_record)

        # 4. Audit log
        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            operation="FILE_UPLOADED",
            actor_type="USER",
            user_id=user_id,
            resource_type="file",
            resource_id=file_record.id,
            decision="ALLOW",
            reason="File uploaded and processed successfully",
            request_metadata={
                "filename": filename,
                "file_type": file_type,
                "file_size": file_size,
            },
        )

        return file_record

    @classmethod
    async def delete_file(
        cls,
        db: AsyncSession,
        workspace_id: str,
        file_id: str,
        user_id: str,
    ) -> bool:
        """Deletes a file from storage and database."""
        result = await db.execute(
            select(FileRecord).where(
                FileRecord.id == file_id,
                FileRecord.workspace_id == workspace_id,
            )
        )
        file_record = result.scalar_one_or_none()
        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        storage = get_storage_backend()
        await storage.delete(file_record.storage_path)

        await db.delete(file_record)
        await db.commit()

        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            operation="FILE_DELETED",
            actor_type="USER",
            user_id=user_id,
            resource_type="file",
            resource_id=file_id,
            decision="ALLOW",
            reason="File deleted by user",
        )
        return True
