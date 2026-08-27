import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.database.models import User


@pytest.mark.asyncio
async def test_password_hashing():
    """Verify password hashing is secure and constant-time verifiable."""
    pwd = "supersecretpassword123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


@pytest.mark.asyncio
async def test_user_registration_success(client: AsyncClient, db_session: AsyncSession):
    """Test standard user registration."""
    resp = await client.post("/auth/register", json={"username": "alice", "password": "password123"})
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data

    # Verify password is not in plaintext in database
    result = await db_session.execute(select(User).where(User.username == "alice"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.password_hash != "password123"
    assert verify_password("password123", user.password_hash)


@pytest.mark.asyncio
async def test_duplicate_username_fails(client: AsyncClient):
    """Test duplicate username is rejected."""
    await client.post("/auth/register", json={"username": "bob", "password": "password123"})
    resp = await client.post("/auth/register", json={"username": "bob", "password": "password456"})
    assert resp.status_code == 400
    assert "already taken" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test login with valid credentials."""
    await client.post("/auth/register", json={"username": "carol", "password": "mypassword"})
    resp = await client.post("/auth/login", json={"username": "carol", "password": "mypassword"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_incorrect_password(client: AsyncClient):
    """Test login with wrong password."""
    await client.post("/auth/register", json={"username": "dave", "password": "correctpassword"})
    resp = await client.post("/auth/login", json={"username": "dave", "password": "wrongpassword"})
    assert resp.status_code == 401
    assert "Invalid username or password" in resp.json()["detail"]
