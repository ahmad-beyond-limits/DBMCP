import json
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


@pytest.mark.asyncio
async def test_dataset_exact_filtering_aggregation_and_editing(client: AsyncClient):
    """
    Test exact filter matching (e.g. female vs male, 1 vs 0),
    filtered aggregations (count filtered rows),
    and editing datasets via edit_dataset tool.
    """
    # 1. Setup workspace & upload student performance dataset
    reg = await client.post("/auth/register", json={"username": "teacher_admin", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "School Workspace"}, headers=headers)).json()["id"]

    csv_content = (
        b"student_id,name,gender,math_score\n"
        b"101,Alice,female,72\n"
        b"102,Bob,male,65\n"
        b"103,Charlie,male,88\n"
        b"104,Diana,female,94\n"
    )
    file_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("students.csv", csv_content, "text/csv")},
        headers=headers,
    )
    dataset_id = file_res.json()["id"]

    cred = (await client.post(f"/workspaces/{ws_id}/mcp-credentials", json={"name": "Teacher Assistant"}, headers=headers)).json()
    mcp_headers = {"Authorization": f"Bearer {cred['raw_token']}"}

    # 2. Query exact filter: gender = 'male' (Must NOT return 'female'!)
    male_query = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": "students.csv",
                "filters": {"gender": "male"},
            },
        },
    }
    res_male = await client.post("/mcp", json=male_query, headers=mcp_headers)
    assert res_male.status_code == 200
    res_data = json.loads(res_male.json()["result"]["content"][0]["text"])
    assert res_data["count"] == 2
    for r in res_data["rows"]:
        assert r["gender"].lower() == "male"
        assert r["name"] in ["Bob", "Charlie"]

    # 3. Filtered Aggregation: Count female students
    female_count_query = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": dataset_id,
                "filters": {"gender": "female"},
                "aggregation": {"column": "gender", "func": "count"},
            },
        },
    }
    res_female = await client.post("/mcp", json=female_count_query, headers=mcp_headers)
    assert res_female.status_code == 200
    agg_out = json.loads(res_female.json()["result"]["content"][0]["text"])
    assert agg_out["result"] == 2

    # 4. Filter on non-existent value '0' or '1' -> Must return 0 matching rows!
    zero_query = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": "students.csv",
                "filters": {"gender": "0"},
                "aggregation": {"func": "count"},
            },
        },
    }
    res_zero = await client.post("/mcp", json=zero_query, headers=mcp_headers)
    assert res_zero.status_code == 200
    zero_out = json.loads(res_zero.json()["result"]["content"][0]["text"])
    assert zero_out["result"] == 0

    # 5. Edit dataset: Update Bob's math score to 99 and gender to 'male_updated'
    edit_query = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "edit_dataset",
            "arguments": {
                "resource_id": "students.csv",
                "action": "update",
                "filters": {"student_id": "102"},
                "updates": {"math_score": 99},
            },
        },
    }
    res_edit = await client.post("/mcp", json=edit_query, headers=mcp_headers)
    assert res_edit.status_code == 200
    edit_out = json.loads(res_edit.json()["result"]["content"][0]["text"])
    assert edit_out["success"] is True
    assert edit_out["records_modified"] == 1

    # 6. Verify Bob's updated score is now queryable
    verify_bob = {
        "jsonrpc": "2.0",
        "id": 5,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": dataset_id,
                "filters": {"student_id": "102"},
            },
        },
    }
    res_v = await client.post("/mcp", json=verify_bob, headers=mcp_headers)
    assert res_v.status_code == 200
    v_data = json.loads(res_v.json()["result"]["content"][0]["text"])
    assert len(v_data["rows"]) == 1
    assert str(v_data["rows"][0]["math_score"]) == "99"
