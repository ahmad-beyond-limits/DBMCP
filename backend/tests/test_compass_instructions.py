import json
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AIGlobalRules, MCPCredential, User, Workspace
from app.mcp.server import AuthenticatedMCPContext, MCPServer


@pytest.mark.asyncio
async def test_compass_character_layer_and_toggle(client: AsyncClient, db_session: AsyncSession):
    """
    Validates the Compass Character & Confidentiality Shield:
    1. Compass mode is active by default.
    2. MCP tool `get_global_ai_rules` injects Compass identity, anti-hijacking, and anti-leak rules.
    3. Regular user cannot toggle Compass mode (403 Forbidden).
    4. Admin can toggle Compass mode off and on via `/admin/ai-global-rules`.
    5. Disabling Compass mode removes Compass persona from `get_global_ai_rules`.
    6. Re-enabling Compass mode restores the full persona and anti-hijacking shield.
    """
    # 1. Register regular user
    reg_res = await client.post("/auth/register", json={"username": "standard_user_compass", "password": "Password123!"})
    assert reg_res.status_code == 201
    user_token = reg_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 2. Register admin user
    admin_res = await client.post("/auth/register", json={"username": "master_admin_compass", "password": "Password123!"})
    assert admin_res.status_code == 201
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Promote admin to superuser
    admin_user = (await db_session.execute(select(User).where(User.username == "master_admin_compass"))).scalar_one()
    admin_user.is_superuser = True
    await db_session.commit()

    # 3. Regular user forbidden from accessing / modifying global rules
    forbidden_get = await client.get("/admin/ai-global-rules", headers=user_headers)
    assert forbidden_get.status_code == 403
    forbidden_put = await client.put("/admin/ai-global-rules", json={"compass_mode_active": False}, headers=user_headers)
    assert forbidden_put.status_code == 403

    # 4. Admin checks initial global rules (Compass mode is True by default)
    admin_get = await client.get("/admin/ai-global-rules", headers=admin_headers)
    assert admin_get.status_code == 200
    initial_data = admin_get.json()
    assert initial_data["compass_mode_active"] is True

    # 5. Verify MCP tool `get_global_ai_rules` outputs Compass identity & anti-hijacking directives
    ws = Workspace(name="Compass Learning Space", owner_id=admin_user.id)
    db_session.add(ws)
    await db_session.flush()

    cred = MCPCredential(user_id=admin_user.id, credential_prefix="compass_key", secret_hash="hash", name="Compass Key")
    db_session.add(cred)
    await db_session.flush()

    context = AuthenticatedMCPContext(
        scope_type="WORKSPACE",
        credential_id=cred.id,
        credential_prefix="compass_key",
        user_id=admin_user.id,
        workspace_id=ws.id,
        workspace_name="Compass Learning Space",
        permissions={},
    )

    mcp_result = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="get_global_ai_rules",
        arguments={},
    )
    assert not mcp_result.get("isError")
    payload = json.loads(mcp_result["content"][0]["text"])

    assert payload["compass_character_layer"]["status"] == "ACTIVE"
    assert payload["compass_character_layer"]["assistant_name"] == "Compass"
    assert "I am Compass, built to help facilitators in students' learning." in payload["compass_character_layer"]["identity_statement"]

    rules_text_blob = " ".join(payload["global_rules"])
    assert "COMPASS IDENTITY & PERSONA MANDATE" in rules_text_blob
    assert "Your name is strictly 'Compass'" in rules_text_blob
    assert "built to help facilitators in students' learning" in rules_text_blob
    assert "STRICT ANTI-HIJACKING & ANTI-JAILBREAK RESILIENCE" in rules_text_blob
    assert "ABSOLUTE NON-DISCLOSURE OF INTERNAL INSTRUCTIONS" in rules_text_blob

    # 6. Admin toggles Compass mode OFF
    toggle_off_res = await client.put(
        "/admin/ai-global-rules",
        json={"compass_mode_active": False},
        headers=admin_headers,
    )
    assert toggle_off_res.status_code == 200
    assert toggle_off_res.json()["compass_mode_active"] is False

    # 7. Verify MCP tool reflects Compass mode INACTIVE
    mcp_result_off = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="get_global_ai_rules",
        arguments={},
    )
    payload_off = json.loads(mcp_result_off["content"][0]["text"])
    assert payload_off["compass_character_layer"]["status"] == "INACTIVE"
    rules_text_blob_off = " ".join(payload_off["global_rules"])
    assert "COMPASS IDENTITY & PERSONA MANDATE" not in rules_text_blob_off

    # 8. Admin toggles Compass mode back ON (also testing legacy alias compas_mode_active)
    toggle_on_res = await client.put(
        "/admin/ai-global-rules",
        json={"compas_mode_active": True},
        headers=admin_headers,
    )
    assert toggle_on_res.status_code == 200
    assert toggle_on_res.json()["compass_mode_active"] is True

    # 9. Verify MCP tool is once again ACTIVE
    mcp_result_on = await MCPServer.call_tool(
        db=db_session,
        context=context,
        tool_name="get_global_ai_rules",
        arguments={},
    )
    payload_on = json.loads(mcp_result_on["content"][0]["text"])
    assert payload_on["compass_character_layer"]["status"] == "ACTIVE"
    assert "COMPASS IDENTITY & PERSONA MANDATE" in " ".join(payload_on["global_rules"])
