import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.mcp.companion import UserCompanionHarnessService
from app.database.models import User, Workspace, Note


@pytest.mark.asyncio
async def test_user_companion_harness_service(db_session: AsyncSession):
    """
    Verifies that UserCompanionHarnessService:
    1. Deterministically creates or finds the dedicated 'Workspace Notes' workspace.
    2. Persists companion insights with category, tags, and cross-workspace metadata.
    3. Searches and retrieves memories.
    4. Generates a comprehensive companion context snapshot.
    """
    # Create test user
    user = User(
        username="companion_tester",
        password_hash="hashed_pw",
        first_name="Ada",
        last_name="Lovelace",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # 1. Ensure notes workspace
    ws_notes = await UserCompanionHarnessService.ensure_notes_workspace(db_session, user.id)
    assert ws_notes is not None
    assert ws_notes.name == "Notes"
    assert ws_notes.owner_id == user.id

    # Calling again returns the identical workspace
    ws_notes_second = await UserCompanionHarnessService.ensure_notes_workspace(db_session, user.id)
    assert ws_notes_second.id == ws_notes.id

    # 2. Save companion insight
    res = await UserCompanionHarnessService.save_user_companion_insight(
        db=db_session,
        user_id=user.id,
        current_workspace_id=None,
        title="Key Statistical Takeaway",
        content="Outliers in column 'sales' skew the mean by 24%. Recommended median imputation.",
        category="analysis_takeaway",
        tags=["sales", "imputation", "statistics"],
    )
    assert res["success"] is True
    assert "Key Statistical Takeaway" in res["title"]
    assert "Notes" in res["workspace_name"]

    # 3. Search companion memory
    search_res = await UserCompanionHarnessService.search_user_companion_memory(
        db=db_session,
        user_id=user.id,
        query="outliers",
    )
    assert search_res["total_found"] == 1
    assert "Key Statistical Takeaway" in search_res["memory_insights"][0]["title"]
    assert "sales" in search_res["memory_insights"][0]["tags"]

    # 4. Context snapshot
    snapshot = await UserCompanionHarnessService.get_user_harness_context_snapshot(
        db=db_session,
        user_id=user.id,
    )
    assert snapshot["user_profile"]["username"] == "companion_tester"
    assert snapshot["user_profile"]["display_name"] == "Ada Lovelace"
    assert len(snapshot["companion_memory"]["recent_insights"]) == 1
    assert "Key Statistical Takeaway" in snapshot["companion_memory"]["recent_insights"][0]["title"]


@pytest.mark.asyncio
async def test_user_companion_mcp_tools(client: AsyncClient):
    """
    Verifies that an AI agent using MCP credentials can:
    1. Call 'save_companion_insight' to persist takeaways to Workspace Notes.
    2. Call 'get_companion_memory' to search memories.
    3. Fetch 'get_tools_cache' and 'workspace_info' and receive 'user_companion_context'.
    """
    # 1. Setup user, workspace, and MCP credentials
    reg = await client.post("/auth/register", json={"username": "mcp_companion_user", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws = (await client.post("/workspaces", json={"name": "Analytics WS"}, headers=headers)).json()
    ws_id = ws["id"]

    cred_res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "Companion Agent Key"},
        headers=headers,
    )
    mcp_headers = {"Authorization": f"Bearer {cred_res.json()['raw_token']}"}

    # 2. Call save_companion_insight via MCP
    save_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "save_companion_insight",
            "arguments": {
                "title": "Quarterly Revenue Growth",
                "content": "Q3 revenue grew by 18% driven by enterprise accounts.",
                "category": "analysis_takeaway",
                "tags": ["revenue", "q3", "growth"],
            },
        },
    }
    save_res = await client.post("/mcp", json=save_req, headers=mcp_headers)
    assert save_res.status_code == 200
    save_content = json.loads(save_res.json()["result"]["content"][0]["text"])
    assert save_content["success"] is True
    assert save_content["workspace_name"] == "Notes"

    # 3. Call get_companion_memory via MCP
    search_req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "get_companion_memory",
            "arguments": {
                "query": "revenue",
            },
        },
    }
    search_res = await client.post("/mcp", json=search_req, headers=mcp_headers)
    assert search_res.status_code == 200
    search_content = json.loads(search_res.json()["result"]["content"][0]["text"])
    assert search_content["total_found"] == 1
    assert "Quarterly Revenue Growth" in search_content["memory_insights"][0]["title"]

    # 4. Call get_tools_cache and verify user_companion_context is returned
    cache_req = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "get_tools_cache",
            "arguments": {},
        },
    }
    cache_res = await client.post("/mcp", json=cache_req, headers=mcp_headers)
    assert cache_res.status_code == 200
    cache_data = json.loads(cache_res.json()["result"]["content"][0]["text"])
    assert "user_companion_context" in cache_data
    assert cache_data["user_companion_context"]["user_profile"]["username"] == "mcp_companion_user"
    assert "companion_memory_harness" in cache_data["skills"]

    # 5. Call workspace_info and verify user_companion_context is present
    info_req = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "workspace_info",
            "arguments": {},
        },
    }
    info_res = await client.post("/mcp", json=info_req, headers=mcp_headers)
    assert info_res.status_code == 200
    info_data = json.loads(info_res.json()["result"]["content"][0]["text"])
    assert "user_companion_context" in info_data


