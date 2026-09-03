import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuditLog


@pytest.mark.asyncio
async def test_audit_logging_and_secret_redaction(client: AsyncClient, db_session: AsyncSession):
    """
    Verify:
    1. Allowed operations generate audit logs.
    2. Denied operations generate audit logs.
    3. Passwords, MCP tokens, and secrets are strictly redacted from metadata.
    """
    # 1. Setup workspace & member
    reg = await client.post("/auth/register", json={"username": "auditor_user", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "Audit Workspace"}, headers=headers)).json()["id"]

    # 2. Upload file -> generates FILE_UPLOADED log
    file_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("doc.txt", b"Sample content", "text/plain")},
        headers=headers,
    )
    doc_id = file_res.json()["id"]

    # 3. Create MCP Credential -> generates MCP_TOKEN_CREATED log
    cred = (await client.post(f"/workspaces/{ws_id}/mcp-credentials", json={"name": "Audit Key"}, headers=headers)).json()
    raw_token = cred["raw_token"]
    mcp_headers = {"Authorization": f"Bearer {raw_token}"}

    # 4. Deny access to the file
    await client.post(
        f"/workspaces/{ws_id}/policies/resource",
        json={"resource_id": doc_id, "operation": "read_resource", "decision": "DENY"},
        headers=headers,
    )

    # 5. MCP attempts read -> generates RESOURCE_ACCESS_DENIED log
    await client.post("/mcp", json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "read_resource", "arguments": {"resource_id": doc_id}},
    }, headers=mcp_headers)

    # 6. Query audit logs via frontend endpoint
    logs_res = await client.get(f"/workspaces/{ws_id}/audit-logs", headers=headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 3

    operations = [l["operation"] for l in logs]
    assert "FILE_UPLOADED" in operations
    assert "MCP_TOKEN_CREATED" in operations
    assert "RESOURCE_ACCESS_DENIED" in operations

    # 7. Verify no secrets leak in audit logs
    all_logs_stmt = select(AuditLog).where(AuditLog.workspace_id == ws_id)
    db_logs = (await db_session.execute(all_logs_stmt)).scalars().all()

    for l in db_logs:
        meta_str = str(l.request_metadata).lower()
        assert raw_token.lower() not in meta_str
        assert "password123" not in meta_str
        assert "mcp_token_secret" not in meta_str


@pytest.mark.asyncio
async def test_audit_log_long_reason_and_permissions(client: AsyncClient, db_session: AsyncSession):
    """
    Verify that creating an MCP credential with extensive granular permissions
    and long descriptions succeeds without character limit truncation or session crash.
    """
    reg = await client.post("/auth/register", json={"username": "long_audit_user", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "Long Audit WS"}, headers=headers)).json()["id"]

    # Complex permissions payload with extensive field definitions (>300 chars)
    complex_perms = {
        "files": {"read": True, "write": False, "allowed_extensions": ["pdf", "docx", "xlsx", "txt", "md"]},
        "notes": {"read": True, "create": True, "update": True, "delete": False, "allowed_tags": ["finance", "confidential", "q3_audit", "compliance_report"]},
        "structured_data": {"read": True, "write": False, "allowed_tables": ["users", "transactions", "audit_trails", "system_parameters"]},
    }

    res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "High Security Key", "permissions": complex_perms},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert "raw_token" in data
    assert data["name"] == "High Security Key"

    # Confirm audit log entry was safely persisted
    logs_res = await client.get(f"/workspaces/{ws_id}/audit-logs", headers=headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    created_logs = [l for l in logs if l["operation"] == "MCP_TOKEN_CREATED"]
    assert len(created_logs) >= 1
    assert "High Security Key" in str(created_logs[0]["request_metadata"])

