from datetime import timedelta
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import MCPCredential, utc_now


@pytest.mark.asyncio
async def test_mcp_credential_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """Test creation, hash storage, validity, rotation, and revocation."""
    # 1. Setup workspace
    reg = await client.post("/auth/register", json={"username": "mcp_tester", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws = (await client.post("/workspaces", json={"name": "MCP Vault"}, headers=headers)).json()
    ws_id = ws["id"]

    # 2. Create Credential
    cred_res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "Claude Agent", "expires_in_days": 10},
        headers=headers,
    )
    assert cred_res.status_code == 201
    cred_data = cred_res.json()
    raw_token = cred_data["raw_token"]
    cred_id = cred_data["id"]
    prefix = cred_data["credential_prefix"]

    # Verify raw token is NOT stored in DB
    db_cred = (await db_session.execute(select(MCPCredential).where(MCPCredential.id == cred_id))).scalar_one()
    assert db_cred.secret_hash != raw_token
    assert raw_token.startswith(prefix)

    # 3. Valid token succeeds on /mcp
    valid_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
    }
    res_ok = await client.post("/mcp", json=valid_req, headers={"Authorization": f"Bearer {raw_token}"})
    assert res_ok.status_code == 200
    assert res_ok.json()["result"]["serverInfo"]["name"] == "DBMCP Policy-Enforced Gateway"

    # 4. Invalid token fails
    res_bad = await client.post("/mcp", json=valid_req, headers={"Authorization": "Bearer mcp_live_fake_badsecret123"})
    assert res_bad.status_code == 401

    # 5. Rotate token: old token should fail, new token should succeed
    rot_res = await client.post(f"/workspaces/{ws_id}/mcp-credentials/{cred_id}/rotate", headers=headers)
    assert rot_res.status_code == 200
    new_raw_token = rot_res.json()["raw_token"]
    assert new_raw_token != raw_token

    # Old token fails
    res_old = await client.post("/mcp", json=valid_req, headers={"Authorization": f"Bearer {raw_token}"})
    assert res_old.status_code == 401

    # New token succeeds
    res_new = await client.post("/mcp", json=valid_req, headers={"Authorization": f"Bearer {new_raw_token}"})
    assert res_new.status_code == 200

    # 6. Revoke token
    new_cred_id = rot_res.json()["id"]
    rev_res = await client.post(f"/workspaces/{ws_id}/mcp-credentials/{new_cred_id}/revoke", headers=headers)
    assert rev_res.status_code == 200

    # Revoked token immediately fails
    res_revoked = await client.post("/mcp", json=valid_req, headers={"Authorization": f"Bearer {new_raw_token}"})
    assert res_revoked.status_code == 401


@pytest.mark.asyncio
async def test_mcp_expired_credential_fails(client: AsyncClient, db_session: AsyncSession):
    """Test that an expired token immediately fails authentication."""
    reg = await client.post("/auth/register", json={"username": "mcp_exp_user", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "Exp Vault"}, headers=headers)).json()["id"]

    cred_res = (await client.post(f"/workspaces/{ws_id}/mcp-credentials", json={"name": "Expiring"}, headers=headers)).json()
    raw_token = cred_res["raw_token"]
    cred_id = cred_res["id"]

    # Manually expire in DB
    db_cred = (await db_session.execute(select(MCPCredential).where(MCPCredential.id == cred_id))).scalar_one()
    db_cred.expires_at = utc_now() - timedelta(days=1)
    await db_session.commit()

    res = await client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"}, headers={"Authorization": f"Bearer {raw_token}"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_mcp_credential_granular_permissions_and_deletion(client: AsyncClient, db_session: AsyncSession):
    """Test setting granular permissions on creation, changing permissions via PATCH, and deleting revoked credentials."""
    import json

    # 1. Setup workspace & upload a test CSV
    reg = await client.post("/auth/register", json={"username": "perm_user", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws = (await client.post("/workspaces", json={"name": "Permissions Vault"}, headers=headers)).json()
    ws_id = ws["id"]

    csv_content = b"id,val\n1,100\n2,200"
    file_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("test.csv", csv_content, "text/csv")},
        headers=headers,
    )
    assert file_res.status_code == 201

    # 2. Create MCP credential with read allowed, but edit_dataset explicitly disabled
    cred_res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={
            "name": "Read-Only Link",
            "permissions": {
                "read_resource": True,
                "search": True,
                "query_dataset": True,
                "edit_dataset": False,
            }
        },
        headers=headers,
    )
    assert cred_res.status_code == 201
    cred_data = cred_res.json()
    raw_token = cred_data["raw_token"]
    cred_id = cred_data["id"]
    mcp_headers = {"Authorization": f"Bearer {raw_token}"}

    # 3. Query should succeed
    query_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {"resource_id": "test.csv"}
        }
    }
    q_res = await client.post("/mcp", json=query_req, headers=mcp_headers)
    assert q_res.status_code == 200
    assert "rows" in json.loads(q_res.json()["result"]["content"][0]["text"])

    # 4. Edit attempt should be BLOCKED by permission policy
    edit_req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "edit_dataset",
            "arguments": {
                "resource_id": "test.csv",
                "action": "update",
                "filters": {"id": "1"},
                "updates": {"val": 999}
            }
        }
    }
    e_res = await client.post("/mcp", json=edit_req, headers=mcp_headers)
    assert e_res.status_code == 200
    assert e_res.json()["result"]["isError"] is True
    assert "Policy Error" in e_res.json()["result"]["content"][0]["text"]

    # 5. Change permissions via PATCH to allow edit_dataset
    patch_res = await client.patch(
        f"/workspaces/{ws_id}/mcp-credentials/{cred_id}",
        json={
            "permissions": {
                "read_resource": True,
                "search": True,
                "query_dataset": True,
                "edit_dataset": True,
            }
        },
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["permissions"]["edit_dataset"] is True

    # 6. Now edit attempt SUCCEEDS!
    e_res2 = await client.post("/mcp", json=edit_req, headers=mcp_headers)
    assert e_res2.status_code == 200
    edit_out = json.loads(e_res2.json()["result"]["content"][0]["text"])
    assert edit_out["success"] is True
    assert edit_out["records_modified"] == 1

    # 7. Revoke credential
    rev_res = await client.post(f"/workspaces/{ws_id}/mcp-credentials/{cred_id}/revoke", headers=headers)
    assert rev_res.status_code == 200

    # 8. Delete revoked credential permanently
    del_res = await client.delete(f"/workspaces/{ws_id}/mcp-credentials/{cred_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # 9. Verify credential is completely gone
    list_res = await client.get(f"/workspaces/{ws_id}/mcp-credentials", headers=headers)
    assert not any(c["id"] == cred_id for c in list_res.json())
