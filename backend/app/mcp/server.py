import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.anonymisation.engine import AnonymisationEngine
from app.audit.service import AuditService
from app.database.models import ExtractedContent, FileRecord
from app.mcp.auth import AuthenticatedMCPContext
from app.policies.engine import PolicyEngine
from app.search.service import SearchService
from app.structured.query_engine import StructuredQueryEngine

logger = logging.getLogger(__name__)

# Standard MCP Tool Definitions
MCP_TOOLS_DEFINITIONS = [
    {
        "name": "workspace_info",
        "description": "Returns general metadata, policy status, and capabilities of the authenticated workspace.",
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
                "resource_id": {"type": "string", "description": "The unique resource UUID"},
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
        "description": "Reads the extracted text of a permitted resource. All workspace anonymisation rules (masking, pseudonymisation, redaction) are applied at read time.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "The resource UUID to read"},
            },
            "required": ["resource_id"],
        },
    },
    {
        "name": "get_dataset_schema",
        "description": "Returns the schema and columns for a structured dataset (CSV or JSON), omitting columns restricted by field-level policies.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "The dataset resource UUID"},
            },
            "required": ["resource_id"],
        },
    },
    {
        "name": "query_dataset",
        "description": "Executes controlled queries or aggregations over structured datasets. Queries referencing restricted columns are strictly denied.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string", "description": "Dataset resource UUID"},
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
]


class MCPServer:
    """
    Executes MCP protocol tools strictly within the context of an AuthenticatedMCPContext.
    Enforces the policy engine, prevents cross-workspace access, and logs all events.
    """

    @classmethod
    async def list_tools(cls) -> List[Dict[str, Any]]:
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
        Evaluates operation policies, resolves resources within context.workspace_id,
        applies transformations, and creates audit logs.
        """
        args = arguments or {}
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
                        "security_protocol": "MCP Policy Boundary Gateway v1.0",
                        "available_tools": [t["name"] for t in MCP_TOOLS_DEFINITIONS],
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

        permitted_resources = []
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
            FileRecord.id == resource_id,
            FileRecord.workspace_id == context.workspace_id,
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
                resource_id=resource_id,
                decision="DENY",
                reason=decision.reason,
            )
            return {"isError": True, "content": [{"type": "text", "text": "Access denied by workspace policy"}]}

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "id": file_rec.id,
                        "filename": file_rec.original_filename,
                        "file_type": file_rec.file_type,
                        "file_size": file_rec.file_size,
                        "status": file_rec.status,
                        "created_at": file_rec.created_at.isoformat(),
                    }, indent=2),
                }
            ]
        }

    @classmethod
    async def _search(
        cls,
        db: AsyncSession,
        context: AuthenticatedMCPContext,
        query: str,
        limit: int,
    ) -> Dict[str, Any]:
        results = await SearchService.search_workspace(
            db=db,
            workspace_id=context.workspace_id,
            actor=context,
            query=query,
            limit=limit,
        )

        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="SEARCH_EXECUTED",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            decision="ALLOW",
            reason=f"Search returned {len(results)} matches",
            request_metadata={"query": query},
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

        # Ensure resource strictly exists in THIS workspace
        stmt = select(FileRecord).where(
            FileRecord.id == resource_id,
            FileRecord.workspace_id == context.workspace_id,
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec:
            return {"isError": True, "content": [{"type": "text", "text": "Resource not found in workspace"}]}

        # Policy Engine evaluation
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
                resource_id=resource_id,
                decision="DENY",
                reason=decision.reason,
            )
            return {"isError": True, "content": [{"type": "text", "text": "Access denied by workspace policy"}]}

        # Retrieve extracted content
        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == resource_id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        raw_text = extracted.plain_text if extracted else ""

        # Apply Anonymisation Engine
        safe_content = AnonymisationEngine.apply_to_text(
            text=raw_text,
            rules=decision.transformations,
            workspace_id=context.workspace_id,
        )

        # Audit successful read
        await AuditService.log_event(
            db=db,
            workspace_id=context.workspace_id,
            operation="RESOURCE_READ",
            actor_type="MCP_CLIENT",
            credential_id=context.credential_id,
            resource_type="file",
            resource_id=resource_id,
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
            FileRecord.id == resource_id,
            FileRecord.workspace_id == context.workspace_id,
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec or file_rec.file_type not in ["CSV", "JSON"]:
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

        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == resource_id)
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
            FileRecord.id == resource_id,
            FileRecord.workspace_id == context.workspace_id,
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec or file_rec.file_type not in ["CSV", "JSON"]:
            return {"isError": True, "content": [{"type": "text", "text": "Resource is not a structured dataset"}]}

        # Evaluate policy engine
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
                resource_id=resource_id,
                decision="DENY",
                reason=decision.reason,
            )
            return {"isError": True, "content": [{"type": "text", "text": f"Query Denied: {decision.reason}"}]}

        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == resource_id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        structured = extracted.structured_data if extracted else {}

        if aggregation:
            col = aggregation.get("column", "")
            func = aggregation.get("func", "count")
            ok, err, agg_res = StructuredQueryEngine.execute_aggregation(
                structured_data=structured or {},
                column=col,
                agg_func=func,
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
