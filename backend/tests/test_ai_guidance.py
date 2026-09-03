import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AIGuidancePlaybook, User


@pytest.mark.asyncio
async def test_ai_guidance_layer_and_mcp_discovery(client: AsyncClient, db_session: AsyncSession):
    """
    Comprehensive verification of the AI Guidance & Playbook Layer:
    1. Seeded starter playbooks exist.
    2. Non-admin users are denied access (403 Forbidden).
    3. Superadmin can create, list, update, and delete playbooks.
    4. MCP tool `search_ai_guidance` returns ONLY lightweight titles/triggers (no prompt body).
    5. MCP tool `get_ai_guidance` returns full prompt instructions and strict rules.
    6. MCP `prompts/list` and `prompts/get` dynamically serve active guidance playbooks.
    """
    # 1. Register a standard non-admin user
    reg_res = await client.post("/auth/register", json={"username": "standard_analyst", "password": "Password123!"})
    assert reg_res.status_code == 201
    user_token = reg_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 2. Register an admin user and promote to superuser in DB
    admin_res = await client.post("/auth/register", json={"username": "master_admin_guidance", "password": "Password123!"})
    assert admin_res.status_code == 201
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Promote to superuser
    user_stmt = select(User).where(User.username == "master_admin_guidance")
    admin_user = (await db_session.execute(user_stmt)).scalar_one()
    admin_user.is_superuser = True
    await db_session.commit()

    # 3. Verify standard user receives 403 Forbidden on /admin/ai-guidance
    forbidden_res = await client.get("/admin/ai-guidance", headers=user_headers)
    assert forbidden_res.status_code == 403

    # 4. Verify admin can list seeded playbooks
    list_res = await client.get("/admin/ai-guidance", headers=admin_headers)
    assert list_res.status_code == 200
    playbooks = list_res.json()
    assert len(playbooks) >= 3
    titles = [p["title"] for p in playbooks]
    assert any("Analytical Data Synthesis" in t for t in titles)

    # 5. Admin creates a new specialized playbook
    new_pb_payload = {
        "title": "Strict Privacy & GDPR Enforcement",
        "category": "compliance",
        "trigger_condition": "Activate when the user asks about European user data, deletion requests, or PII consent.",
        "summary": "Mandatory privacy adherence protocol enforcing data minimization and PII erasure guarantees.",
        "prompt_template": "You are serving as the Platform Data Privacy Officer. Enforce strict GDPR compliance on all queries.",
        "strict_rules": [
            "Never disclose raw IP addresses or email addresses.",
            "Always state the lawful basis for data processing.",
            "Advise the user to contact DPO for Article 17 erasure requests."
        ],
        "style_guide": "Audit-grade legal compliance language.",
        "is_active": True,
        "tags": ["gdpr", "privacy", "compliance", "strict"]
    }
    create_res = await client.post("/admin/ai-guidance", json=new_pb_payload, headers=admin_headers)
    assert create_res.status_code == 201
    created_pb = create_res.json()
    assert created_pb["title"] == "Strict Privacy & GDPR Enforcement"
    assert len(created_pb["strict_rules"]) == 3
    guidance_id = created_pb["id"]

    # 6. Admin updates playbook
    update_res = await client.put(
        f"/admin/ai-guidance/{guidance_id}",
        json={"summary": "Updated GDPR compliance and data protection protocol."},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["summary"] == "Updated GDPR compliance and data protection protocol."

    # 7. Create a workspace and generate an MCP token to test MCP tools
    ws_res = await client.post("/workspaces", json={"name": "Guidance Test Workspace"}, headers=user_headers)
    assert ws_res.status_code == 201
    ws_id = ws_res.json()["id"]

    mcp_key_res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "Test Key for Guidance"},
        headers=user_headers,
    )
    assert mcp_key_res.status_code == 201
    raw_mcp_token = mcp_key_res.json()["raw_token"]
    mcp_headers = {"Authorization": f"Bearer {raw_mcp_token}"}

    # 8. Test MCP tool `search_ai_guidance` (Progressive discovery, minimal cognitive load)
    # Notice: It should NOT return `prompt_template` or `strict_rules`
    search_req = {
        "jsonrpc": "2.0",
        "id": 101,
        "method": "tools/call",
        "params": {
            "name": "search_ai_guidance",
            "arguments": {"query": "gdpr"}
        }
    }
    search_res = await client.post("/mcp", json=search_req, headers=mcp_headers)
    assert search_res.status_code == 200
    search_content = search_res.json()["result"]["content"][0]["text"]
    assert "Strict Privacy & GDPR Enforcement" in search_content
    # Crucial cognitive load verification: prompt_template and strict_rules must NOT be in search results!
    assert "prompt_template" not in search_content
    assert "Never disclose raw IP addresses" not in search_content

    # 9. Test MCP tool `get_ai_guidance` (Loads full prompt and strict rules)
    get_req = {
        "jsonrpc": "2.0",
        "id": 102,
        "method": "tools/call",
        "params": {
            "name": "get_ai_guidance",
            "arguments": {"guidance_id": guidance_id}
        }
    }
    get_res = await client.post("/mcp", json=get_req, headers=mcp_headers)
    assert get_res.status_code == 200
    get_content = get_res.json()["result"]["content"][0]["text"]
    assert "Strict Privacy & GDPR Enforcement" in get_content
    assert "Never disclose raw IP addresses" in get_content
    assert "Platform Data Privacy Officer" in get_content

    # 10. Test dynamic MCP `prompts/list`
    prompts_list_req = {"jsonrpc": "2.0", "id": 103, "method": "prompts/list", "params": {}}
    prompts_res = await client.post("/mcp", json=prompts_list_req, headers=mcp_headers)
    assert prompts_res.status_code == 200
    prompt_names = [p["name"] for p in prompts_res.json()["result"]["prompts"]]
    assert any("strict_privacy" in p for p in prompt_names)

    # 11. Test dynamic MCP `prompts/get`
    target_prompt_name = [p for p in prompt_names if "strict_privacy" in p][0]
    prompt_get_req = {"jsonrpc": "2.0", "id": 104, "method": "prompts/get", "params": {"name": target_prompt_name}}
    p_res = await client.post("/mcp", json=prompt_get_req, headers=mcp_headers)
    assert p_res.status_code == 200
    prompt_body = p_res.json()["result"]["messages"][0]["content"]["text"]
    assert "Strict Mandatory Rules" in prompt_body
    assert "Never disclose raw IP addresses" in prompt_body

    # 12. Admin deletes playbook
    del_res = await client.delete(f"/admin/ai-guidance/{guidance_id}", headers=admin_headers)
    assert del_res.status_code == 200
