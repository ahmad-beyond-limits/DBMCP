import logging
import uuid
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import (
    ExtractedContent,
    FileRecord,
    MCPCredential,
    Note,
    ResourcePolicy,
    User,
    Workspace,
    WorkspaceMember,
)
from app.storage.supabase_storage import get_storage_backend

logger = logging.getLogger(__name__)


class WorkspaceService:
    @staticmethod
    async def get_user_workspace_role(
        db: AsyncSession, workspace_id: str, user_id: str
    ) -> Optional[str]:
        """Returns the user's role in the workspace (OWNER, MEMBER) or None if not a member."""
        # Direct check on workspace_members
        result = await db.execute(
            select(WorkspaceMember.role).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        role = result.scalar_one_or_none()
        if role:
            return role

        # Fallback check on workspace.owner_id
        ws_result = await db.execute(
            select(Workspace.owner_id).where(Workspace.id == workspace_id)
        )
        owner_id = ws_result.scalar_one_or_none()
        if owner_id == user_id:
            return "OWNER"
        return None

    @classmethod
    async def ensure_user_default_workspace(cls, db: AsyncSession, user_id: str) -> Workspace:
        """
        Ensures the user has a default 'Notes' workspace.
        Creates one automatically if it does not exist.
        Also guarantees the 'Student' workspace is provisioned.
        """
        stmt = (
            select(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(
                WorkspaceMember.user_id == user_id,
                Workspace.name.ilike("Notes"),
            )
        )
        notes_ws = (await db.execute(stmt)).scalar_one_or_none()
        if not notes_ws:
            # Check by owner_id directly
            stmt_owner = select(Workspace).where(
                Workspace.owner_id == user_id,
                Workspace.name.ilike("Notes"),
            )
            notes_ws = (await db.execute(stmt_owner)).scalar_one_or_none()

        if not notes_ws:
            # Create default Notes workspace
            notes_ws = Workspace(
                name="Notes",
                description="Personal notes, knowledge base, and AI scratchpad",
                owner_id=user_id,
            )
            db.add(notes_ws)
            await db.flush()

            membership = WorkspaceMember(
                workspace_id=notes_ws.id,
                user_id=user_id,
                role="OWNER",
            )
            db.add(membership)
            await db.commit()
            await db.refresh(notes_ws)

        # Also guarantee the Student workspace is provisioned
        try:
            await cls.ensure_user_student_workspace(db, user_id)
        except Exception as e:
            logger.warning(f"Failed to auto-provision student workspace for user {user_id}: {e}")

        return notes_ws

    @classmethod
    async def ensure_user_student_workspace(cls, db: AsyncSession, user_id: str) -> Workspace:
        """
        Ensures the user has a pre-created 'Student' workspace.
        Creates one automatically if it does not exist, with starter student dataset.
        """
        stmt = (
            select(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(
                WorkspaceMember.user_id == user_id,
                Workspace.name.ilike("Student"),
            )
        )
        student_ws = (await db.execute(stmt)).scalar_one_or_none()
        if not student_ws:
            # Check by owner_id directly
            stmt_owner = select(Workspace).where(
                Workspace.owner_id == user_id,
                Workspace.name.ilike("Student"),
            )
            student_ws = (await db.execute(stmt_owner)).scalar_one_or_none()

        if student_ws:
            return student_ws

        # Create pre-created Student workspace
        student_ws = Workspace(
            name="Student",
            description="Student records, academic rosters, performance analytics, and grading data",
            owner_id=user_id,
        )
        db.add(student_ws)
        await db.flush()

        membership = WorkspaceMember(
            workspace_id=student_ws.id,
            user_id=user_id,
            role="OWNER",
        )
        db.add(membership)
        await db.commit()
        await db.refresh(student_ws)

        # Seed starter students.csv dataset so the workspace is immediately functional
        await cls._seed_student_workspace_dataset(db, student_ws.id, user_id)

        return student_ws

    @classmethod
    async def ensure_user_default_workspaces(cls, db: AsyncSession, user_id: str) -> Tuple[Workspace, Workspace]:
        """
        Ensures both default 'Notes' and 'Student' workspaces are provisioned for the user.
        """
        notes_ws = await cls.ensure_user_default_workspace(db, user_id)
        student_ws = await cls.ensure_user_student_workspace(db, user_id)
        return notes_ws, student_ws

    @classmethod
    async def _seed_student_workspace_dataset(cls, db: AsyncSession, workspace_id: str, user_id: str):
        """
        Seeds a starter students.csv dataset into the student workspace
        so the user and AI immediately have structured records to query and edit.
        """
        try:
            existing_file = (
                await db.execute(
                    select(FileRecord.id).where(
                        FileRecord.workspace_id == workspace_id,
                        FileRecord.original_filename == "students.csv",
                    )
                )
            ).scalar_one_or_none()
            if existing_file:
                return

            csv_text = (
                "student_id,name,email,grade,math_score,reading_score,status\n"
                "S001,Alice Johnson,alice@example.edu,10,88,92,Enrolled\n"
                "S002,Bob Smith,bob@example.edu,11,74,80,Enrolled\n"
                "S003,Charlie Brown,charlie@example.edu,10,95,91,Enrolled\n"
                "S004,Diana Prince,diana@example.edu,12,89,94,Enrolled\n"
                "S005,Evan Wright,evan@example.edu,11,62,70,Probation\n"
            )
            csv_content = csv_text.encode("utf-8")

            storage = get_storage_backend()
            storage_filename = f"{workspace_id}/{uuid.uuid4()}.csv"
            stored_path = await storage.upload(storage_filename, csv_content, "text/csv")

            from app.resources.extractor import ContentExtractor

            plain_text, structured_data, detected_entities = await ContentExtractor.extract(
                csv_content, "CSV", filename="students.csv"
            )

            file_record = FileRecord(
                workspace_id=workspace_id,
                original_filename="students.csv",
                storage_path=stored_path,
                content_type="text/csv",
                file_size=len(csv_content),
                file_type="CSV",
                status="READY",
                uploaded_by=user_id,
            )
            db.add(file_record)
            await db.flush()

            extracted_record = ExtractedContent(
                file_id=file_record.id,
                workspace_id=workspace_id,
                plain_text=plain_text,
                structured_data=structured_data,
                detected_entities=detected_entities or [],
            )
            db.add(extracted_record)
            await db.commit()
        except Exception as e:
            logger.warning(f"Could not seed starter students.csv for workspace {workspace_id}: {e}")
            await db.rollback()

    @classmethod
    async def verify_access(
        cls,
        db: AsyncSession,
        workspace_id: str,
        user_id: str,
        require_owner: bool = False,
    ) -> Tuple[Workspace, str]:
        """
        Verify that a user has access to the given workspace.
        Raises 404 (or 403) to prevent unauthorized access and cross-workspace inspection.
        """
        result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
        workspace = result.scalar_one_or_none()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )

        role = await cls.get_user_workspace_role(db, workspace_id, user_id)
        if not role:
            # Do not leak workspace existence to unauthorized users
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )

        if require_owner and role != "OWNER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Action requires OWNER role in this workspace",
            )

        return workspace, role

    @staticmethod
    async def get_workspace_counts(db: AsyncSession, workspace_id: str) -> dict:
        """Fetch summary counts for files, policies, credentials, and notes."""
        files_q = await db.execute(
            select(func.count(FileRecord.id)).where(
                FileRecord.workspace_id == workspace_id,
                FileRecord.note_id.is_(None),
            )
        )
        policies_q = await db.execute(
            select(func.count(ResourcePolicy.id)).where(ResourcePolicy.workspace_id == workspace_id)
        )
        creds_q = await db.execute(
            select(func.count(MCPCredential.id)).where(
                MCPCredential.workspace_id == workspace_id,
                MCPCredential.revoked_at.is_(None),
            )
        )
        notes_q = await db.execute(
            select(func.count(Note.id)).where(Note.workspace_id == workspace_id)
        )
        return {
            "files_count": files_q.scalar() or 0,
            "policies_count": policies_q.scalar() or 0,
            "credentials_count": creds_q.scalar() or 0,
            "notes_count": notes_q.scalar() or 0,
        }
