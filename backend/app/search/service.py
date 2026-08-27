import re
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.anonymisation.engine import AnonymisationEngine
from app.database.models import ExtractedContent, FileRecord
from app.policies.engine import PolicyEngine


class SearchService:
    @classmethod
    async def search_workspace(
        cls,
        db: AsyncSession,
        workspace_id: str,
        actor: Any,
        query: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Workspace-scoped search that enforces policy evaluation and snippet anonymisation.
        Omit denied files entirely. Anonymise all returned snippets.
        """
        clean_q = query.strip()
        if not clean_q:
            return []

        # Find extracted content matching query within workspace
        # Case-insensitive substring matching for universal SQLite & Postgres compatibility
        stmt = (
            select(FileRecord, ExtractedContent)
            .join(ExtractedContent, ExtractedContent.file_id == FileRecord.id)
            .where(
                FileRecord.workspace_id == workspace_id,
                FileRecord.status == "READY",
            )
        )
        rows = (await db.execute(stmt)).all()

        results = []
        pattern = re.compile(re.escape(clean_q), re.IGNORECASE)

        for file_rec, content in rows:
            # Check resource policy
            decision = await PolicyEngine.evaluate(
                db=db,
                workspace_id=workspace_id,
                actor=actor,
                operation="search",
                resource=file_rec,
            )
            if not decision.allowed:
                continue

            # Check if query matches filename or text
            text = content.plain_text or ""
            filename_match = pattern.search(file_rec.original_filename)
            text_match = pattern.search(text)

            if filename_match or text_match:
                snippet = ""
                if text_match:
                    start = max(0, text_match.start() - 60)
                    end = min(len(text), text_match.end() + 60)
                    snippet = f"...{text[start:end]}..."
                else:
                    snippet = text[:120] + "..." if len(text) > 120 else text

                # Apply anonymisation to snippet
                safe_snippet = AnonymisationEngine.apply_to_text(
                    text=snippet,
                    rules=decision.transformations,
                    workspace_id=workspace_id,
                )

                results.append({
                    "resource_id": file_rec.id,
                    "filename": file_rec.original_filename,
                    "file_type": file_rec.file_type,
                    "snippet": safe_snippet,
                })

                if len(results) >= limit:
                    break

        return results
