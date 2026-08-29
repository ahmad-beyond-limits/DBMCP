from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import (
    AnonymisationRule,
    FileRecord,
    OperationPolicy,
    ResourcePolicy,
)
from app.policies.schemas import PolicyDecision


class PolicyEngine:
    """
    Dedicated security policy engine for workspace authorization and transformations.
    Enforces the core principle: MCP is the access protocol; Policy Engine is the security boundary.
    """

    @classmethod
    async def evaluate(
        cls,
        db: AsyncSession,
        workspace_id: str,
        actor: Any,
        operation: str,
        resource: Optional[FileRecord] = None,
        resource_id: Optional[str] = None,
        requested_fields: Optional[List[str]] = None,
    ) -> PolicyDecision:
        """
        Evaluates operation, resource, field, and anonymisation rules for the given context.
        Precedence:
          1. Explicit operation DENY overrides all.
          2. Explicit resource DENY overrides allow.
          3. Specific resource rule overrides workspace default.
          4. Field DENY overrides query execution.
          5. Transformations applied on allowed reads.
        """
        target_resource_id = resource.id if resource else resource_id

        # 0. Credential-level permission check
        if hasattr(actor, "permissions") and actor.permissions:
            perms = actor.permissions
            if operation in perms and perms[operation] is False:
                return PolicyDecision(
                    allowed=False,
                    decision="DENY",
                    reason=f"Operation '{operation}' is not permitted by this MCP credential's permission settings",
                )
            if operation == "edit_dataset" and perms.get("can_edit") is False:
                return PolicyDecision(
                    allowed=False,
                    decision="DENY",
                    reason="Data edit operations ('edit_dataset') are disabled for this MCP credential",
                )
            if operation == "read_resource" and perms.get("can_read") is False:
                return PolicyDecision(
                    allowed=False,
                    decision="DENY",
                    reason="Document read operations are disabled for this MCP credential",
                )
            if operation in ["query_dataset", "get_dataset_schema"] and perms.get("can_query") is False:
                return PolicyDecision(
                    allowed=False,
                    decision="DENY",
                    reason="Dataset querying is disabled for this MCP credential",
                )
            if operation == "search" and perms.get("can_search") is False:
                return PolicyDecision(
                    allowed=False,
                    decision="DENY",
                    reason="Keyword search is disabled for this MCP credential",
                )
            allowed_tools = perms.get("allowed_tools")
            if allowed_tools is not None and isinstance(allowed_tools, list) and operation not in allowed_tools:
                return PolicyDecision(
                    allowed=False,
                    decision="DENY",
                    reason=f"Tool '{operation}' is not authorized for this MCP credential",
                )

            # Credential-level File Scope enforcement
            allowed_file_ids = perms.get("allowed_file_ids")
            if allowed_file_ids is not None and isinstance(allowed_file_ids, list):
                if target_resource_id:
                    res_id = resource.id if resource else target_resource_id
                    res_orig_name = resource.original_filename if resource else None
                    if res_id not in allowed_file_ids and (not res_orig_name or res_orig_name not in allowed_file_ids):
                        return PolicyDecision(
                            allowed=False,
                            decision="DENY",
                            reason=f"Access denied: Resource '{target_resource_id}' is excluded from this MCP credential's authorized file scope",
                        )

        # 1. Operation-level check
        op_stmt = select(OperationPolicy).where(
            OperationPolicy.workspace_id == workspace_id,
            OperationPolicy.operation == operation,
        )
        op_rule = (await db.execute(op_stmt)).scalar_one_or_none()
        if op_rule and op_rule.decision.upper() == "DENY":
            return PolicyDecision(
                allowed=False,
                decision="DENY",
                reason=f"Operation '{operation}' is explicitly denied by workspace policy",
            )

        # 2. Resource-level check (if a resource is targeted)
        if target_resource_id:
            # Check specific resource rule first
            spec_stmt = select(ResourcePolicy).where(
                ResourcePolicy.workspace_id == workspace_id,
                ResourcePolicy.resource_id == target_resource_id,
                ResourcePolicy.operation == operation,
            )
            spec_rule = (await db.execute(spec_stmt)).scalar_one_or_none()

            if spec_rule:
                if spec_rule.decision.upper() == "DENY":
                    return PolicyDecision(
                        allowed=False,
                        decision="DENY",
                        reason=f"Access to resource '{target_resource_id}' is explicitly denied",
                    )
            else:
                # Fall back to workspace default resource policy (resource_id is None)
                def_stmt = select(ResourcePolicy).where(
                    ResourcePolicy.workspace_id == workspace_id,
                    ResourcePolicy.resource_id.is_(None),
                    ResourcePolicy.operation == operation,
                )
                def_rule = (await db.execute(def_stmt)).scalar_one_or_none()
                if def_rule and def_rule.decision.upper() == "DENY":
                    return PolicyDecision(
                        allowed=False,
                        decision="DENY",
                        reason=f"Resource access denied by workspace default policy",
                    )

        # 3. Load Anonymisation & Field-level rules
        anon_stmt = select(AnonymisationRule).where(
            AnonymisationRule.workspace_id == workspace_id
        )
        anon_rules = (await db.execute(anon_stmt)).scalars().all()

        transformations: Dict[str, str] = {}
        denied_fields: List[str] = []

        for rule in anon_rules:
            # Check field-level rules
            field_name = rule.field_name or (rule.entity_type if not rule.entity_type.lower() in ["email", "phone", "ssn", "credit_card", "person_name"] else None)
            if field_name:
                trans = rule.transformation.upper()
                if trans == "DENY":
                    denied_fields.append(field_name.lower())
                else:
                    transformations[field_name.lower()] = trans

            # Entity-level rules (email, phone, ssn, person_name)
            if rule.entity_type.lower() in ["email", "phone", "ssn", "credit_card", "person_name"]:
                transformations[rule.entity_type.lower()] = rule.transformation.upper()

        # 4. Check requested fields for structured data leakage
        if requested_fields and denied_fields:
            normalized_requested = [f.strip().lower() for f in requested_fields]
            for denied in denied_fields:
                if denied in normalized_requested:
                    return PolicyDecision(
                        allowed=False,
                        decision="DENY",
                        reason=f"Access to restricted field '{denied}' is denied",
                        denied_fields=denied_fields,
                    )

        # 5. Access is allowed
        if transformations:
            return PolicyDecision(
                allowed=True,
                decision="ALLOW_WITH_TRANSFORMATION",
                transformations=transformations,
                denied_fields=denied_fields,
                reason="Access permitted with configured anonymisation transformations",
            )

        return PolicyDecision(
            allowed=True,
            decision="ALLOW",
            transformations={},
            denied_fields=denied_fields,
            reason="Access permitted under workspace policy",
        )
