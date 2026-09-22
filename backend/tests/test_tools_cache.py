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


def _create_mock_db():
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res
    return mock_db


@pytest.mark.asyncio
async def test_mcp_server_call_get_tools_cache():
    mock_db = _create_mock_db()
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
    assert "instructions" in payload
    assert len(payload["tools"]) > 10


@pytest.mark.asyncio
async def test_list_tools_returns_strictly_only_get_tools_cache():
    ws_context = AuthenticatedMCPContext(
        scope_type="WORKSPACE",
        credential_id="ws_cred_1",
        credential_prefix="ws_pref",
        workspace_id="ws_123",
        workspace_name="Test Workspace",
        permissions={},
    )
    acc_context = AuthenticatedMCPContext(
        scope_type="ACCOUNT",
        credential_id="acc_cred_1",
        credential_prefix="acc_pref",
        user_id="user_123",
        username="operator",
        permissions={},
    )

    # 1. Workspace scope
    ws_tools = await MCPServer.list_tools(ws_context)
    assert len(ws_tools) == 1
    assert ws_tools[0]["name"] == "get_tools_cache"
    assert "execute_tool" in ws_tools[0]["inputSchema"]["properties"]

    # 2. Account scope
    acc_tools = await MCPServer.list_tools(acc_context)
    assert len(acc_tools) == 1
    assert acc_tools[0]["name"] == "get_tools_cache"
    assert "execute_tool" in acc_tools[0]["inputSchema"]["properties"]

    # 3. None / Default scope
    default_tools = await MCPServer.list_tools(None)
    assert len(default_tools) == 1
    assert default_tools[0]["name"] == "get_tools_cache"


@pytest.mark.asyncio
async def test_get_tools_cache_executes_packed_tool_via_gateway():
    mock_db = _create_mock_db()
    context = AuthenticatedMCPContext(
        scope_type="WORKSPACE",
        credential_id="test_cred_1",
        credential_prefix="test_prefix",
        workspace_id="ws_123",
        workspace_name="Test Workspace",
        permissions={},
    )

    # Execute workspace_info via execute_tool dict
    res1 = await MCPServer.call_tool(
        db=mock_db,
        context=context,
        tool_name="get_tools_cache",
        arguments={"execute_tool": {"name": "workspace_info", "arguments": {}}},
    )
    assert not res1.get("isError")
    assert "content" in res1
    parsed1 = json.loads(res1["content"][0]["text"])
    assert parsed1["workspace_id"] == "ws_123"

    # Execute workspace_info via tool_name shortcut
    res2 = await MCPServer.call_tool(
        db=mock_db,
        context=context,
        tool_name="get_tools_cache",
        arguments={"tool_name": "workspace_info", "tool_arguments": {}},
    )
    assert not res2.get("isError")
    assert "content" in res2
    parsed2 = json.loads(res2["content"][0]["text"])
    assert parsed2["workspace_id"] == "ws_123"


@pytest.mark.asyncio
async def test_packed_tool_direct_call_compatibility():
    mock_db = _create_mock_db()
    context = AuthenticatedMCPContext(
        scope_type="WORKSPACE",
        credential_id="test_cred_1",
        credential_prefix="test_prefix",
        workspace_id="ws_123",
        workspace_name="Test Workspace",
        permissions={},
    )

    # Calling packed tool directly by name via MCPServer.call_tool
    res = await MCPServer.call_tool(
        db=mock_db,
        context=context,
        tool_name="workspace_info",
        arguments={},
    )
    assert not res.get("isError")
    assert "content" in res
    parsed = json.loads(res["content"][0]["text"])
    assert parsed["workspace_id"] == "ws_123"

