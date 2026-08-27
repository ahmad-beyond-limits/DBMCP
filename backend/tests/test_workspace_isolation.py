import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_cannot_access_other_user_workspace(client: AsyncClient):
    """User A creates a workspace; User B should receive 404 attempting to access or delete it."""
    # Register User A and create workspace
    res_a = await client.post("/auth/register", json={"username": "user_a", "password": "password123"})
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    ws_res = await client.post("/workspaces", json={"name": "Alpha Workspace"}, headers=headers_a)
    ws_id = ws_res.json()["id"]

    # Register User B
    res_b = await client.post("/auth/register", json={"username": "user_b", "password": "password123"})
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B tries to view User A's workspace
    get_res = await client.get(f"/workspaces/{ws_id}", headers=headers_b)
    assert get_res.status_code == 404

    # User B tries to delete User A's workspace
    del_res = await client.delete(f"/workspaces/{ws_id}", headers=headers_b)
    assert del_res.status_code == 404


@pytest.mark.asyncio
async def test_mcp_token_cross_workspace_isolation(client: AsyncClient):
    """MCP Token for Workspace A cannot read or query resources belonging to Workspace B."""
    # User creates Workspace A and Workspace B
    reg = await client.post("/auth/register", json={"username": "owner_all", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    ws_a = (await client.post("/workspaces", json={"name": "Workspace A"}, headers=headers)).json()["id"]
    ws_b = (await client.post("/workspaces", json={"name": "Workspace B"}, headers=headers)).json()["id"]

    # Generate MCP Credential for Workspace A
    cred_a = (await client.post(f"/workspaces/{ws_a}/mcp-credentials", json={"name": "Agent A"}, headers=headers)).json()
    token_a = cred_a["raw_token"]
    mcp_headers_a = {"Authorization": f"Bearer {token_a}"}

    # Upload file to Workspace B
    file_payload = {"file": ("secret_b.txt", b"Confidential Project B Data", "text/plain")}
    file_b = (await client.post(f"/workspaces/{ws_b}/files", files=file_payload, headers=headers)).json()["id"]

    # MCP client with Workspace A token tries to read file from Workspace B
    read_payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "read_resource",
            "arguments": {"resource_id": file_b},
        },
    }
    mcp_res = await client.post("/mcp", json=read_payload, headers=mcp_headers_a)
    assert mcp_res.status_code == 200
    res_data = mcp_res.json()["result"]
    assert res_data.get("isError") is True
    assert "not found in workspace" in res_data["content"][0]["text"].lower()
