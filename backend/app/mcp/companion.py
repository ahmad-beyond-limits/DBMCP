import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuditLog, FileRecord, Note, User, Workspace, utc_now
from app.notes.service import NoteService
from app.workspaces.service import WorkspaceService
from app.audit.service import AuditService

logger = logging.getLogger(__name__)


class UserCompanionHarnessService:
    """
    User-Scoped Centralized Companion Agent Harness Service.
    
    Architectural Hierarchy:
    1. External AI: Consumer LLM (Claude, Cursor, ChatGPT, autonomous CLI agents).
    2. Centralized Harness: User-scoped cognitive companion, memory bank, and execution governor.
    3. DBMCP: Underlying enterprise data platform, storage, datasets, and workspaces.
    
    The Harness travels with the USER across all their workspaces, preserving behavioral context,
    analytical takeaways, user preferences, and externalized memory via structured Notes.
    """

    @classmethod
    async def ensure_notes_workspace(cls, db: AsyncSession, user_id: str) -> Workspace:
        """
        Retrieves or creates the user's dedicated primary Notes workspace.
        """
        return await WorkspaceService.ensure_user_default_workspace(db, user_id)

    @classmethod
    async def get_user_harness_context_snapshot(
        cls,
        db: AsyncSession,
        user_id: Optional[str],
        current_workspace_id: Optional[str] = None,
        limit_insights: int = 5,
        limit_traces: int = 5,
    ) -> Dict[str, Any]:
        """
        Builds a comprehensive, policy-governed User Companion Context Snapshot.
        Injected into the external AI's context on startup and cache retrieval.
        """
        if not user_id:
            return {
                "status": "anonymous_or_unscoped",
                "harness_message": "No authenticated user_id associated with this session context.",
            }

        # 1. Fetch User Profile
        user_stmt = select(User).where(User.id == user_id)
        user = (await db.execute(user_stmt)).scalar_one_or_none()
        user_info = {
            "user_id": user_id,
            "username": user.username if user else "user",
            "display_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else (user.username if user else "User"),
        }

        # 2. Fetch User Workspaces Overview
        ws_stmt = select(Workspace).where(
            Workspace.owner_id == user_id,
            Workspace.is_active.is_(True),
        )
        workspaces = (await db.execute(ws_stmt)).scalars().all()
        workspace_summaries = []
        for ws in workspaces:
            workspace_summaries.append({
                "workspace_id": ws.id,
                "name": ws.name,
                "is_current": (ws.id == current_workspace_id),
            })

        # 3. Fetch Active Datasets across user workspaces (or focused on current workspace)
        ws_ids = [current_workspace_id] if current_workspace_id else [w.id for w in workspaces]
        active_datasets = []
        if ws_ids:
            files_stmt = (
                select(FileRecord)
                .where(
                    FileRecord.workspace_id.in_(ws_ids),
                    FileRecord.status == "READY",
                    FileRecord.note_id.is_(None),
                )
                .order_by(desc(FileRecord.created_at))
                .limit(10)
            )
            files = (await db.execute(files_stmt)).scalars().all()
            for f in files:
                active_datasets.append({
                    "file_id": f.id,
                    "filename": f.original_filename,
                    "file_type": f.file_type or "unknown",
                    "workspace_id": f.workspace_id,
                    "file_size": f.file_size,
                })

        # 4. Resolve Primary Notes Workspace & Retrieve Companion Memory Notes
        primary_notes_ws = await WorkspaceService.ensure_user_default_workspace(db, user_id)
        notes_ws_ids = list(set([primary_notes_ws.id] + ([current_workspace_id] if current_workspace_id else [])))

        # Fetch recent companion memory notes (tagged with companion-memory or recent notes)
        notes_stmt = (
            select(Note)
            .where(
                Note.workspace_id.in_(notes_ws_ids),
            )
            .order_by(desc(Note.updated_at))
            .limit(limit_insights * 2)
        )
        all_notes = (await db.execute(notes_stmt)).scalars().all()

        companion_insights = []
        for n in all_notes:
            tags = n.tags or []
            is_companion = any("companion" in str(t).lower() or "insight" in str(t).lower() or "preference" in str(t).lower() for t in tags)
            if is_companion or len(companion_insights) < limit_insights:
                snippet = (n.content[:200] + "...") if len(n.content or "") > 200 else (n.content or "")
                companion_insights.append({
                    "note_id": n.id,
                    "title": n.title,
                    "summary": snippet,
                    "tags": tags,
                    "workspace_id": n.workspace_id,
                    "updated_at": n.updated_at.isoformat() if n.updated_at else None,
                })
                if len(companion_insights) >= limit_insights:
                    break

        # 5. Fetch Recent Operations Trace from Audit Logs (non-sensitive activity)
        audit_stmt = (
            select(AuditLog)
            .where(
                AuditLog.user_id == user_id,
                AuditLog.decision == "ALLOW",
                AuditLog.operation.notin_([
                    "MCP_AUTH_SUCCESS", "TOOLS_CACHE_FETCHED", "WORKSPACE_INFO_ACCESSED"
                ]),
            )
            .order_by(desc(AuditLog.timestamp))
            .limit(limit_traces)
        )
        audit_records = (await db.execute(audit_stmt)).scalars().all()
        recent_activity = []
        for a in audit_records:
            recent_activity.append({
                "operation": a.operation,
                "resource_id": a.resource_id,
                "workspace_id": a.workspace_id,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            })

        return {
            "harness_tier": "Centralized User-Level Companion Harness v1.0",
            "user_profile": user_info,
            "user_workspaces": workspace_summaries,
            "active_datasets_overview": active_datasets,
            "companion_memory": {
                "primary_notes_workspace_id": primary_notes_ws.id,
                "recent_insights": companion_insights,
            },
            "recent_activity_trace": recent_activity,
            "harness_instructions": (
                "You are connected to this user's Centralized Companion Harness. "
                "This context snapshot represents the user's cross-workspace state, recent actions, and stored memory. "
                "Continuously externalize important user insights, analysis takeaways, data patterns, and preferences "
                "using the 'save_companion_insight' tool. Use 'get_companion_memory' to search past notes and findings."
            ),
        }

    @classmethod
    async def save_user_companion_insight(
        cls,
        db: AsyncSession,
        user_id: str,
        current_workspace_id: Optional[str],
        title: str,
        content: str,
        tags: Optional[List[str]] = None,
        referenced_file_ids: Optional[List[str]] = None,
        category: Optional[str] = "analysis_takeaway",
    ) -> Dict[str, Any]:
        """
        Saves a structured analytical insight, user preference, or project milestone
        into the user's externalized memory bank (stored in their primary Notes workspace).
        """
        if not user_id:
            raise ValueError("user_id is required to save a companion insight.")
        if not title or not str(title).strip():
            raise ValueError("title is required.")

        # Default to user's primary "Notes" workspace for persistent memory
        primary_notes_ws = await WorkspaceService.ensure_user_default_workspace(db, user_id)
        target_ws_id = primary_notes_ws.id

        # Standardize tags
        clean_tags = ["companion-memory"]
        if category:
            clean_tags.append(f"category:{str(category).strip().lower()}")
        if tags:
            for t in tags:
                ct = str(t).strip().lower()
                if ct and ct not in clean_tags:
                    clean_tags.append(ct)

        note = await NoteService.create_note(
            db=db,
            workspace_id=target_ws_id,
            title=f"[Companion Insight] {str(title).strip()}",
            content=content or "",
            tags=clean_tags,
            referenced_file_ids=referenced_file_ids or [],
            user_id=user_id,
        )

        await AuditService.log_event(
            db=db,
            user_id=user_id,
            workspace_id=target_ws_id,
            operation="COMPANION_INSIGHT_SAVED",
            actor_type="MCP_CLIENT",
            decision="ALLOW",
            reason=f"Saved companion insight note '{note.id}'",
            request_metadata={
                "note_id": note.id,
                "category": category,
                "tags": clean_tags,
                "origin_workspace_id": current_workspace_id,
            },
        )

        return {
            "success": True,
            "note_id": note.id,
            "workspace_id": target_ws_id,
            "workspace_name": primary_notes_ws.name,
            "title": note.title,
            "category": category,
            "tags": clean_tags,
            "referenced_file_ids": note.referenced_file_ids or [],
            "message": (
                f"Successfully externalized companion insight to user's memory in '{primary_notes_ws.name}'. "
                "This will persist across sessions and be available whenever the user returns."
            ),
        }

    @classmethod
    async def search_user_companion_memory(
        cls,
        db: AsyncSession,
        user_id: str,
        query: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """
        Searches the user's persistent companion memory across all their notes and insights.
        """
        if not user_id:
            raise ValueError("user_id is required to query companion memory.")

        primary_notes_ws = await WorkspaceService.ensure_user_default_workspace(db, user_id)
        
        # Query user notes
        stmt = (
            select(Note)
            .join(Workspace, Note.workspace_id == Workspace.id)
            .where(Workspace.owner_id == user_id)
        )

        if query and str(query).strip():
            clean_q = f"%{str(query).strip().lower()}%"
            stmt = stmt.where(
                or_(
                    Note.title.ilike(clean_q),
                    Note.content.ilike(clean_q),
                )
            )

        stmt = stmt.order_by(desc(Note.updated_at)).limit(limit * 2)
        results = (await db.execute(stmt)).scalars().all()

        matching_insights = []
        for n in results:
            tags = n.tags or []
            if category:
                cat_tag = f"category:{str(category).strip().lower()}"
                if cat_tag not in [str(t).lower() for t in tags]:
                    continue

            matching_insights.append({
                "note_id": n.id,
                "title": n.title,
                "content": n.content,
                "tags": tags,
                "workspace_id": n.workspace_id,
                "updated_at": n.updated_at.isoformat() if n.updated_at else None,
            })
            if len(matching_insights) >= limit:
                break

        await AuditService.log_event(
            db=db,
            user_id=user_id,
            workspace_id=primary_notes_ws.id,
            operation="COMPANION_MEMORY_QUERIED",
            actor_type="MCP_CLIENT",
            decision="ALLOW",
            reason=f"Queried companion memory (found {len(matching_insights)} entries)",
            request_metadata={"query": query, "category": category, "count": len(matching_insights)},
        )

        return {
            "success": True,
            "query": query,
            "category": category,
            "total_found": len(matching_insights),
            "memory_insights": matching_insights,
            "instructions": "Use these retrieved insights to inform your analysis, remember user preferences, and avoid redundant work.",
        }
