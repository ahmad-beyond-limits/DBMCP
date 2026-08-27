import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_structured_data_field_denial_and_indirect_leakage(client: AsyncClient):
    """
    Field-level policy on CSV/JSON dataset:
    - 'salary' column is DENIED
    - Query requesting 'salary' must be rejected
    - Aggregation over 'salary' (e.g. AVG(salary)) must be rejected
    - Query requesting 'department' and 'name' must be allowed
    """
    # 1. Setup workspace
    reg = await client.post("/auth/register", json={"username": "data_admin", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "Data Dept"}, headers=headers)).json()["id"]

    # 2. Upload CSV dataset
    csv_content = b"name,email,salary,department\nAlice,alice@corp.com,95000,Engineering\nBob,bob@corp.com,82000,Sales\n"
    file_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("employees.csv", csv_content, "text/csv")},
        headers=headers,
    )
    dataset_id = file_res.json()["id"]

    # 3. Configure Anonymisation Rule: salary -> DENY, email -> MASK
    await client.post(
        f"/workspaces/{ws_id}/policies/anonymisation",
        json={"entity_type": "salary", "field_name": "salary", "transformation": "DENY"},
        headers=headers,
    )
    await client.post(
        f"/workspaces/{ws_id}/policies/anonymisation",
        json={"entity_type": "email", "field_name": "email", "transformation": "MASK"},
        headers=headers,
    )

    # 4. Generate MCP Credential
    cred = (await client.post(f"/workspaces/{ws_id}/mcp-credentials", json={"name": "Analyst"}, headers=headers)).json()
    mcp_headers = {"Authorization": f"Bearer {cred['raw_token']}"}

    # 5. Get Schema: verify 'salary' is omitted from safe schema
    schema_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "get_dataset_schema", "arguments": {"resource_id": dataset_id}},
    }
    schema_res = await client.post("/mcp", json=schema_req, headers=mcp_headers)
    assert schema_res.status_code == 200
    schema_text = schema_res.json()["result"]["content"][0]["text"]
    assert "salary" not in schema_text
    assert "department" in schema_text

    # 6. Query targeting denied column 'salary' -> DENIED
    bad_query = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": dataset_id,
                "columns": ["name", "salary"],
            },
        },
    }
    res_bad = await client.post("/mcp", json=bad_query, headers=mcp_headers)
    assert res_bad.status_code == 200
    call_res = res_bad.json()["result"]
    assert call_res.get("isError") is True or "denied" in call_res["content"][0]["text"].lower()

    # 7. Indirect leakage prevention: Aggregation on denied column 'salary' -> DENIED
    agg_query = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": dataset_id,
                "aggregation": {"column": "salary", "func": "avg"},
            },
        },
    }
    res_agg = await client.post("/mcp", json=agg_query, headers=mcp_headers)
    assert res_agg.status_code == 200
    agg_res = res_agg.json()["result"]
    assert agg_res.get("isError") is True or "denied" in agg_res["content"][0]["text"].lower()

    # 8. Permitted query: projecting 'name', 'department', 'email'
    good_query = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": dataset_id,
                "columns": ["name", "email", "department"],
            },
        },
    }
    res_good = await client.post("/mcp", json=good_query, headers=mcp_headers)
    assert res_good.status_code == 200
    good_text = res_good.json()["result"]["content"][0]["text"]
    assert "Engineering" in good_text
    assert "a***@corp.com" in good_text  # email was masked!
