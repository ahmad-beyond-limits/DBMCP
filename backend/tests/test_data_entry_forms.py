import json
import pytest
from httpx import AsyncClient

from app.forms.service import sanitize_cell_value


def test_sanitize_cell_value_formula_injection_defense():
    """
    CWE-1236 Defense Test:
    Ensures strings starting with =, +, -, @, \t, \r are properly neutralized,
    while legitimate numbers (positive or negative) are preserved safely.
    """
    # Dangerous formula triggers
    assert sanitize_cell_value("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_cell_value("=1+2") == "'=1+2"
    assert sanitize_cell_value("@HYPERLINK('http://evil.com')") == "'@HYPERLINK('http://evil.com')"
    assert sanitize_cell_value("+cmd|'/c calc'!A1") == "'+cmd|'/c calc'!A1"
    assert sanitize_cell_value("\tDangerousTab") == "'\tDangerousTab"

    # Legitimate numbers should remain safe numbers
    assert sanitize_cell_value("-42") == "-42"
    assert sanitize_cell_value("+3.14") == "+3.14"
    assert sanitize_cell_value(95) == 95
    assert sanitize_cell_value(-10.5) == -10.5
    assert sanitize_cell_value("Normal text") == "Normal text"


@pytest.mark.asyncio
async def test_form_generation_session_and_submission(client: AsyncClient):
    """
    End-to-end test of the Generative UI Form flow:
    1. Register user & create workspace with CSV dataset.
    2. Request form generation via MCP tool 'generate_data_entry_form'.
    3. Retrieve form schema via GET /forms/session?token=...
    4. Submit data via POST /forms/submit.
    5. Verify dataset contains the newly submitted record.
    """
    # 1. Setup workspace and dataset
    reg = await client.post("/auth/register", json={"username": "forms_tester", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "Forms Workspace"}, headers=headers)).json()["id"]

    csv_data = b"student_id,name,math_score,status\n1,Alice,88,Passed\n2,Bob,74,Passed\n"
    file_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("students.csv", csv_data, "text/csv")},
        headers=headers,
    )
    file_id = file_res.json()["id"]

    # 2. Generate MCP Live Token
    token_res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "Forms Token"},
        headers=headers,
    )
    raw_mcp_token = token_res.json()["raw_token"]
    mcp_headers = {"Authorization": f"Bearer {raw_mcp_token}"}

    # 3. Call generate_data_entry_form MCP tool for 'insert'
    mcp_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "generate_data_entry_form",
            "arguments": {
                "resource_id": file_id,
                "action": "insert",
                "target_identifier": "Student 3",
            },
        },
    }
    mcp_res = await client.post("/mcp", json=mcp_req, headers=mcp_headers)
    assert mcp_res.status_code == 200
    res_data = mcp_res.json()["result"]
    assert "metadata" in res_data
    session_token = res_data["metadata"]["session_token"]
    form_url = res_data["metadata"]["form_url"]
    assert "/forms?session=" in form_url

    # 4. GET /forms/session to load the form schema
    session_res = await client.get(f"/forms/session?token={session_token}")
    assert session_res.status_code == 200
    form_info = session_res.json()
    assert form_info["filename"] == "students.csv"
    assert form_info["action"] == "insert"
    field_names = [f["name"] for f in form_info["fields"]]
    assert "student_id" in field_names
    assert "math_score" in field_names
    assert "status" in field_names

    # 5. POST /forms/submit to add the new row with formula injection payload to test safety
    submit_req = {
        "session_token": session_token,
        "values": {
            "student_id": "3",
            "name": "=CMD|'calc'!A1",  # Malicious formula
            "math_score": "95",
            "status": "Passed",
        },
    }
    sub_res = await client.post("/forms/submit", json=submit_req)
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "success"
    assert sub_data["action"] == "insert"
    assert sub_data["affected_records"] == 1
    # Check that dangerous formula was safely sanitized
    assert sub_data["record"]["name"] == "'=CMD|'calc'!A1"

    # 6. Verify via query_dataset that row 3 exists in dataset
    query_req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "query_dataset",
            "arguments": {
                "resource_id": file_id,
                "filters": {"student_id": 3},
            },
        },
    }
    q_res = await client.post("/mcp", json=query_req, headers=mcp_headers)
    q_text = q_res.json()["result"]["content"][0]["text"]
    q_data = json.loads(q_text)
    assert q_data["count"] == 1
    assert q_data["rows"][0]["status"] == "Passed"


@pytest.mark.asyncio
async def test_form_update_flow(client: AsyncClient):
    """
    Tests updating an existing record using the form:
    1. Generates form for action='update' with filter {'student_id': 2}.
    2. Verifies prefilled values match Bob's existing values.
    3. Submits updated math_score.
    4. Verifies Bob's score is updated to 99.
    """
    reg = await client.post("/auth/register", json={"username": "update_tester", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_id = (await client.post("/workspaces", json={"name": "Update Workspace"}, headers=headers)).json()["id"]

    csv_data = b"student_id,name,math_score\n1,Alice,85\n2,Bob,70\n"
    file_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("grades.csv", csv_data, "text/csv")},
        headers=headers,
    )
    file_id = file_res.json()["id"]

    token_res = await client.post(
        f"/workspaces/{ws_id}/mcp-credentials",
        json={"name": "Update Token"},
        headers=headers,
    )
    raw_mcp_token = token_res.json()["raw_token"]
    mcp_headers = {"Authorization": f"Bearer {raw_mcp_token}"}

    # Generate update form for Bob
    mcp_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "generate_data_entry_form",
            "arguments": {
                "resource_id": file_id,
                "action": "update",
                "filters": {"student_id": 2},
                "target_identifier": "Student 2 (Bob)",
            },
        },
    }
    mcp_res = await client.post("/mcp", json=mcp_req, headers=mcp_headers)
    assert mcp_res.status_code == 200
    session_token = mcp_res.json()["result"]["metadata"]["session_token"]

    # Retrieve form schema and verify prefilled values
    session_res = await client.get(f"/forms/session?token={session_token}")
    assert session_res.status_code == 200
    form_info = session_res.json()
    assert form_info["prefilled_values"]["name"] == "Bob"
    assert str(form_info["prefilled_values"]["math_score"]) == "70"

    # Submit updated score
    sub_res = await client.post("/forms/submit", json={
        "session_token": session_token,
        "values": {
            "student_id": "2",
            "name": "Bob",
            "math_score": "99",
        },
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["record"]["math_score"] == "99"


@pytest.mark.asyncio
async def test_form_security_tampered_token(client: AsyncClient):
    """
    Confirms that forged or invalid tokens fail with 401 Unauthorized.
    """
    res = await client.get("/forms/session?token=invalid.tampered.token")
    assert res.status_code == 401
    assert "Invalid or tampered" in res.json()["detail"]
