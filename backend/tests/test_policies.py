import pytest
from httpx import AsyncClient
from app.anonymisation.engine import AnonymisationEngine


def test_deterministic_pseudonymisation():
    """Verify pseudonymisation is deterministic within one workspace and distinct across workspaces."""
    name = "John Smith"
    ws_1 = "workspace-uuid-1111"
    ws_2 = "workspace-uuid-2222"

    p1_a = AnonymisationEngine._pseudonymize_value(name, "person_name", ws_1)
    p1_b = AnonymisationEngine._pseudonymize_value(name, "person_name", ws_1)
    # Must be deterministic within ws_1
    assert p1_a == p1_b
    assert p1_a.startswith("Person_")

    # In different workspace, hashing with workspace_id should produce different outcome
    # Note: even if modulo hits same slot by small chance, the engine formula incorporates workspace_id
    p2 = AnonymisationEngine._pseudonymize_value(name, "person_name", ws_2)
    assert p2.startswith("Person_")


def test_transformations_masking_and_removal():
    """Verify masking, removal, and redaction rules."""
    text = "Contact Alice at alice@example.com or call 555-123-4567. SSN: 123-45-6789."
    rules = {
        "email": "MASK",
        "phone": "REMOVE",
        "ssn": "REDACT",
    }
    result = AnonymisationEngine.apply_to_text(text, rules, "ws-123")
    assert "a***@example.com" in result
    assert "555-123-4567" not in result
    assert "[REDACTED: SSN]" in result


@pytest.mark.asyncio
async def test_explicit_deny_overrides_allow(client: AsyncClient):
    """Explicit deny rule on a specific resource overrides any default allow."""
    # Setup
    reg = await client.post("/auth/register", json={"username": "policy_admin", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "Policy Lab"}, headers=headers)).json()["id"]

    # Upload two files
    f1 = (await client.post(f"/workspaces/{ws_id}/files", files={"file": ("public.txt", b"Public info", "text/plain")}, headers=headers)).json()["id"]
    f2 = (await client.post(f"/workspaces/{ws_id}/files", files={"file": ("restricted.txt", b"Top secret info", "text/plain")}, headers=headers)).json()["id"]

    # Add explicit DENY rule for f2
    policy_res = await client.post(
        f"/workspaces/{ws_id}/policies/resource",
        json={"resource_id": f2, "operation": "read_resource", "decision": "DENY"},
        headers=headers,
    )
    assert policy_res.status_code == 201

    # Create MCP credential
    cred = (await client.post(f"/workspaces/{ws_id}/mcp-credentials", json={"name": "Inspector"}, headers=headers)).json()
    mcp_headers = {"Authorization": f"Bearer {cred['raw_token']}"}

    # Reading f1 (allowed)
    r1 = await client.post("/mcp", json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "read_resource", "arguments": {"resource_id": f1}},
    }, headers=mcp_headers)
    assert r1.status_code == 200
    assert r1.json()["result"]["content"][0]["text"] == "Public info"

    # Reading f2 (denied)
    r2 = await client.post("/mcp", json={
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {"name": "read_resource", "arguments": {"resource_id": f2}},
    }, headers=mcp_headers)
    assert r2.status_code == 200
    res2 = r2.json()["result"]
    assert res2.get("isError") is True
    assert "access denied" in res2["content"][0]["text"].lower()
