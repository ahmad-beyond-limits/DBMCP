from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.router import get_current_user
from app.database.models import (
    AnonymisationRule,
    OperationPolicy,
    ResourcePolicy,
    User,
)
from app.database.session import get_db
from app.policies.schemas import (
    AnonymisationRuleCreate,
    OperationPolicyCreate,
    PolicyResponse,
    ResourcePolicyCreate,
)
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/workspaces/{workspace_id}/policies", tags=["Policies"])


@router.get("")
async def get_workspace_policies(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all active policies (resource, operation, anonymisation) for a workspace."""
    await WorkspaceService.verify_access(db, workspace_id, user.id)

    # Resource policies
    res_stmt = select(ResourcePolicy).where(ResourcePolicy.workspace_id == workspace_id)
    resource_policies = (await db.execute(res_stmt)).scalars().all()

    # Operation policies
    op_stmt = select(OperationPolicy).where(OperationPolicy.workspace_id == workspace_id)
    operation_policies = (await db.execute(op_stmt)).scalars().all()

    # Anonymisation rules
    anon_stmt = select(AnonymisationRule).where(AnonymisationRule.workspace_id == workspace_id)
    anonymisation_rules = (await db.execute(anon_stmt)).scalars().all()

    return {
        "resource_policies": [
            {
                "id": p.id,
                "workspace_id": p.workspace_id,
                "resource_id": p.resource_id,
                "operation": p.operation,
                "decision": p.decision,
                "created_at": p.created_at,
            }
            for p in resource_policies
        ],
        "operation_policies": [
            {
                "id": p.id,
                "workspace_id": p.workspace_id,
                "operation": p.operation,
                "decision": p.decision,
                "created_at": p.created_at,
            }
            for p in operation_policies
        ],
        "anonymisation_rules": [
            {
                "id": p.id,
                "workspace_id": p.workspace_id,
                "entity_type": p.entity_type,
                "field_name": p.field_name,
                "transformation": p.transformation,
                "created_at": p.created_at,
            }
            for p in anonymisation_rules
        ],
    }


@router.post("/resource", status_code=status.HTTP_201_CREATED)
async def create_resource_policy(
    workspace_id: str,
    data: ResourcePolicyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a resource access policy (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    # Check if duplicate rule exists
    existing_stmt = select(ResourcePolicy).where(
        ResourcePolicy.workspace_id == workspace_id,
        ResourcePolicy.resource_id == data.resource_id,
        ResourcePolicy.operation == data.operation,
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        existing.decision = data.decision.upper()
        await db.commit()
        await db.refresh(existing)
        return existing

    new_rule = ResourcePolicy(
        workspace_id=workspace_id,
        resource_id=data.resource_id,
        operation=data.operation,
        decision=data.decision.upper(),
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule


@router.delete("/resource/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource_policy(
    workspace_id: str,
    policy_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a resource policy (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(ResourcePolicy).where(
        ResourcePolicy.id == policy_id,
        ResourcePolicy.workspace_id == workspace_id,
    )
    policy = (await db.execute(stmt)).scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    await db.delete(policy)
    await db.commit()
    return None


@router.post("/operation", status_code=status.HTTP_201_CREATED)
async def create_operation_policy(
    workspace_id: str,
    data: OperationPolicyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update an operation permission policy (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(OperationPolicy).where(
        OperationPolicy.workspace_id == workspace_id,
        OperationPolicy.operation == data.operation,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.decision = data.decision.upper()
        await db.commit()
        await db.refresh(existing)
        return existing

    new_rule = OperationPolicy(
        workspace_id=workspace_id,
        operation=data.operation,
        decision=data.decision.upper(),
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule


@router.delete("/operation/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operation_policy(
    workspace_id: str,
    policy_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an operation policy (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(OperationPolicy).where(
        OperationPolicy.id == policy_id,
        OperationPolicy.workspace_id == workspace_id,
    )
    policy = (await db.execute(stmt)).scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    await db.delete(policy)
    await db.commit()
    return None


@router.post("/anonymisation", status_code=status.HTTP_201_CREATED)
async def create_anonymisation_rule(
    workspace_id: str,
    data: AnonymisationRuleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update an anonymisation or field rule (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(AnonymisationRule).where(
        AnonymisationRule.workspace_id == workspace_id,
        AnonymisationRule.entity_type == data.entity_type,
        AnonymisationRule.field_name == data.field_name,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.transformation = data.transformation.upper()
        await db.commit()
        await db.refresh(existing)
        return existing

    new_rule = AnonymisationRule(
        workspace_id=workspace_id,
        entity_type=data.entity_type,
        field_name=data.field_name,
        transformation=data.transformation.upper(),
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule


@router.delete("/anonymisation/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_anonymisation_rule(
    workspace_id: str,
    rule_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an anonymisation rule (OWNER only)."""
    await WorkspaceService.verify_access(db, workspace_id, user.id, require_owner=True)

    stmt = select(AnonymisationRule).where(
        AnonymisationRule.id == rule_id,
        AnonymisationRule.workspace_id == workspace_id,
    )
    rule = (await db.execute(stmt)).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    await db.delete(rule)
    await db.commit()
    return None
