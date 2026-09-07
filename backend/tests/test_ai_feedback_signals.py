import json
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import User


@pytest.mark.asyncio
async def test_silent_ai_feedback_observation_via_workspace_mcp(client: AsyncClient):
    """
    Verify that an AI connected via a Workspace-scoped MCP key can silently record
    a user care / friction observation signal, and it is saved to the database.
    """
    # 1. Register a user and workspace
    reg = await client.post("/auth/register", json={"username": "care_user_ws", "password": "password123"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    ws_id = (await client.post("/workspaces", json={"name": "Classroom Workspace"}, headers=headers)).json()["id"]

    # 2. Create restricted MCP credential (no edit perms)
    cred = (await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "Classroom Assistant", "can_read": True, "can_search": True, "can_query": True, "can_edit": False},
        headers=headers,
    )).json()
    mcp_token = cred["raw_token"]
    mcp_headers = {"Authorization": f"Bearer {mcp_token}"}

    # 3. AI observes user frustration and calls record_user_observation_signal
    call_payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "record_user_observation_signal",
            "arguments": {
                "heading": "User Frustration with Student Grading Columns",
                "category": "student_issues",
                "description": "User struggled repeatedly with finding math score averages across 3 sections. Exhibited cognitive fatigue.",
                "context_summary": "User attempted 4 manual queries without filtering properly.",
                "severity": "high",
                "metadata": {"attempted_query": "math_score_filter", "dataset": "students.csv"},
            },
        },
    }

    res = await client.post("/mcp", json=call_payload, headers=mcp_headers)
    assert res.status_code == 200
    res_data = res.json()
    assert "result" in res_data
    content_text = json.loads(res_data["result"]["content"][0]["text"])
    assert content_text["status"] == "recorded"
    assert "signal_id" in content_text


@pytest.mark.asyncio
async def test_silent_ai_feedback_observation_via_account_mcp(client: AsyncClient):
    """
    Verify that an AI connected via Account Master MCP key can silently record
    friction / cognitive fatigue signals.
    """
    # 1. Register user
    reg = await client.post("/auth/register", json={"username": "care_user_acc", "password": "password123"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Account-level MCP key
    acc_key_res = await client.post(
        "/account/mcp-credentials",
        json={"name": "Executive Assistant", "permissions": {"read_data": True, "manage_workspaces": False}},
        headers=headers,
    )
    assert acc_key_res.status_code == 201
    acc_mcp_token = acc_key_res.json()["raw_token"]
    acc_mcp_headers = {"Authorization": f"Bearer {acc_mcp_token}"}

    # 3. AI detects cognitive fatigue and logs signal
    call_payload = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "record_user_observation_signal",
            "arguments": {
                "heading": "Cognitive Fatigue and Mental Exhaustion Detected",
                "category": "cognitive_fatigue",
                "description": "User expressed feeling overwhelmed by multiple simultaneous policy reports.",
                "severity": "medium",
            },
        },
    }

    res = await client.post("/mcp", json=call_payload, headers=acc_mcp_headers)
    assert res.status_code == 200
    res_data = res.json()
    assert "result" in res_data
    content_text = json.loads(res_data["result"]["content"][0]["text"])
    assert content_text["status"] == "recorded"


@pytest.mark.asyncio
async def test_admin_can_retrieve_feedback_signals(client: AsyncClient, db_session: AsyncSession):
    """
    Verify that administrators can query logged feedback signals via /admin/feedback-signals.
    """
    # 1. Register admin user
    reg = await client.post("/auth/register", json={"username": "admin_feedback_viewer", "password": "password123"})
    admin_token = reg.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Promote to superuser
    user_stmt = select(User).where(User.username == "admin_feedback_viewer")
    admin_user = (await db_session.execute(user_stmt)).scalar_one()
    admin_user.is_superuser = True
    await db_session.commit()

    # 2. Query feedback signals endpoint
    res = await client.get("/admin/feedback-signals", headers=admin_headers)
    assert res.status_code == 200
    signals = res.json()
    assert isinstance(signals, list)
