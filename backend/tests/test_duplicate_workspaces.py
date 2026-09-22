import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.mcp.server import MCPServer
from app.mcp.auth import AuthenticatedMCPContext
from app.database.models import User, Workspace, WorkspaceMember


@pytest.mark.asyncio
async def test_user_cannot_create_duplicate_workspace_api(client: AsyncClient):
    """User cannot create duplicate workspaces with identical or case-insensitive names."""
    res = await client.post("/auth/register", json={"username": "dup_tester_1", "password": "Password123!"})
    assert res.status_code == 201
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # 1. Create first workspace
    create_res = await client.post("/workspaces", json={"name": "Research Lab"}, headers=headers)
    assert create_res.status_code == 201
    assert create_res.json()["name"] == "Research Lab"

    # 2. Duplicate with exact same name -> 409 Conflict
    dup_res1 = await client.post("/workspaces", json={"name": "Research Lab"}, headers=headers)
    assert dup_res1.status_code == 409
    assert "Duplicate workspace names are not allowed" in dup_res1.json()["detail"]

    # 3. Duplicate with case variation -> 409 Conflict
    dup_res2 = await client.post("/workspaces", json={"name": "research lab"}, headers=headers)
    assert dup_res2.status_code == 409
    assert "Duplicate workspace names are not allowed" in dup_res2.json()["detail"]

    # 4. Duplicate with whitespace padding -> 409 Conflict
    dup_res3 = await client.post("/workspaces", json={"name": "  Research Lab  "}, headers=headers)
    assert dup_res3.status_code == 409
    assert "Duplicate workspace names are not allowed" in dup_res3.json()["detail"]


@pytest.mark.asyncio
async def test_different_users_can_have_same_workspace_name(client: AsyncClient):
    """Workspaces are isolated per user; User B can create a workspace named 'Research Lab' even if User A has one."""
    res_a = await client.post("/auth/register", json={"username": "dup_owner_a", "password": "Password123!"})
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    res_b = await client.post("/auth/register", json={"username": "dup_owner_b", "password": "Password123!"})
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # User A creates "Engineering"
    res1 = await client.post("/workspaces", json={"name": "Engineering"}, headers=headers_a)
    assert res1.status_code == 201

    # User B creates "Engineering" -> Allowed
    res2 = await client.post("/workspaces", json={"name": "Engineering"}, headers=headers_b)
    assert res2.status_code == 201
    assert res1.json()["id"] != res2.json()["id"]


@pytest.mark.asyncio
async def test_user_cannot_rename_workspace_to_duplicate(client: AsyncClient):
    """User cannot rename a workspace to match the name of another existing workspace they own."""
    res = await client.post("/auth/register", json={"username": "dup_rename_user", "password": "Password123!"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    ws1 = (await client.post("/workspaces", json={"name": "Primary Vault"}, headers=headers)).json()
    ws2 = (await client.post("/workspaces", json={"name": "Secondary Vault"}, headers=headers)).json()

    # Rename ws2 to "Primary Vault" -> 409 Conflict
    patch_dup = await client.patch(f"/workspaces/{ws2['id']}", json={"name": "Primary Vault"}, headers=headers)
    assert patch_dup.status_code == 409
    assert "Duplicate workspace names are not allowed" in patch_dup.json()["detail"]

    # Rename ws2 to itself (same name) -> Allowed
    patch_self = await client.patch(f"/workspaces/{ws2['id']}", json={"name": "Secondary Vault"}, headers=headers)
    assert patch_self.status_code == 200

    # Rename ws2 to a new unique name -> Allowed
    patch_ok = await client.patch(f"/workspaces/{ws2['id']}", json={"name": "Tertiary Vault"}, headers=headers)
    assert patch_ok.status_code == 200
    assert patch_ok.json()["name"] == "Tertiary Vault"


@pytest.mark.asyncio
async def test_mcp_account_tool_prevents_duplicate_workspace(db_session: AsyncSession):
    """MCP create_workspace tool prevents duplicate workspace creation for the account."""
    user = User(username="mcp_dup_user", password_hash="hash")
    db_session.add(user)
    await db_session.flush()

    context = AuthenticatedMCPContext(
        scope_type="ACCOUNT",
        credential_id="cred_test_1",
        credential_prefix="test_pref",
        user_id=user.id,
        username=user.username,
        permissions={"manage_workspaces": True, "read_data": True},
    )

    # 1. Create first workspace via MCP
    res1 = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="create_workspace",
        arguments={"name": "Marketing Hub", "description": "Vault for campaigns"},
    )
    assert not res1.get("isError")

    # 2. Attempt duplicate workspace via MCP
    res2 = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="create_workspace",
        arguments={"name": "marketing hub", "description": "Duplicate attempt"},
    )
    assert res2.get("isError") is True
    assert "Duplicate workspace names are not permitted" in res2["content"][0]["text"]
