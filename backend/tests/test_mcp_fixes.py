import json
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_mcp_token, hash_mcp_token, hash_password
from app.database.models import (
    AIGuidancePlaybook,
    FileRecord,
    MCPCredential,
    Note,
    OperationPolicy,
    User,
    Workspace,
    WorkspaceMember,
    utc_now,
)
from app.database.reconcile_memberships import reconcile_workspace_memberships
from app.mcp.auth import AuthenticatedMCPContext
from app.mcp.server import MCPServer
from app.resources.service import ResourceService


@pytest.mark.asyncio
async def test_mcp_create_workspace_membership_and_policies(db_session: AsyncSession):
    """Test that creating a workspace via MCP adds WorkspaceMember and full default policies."""
    user = User(
        username="mcp_user",
        password_hash=hash_password("Password123!"),
        is_superuser=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    context = AuthenticatedMCPContext(
        scope_type="ACCOUNT",
        credential_id="test_cred",
        credential_prefix="mcp_live_acc_1234",
        user_id=user.id,
        workspace_id=None,
        permissions={
            "manage_workspaces": True,
            "read_data": True,
        },
    )

    res = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="create_workspace",
        arguments={"name": "Finance Analytics", "description": "Financial reports & models"},
    )
    assert not res.get("isError")
    content_data = json.loads(res["content"][0]["text"])
    ws_id = content_data["workspace_id"]

    # Verify workspace exists
    ws = (await db_session.execute(select(Workspace).where(Workspace.id == ws_id))).scalar_one_or_none()
    assert ws is not None
    assert ws.name == "Finance Analytics"
    assert ws.owner_id == user.id

    # Verify WorkspaceMember was created with OWNER role
    member = (await db_session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.user_id == user.id,
        )
    )).scalar_one_or_none()
    assert member is not None
    assert member.role == "OWNER"

    # Verify default OperationPolicies include notes and AI guidance tools
    ops = (await db_session.execute(
        select(OperationPolicy.operation).where(OperationPolicy.workspace_id == ws_id)
    )).scalars().all()
    assert "create_note" in ops
    assert "list_notes" in ops
    assert "get_note" in ops
    assert "update_note" in ops
    assert "delete_note" in ops
    assert "search_ai_guidance" in ops
    assert "get_ai_guidance" in ops
    assert "get_global_ai_rules" in ops

    # Verify it appears in MCP list_workspaces
    list_res = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="list_workspaces",
        arguments={},
    )
    list_data = json.loads(list_res["content"][0]["text"])
    assert any(w["id"] == ws_id for w in list_data["workspaces"])


@pytest.mark.asyncio
async def test_mcp_list_workspaces_includes_member_workspaces(db_session: AsyncSession):
    """Test that MCP list_workspaces includes shared/collaborator workspaces."""
    owner = User(username="owner_user", password_hash=hash_password("Pass123!"))
    collab = User(username="collab_user", password_hash=hash_password("Pass123!"))
    db_session.add_all([owner, collab])
    await db_session.commit()
    await db_session.refresh(owner)
    await db_session.refresh(collab)

    # Shared workspace owned by owner_user, member is collab_user
    shared_ws = Workspace(name="Shared Project", owner_id=owner.id)
    db_session.add(shared_ws)
    await db_session.flush()

    membership = WorkspaceMember(workspace_id=shared_ws.id, user_id=collab.id, role="MEMBER")
    db_session.add(membership)
    await db_session.commit()

    # Collab user MCP context
    collab_context = AuthenticatedMCPContext(
        scope_type="ACCOUNT",
        credential_id="collab_cred",
        credential_prefix="mcp_live_acc_5678",
        user_id=collab.id,
        workspace_id=None,
        permissions={"read_data": True},
    )

    res = await MCPServer.call_tool(
        db=db_session,
        context=collab_context,
        tool_name="list_workspaces",
        arguments={},
    )
    data = json.loads(res["content"][0]["text"])
    ws_ids = [w["id"] for w in data["workspaces"]]
    assert shared_ws.id in ws_ids


@pytest.mark.asyncio
async def test_mcp_get_workspace_member_count_accuracy(db_session: AsyncSession):
    """Test that members_count in get_workspace is accurate without double-counting."""
    user = User(username="test_owner", password_hash=hash_password("Pass123!"))
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    ws = Workspace(name="Single Owner Space", owner_id=user.id)
    db_session.add(ws)
    await db_session.flush()

    # Owner is also in WorkspaceMember
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="OWNER"))
    await db_session.commit()

    context = AuthenticatedMCPContext(
        scope_type="ACCOUNT",
        credential_id="test_cred",
        credential_prefix="mcp_live_acc_9999",
        user_id=user.id,
        workspace_id=None,
        permissions={"read_data": True},
    )

    res = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="get_workspace",
        arguments={"workspace_id": ws.id},
    )
    data = json.loads(res["content"][0]["text"])
    assert data["members_count"] == 1


@pytest.mark.asyncio
async def test_file_deletion_prunes_note_references(db_session: AsyncSession):
    """Test that deleting a file prunes its ID from note referenced_file_ids."""
    user = User(username="notes_user", password_hash=hash_password("Pass123!"))
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    ws = Workspace(name="Notes Sync Space", owner_id=user.id)
    db_session.add(ws)
    await db_session.flush()

    file_a = FileRecord(
        workspace_id=ws.id,
        original_filename="dataset_a.csv",
        storage_path=f"{ws.id}/test_a.csv",
        content_type="text/csv",
        file_size=100,
        file_type="CSV",
        status="PROCESSED",
        uploaded_by=user.id,
    )
    file_b = FileRecord(
        workspace_id=ws.id,
        original_filename="dataset_b.csv",
        storage_path=f"{ws.id}/test_b.csv",
        content_type="text/csv",
        file_size=200,
        file_type="CSV",
        status="PROCESSED",
        uploaded_by=user.id,
    )
    db_session.add_all([file_a, file_b])
    await db_session.flush()

    note = Note(
        workspace_id=ws.id,
        created_by=user.id,
        title="Research Note",
        content="Analyzed both files.",
        tags=["research"],
        referenced_file_ids=[file_a.id, file_b.id],
    )
    db_session.add(note)
    await db_session.commit()
    await db_session.refresh(note)

    assert file_a.id in note.referenced_file_ids
    assert file_b.id in note.referenced_file_ids

    # Delete file_a
    await ResourceService.delete_file(db_session, ws.id, file_a.id, user_id=user.id)

    # Refresh note and check
    await db_session.refresh(note)
    assert file_a.id not in note.referenced_file_ids
    assert file_b.id in note.referenced_file_ids


@pytest.mark.asyncio
async def test_reconcile_workspace_memberships(db_session: AsyncSession):
    """Test that reconcile_workspace_memberships fixes orphaned workspaces."""
    user = User(username="orphan_owner", password_hash=hash_password("Pass123!"))
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Create workspace without membership
    ws = Workspace(name="Orphaned Space", owner_id=user.id)
    db_session.add(ws)
    await db_session.commit()
    await db_session.refresh(ws)

    # Check initially missing
    mem = (await db_session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == user.id,
        )
    )).scalar_one_or_none()
    assert mem is None

    # Run reconciliation
    repaired = await reconcile_workspace_memberships(db_session)
    assert repaired >= 1

    # Check repaired
    mem_after = (await db_session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == user.id,
        )
    )).scalar_one_or_none()
    assert mem_after is not None
    assert mem_after.role == "OWNER"
