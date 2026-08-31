import base64
import csv
import io
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import openpyxl
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.anonymisation.engine import AnonymisationEngine
from app.audit.service import AuditService
from app.core.security import generate_mcp_token, hash_mcp_token
from app.database.models import (
    AuditLog,
    ExtractedContent,
    FileRecord,
    MCPCredential,
    OperationPolicy,
    ResourcePolicy,
    User,
    Workspace,
    WorkspaceMember,
    ensure_utc,
    utc_now,
)
from app.mcp.auth import AuthenticatedMCPContext
from app.mcp.skills import ABOX_AI_SKILLS_GUIDE
from app.policies.engine import PolicyEngine
from app.resources.service import ResourceService
from app.search.service import SearchService
from app.storage.supabase_storage import get_storage_backend
from app.structured.query_engine import StructuredQueryEngine

logger = logging.getLogger(__name__)

DATASET_FILE_TYPES = ["CSV", "JSON", "XLSX", "XLS"]

# Account-Level Master Operator Tool Definitions
ACCOUNT_MCP_TOOLS_DEFINITIONS = [
    {
        "name": "account_info",
        "description": "Returns current user account profile, enabled permissions, and operational instructions for account automation.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "list_workspaces",
        "description": "Lists all workspaces owned by or accessible to this user account with member counts, file counts, and descriptions.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "create_workspace",
        "description": "Creates a new policy-isolated workspace under this account with a custom name and description.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "The name of the new workspace"},
                "description": {"type": "string", "description": "Optional purpose or description for the workspace"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "get_workspace",
        "description": "Retrieves comprehensive details about a specific workspace including members, file counts, and resource list.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "The workspace UUID or name"},
            },
            "required": ["workspace_id"],
        },
    },
    {
        "name": "list_files",
        "description": "Lists documents, datasets, and images across all user workspaces or within a specific workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Optional workspace UUID or name to filter files"},
            },
        },
    },
    {
        "name": "upload_file",
        "description": "Uploads and ingests a document, dataset (CSV, JSON, XLSX), or image into a workspace from raw text, JSON, or base64 binary content.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Target workspace UUID or name"},
                "filename": {"type": "string", "description": "Name of the file including extension (e.g. 'q3_sales.csv', 'report.pdf', 'diagram.svg')"},
                "content": {"type": "string", "description": "The file content (plain text, JSON string, CSV data, or base64-encoded binary)"},
                "is_base64": {"type": "boolean", "description": "Set to true if content is base64-encoded binary (e.g. for PDFs or raster images)"},
                "description": {"type": "string", "description": "Optional description for AI indexing and search"},
            },
            "required": ["workspace_id", "filename", "content"],
        },
    },
    {
        "name": "import_cloud_link",
        "description": "Converts a shared Google Drive file, Google Doc/Sheet/Slide, Dropbox link, or web URL into a policy-governed MCP resource in a workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Target workspace UUID or name"},
                "url": {"type": "string", "description": "Public or shared Google Drive / Dropbox / web URL"},
                "custom_name": {"type": "string", "description": "Optional custom filename for the imported resource"},
            },
            "required": ["workspace_id", "url"],
        },
    },
    {
        "name": "read_file_content",
        "description": "Reads the extracted text and structured contents of any file in a workspace with privacy and anonymisation policies applied.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Workspace UUID or name"},
                "file_id": {"type": "string", "description": "File UUID or filename"},
            },
            "required": ["workspace_id", "file_id"],
        },
    },
    {
        "name": "query_dataset",
        "description": "Queries, filters, and aggregates tabular data (CSV, XLSX, JSON) in any workspace with SQL-like precision.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Workspace UUID or name"},
                "file_id": {"type": "string", "description": "Dataset file UUID or filename"},
                "columns": {"type": "array", "items": {"type": "string"}, "description": "Columns to project"},
                "filters": {"type": "object", "description": "Key-value filter mapping"},
                "limit": {"type": "integer", "description": "Max rows to return (default 50)"},
                "aggregation": {
                    "type": "object",
                    "properties": {
                        "column": {"type": "string"},
                        "func": {"type": "string", "enum": ["count", "sum", "avg", "min", "max"]},
                    },
                    "description": "Optional aggregation specification",
                },
            },
            "required": ["workspace_id", "file_id"],
        },
    },
    {
        "name": "edit_dataset",
        "description": "Mutates (inserts, updates, or deletes) rows in a tabular dataset in a workspace. MANDATORY: Verify with query_dataset after mutation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Workspace UUID or name"},
                "file_id": {"type": "string", "description": "Dataset file UUID or filename"},
                "action": {"type": "string", "enum": ["update", "insert", "delete"], "description": "Mutation type"},
                "filters": {"type": "object", "description": "Key-value criteria to locate rows to update or delete"},
                "updates": {"type": "object", "description": "Key-value pairs of columns and new values to update"},
                "new_row": {"type": "object", "description": "Object representing a new row to insert when action is 'insert'"},
            },
            "required": ["workspace_id", "file_id", "action"],
        },
    },
    {
        "name": "delete_file",
        "description": "Permanently deletes a file/resource from a workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Workspace UUID or name"},
                "file_id": {"type": "string", "description": "File UUID or filename"},
            },
            "required": ["workspace_id", "file_id"],
        },
    },
    {
        "name": "list_workspace_mcp_links",
        "description": "Lists all active and revoked MCP access links for a specific workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Workspace UUID or name"},
            },
            "required": ["workspace_id"],
        },
    },
    {
        "name": "generate_workspace_mcp_link",
        "description": "Generates a new workspace-scoped MCP access token with specific permissions and optional file scopes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Workspace UUID or name"},
                "name": {"type": "string", "description": "Label for the MCP key"},
                "can_read": {"type": "boolean", "description": "Allow reading documents"},
                "can_search": {"type": "boolean", "description": "Allow keyword search"},
                "can_query": {"type": "boolean", "description": "Allow tabular dataset queries"},
                "can_edit": {"type": "boolean", "description": "Allow tabular dataset mutations"},
                "allowed_file_ids": {"type": "array", "items": {"type": "string"}, "description": "Optional list of file IDs to scope this key to"},
            },
            "required": ["workspace_id", "name"],
        },
    },
    {
        "name": "revoke_workspace_mcp_link",
        "description": "Revokes a workspace-scoped MCP access key.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "Workspace UUID or name"},
                "credential_id": {"type": "string", "description": "Credential UUID or prefix"},
            },
            "required": ["workspace_id", "credential_id"],
        },
    },
]

