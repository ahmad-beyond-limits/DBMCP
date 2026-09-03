import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_file_download_and_raw_stream(client: AsyncClient, db_session: AsyncSession):
    """
    Verify:
    1. Uploaded file can be downloaded via GET /workspaces/{ws_id}/files/{file_id}/download
    2. Correct Content-Disposition attachment header is provided
    3. Raw inline stream via GET /workspaces/{ws_id}/files/{file_id}/raw works
    4. Unauthorized user / cross-workspace cannot download
    """
    # 1. Register user and create workspace
    reg = await client.post("/auth/register", json={"username": "downloader_user", "password": "password123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    ws_res = await client.post("/workspaces", json={"name": "Download Test WS"}, headers=headers)
    ws_id = ws_res.json()["id"]

    # 2. Upload sample CSV file
    file_bytes = b"id,name,role\n1,Alex,Admin\n2,Taylor,Analyst\n"
    upload_res = await client.post(
        f"/workspaces/{ws_id}/files",
        files={"file": ("team.csv", file_bytes, "text/csv")},
        headers=headers,
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    # 3. Test direct file download
    dl_res = await client.get(f"/workspaces/{ws_id}/files/{file_id}/download", headers=headers)
    assert dl_res.status_code == 200
    assert dl_res.content == file_bytes
    assert "attachment" in dl_res.headers.get("content-disposition", "").lower()
    assert "team.csv" in dl_res.headers.get("content-disposition", "")

    # 4. Test raw streaming
    raw_res = await client.get(f"/workspaces/{ws_id}/files/{file_id}/raw", headers=headers)
    assert raw_res.status_code == 200
    assert raw_res.content == file_bytes
    assert "inline" in raw_res.headers.get("content-disposition", "").lower()

    # 5. Test cross-workspace isolation (another user cannot download)
    reg2 = await client.post("/auth/register", json={"username": "other_user", "password": "password123"})
    headers2 = {"Authorization": f"Bearer {reg2.json()['access_token']}"}
    unauthorized_dl = await client.get(f"/workspaces/{ws_id}/files/{file_id}/download", headers=headers2)
    assert unauthorized_dl.status_code in (403, 404)