@pytest.mark.asyncio
async def test_read_tools_do_not_return_interactive_form_urls(client: AsyncClient):
    """
    Confirms that:
    1. list_resources, get_dataset_schema, and query_dataset DO NOT return interactive_form_url.
    2. Only generate_data_entry_form returns an ephemeral 5-minute interactive form session.
    """
    # 1. Setup workspace with CSV dataset
    reg = await client.post("/auth/register", json={"username": "forms_read_tester", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws = (await client.post("/workspaces", json={"name": "Forms Test WS"}, headers=headers)).json()
    ws_id = ws["id"]

    csv_data = b"id,name,role\n1,Alice,Engineer\n2,Charlie,Designer\n"
    file_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("team.csv", csv_data, "text/csv")},
        headers=headers,
    )
    file_id = file_res.json()["id"]

    cred_res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "Forms Agent Key"},
        headers=headers,
    )
    mcp_headers = {"Authorization": f"Bearer {cred_res.json()['raw_token']}"}

    # 2. Test list_resources
    list_req = {"jsonrpc": "2.0", "id": 1, "method": "resources/list"}
    list_res = await client.post("/mcp", json=list_req, headers=mcp_headers)
    assert list_res.status_code == 200
    res_content = json.loads(list_res.json()["result"]["content"][0]["text"])
    for res_item in res_content["resources"]:
        assert "interactive_form_url" not in res_item

    # 3. Test get_dataset_schema
    schema_req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "get_dataset_schema",
            "arguments": {"resource_id": file_id},
        },
    }
    schema_res = await client.post("/mcp", json=schema_req, headers=mcp_headers)
    assert schema_res.status_code == 200
    schema_data = json.loads(schema_res.json()["result"]["content"][0]["text"])
    assert "interactive_form_url" not in schema_data
    assert "generate_data_entry_form" in schema_data.get("data_entry_guidance", "")

    # 4. Test query_dataset
    query_req = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {"resource_id": file_id},
        },
    }
    query_res = await client.post("/mcp", json=query_req, headers=mcp_headers)
    assert query_res.status_code == 200
    query_data = json.loads(query_res.json()["result"]["content"][0]["text"])
    assert "interactive_form_url" not in query_data

    # 5. Only generate_data_entry_form produces interactive_form_url
    form_req = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "generate_data_entry_form",
            "arguments": {"resource_id": file_id, "action": "insert"},
        },
    }
    form_res = await client.post("/mcp", json=form_req, headers=mcp_headers)
    assert form_res.status_code == 200
    form_result = form_res.json()["result"]
    assert "metadata" in form_result
    assert "form_url" in form_result["metadata"]
    assert "expires_in" in form_result["metadata"]
    assert "5 minutes" in form_result["metadata"]["expires_in"]
