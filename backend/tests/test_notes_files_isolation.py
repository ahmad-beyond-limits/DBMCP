import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_workspace_files_count_excludes_note_attachments(client: AsyncClient):
    """
    Ensure note attachments do not inflate workspace files_count,
    and are excluded from standard workspace file listings.
    """
    # 1. Register user and create workspace
    res = await client.post("/auth/register", json={"username": "notetest_user", "password": "password123"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    ws_res = await client.post("/workspaces", json={"name": "Research Workspace"}, headers=headers)
    ws_id = ws_res.json()["id"]

    # 2. Upload 1 standalone workspace file
    file_payload = {"file": ("dataset.csv", b"id,name\n1,Alice\n2,Bob", "text/csv")}
    upload_res = await client.post(f"/workspaces/{ws_id}/files", files=file_payload, headers=headers)
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    # 3. Create a note in the workspace referencing the file
    note_payload = {
        "title": "Quarterly Summary",
        "content": "Please review @dataset.csv for findings.",
        "referenced_file_ids": [file_id],
    }
    note_res = await client.post(f"/workspaces/{ws_id}/notes", json=note_payload, headers=headers)
    assert note_res.status_code == 201
    note_id = note_res.json()["id"]
    note_data = note_res.json()
    assert file_id in note_data["referenced_file_ids"]

    # 4. Upload an attached image directly to the note
    attachment_payload = {"file": ("screenshot.png", b"\x89PNG\r\n\x1a\nfakeimage", "image/png")}
    attach_res = await client.post(f"/workspaces/{ws_id}/notes/{note_id}/files", files=attachment_payload, headers=headers)
    assert attach_res.status_code == 201

    # 5. Check workspace details and counts
    ws_detail = await client.get(f"/workspaces/{ws_id}", headers=headers)
    assert ws_detail.status_code == 200
    ws_counts = ws_detail.json()
    assert ws_counts["files_count"] == 1  # ONLY the standalone dataset.csv, NOT the screenshot.png!
    assert ws_counts["notes_count"] == 1

    # 6. Verify default workspace files listing only has standalone files
    ws_files_res = await client.get(f"/workspaces/{ws_id}/files", headers=headers)
    assert ws_files_res.status_code == 200
    ws_files = ws_files_res.json()
    assert len(ws_files) == 1
    assert ws_files[0]["original_filename"] == "dataset.csv"

    # 7. Verify listing note files returns the attachment
    note_files_res = await client.get(f"/workspaces/{ws_id}/notes/{note_id}/files", headers=headers)
    assert note_files_res.status_code == 200
    note_files = note_files_res.json()
    assert len(note_files) == 1
    assert note_files[0]["original_filename"] == "screenshot.png"