# Standard Workspace-Scoped MCP Tool Definitions
MCP_TOOLS_DEFINITIONS = [
    {
        "name": "workspace_info",
        "description": "Returns general metadata, security boundaries, and the full AI agent skills operational guide for interacting with this workspace.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "list_resources",
        "description": "Lists permitted document and dataset resources in the workspace. Resources restricted by policy are filtered out.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_resource_metadata",
        "description": "Retrieves high-level metadata (filename, size, type, status) for a permitted resource without revealing raw storage paths.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "The unique resource UUID or filename"},
            },
            "required": ["resource_id"],
        },
    },
    {
        "name": "search",
        "description": "Searches permitted text resources in the workspace for keywords, returning policy-anonymised snippets.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Keyword search query"},
                "limit": {"type": "integer", "description": "Maximum snippets to return (default 10)"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "read_resource",
        "description": "Reads the extracted text of a permitted resource. All workspace anonymisation rules (masking, pseudonymisation, redaction) are applied at read time. Also supports reading 'abox://skills/workflow-guide' for full AI agent guidelines.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "The resource UUID, filename, or 'abox://skills/workflow-guide'"},
            },
            "required": ["resource_id"],
        },
    },
    {
        "name": "get_dataset_schema",
        "description": "Returns the schema, columns, and data types for a structured dataset (CSV, Excel, or JSON). MANDATORY: Call this before querying or editing an unfamiliar dataset to verify exact column names.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "The dataset resource UUID or filename"},
            },
            "required": ["resource_id"],
        },
    },
    {
        "name": "query_dataset",
        "description": "Executes controlled queries or aggregations over structured datasets (CSV, Excel, or JSON). Supports exact matching and comparison operators ($gt, $gte, $lt, $lte, $eq, $ne, $in, $contains). Use this tool to verify and reconfirm any data changes after calling edit_dataset.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "Dataset resource UUID or filename"},
                "columns": {"type": "array", "items": {"type": "string"}, "description": "Columns to project"},
                "filters": {"type": "object", "description": "Key-value filter mapping"},
                "limit": {"type": "integer", "description": "Max rows to return (default 50)"},
                "aggregation": {
                    "type": "object",
                    "properties": {
                        "column": {"type": "string"},
                        "func": {"type": "string", "enum": ["count", "sum", "avg", "min", "max"]},
                    },
                    "description": "Optional aggregation specification",
                },
            },
            "required": ["resource_id"],
        },
    },
    {
        "name": "edit_dataset",
        "description": "Edits, updates, inserts, or deletes records in a structured dataset (CSV, Excel, or JSON). MANDATORY RULE: After executing edit_dataset, you MUST IMMEDIATELY call query_dataset with the filter criteria to verify and reconfirm that the data change has persisted in storage before replying to the user.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {
                    "type": "string",
                    "description": "The dataset resource UUID or filename (e.g. 'studentperformance.csv', 'students_data.xlsx')",
                },
                "action": {
                    "type": "string",
                    "enum": ["update", "insert", "delete"],
                    "description": "Mutation type: 'update' (modify matching rows), 'insert' (append a new row), 'delete' (remove matching rows)",
                },
                "filters": {
                    "type": "object",
                    "description": "Key-value criteria to locate rows to update or delete (e.g. {'student_id': '101'} or {'name': 'John Doe'})",
                },
                "updates": {
                    "type": "object",
                    "description": "Key-value pairs of columns and new values to update (e.g. {'math_score': 95, 'status': 'PASS'})",
                },
                "new_row": {
                    "type": "object",
                    "description": "Object representing a new row to insert when action is 'insert'",
                },
            },
            "required": ["resource_id", "action"],
        },
    },
]


