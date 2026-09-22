import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import FileRecord, User, Workspace, WorkspaceMember
from app.workspaces.service import WorkspaceService


@pytest.mark.asyncio
async def test_student_workspace_precreated_on_registration(client: AsyncClient, db_session: AsyncSession):
    """
    Verifies that whenever a user creates an account:
    1. A 'Student' workspace is pre-created automatically with OWNER role.
    2. A starter 'students.csv' file is seeded and query-ready in the workspace.
    3. The default 'Notes' workspace is also provisioned.
    4. GET /workspaces returns both default workspaces for the new user.
    """
    # 1. Register a new user
    reg_resp = await client.post(
        "/auth/register",
        json={"username": "new_student_user", "password": "Password123!"},
    )
    assert reg_resp.status_code == 201
    user_token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    # 2. Query user from DB
    user = (await db_session.execute(select(User).where(User.username == "new_student_user"))).scalar_one()
    assert user is not None

    # 3. Check that 'Student' workspace exists in DB for this user
    student_ws = (
        await db_session.execute(
            select(Workspace).where(Workspace.owner_id == user.id, Workspace.name == "Student")
        )
    ).scalar_one_or_none()
    assert student_ws is not None
    assert student_ws.name == "Student"
    assert "Student records" in student_ws.description

    # Verify user is owner in WorkspaceMember
    membership = (
        await db_session.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == student_ws.id,
                WorkspaceMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    assert membership is not None
    assert membership.role == "OWNER"

    # 4. Verify starter students.csv was seeded into the Student workspace
    seeded_file = (
        await db_session.execute(
            select(FileRecord).where(
                FileRecord.workspace_id == student_ws.id,
                FileRecord.original_filename == "students.csv",
            )
        )
    ).scalar_one_or_none()
    assert seeded_file is not None
    assert seeded_file.file_type == "CSV"
    assert seeded_file.status == "READY"

    # 5. Verify GET /workspaces returns both Notes and Student
    list_resp = await client.get("/workspaces", headers=headers)
    assert list_resp.status_code == 200
    workspaces = list_resp.json()
    ws_names = [w["name"] for w in workspaces]
    assert "Student" in ws_names
    assert "Notes" in ws_names

    # Check that Student workspace reports the seeded file
    student_ws_item = next(w for w in workspaces if w["name"] == "Student")
    assert student_ws_item["files_count"] >= 1


@pytest.mark.asyncio
async def test_ensure_user_student_workspace_idempotent(db_session: AsyncSession):
    """
    Verifies that calling ensure_user_student_workspace multiple times
    is idempotent and does not create duplicate workspaces or files.
    """
    user = User(username="idempotent_student_tester", password_hash="hash")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # First call creates workspace
    ws1 = await WorkspaceService.ensure_user_student_workspace(db_session, user.id)
    assert ws1.name == "Student"

    # Second call returns existing workspace without error
    ws2 = await WorkspaceService.ensure_user_student_workspace(db_session, user.id)
    assert ws1.id == ws2.id

    # Verify only 1 Student workspace exists in DB
    stmt = select(Workspace).where(Workspace.owner_id == user.id, Workspace.name == "Student")
    all_student_ws = (await db_session.execute(stmt)).scalars().all()
    assert len(all_student_ws) == 1
