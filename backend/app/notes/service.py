import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models import FileRecord, Note, utc_now

logger = logging.getLogger(__name__)


class NoteService:
    @staticmethod
    async def extract_workspace_file_references(
        db: AsyncSession,
        workspace_id: str,
        content: str,
        explicit_file_ids: Optional[List[str]] = None,
    ) -> List[str]:
        """
        Extracts referenced file IDs from note content (mentions like @filename, @[filename], @file_id)
        and merges with explicit file IDs, strictly verifying that all files belong to workspace_id.
        """
        stmt = select(FileRecord).where(
            FileRecord.workspace_id == workspace_id,
            FileRecord.note_id.is_(None),
        )
        ws_files = (await db.execute(stmt)).scalars().all()
        ws_file_map = {f.id: f for f in ws_files}
        filename_map = {f.original_filename.lower(): f.id for f in ws_files}

        resolved_ids: Set[str] = set()

        # 1. Add valid explicit file IDs
        if explicit_file_ids:
            for fid in explicit_file_ids:
                if fid in ws_file_map:
                    resolved_ids.add(fid)

        # 2. Parse @[filename] or @filename from content
        if content:
            content_lower = content.lower()

            # Matches @[filename.ext]
            bracketed = re.findall(r"@\[([^\]]+)\]", content)
            for fname in bracketed:
                fn_clean = fname.strip().rstrip(".,;:!?)'\"").lower()
                if fn_clean in filename_map:
                    resolved_ids.add(filename_map[fn_clean])
                elif fname.strip().rstrip(".,;:!?)'\"") in ws_file_map:
                    resolved_ids.add(fname.strip().rstrip(".,;:!?)'\""))

            # Matches @filename.ext
            unbracketed = re.findall(r"@([a-zA-Z0-9_\-\.]+)", content)
            for word in unbracketed:
                w_clean = word.strip().rstrip(".,;:!?)'\"").lower()
                w_raw = word.strip().rstrip(".,;:!?)'\"")
                if w_clean in filename_map:
                    resolved_ids.add(filename_map[w_clean])
                elif w_raw in ws_file_map:
                    resolved_ids.add(w_raw)

            # Direct check for every workspace document mentioned with @
            for fname_lower, fid in filename_map.items():
                if f"@{fname_lower}" in content_lower or f"@[{fname_lower}]" in content_lower:
                    resolved_ids.add(fid)

        return list(resolved_ids)

    @staticmethod
    async def populate_referenced_files(
        db: AsyncSession,
        notes: List[Note],
    ) -> List[Note]:
        """
        Loads and attaches FileRecord models for each note's referenced_file_ids.
        """
        if not notes:
            return notes

        all_file_ids: Set[str] = set()
        for note in notes:
            ref_ids = getattr(note, "referenced_file_ids", None) or []
            if isinstance(ref_ids, list):
                all_file_ids.update(ref_ids)

        file_map: Dict[str, FileRecord] = {}
        if all_file_ids:
            stmt = select(FileRecord).where(FileRecord.id.in_(list(all_file_ids)))
            records = (await db.execute(stmt)).scalars().all()
            file_map = {r.id: r for r in records}

        for note in notes:
            ref_ids = getattr(note, "referenced_file_ids", None) or []
            note.referenced_files = [file_map[fid] for fid in ref_ids if fid in file_map]

        return notes

    @staticmethod
    async def create_note(
        db: AsyncSession,
        workspace_id: str,
        title: str,
        content: str = "",
        tags: Optional[List[str]] = None,
        referenced_file_ids: Optional[List[str]] = None,
        user_id: Optional[str] = None,
    ) -> Note:
        """Creates and stores a new structured Note with workspace file references in the workspace."""
        clean_tags = [str(t).strip() for t in (tags or []) if str(t).strip()]
        clean_refs = await NoteService.extract_workspace_file_references(
            db, workspace_id, content or "", referenced_file_ids
        )
        note = Note(
            workspace_id=workspace_id,
            title=title.strip(),
            content=content or "",
            tags=clean_tags,
            referenced_file_ids=clean_refs,
            created_by=user_id,
        )
        db.add(note)
        await db.commit()
        await db.refresh(note)
        await NoteService.populate_referenced_files(db, [note])
        return note

    @staticmethod
    async def list_notes(
        db: AsyncSession,
        workspace_id: str,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Note], int]:
        """Lists and searches notes in the given workspace."""
        query = select(Note).options(selectinload(Note.files)).where(Note.workspace_id == workspace_id)

        if search and search.strip():
            s_term = f"%{search.strip()}%"
            query = query.where(or_(Note.title.ilike(s_term), Note.content.ilike(s_term)))

        # Count total
        count_query = select(func.count(Note.id)).where(Note.workspace_id == workspace_id)
        if search and search.strip():
            s_term = f"%{search.strip()}%"
            count_query = count_query.where(or_(Note.title.ilike(s_term), Note.content.ilike(s_term)))

        total = (await db.execute(count_query)).scalar() or 0

        query = query.order_by(desc(Note.updated_at)).offset(offset).limit(limit)
        results = list((await db.execute(query)).scalars().all())

        await NoteService.populate_referenced_files(db, results)

        # In-memory tag filter fallback for JSON fields if needed
        if tag and tag.strip():
            tag_clean = tag.strip().lower()
            filtered = [
                n for n in results
                if n.tags and any(str(t).lower() == tag_clean for t in n.tags)
            ]
            return filtered, len(filtered)

        return results, total

    @staticmethod
    async def get_note(
        db: AsyncSession,
        workspace_id: str,
        note_id: str,
    ) -> Optional[Note]:
        """Fetches a specific note by ID or title within a workspace."""
        stmt = (
            select(Note)
            .options(selectinload(Note.files))
            .where(
                Note.workspace_id == workspace_id,
                or_(Note.id == note_id, Note.title == note_id),
            )
        )
        note = (await db.execute(stmt)).scalar_one_or_none()
        if note:
            await NoteService.populate_referenced_files(db, [note])
        return note

    @staticmethod
    async def update_note(
        db: AsyncSession,
        workspace_id: str,
        note_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        append_content: Optional[str] = None,
        tags: Optional[List[str]] = None,
        referenced_file_ids: Optional[List[str]] = None,
    ) -> Optional[Note]:
        """Modifies or appends to an existing note and updates file references."""
        note = await NoteService.get_note(db, workspace_id, note_id)
        if not note:
            return None

        if title is not None:
            note.title = title.strip()
        
        if content is not None:
            note.content = content
        elif append_content is not None and append_content.strip():
            if note.content:
                note.content += "\n\n" + append_content.strip()
            else:
                note.content = append_content.strip()

        if tags is not None:
            note.tags = [str(t).strip() for t in tags if str(t).strip()]

        if referenced_file_ids is not None or content is not None or append_content is not None:
            current_refs = referenced_file_ids if referenced_file_ids is not None else (note.referenced_file_ids or [])
            note.referenced_file_ids = await NoteService.extract_workspace_file_references(
                db, workspace_id, note.content, current_refs
            )

        note.updated_at = utc_now()
        await db.commit()
        await db.refresh(note)
        await NoteService.populate_referenced_files(db, [note])
        return note

    @staticmethod
    async def delete_note(
        db: AsyncSession,
        workspace_id: str,
        note_id: str,
    ) -> bool:
        """Deletes a note from the workspace."""
        note = await NoteService.get_note(db, workspace_id, note_id)
        if not note:
            return False

        await db.delete(note)
        await db.commit()
        return True