class MCPServer:
    """
    Executes MCP protocol tools strictly within the context of an AuthenticatedMCPContext.
    Enforces the policy engine, prevents cross-workspace access, and logs all events.
    """

    @classmethod
    async def list_tools(cls, context: Optional[AuthenticatedMCPContext] = None) -> List[Dict[str, Any]]:
        if context and context.scope_type == "ACCOUNT":
            return ACCOUNT_MCP_TOOLS_DEFINITIONS
        return MCP_TOOLS_DEFINITIONS

    @classmethod
    async def call_tool(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Main entry point for executing any MCP tool.
        Dispatches to Account Master Operator Tools if scope is ACCOUNT,
        or Workspace Tools if scope is WORKSPACE.
        """
        args = arguments or {}

        # Dispatch Account-Level Master Operator Tool
        if context.scope_type == "ACCOUNT":
            return await cls._call_account_tool(db, context, tool_name, args)

        ws_id = context.workspace_id

        # 1. Evaluate Operation Policy
        op_decision = await PolicyEngine.evaluate(
            db=db,
            workspace_id=ws_id,
            actor=context,
            operation=tool_name,
        )
        if not op_decision.allowed:
            await AuditService.log_event(
                db=db,
                workspace_id=ws_id,
                operation=f"MCP_{tool_name.upper()}_DENIED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                decision="DENY",
                reason=op_decision.reason,
                request_metadata={"tool": tool_name},
            )
            return {
                "isError": True,
                "content": [{"type": "text", "text": f"Policy Error: {op_decision.reason}"}],
            }

        # 2. Dispatch Tool
        try:
            if tool_name == "workspace_info":
                return await cls._workspace_info(db, context)
            elif tool_name == "list_resources":
                return await cls._list_resources(db, context)
            elif tool_name == "get_resource_metadata":
                return await cls._get_resource_metadata(db, context, args.get("resource_id"))
            elif tool_name == "search":
                return await cls._search(db, context, args.get("query", ""), args.get("limit", 10))
            elif tool_name == "read_resource":
                return await cls._read_resource(db, context, args.get("resource_id"))
            elif tool_name == "get_dataset_schema":
                return await cls._get_dataset_schema(db, context, args.get("resource_id"))
            elif tool_name == "query_dataset":
                return await cls._query_dataset(
                    db=db,
                    context=context,
                    resource_id=args.get("resource_id"),
                    columns=args.get("columns"),
                    filters=args.get("filters"),
                    limit=args.get("limit", 50),
                    aggregation=args.get("aggregation"),
                )
            elif tool_name == "edit_dataset":
                return await cls._edit_dataset(
                    db=db,
                    context=context,
                    resource_id=args.get("resource_id"),
                    action=args.get("action", "update"),
                    filters=args.get("filters"),
                    updates=args.get("updates"),
                    new_row=args.get("new_row"),
                )
            else:
                return {
                    "isError": True,
                    "content": [{"type": "text", "text": f"Unknown tool: {tool_name}"}],
                }
        except Exception as e:
            logger.error(f"Error executing MCP tool {tool_name}: {e}", exc_info=True)
            return {
                "isError": True,
                "content": [{"type": "text", "text": f"Internal execution error: {str(e)}"}],
            }

    @classmethod
    async def _workspace_info(
        cls, db: AsyncSession, context: AuthenticatedMCPContext
    ) -> Dict[str, Any]:
        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="WORKSPACE_INFO_ACCESSED",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason="Workspace metadata returned",
        )
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "workspace_id": context.workspace_id,
                        "workspace_name": context.workspace_name,
                        "security_protocol": "ABOX Policy Boundary Gateway v1.0",
                        "available_tools": [t["name"] for t in MCP_TOOLS_DEFINITIONS],
                        "ai_skills_guide": ABOX_AI_SKILLS_GUIDE,
                        "verification_rule": "MANDATORY: Always call query_dataset immediately after calling edit_dataset to verify and confirm persisted data in storage before replying to the user.",
                    }, indent=2),
                }
            ]
        }

    @classmethod
    async def _list_resources(
        cls, db: AsyncSession, context: AuthenticatedMCPContext
    ) -> Dict[str, Any]:
        stmt = (
            select(FileRecord)
            .where(
                FileRecord.workspace_id == context.workspace_id,
                FileRecord.status == "READY",
            )
            .order_by(FileRecord.created_at.desc())
        )
        files = (await db.execute(stmt)).scalars().all()

        permitted_resources = [
            {
                "id": "abox://skills/workflow-guide",
                "filename": "ABOX_AGENT_SKILLS.md",
                "file_type": "SKILLS_GUIDE",
                "file_size": len(ABOX_AI_SKILLS_GUIDE),
                "description": "Mandatory operating rules, verification protocols, and tool usage guide for AI agents",
            }
        ]
        for f in files:
            decision = await PolicyEngine.evaluate(
                db=db,
                workspace_id=context.workspace_id,
                actor=context,
                operation="read_resource",
                resource=f,
            )
            if decision.allowed:
                permitted_resources.append({
                    "id": f.id,
                    "filename": f.original_filename,
                    "file_type": f.file_type,
                    "file_size": f.file_size,
                })

        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="RESOURCE_LISTED",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Listed {len(permitted_resources)} permitted resources",
        )

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({"resources": permitted_resources}, indent=2),
                }
            ]
        }

    @classmethod
    async def _get_resource_metadata(
        cls, db: AsyncSession, context: AuthenticatedMCPContext, resource_id: Optional[str]
    ) -> Dict[str, Any]:
        if not resource_id:
            return {"isError": True, "content": [{"type": "text", "text": "Missing resource_id"}]}

        stmt = select(FileRecord).where(
            FileRecord.workspace_id == context.workspace_id,
            (FileRecord.id == resource_id) | (FileRecord.original_filename == resource_id),
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec:
            return {"isError": True, "content": [{"type": "text", "text": "Resource not found in workspace"}]}

        decision = await PolicyEngine.evaluate(
            db=db,
            workspace_id=context.workspace_id,
            actor=context,
            operation="read_resource",
            resource=file_rec,
        )
        if not decision.allowed:
            await AuditService.log_event(
                db=db,
                workspace_id=context.workspace_id,
                operation="RESOURCE_ACCESS_DENIED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                resource_type="file",
                resource_id=file_rec.id,
                decision="DENY",
                reason=decision.reason,
            )
            return {"isError": True, "content": [{"type": "text", "text": "Access denied by workspace policy"}]}

        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="RESOURCE_METADATA_READ",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="file",
            resource_id=file_rec.id,
            decision="ALLOW",
            reason="Metadata retrieved",
        )

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "id": file_rec.id,
                        "filename": file_rec.original_filename,
                        "file_type": file_rec.file_type,
                        "file_size": file_rec.file_size,
                        "created_at": file_rec.created_at.isoformat(),
                    }, indent=2),
                }
            ]
        }

    @classmethod
    async def _search(
        cls, db: AsyncSession, context: AuthenticatedMCPContext, query: str, limit: int
    ) -> Dict[str, Any]:
        if not query or not query.strip():
            return {"isError": True, "content": [{"type": "text", "text": "Query cannot be empty"}]}

        results = await SearchService.search_workspace(
            db=db,
            workspace_id=context.workspace_id,
            query=query.strip(),
            actor=context,
            limit=min(limit, 20),
        )

        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="SEARCH_EXECUTED",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Search for '{query}' returned {len(results)} snippets",
            request_metadata={"query": query, "count": len(results)},
        )

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({"query": query, "results": results}, indent=2),
                }
            ]
        }

    @classmethod
    async def _read_resource(
        cls, db: AsyncSession, context: AuthenticatedMCPContext, resource_id: Optional[str]
    ) -> Dict[str, Any]:
        if not resource_id:
            return {"isError": True, "content": [{"type": "text", "text": "Missing resource_id"}]}

        # Built-in skills / operational guide resource
        clean_id = resource_id.strip().lower()
        if clean_id in [
            "abox://skills/workflow-guide",
            "abox://skills/guide",
            "abox://instructions",
            "skills",
            "skills.md",
            "abox_agent_skills.md",
            "instructions",
        ]:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": ABOX_AI_SKILLS_GUIDE,
                    }
                ]
            }

        stmt = select(FileRecord).where(
            FileRecord.workspace_id == context.workspace_id,
            (FileRecord.id == resource_id) | (FileRecord.original_filename == resource_id),
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec:
            return {"isError": True, "content": [{"type": "text", "text": "Resource not found in workspace"}]}

        decision = await PolicyEngine.evaluate(
            db=db,
            workspace_id=context.workspace_id,
            actor=context,
            operation="read_resource",
            resource=file_rec,
        )
        if not decision.allowed:
            await AuditService.log_event(
                db=db,
                workspace_id=context.workspace_id,
                operation="RESOURCE_ACCESS_DENIED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                resource_type="file",
                resource_id=file_rec.id,
                decision="DENY",
                reason=decision.reason,
            )
            return {"isError": True, "content": [{"type": "text", "text": "Access denied by workspace policy"}]}

        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        raw_text = extracted.plain_text if extracted else ""

        safe_content = AnonymisationEngine.apply_to_text(
            text=raw_text,
            rules=decision.transformations,
            workspace_id=context.workspace_id,
        )

        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="RESOURCE_READ",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="file",
            resource_id=file_rec.id,
            decision=decision.decision,
            reason="Resource read successfully with policy enforcement",
        )

        return {
            "content": [
                {
                    "type": "text",
                    "text": safe_content,
                }
            ]
        }

    @classmethod
    async def _get_dataset_schema(
        cls, db: AsyncSession, context: AuthenticatedMCPContext, resource_id: Optional[str]
    ) -> Dict[str, Any]:
        if not resource_id:
            return {"isError": True, "content": [{"type": "text", "text": "Missing resource_id"}]}

        stmt = select(FileRecord).where(
            FileRecord.workspace_id == context.workspace_id,
            (FileRecord.id == resource_id) | (FileRecord.original_filename == resource_id),
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec or file_rec.file_type not in DATASET_FILE_TYPES:
            return {"isError": True, "content": [{"type": "text", "text": "Resource is not a structured dataset"}]}

        decision = await PolicyEngine.evaluate(
            db=db,
            workspace_id=context.workspace_id,
            actor=context,
            operation="query_dataset",
            resource=file_rec,
        )
        if not decision.allowed:
            return {"isError": True, "content": [{"type": "text", "text": "Access denied by workspace policy"}]}

        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        structured = extracted.structured_data if extracted else {}

        safe_schema = StructuredQueryEngine.get_safe_schema(structured or {}, decision.denied_fields)
        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(safe_schema, indent=2),
                }
            ]
        }

    @classmethod
    async def _query_dataset(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        resource_id: Optional[str],
        columns: Optional[List[str]],
        filters: Optional[Dict[str, Any]],
        limit: int,
        aggregation: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        if not resource_id:
            return {"isError": True, "content": [{"type": "text", "text": "Missing resource_id"}]}

        stmt = select(FileRecord).where(
            FileRecord.workspace_id == context.workspace_id,
            (FileRecord.id == resource_id) | (FileRecord.original_filename == resource_id),
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec or file_rec.file_type not in DATASET_FILE_TYPES:
            return {"isError": True, "content": [{"type": "text", "text": "Resource is not a structured dataset"}]}

        decision = await PolicyEngine.evaluate(
            db=db,
            workspace_id=context.workspace_id,
            actor=context,
            operation="query_dataset",
            resource=file_rec,
            requested_fields=columns,
        )
        if not decision.allowed:
            await AuditService.log_event(
                db=db,
                workspace_id=context.workspace_id,
                operation="DATASET_QUERY_DENIED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                resource_type="dataset",
                resource_id=file_rec.id,
                decision="DENY",
                reason=decision.reason,
            )
            return {"isError": True, "content": [{"type": "text", "text": f"Query Denied: {decision.reason}"}]}

        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        structured = extracted.structured_data if extracted else {}

        if aggregation:
            col = aggregation.get("column", "")
            func = aggregation.get("func", "count")
            ok, err, agg_res = StructuredQueryEngine.execute_aggregation(
                structured_data=structured or {},
                column=col,
                agg_func=func,
                filters=filters,
                denied_fields=decision.denied_fields,
            )
            if not ok:
                await AuditService.log_event(
                    db=db,
                    workspace_id=context.workspace_id,
                    operation="DATASET_QUERY_DENIED",
                    actor_type="MCP_CLIENT",
                    credential_id=context.credential_id,
                    decision="DENY",
                    reason=err,
                )
                return {"isError": True, "content": [{"type": "text", "text": f"Query Error: {err}"}]}

            await AuditService.log_event(
                db=db,
                workspace_id=context.workspace_id,
                operation="DATASET_QUERY_ALLOWED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                decision="ALLOW",
                reason="Aggregation executed successfully",
            )
            return {"content": [{"type": "text", "text": json.dumps({"aggregation": func, "column": col, "result": agg_res})}]}

        ok, err, rows = StructuredQueryEngine.execute_query(
            structured_data=structured or {},
            columns=columns,
            filters=filters,
            limit=limit,
            transformations=decision.transformations,
            denied_fields=decision.denied_fields,
            workspace_id=context.workspace_id,
        )
        if not ok:
            await AuditService.log_event(
                db=db,
                workspace_id=context.workspace_id,
                operation="DATASET_QUERY_DENIED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                decision="DENY",
                reason=err,
            )
            return {"isError": True, "content": [{"type": "text", "text": f"Query Error: {err}"}]}

        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="DATASET_QUERY_ALLOWED",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Tabular query returned {len(rows)} rows",
        )
        return {"content": [{"type": "text", "text": json.dumps({"rows": rows, "count": len(rows)}, indent=2)}]}

    @classmethod
    async def _edit_dataset(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        resource_id: Optional[str],
        action: str,
        filters: Optional[Dict[str, Any]],
        updates: Optional[Dict[str, Any]],
        new_row: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Executes mutations (update, insert, delete) on structured datasets.
        Enables AI models to change data when requested by the user.
        """
        from app.structured.query_engine import _matches_filter, _get_row_val

        if not resource_id:
            return {"isError": True, "content": [{"type": "text", "text": "Missing resource_id"}]}

        stmt = select(FileRecord).where(
            FileRecord.workspace_id == context.workspace_id,
            (FileRecord.id == resource_id) | (FileRecord.original_filename == resource_id),
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec or file_rec.file_type not in DATASET_FILE_TYPES:
            return {"isError": True, "content": [{"type": "text", "text": f"Dataset '{resource_id}' not found or not a structured data file"}]}

        # Policy evaluation
        decision = await PolicyEngine.evaluate(
            db=db,
            workspace_id=context.workspace_id,
            actor=context,
            operation="edit_dataset",
            resource=file_rec,
        )
        if not decision.allowed:
            await AuditService.log_event(
                db=db,
                workspace_id=context.workspace_id,
                operation="DATASET_EDIT_DENIED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                resource_type="dataset",
                resource_id=file_rec.id,
                decision="DENY",
                reason=decision.reason,
            )
            return {"isError": True, "content": [{"type": "text", "text": f"Edit Denied: {decision.reason}"}]}

        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        if not extracted or not extracted.structured_data:
            return {"isError": True, "content": [{"type": "text", "text": "Structured dataset content not found for editing"}]}

        structured = dict(extracted.structured_data)
        rows: List[Dict[str, Any]] = list(structured.get("rows", []))
        columns: List[str] = list(structured.get("columns", []))
        modified_count = 0
        affected_samples = []

        if action == "update":
            if not updates:
                return {"isError": True, "content": [{"type": "text", "text": "Missing 'updates' mapping for update action"}]}

            # Ensure any new updated column names are in columns list
            for col in updates.keys():
                found_col = any(c.strip().lower() == col.strip().lower() for c in columns)
                if not found_col:
                    columns.append(col)

            for row in rows:
                if not filters or _matches_filter(row, filters):
                    for uk, uv in updates.items():
                        # Update existing key case-insensitively or set new key
                        target_key = uk
                        for existing_k in list(row.keys()):
                            if existing_k.strip().lower() == uk.strip().lower():
                                target_key = existing_k
                                break
                        row[target_key] = uv

                    modified_count += 1
                    if len(affected_samples) < 5:
                        affected_samples.append(dict(row))

        elif action == "insert":
            if not new_row:
                return {"isError": True, "content": [{"type": "text", "text": "Missing 'new_row' dictionary for insert action"}]}
            for col in new_row.keys():
                found_col = any(c.strip().lower() == col.strip().lower() for c in columns)
                if not found_col:
                    columns.append(col)
            rows.append(new_row)
            modified_count = 1
            affected_samples.append(new_row)

        elif action == "delete":
            if not filters:
                return {"isError": True, "content": [{"type": "text", "text": "Safety constraint: 'filters' must be provided for delete action"}]}

            remaining_rows = []
            for row in rows:
                if _matches_filter(row, filters):
                    modified_count += 1
                    if len(affected_samples) < 5:
                        affected_samples.append(dict(row))
                else:
                    remaining_rows.append(row)
            rows = remaining_rows

        else:
            return {"isError": True, "content": [{"type": "text", "text": f"Unsupported action '{action}'. Use 'update', 'insert', or 'delete'."}]}

        import copy
        from sqlalchemy.orm.attributes import flag_modified

        # Save back updated structured data & plain text
        new_structured = {
            "columns": list(columns),
            "rows": copy.deepcopy(rows),
            "row_count": len(rows),
            "schema": structured.get("schema", {}),
            "table_detected": structured.get("table_detected", True),
        }
        extracted.structured_data = new_structured
        flag_modified(extracted, "structured_data")

        # Re-generate plain_text CSV representation for search/read tools
        lines = [",".join(columns)]
        for r in rows:
            lines.append(",".join([str(r.get(c, "")) for c in columns]))
        extracted.plain_text = "\n".join(lines)
        db.add(extracted)

        # Synchronize and overwrite the original file in storage (Supabase / Local)
        try:
            import io
            import csv
            import openpyxl
            from app.storage.supabase_storage import get_storage_backend

            storage = get_storage_backend()
            new_binary: bytes = b""
            content_type = file_rec.content_type or "application/octet-stream"

            if file_rec.file_type == "CSV" or file_rec.original_filename.lower().endswith(".csv"):
                out_stream = io.StringIO()
                writer = csv.DictWriter(out_stream, fieldnames=columns)
                writer.writeheader()
                for r in rows:
                    writer.writerow({c: r.get(c, "") for c in columns})
                new_binary = out_stream.getvalue().encode("utf-8")
                content_type = "text/csv"

            elif file_rec.file_type == "JSON" or file_rec.original_filename.lower().endswith(".json"):
                new_binary = json.dumps(rows, indent=2).encode("utf-8")
                content_type = "application/json"

            elif file_rec.file_type in ["XLSX", "XLS"] or file_rec.original_filename.lower().endswith((".xlsx", ".xls")):
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Sheet1"
                ws.append(columns)
                for r in rows:
                    ws.append([r.get(c, "") for c in columns])
                out_bytes = io.BytesIO()
                wb.save(out_bytes)
                new_binary = out_bytes.getvalue()
                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

            if new_binary and file_rec.storage_path:
                await storage.upload(file_rec.storage_path, new_binary, content_type)
                file_rec.file_size = len(new_binary)
                db.add(file_rec)
        except Exception as storage_err:
            logger.error(f"Error synchronizing raw storage binary for {file_rec.original_filename}: {storage_err}", exc_info=True)

        await db.commit()

        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="DATASET_EDIT_APPLIED",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="dataset",
            resource_id=file_rec.id,
            decision="ALLOW",
            reason=f"Action '{action}' modified {modified_count} record(s) in {file_rec.original_filename}",
            request_metadata={"action": action, "modified_count": modified_count},
        )

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "success": True,
                        "action": action,
                        "dataset": file_rec.original_filename,
                        "records_modified": modified_count,
                        "total_records": len(rows),
                        "affected_samples": affected_samples,
                        "message": f"Successfully performed '{action}' on {modified_count} record(s) in {file_rec.original_filename}.",
                    }, indent=2),
                }
            ]
        }

    # ==============================================================================
    # Account-Level Master Operator Tool Handlers
    # ==============================================================================

    @classmethod
    async def _call_account_tool(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        tool_name: str,
        args: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Dispatches and executes Account-Level Master Operator Tools across user workspaces.
        Validates granular permission flags (manage_workspaces, upload_files, read_data, query_dataset, edit_dataset, delete_files, manage_mcp_keys).
        """
        perms = context.permissions or {}
        user_id = context.user_id

        def require_perm(perm_key: str, desc_text: str):
            if not perms.get(perm_key, False):
                raise PermissionError(f"Permission Denied: This Account Master MCP key does not have '{perm_key}' ({desc_text}) enabled.")

        try:
            if tool_name == "account_info":
                return await cls._account_info(db, context)

            elif tool_name == "list_workspaces":
                require_perm("read_data", "View workspaces and data")
                return await cls._account_list_workspaces(db, context)

            elif tool_name == "create_workspace":
                require_perm("manage_workspaces", "Create and configure workspaces")
                return await cls._account_create_workspace(db, context, args.get("name"), args.get("description"))

            elif tool_name == "get_workspace":
                require_perm("read_data", "View workspaces and data")
                return await cls._account_get_workspace(db, context, args.get("workspace_id"))

            elif tool_name == "list_files":
                require_perm("read_data", "View workspaces and data")
                return await cls._account_list_files(db, context, args.get("workspace_id"))

            elif tool_name == "upload_file":
                require_perm("upload_files", "Upload files and ingest content")
                return await cls._account_upload_file(
                    db=db,
                    context=context,
                    workspace_id=args.get("workspace_id"),
                    filename=args.get("filename"),
                    content=args.get("content"),
                    is_base64=args.get("is_base64", False),
                    description=args.get("description"),
                )

            elif tool_name == "import_cloud_link":
                require_perm("upload_files", "Upload files and ingest content")
                return await cls._account_import_cloud_link(
                    db=db,
                    context=context,
                    workspace_id=args.get("workspace_id"),
                    url=args.get("url"),
                    custom_name=args.get("custom_name"),
                )

            elif tool_name == "read_file_content":
                require_perm("read_data", "Read documents and data")
                target_file_id = args.get("file_id") or args.get("resource_id")
                return await cls._account_read_file_content(db, context, args.get("workspace_id"), target_file_id)

            elif tool_name == "query_dataset":
                require_perm("query_dataset", "Query tabular datasets")
                target_file_id = args.get("file_id") or args.get("resource_id")
                return await cls._account_query_dataset(
                    db=db,
                    context=context,
                    workspace_id=args.get("workspace_id"),
                    file_id=target_file_id,
                    columns=args.get("columns"),
                    filters=args.get("filters"),
                    limit=args.get("limit", 50),
                    aggregation=args.get("aggregation"),
                )

            elif tool_name == "edit_dataset":
                require_perm("edit_dataset", "Mutate and edit dataset rows")
                target_file_id = args.get("file_id") or args.get("resource_id")
                return await cls._account_edit_dataset(
                    db=db,
                    context=context,
                    workspace_id=args.get("workspace_id"),
                    file_id=target_file_id,
                    action=args.get("action", "update"),
                    filters=args.get("filters"),
                    updates=args.get("updates"),
                    new_row=args.get("new_row"),
                )

            elif tool_name == "delete_file":
                require_perm("delete_files", "Permanently delete files")
                target_file_id = args.get("file_id") or args.get("resource_id")
                return await cls._account_delete_file(db, context, args.get("workspace_id"), target_file_id)

            elif tool_name == "list_workspace_mcp_links":
                require_perm("manage_mcp_keys", "Manage MCP keys and credentials")
                return await cls._account_list_mcp_links(db, context, args.get("workspace_id"))

            elif tool_name == "generate_workspace_mcp_link":
                require_perm("manage_mcp_keys", "Manage MCP keys and credentials")
                return await cls._account_generate_mcp_link(
                    db=db,
                    context=context,
                    workspace_id=args.get("workspace_id"),
                    name=args.get("name"),
                    can_read=args.get("can_read", True),
                    can_search=args.get("can_search", True),
                    can_query=args.get("can_query", True),
                    can_edit=args.get("can_edit", False),
                    allowed_file_ids=args.get("allowed_file_ids"),
                )

            elif tool_name == "revoke_workspace_mcp_link":
                require_perm("manage_mcp_keys", "Manage MCP keys and credentials")
                return await cls._account_revoke_mcp_link(db, context, args.get("workspace_id"), args.get("credential_id"))

            else:
                return {
                    "isError": True,
                    "content": [{"type": "text", "text": f"Unknown Account Master MCP tool: '{tool_name}'"}],
                }

        except PermissionError as pe:
            await AuditService.log_event(
                db=db,
                user_id=user_id,
                workspace_id=None,
                operation=f"MCP_ACCOUNT_{tool_name.upper()}_DENIED",
                actor_type="MCP_CLIENT",
                credential_id=context.credential_id,
                decision="DENY",
                reason=str(pe),
                request_metadata={"tool": tool_name, "args": args},
            )
            return {"isError": True, "content": [{"type": "text", "text": str(pe)}]}
        except Exception as e:
            logger.error(f"Error in Account MCP tool '{tool_name}': {e}", exc_info=True)
            return {"isError": True, "content": [{"type": "text", "text": f"Tool Execution Error: {str(e)}"}]}

    @classmethod
    async def _resolve_account_workspace(cls, db: AsyncSession, user_id: str, ws_identifier: str) -> Workspace:
        if not ws_identifier or not str(ws_identifier).strip():
            raise ValueError("workspace_id parameter is required.")
        target = str(ws_identifier).strip()

        stmt = select(Workspace).where(
            or_(
                Workspace.id == target,
                Workspace.name.ilike(target),
            )
        )
        res = await db.execute(stmt)
        workspaces = res.scalars().all()

        for ws in workspaces:
            if ws.owner_id == user_id:
                return ws
            mem_stmt = select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == user_id,
            )
            if (await db.execute(mem_stmt)).scalar_one_or_none():
                return ws
        raise ValueError(f"Workspace '{ws_identifier}' was not found or is not accessible under this account.")

    @classmethod
    async def _account_info(cls, db: AsyncSession, context: AuthenticatedMCPContext) -> Dict[str, Any]:
        user_stmt = select(User).where(User.id == context.user_id)
        user = (await db.execute(user_stmt)).scalar_one_or_none()

        ws_stmt = select(Workspace).where(Workspace.owner_id == context.user_id)
        workspaces = (await db.execute(ws_stmt)).scalars().all()

        ws_ids = [w.id for w in workspaces]
        file_count = 0
        if ws_ids:
            files_stmt = select(FileRecord).where(FileRecord.workspace_id.in_(ws_ids))
            file_count = len((await db.execute(files_stmt)).scalars().all())

        info = {
            "account_user_id": context.user_id,
            "username": user.username if user else context.username,
            "full_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "",
            "active_workspaces_count": len(workspaces),
            "total_files_count": file_count,
            "scope": "ACCOUNT_MASTER_OPERATOR",
            "permissions": context.permissions or {},
            "capabilities": [
                "Create and configure workspaces",
                "Upload and ingest documents, datasets (CSV, JSON, Excel), and images",
                "Convert Google Drive and Dropbox links to MCP resources",
                "Execute precision queries and row-level mutations on datasets",
                "Generate and revoke workspace-scoped MCP keys",
            ],
        }
        return {"content": [{"type": "text", "text": json.dumps(info, indent=2)}]}

    @classmethod
    async def _account_list_workspaces(cls, db: AsyncSession, context: AuthenticatedMCPContext) -> Dict[str, Any]:
        stmt = select(Workspace).where(Workspace.owner_id == context.user_id).order_by(desc(Workspace.created_at))
        workspaces = (await db.execute(stmt)).scalars().all()

        results = []
        for w in workspaces:
            f_stmt = select(FileRecord).where(FileRecord.workspace_id == w.id)
            files = (await db.execute(f_stmt)).scalars().all()
            results.append({
                "id": w.id,
                "name": w.name,
                "description": w.description or "",
                "files_count": len(files),
                "created_at": w.created_at.isoformat() if w.created_at else None,
            })

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=None,
            operation="MCP_ACCOUNT_LIST_WORKSPACES",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Listed {len(results)} workspace(s)",
        )
        return {"content": [{"type": "text", "text": json.dumps({"workspaces": results, "count": len(results)}, indent=2)}]}

    @classmethod
    async def _account_create_workspace(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        name: Optional[str],
        description: Optional[str],
    ) -> Dict[str, Any]:
        if not name or not str(name).strip():
            raise ValueError("Workspace 'name' is required.")

        ws = Workspace(
            name=str(name).strip(),
            description=str(description).strip() if description else None,
            owner_id=context.user_id,
            created_at=utc_now(),
        )
        db.add(ws)
        await db.commit()
        await db.refresh(ws)

        default_ops = [
            "workspace_info",
            "list_resources",
            "get_resource_metadata",
            "search",
            "read_resource",
            "get_dataset_schema",
            "query_dataset",
            "edit_dataset",
        ]
        for op in default_ops:
            db.add(OperationPolicy(workspace_id=ws.id, operation=op, decision="ALLOW"))
        await db.commit()

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="CREATE_WORKSPACE_VIA_MCP",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Account Master MCP key created workspace '{ws.name}'",
        )

        return {"content": [{"type": "text", "text": json.dumps({
            "success": True,
            "workspace_id": ws.id,
            "name": ws.name,
            "description": ws.description,
            "created_at": ws.created_at.isoformat() if ws.created_at else None,
            "message": f"Workspace '{ws.name}' created successfully.",
        }, indent=2)}]}

    @classmethod
    async def _account_get_workspace(cls, db: AsyncSession, context: AuthenticatedMCPContext, workspace_id: str) -> Dict[str, Any]:
        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)

        f_stmt = select(FileRecord).where(FileRecord.workspace_id == ws.id).order_by(desc(FileRecord.created_at))
        files = (await db.execute(f_stmt)).scalars().all()

        m_stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id)
        members = (await db.execute(m_stmt)).scalars().all()

        data = {
            "id": ws.id,
            "name": ws.name,
            "description": ws.description or "",
            "created_at": ws.created_at.isoformat() if ws.created_at else None,
            "members_count": len(members) + 1,
            "files_count": len(files),
            "files": [
                {
                    "id": f.id,
                    "filename": f.original_filename,
                    "file_type": f.file_type,
                    "file_size": f.file_size,
                    "status": f.status,
                    "created_at": f.created_at.isoformat() if f.created_at else None,
                }
                for f in files
            ],
        }
        return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}

    @classmethod
    async def _account_list_files(cls, db: AsyncSession, context: AuthenticatedMCPContext, workspace_id: Optional[str]) -> Dict[str, Any]:
        if workspace_id:
            ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
            f_stmt = select(FileRecord).where(FileRecord.workspace_id == ws.id).order_by(desc(FileRecord.created_at))
            files = (await db.execute(f_stmt)).scalars().all()
            ws_map = {ws.id: ws.name}
        else:
            ws_stmt = select(Workspace).where(Workspace.owner_id == context.user_id)
            workspaces = (await db.execute(ws_stmt)).scalars().all()
            ws_map = {w.id: w.name for w in workspaces}
            if not ws_map:
                files = []
            else:
                f_stmt = select(FileRecord).where(FileRecord.workspace_id.in_(list(ws_map.keys()))).order_by(desc(FileRecord.created_at))
                files = (await db.execute(f_stmt)).scalars().all()

        results = [
            {
                "file_id": f.id,
                "filename": f.original_filename,
                "file_type": f.file_type,
                "file_size": f.file_size,
                "status": f.status,
                "workspace_id": f.workspace_id,
                "workspace_name": ws_map.get(f.workspace_id, "Unknown"),
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in files
        ]
        return {"content": [{"type": "text", "text": json.dumps({"files": results, "count": len(results)}, indent=2)}]}

    @classmethod
    async def _account_upload_file(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        workspace_id: str,
        filename: str,
        content: str,
        is_base64: bool = False,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not workspace_id or not filename or content is None:
            raise ValueError("workspace_id, filename, and content are required.")

        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)

        if is_base64:
            try:
                file_bytes = base64.b64decode(content)
            except Exception as e:
                raise ValueError(f"Failed to decode base64 content: {e}")
        else:
            file_bytes = content.encode("utf-8") if isinstance(content, str) else bytes(content)

        file_rec = await ResourceService.upload_from_bytes(
            db=db,
            workspace_id=ws.id,
            user_id=context.user_id,
            filename=filename.strip(),
            content=file_bytes,
            description=description,
        )

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="UPLOAD_FILE_VIA_MCP",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="file",
            resource_id=file_rec.id,
            decision="ALLOW",
            reason=f"Account MCP key uploaded file '{file_rec.original_filename}' ({file_rec.file_size} bytes)",
        )

        return {"content": [{"type": "text", "text": json.dumps({
            "success": True,
            "file_id": file_rec.id,
            "filename": file_rec.original_filename,
            "file_type": file_rec.file_type,
            "file_size": file_rec.file_size,
            "workspace_id": ws.id,
            "workspace_name": ws.name,
            "status": file_rec.status,
            "message": f"File '{file_rec.original_filename}' uploaded and processed successfully in workspace '{ws.name}'.",
        }, indent=2)}]}

    @classmethod
    async def _account_import_cloud_link(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        workspace_id: str,
        url: str,
        custom_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not workspace_id or not url:
            raise ValueError("workspace_id and url are required.")

        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        file_rec = await ResourceService.import_from_cloud_link(
            db=db,
            workspace_id=ws.id,
            url=url.strip(),
            user_id=context.user_id,
            custom_filename=custom_name.strip() if custom_name else None,
        )

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="IMPORT_CLOUD_LINK_VIA_MCP",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="file",
            resource_id=file_rec.id,
            decision="ALLOW",
            reason=f"Account MCP key converted cloud link to '{file_rec.original_filename}'",
            request_metadata={"url": url},
        )

        return {"content": [{"type": "text", "text": json.dumps({
            "success": True,
            "file_id": file_rec.id,
            "filename": file_rec.original_filename,
            "file_type": file_rec.file_type,
            "file_size": file_rec.file_size,
            "workspace_id": ws.id,
            "workspace_name": ws.name,
            "status": file_rec.status,
            "message": f"Cloud resource '{file_rec.original_filename}' converted to MCP resource in workspace '{ws.name}'.",
        }, indent=2)}]}

    @classmethod
    async def _account_read_file_content(cls, db: AsyncSession, context: AuthenticatedMCPContext, workspace_id: str, file_id: str) -> Dict[str, Any]:
        if not file_id:
            raise ValueError("file_id (or resource_id) is required.")
        file_id_str = str(file_id).strip()
        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        f_stmt = select(FileRecord).where(
            FileRecord.workspace_id == ws.id,
            or_(FileRecord.id == file_id_str, FileRecord.original_filename == file_id_str),
        )
        file_rec = (await db.execute(f_stmt)).scalar_one_or_none()
        if not file_rec:
            raise ValueError(f"File '{file_id_str}' not found in workspace '{ws.name}'.")

        ext_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(ext_stmt)).scalar_one_or_none()
        if not extracted:
            raise ValueError(f"Extracted content for file '{file_rec.original_filename}' is not ready yet.")

        # Apply anonymisation
        text_content = extracted.plain_text or ""
        anonymized_text, _ = await AnonymisationEngine.anonymize_text(
            db=db,
            workspace_id=ws.id,
            text=text_content,
            entities=extracted.detected_entities or [],
        )

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="MCP_ACCOUNT_READ_FILE",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="file",
            resource_id=file_rec.id,
            decision="ALLOW",
            reason=f"Account MCP key read content of '{file_rec.original_filename}'",
        )

        return {"content": [{"type": "text", "text": anonymized_text}]}

    @classmethod
    async def _account_query_dataset(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        workspace_id: str,
        file_id: str,
        columns: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        aggregation: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not file_id:
            raise ValueError("file_id (or resource_id) is required.")
        file_id_str = str(file_id).strip()
        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        f_stmt = select(FileRecord).where(
            FileRecord.workspace_id == ws.id,
            or_(FileRecord.id == file_id_str, FileRecord.original_filename == file_id_str),
        )
        file_rec = (await db.execute(f_stmt)).scalar_one_or_none()
        if not file_rec:
            raise ValueError(f"Dataset file '{file_id_str}' not found in workspace '{ws.name}'.")

        ext_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(ext_stmt)).scalar_one_or_none()
        if not extracted or not extracted.structured_data:
            raise ValueError(f"Structured data for dataset '{file_rec.original_filename}' is not available.")

        structured = extracted.structured_data or {}
        if aggregation:
            col = aggregation.get("column")
            func = aggregation.get("func") or "count"
            ok, err, agg_res = StructuredQueryEngine.execute_aggregation(
                structured_data=structured,
                column=col,
                agg_func=func,
                filters=filters,
                denied_fields=[],
            )
            if not ok:
                return {"isError": True, "content": [{"type": "text", "text": f"Aggregation Error: {err}"}]}
            return {"content": [{"type": "text", "text": json.dumps({"aggregation": agg_res}, indent=2)}]}

        ok, err, rows = StructuredQueryEngine.execute_query(
            structured_data=structured,
            columns=columns,
            filters=filters,
            limit=limit,
            transformations={},
            denied_fields=[],
            workspace_id=ws.id,
        )
        if not ok:
            return {"isError": True, "content": [{"type": "text", "text": f"Query Error: {err}"}]}

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="MCP_ACCOUNT_QUERY_DATASET",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="dataset",
            resource_id=file_rec.id,
            decision="ALLOW",
            reason=f"Queried {len(rows)} row(s) from '{file_rec.original_filename}'",
        )
        return {"content": [{"type": "text", "text": json.dumps({"dataset": file_rec.original_filename, "rows": rows, "count": len(rows)}, indent=2)}]}

    @classmethod
    async def _account_edit_dataset(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        workspace_id: str,
        file_id: str,
        action: str,
        filters: Optional[Dict[str, Any]] = None,
        updates: Optional[Dict[str, Any]] = None,
        new_row: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not file_id:
            raise ValueError("file_id (or resource_id) is required.")
        file_id_str = str(file_id).strip()
        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        # Create temporary mock workspace context to reuse dataset editor
        ws_context = AuthenticatedMCPContext(
            scope_type="WORKSPACE",
            workspace_id=ws.id,
            credential_id=context.credential_id,
            credential_prefix=context.credential_prefix,
            workspace_name=ws.name,
            user_id=context.user_id,
            permissions={"edit_dataset": True},
        )
        return await cls._edit_dataset(
            db=db,
            context=ws_context,
            resource_id=file_id_str,
            action=action,
            filters=filters,
            updates=updates,
            new_row=new_row,
        )

    @classmethod
    async def _account_delete_file(cls, db: AsyncSession, context: AuthenticatedMCPContext, workspace_id: str, file_id: str) -> Dict[str, Any]:
        if not file_id:
            raise ValueError("file_id (or resource_id) is required.")
        file_id_str = str(file_id).strip()
        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        f_stmt = select(FileRecord).where(
            FileRecord.workspace_id == ws.id,
            or_(FileRecord.id == file_id_str, FileRecord.original_filename == file_id_str),
        )
        file_rec = (await db.execute(f_stmt)).scalar_one_or_none()
        if not file_rec:
            raise ValueError(f"File '{file_id_str}' not found in workspace '{ws.name}'.")

        filename = file_rec.original_filename
        await ResourceService.delete_file(db, ws.id, file_rec.id, user_id=context.user_id)

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="DELETE_FILE_VIA_MCP",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Account MCP key deleted file '{filename}' from workspace '{ws.name}'",
        )
        return {"content": [{"type": "text", "text": json.dumps({"success": True, "message": f"File '{filename}' was permanently deleted from workspace '{ws.name}'."}, indent=2)}]}

    @classmethod
    async def _account_list_mcp_links(cls, db: AsyncSession, context: AuthenticatedMCPContext, workspace_id: str) -> Dict[str, Any]:
        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        stmt = select(MCPCredential).where(MCPCredential.workspace_id == ws.id).order_by(desc(MCPCredential.created_at))
        creds = (await db.execute(stmt)).scalars().all()
        now = utc_now()

        results = [
            {
                "id": c.id,
                "name": c.name,
                "credential_prefix": c.credential_prefix,
                "is_active": c.revoked_at is None and (c.expires_at is None or ensure_utc(c.expires_at) > now),
                "permissions": c.permissions or {},
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
            }
            for c in creds
        ]
        return {"content": [{"type": "text", "text": json.dumps({"workspace": ws.name, "credentials": results, "count": len(results)}, indent=2)}]}

    @classmethod
    async def _account_generate_mcp_link(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        workspace_id: str,
        name: str,
        can_read: bool = True,
        can_search: bool = True,
        can_query: bool = True,
        can_edit: bool = False,
        allowed_file_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not name or not str(name).strip():
            raise ValueError("Credential 'name' is required.")

        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        raw_token, prefix, secret_hash = generate_mcp_token()
        now = utc_now()
        expires_at = now + timedelta(days=30)

        perms = {
            "read_resource": can_read,
            "search": can_search,
            "query_dataset": can_query,
            "edit_dataset": can_edit,
        }
        if allowed_file_ids:
            perms["allowed_file_ids"] = allowed_file_ids

        cred = MCPCredential(
            workspace_id=ws.id,
            name=str(name).strip(),
            credential_prefix=prefix,
            secret_hash=secret_hash,
            expires_at=expires_at,
            permissions=perms,
        )
        db.add(cred)
        await db.commit()
        await db.refresh(cred)

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="GENERATE_WORKSPACE_MCP_LINK_VIA_ACCOUNT_MCP",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Account MCP key generated workspace link '{cred.name}' for workspace '{ws.name}'",
        )

        return {"content": [{"type": "text", "text": json.dumps({
            "success": True,
            "workspace_id": ws.id,
            "workspace_name": ws.name,
            "credential_id": cred.id,
            "name": cred.name,
            "credential_prefix": cred.credential_prefix,
            "raw_token": raw_token,
            "connector_url": f"/mcp?token={raw_token}",
            "expires_at": expires_at.isoformat(),
            "message": f"Successfully generated workspace MCP token '{cred.name}'. Save raw_token now as it cannot be retrieved again.",
        }, indent=2)}]}

    @classmethod
    async def _account_revoke_mcp_link(cls, db: AsyncSession, context: AuthenticatedMCPContext, workspace_id: str, credential_id: str) -> Dict[str, Any]:
        ws = await cls._resolve_account_workspace(db, context.user_id, workspace_id)
        stmt = select(MCPCredential).where(
            MCPCredential.workspace_id == ws.id,
            or_(MCPCredential.id == credential_id, MCPCredential.credential_prefix == credential_id),
        )
        cred = (await db.execute(stmt)).scalar_one_or_none()
        if not cred:
            raise ValueError(f"Credential '{credential_id}' not found in workspace '{ws.name}'.")

        cred.revoked_at = utc_now()
        await db.commit()

        await AuditService.log_event(
            db=db,
            user_id=context.user_id,
            workspace_id=ws.id,
            operation="REVOKE_WORKSPACE_MCP_LINK_VIA_ACCOUNT_MCP",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Account MCP key revoked workspace link '{cred.name}' ({cred.credential_prefix})",
        )

        return {"content": [{"type": "text", "text": json.dumps({"success": True, "message": f"Credential '{cred.name}' ({cred.credential_prefix}) revoked."}, indent=2)}]}

