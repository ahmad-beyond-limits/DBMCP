import pytest
import json
from unittest.mock import AsyncMock, MagicMock
from app.mcp.server import MCPServer, ToolCacheRegistry
from app.mcp.auth import AuthenticatedMCPContext


def test_tool_cache_registry_structure():
    workspace_tools = ToolCacheRegistry.get_all_tools("WORKSPACE")
    account_tools = ToolCacheRegistry.get_all_tools("ACCOUNT")

    ws_names = [t["name"] for t in workspace_tools]
    acc_names = [t["name"] for t in account_tools]

    assert "get_tools_cache" in ws_names
    assert "workspace_info" in ws_names
    assert "query_dataset" in ws_names
    assert "generate_data_entry_form" in ws_names

    assert "get_tools_cache" in acc_names
    assert "account_info" in acc_names
    assert "list_workspaces" in acc_names


def test_tool_cache_diff_calculation():
    # Pass known tools missing 'get_tools_cache' and 'edit_dataset'
    cache = ToolCacheRegistry.build_cache_for_scope(
        scope_type="WORKSPACE",
        known_tools=["workspace_info", "list_resources"],
        include_schemas=True,
    )

    assert cache["status"] == "synchronized"
    assert cache["server_scope"] == "WORKSPACE"
    assert cache["known_tools_count"] == 2
    assert "new_tools_on_server" in cache
    assert "get_tools_cache" in cache["new_tools_on_server"]
    assert "query_dataset" in cache["new_tools_on_server"]
    assert cache["new_tools_count"] > 0
    assert "diff_summary" in cache


def test_tool_cache_category_filtering():
    cache_data = ToolCacheRegistry.build_cache_for_scope(
        scope_type="WORKSPACE",
        category_filter="data_management",
    )
    for tool in cache_data["tools"]:
        assert tool["category"] == "data_management"


def test_tool_cache_dynamic_registration():
    initial_version = ToolCacheRegistry._cache_version
    custom_tool = {
        "name": "custom_analytics_scanner",
        "description": "Scans workspace metrics for anomalies",
        "inputSchema": {"type": "object", "properties": {}},
    }

    ToolCacheRegistry.register_tool(custom_tool, scope="WORKSPACE")

    assert ToolCacheRegistry._cache_version > initial_version
    updated_tools = ToolCacheRegistry.get_all_tools("WORKSPACE")
    tool_names = [t["name"] for t in updated_tools]
    assert "custom_analytics_scanner" in tool_names

    cache = ToolCacheRegistry.build_cache_for_scope(
        scope_type="WORKSPACE",
        known_tools=["workspace_info"],
    )
    assert "custom_analytics_scanner" in cache["new_tools_on_server"]


@pytest.mark.asyncio
async def test_mcp_server_call_get_tools_cache():
    mock_db = AsyncMock()
    context = AuthenticatedMCPContext(
        scope_type="WORKSPACE",
        credential_id="test_cred_1",
        credential_prefix="test_prefix",
        workspace_id="ws_123",
        workspace_name="Test Workspace",
        permissions={},
    )

    response = await MCPServer.call_tool(
        db=mock_db,
        context=context,
        tool_name="get_tools_cache",
        arguments={"known_tools": ["workspace_info"]},
    )

    assert not response.get("isError")
    assert "content" in response
    payload = json.loads(response["content"][0]["text"])
    assert payload["status"] == "synchronized"
    assert payload["server_scope"] == "WORKSPACE"
    assert "new_tools_on_server" in payload
    assert "get_tools_cache" in payload["all_tool_names"]
