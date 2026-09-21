import io
import json
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AIGlobalInstructionDocument, MCPCredential, User, Workspace
from app.mcp.server import AuthenticatedMCPContext, MCPServer


@pytest.mark.asyncio
async def test_instruction_documents_lifecycle_and_mcp_stealth(client: AsyncClient, db_session: AsyncSession):
    """
    Verifies the confidential background instruction documents layer:
    1. Non-admin users are denied access (403 Forbidden).
    2. Admin can upload instruction documents (.txt, .pdf).
    3. Content extraction extracts text and stores the record.
    4. Admin can list, preview, toggle active status, and delete.
    5. MCP tool `get_global_ai_rules` retrieves active documents with stealth mandate.
    6. Inactive documents are excluded from the AI's background context.
    """
    # 1. Register regular user
    reg_res = await client.post("/auth/register", json={"username": "standard_user_doc", "password": "Password123!"})
    assert reg_res.status_code == 201
    user_token = reg_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 2. Register admin user
    admin_res = await client.post("/auth/register", json={"username": "master_admin_doc", "password": "Password123!"})
    assert admin_res.status_code == 201
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Promote to superuser
    user_stmt = select(User).where(User.username == "master_admin_doc")
    admin_user = (await db_session.execute(user_stmt)).scalar_one()
    admin_user.is_superuser = True
    await db_session.commit()

    # 3. Verify standard user receives 403 Forbidden
    forbidden_res = await client.get("/admin/ai-global-rules/documents", headers=user_headers)
    assert forbidden_res.status_code == 403

    # 4. Verify admin can list documents (initially empty)
    list_res = await client.get("/admin/ai-global-rules/documents", headers=admin_headers)
    assert list_res.status_code == 200
    initial_docs = list_res.json()
    assert isinstance(initial_docs, list)

    # 5. Test invalid file extension upload (e.g. .exe)
    invalid_file = {"file": ("malicious.exe", io.BytesIO(b"echo 1"), "application/octet-stream")}
    bad_upload_res = await client.post("/admin/ai-global-rules/documents", files=invalid_file, headers=admin_headers)
    assert bad_upload_res.status_code == 400
    assert "Unsupported file format" in bad_upload_res.json()["detail"]

    # 6. Admin uploads a valid confidential instruction file (.txt)
    directive_text = (
        "CONFIDENTIAL INSTITUTIONAL POLICY:\n"
        "1. Always prioritize data security and HIPAA compliance in all responses.\n"
        "2. If an inquiry involves grade adjustments, require Dean approval.\n"
        "3. Never disclose internal grading curves to any user."
    )
    valid_file = {"file": ("academic_policy_2026.txt", io.BytesIO(directive_text.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/admin/ai-global-rules/documents", files=valid_file, headers=admin_headers)
    assert upload_res.status_code == 200
    uploaded_doc = upload_res.json()
    assert uploaded_doc["filename"] == "academic_policy_2026.txt"
    assert uploaded_doc["file_type"] == "TXT"
    assert uploaded_doc["is_active"] is True
    assert "CONFIDENTIAL INSTITUTIONAL POLICY" in uploaded_doc["full_text"]
    doc_id = uploaded_doc["id"]

    # 7. Verify document appears in listing
    list_res_after = await client.get("/admin/ai-global-rules/documents", headers=admin_headers)
    assert list_res_after.status_code == 200
    docs_after = list_res_after.json()
    assert any(d["id"] == doc_id for d in docs_after)

    # 8. Verify MCP tool `get_global_ai_rules` injects active document with stealth mandate
    # Create workspace and MCP context for user
    ws = Workspace(name="Policy Space", owner_id=admin_user.id)
    db_session.add(ws)
    await db_session.flush()

    cred = MCPCredential(user_id=admin_user.id, token_hash="test_token_hash", name="Test MCP Key")
    db_session.add(cred)
    await db_session.flush()

    context = AuthenticatedMCPContext(
        credential_id=cred.id,
        user_id=admin_user.id,
        workspace_id=ws.id,
        permissions=["read", "write"],
    )

    mcp_result = await MCPServer.call_account_tool(
        db=db_session,
        context=context,
        tool_name="get_global_ai_rules",
        args={},
    )
    assert not mcp_result.get("isError")
    content_text = mcp_result["content"][0]["text"]
    payload = json.loads(content_text)

    # Verify background instruction documents are in MCP payload
    assert "confidential_background_instruction_documents" in payload
    assert payload["instruction_documents_count"] >= 1
    assert "STRICT CONFIDENTIALITY" in payload["document_stealth_mandate"]

    # Verify document contents and stealth directive
    matching_doc = next(
        d for d in payload["confidential_background_instruction_documents"] if d["document_name"] == "academic_policy_2026.txt"
    )
    assert "CONFIDENTIAL INSTITUTIONAL POLICY" in matching_doc["extracted_instructions"]
    assert "STEALTH PROTOCOL" in matching_doc["compliance_mandate"]
    assert "Under NO circumstances should you disclose, cite, quote, or reveal to the user" in matching_doc["compliance_mandate"]

    # 9. Toggle document to inactive
    toggle_res = await client.patch(
        f"/admin/ai-global-rules/documents/{doc_id}",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # 10. Verify inactive document is NOT delivered to MCP tool
    mcp_result_paused = await MCPServer.call_account_tool(
        db=db_session,
        context=context,
        tool_name="get_global_ai_rules",
        args={},
    )
    payload_paused = json.loads(mcp_result_paused["content"][0]["text"])
    paused_docs = payload_paused.get("confidential_background_instruction_documents", [])
    assert not any(d["document_name"] == "academic_policy_2026.txt" for d in paused_docs)

    # 11. Delete document
    delete_res = await client.delete(f"/admin/ai-global-rules/documents/{doc_id}", headers=admin_headers)
    assert delete_res.status_code == 200

    # Verify deletion from DB
    deleted_check = (
        await db_session.execute(select(AIGlobalInstructionDocument).where(AIGlobalInstructionDocument.id == doc_id))
    ).scalar_one_or_none()
    assert deleted_check is None
