from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
)
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database.models import FileRecord, User, Workspace
from app.database.session import get_db
from app.storage.supabase_storage import get_storage_backend
from app.workspaces.service import WorkspaceService

router = APIRouter(prefix="/auth", tags=["Authentication"])
security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to retrieve the authenticated user from JWT access token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identity",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended. Please contact platform administrator.",
        )

    return user


async def get_current_admin_user(user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure the authenticated user has superadmin privileges."""
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative access required.",
        )
    return user


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60, scope="register"))],
)
async def register(data: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with unique username and hashed password."""
    # Check if username already exists
    existing = await db.execute(select(User).where(User.username == data.username.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    hashed_pwd = hash_password(data.password)
    new_user = User(
        username=data.username.strip(),
        first_name=data.first_name.strip() if data.first_name else None,
        last_name=data.last_name.strip() if data.last_name else None,
        password_hash=hashed_pwd,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Provision default Notes workspace
    await WorkspaceService.ensure_user_default_workspace(db, new_user.id)

    access_token = create_access_token(new_user.id, {"username": new_user.username})
    refresh_token = create_refresh_token(new_user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(max_requests=15, window_seconds=60, scope="login"))],
)
async def login(data: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user with username and password."""
    result = await db.execute(select(User).where(User.username == data.username.strip()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended. Please contact platform administrator.",
        )

    # Ensure default Notes workspace is provisioned
    await WorkspaceService.ensure_user_default_workspace(db, user.id)

    access_token = create_access_token(user.id, {"username": user.username})
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_access_token = create_access_token(user.id, {"username": user.username})
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return user


@router.patch("/me", response_model=UserResponse)
@router.put("/me", response_model=UserResponse)
@router.post("/me", response_model=UserResponse)
async def update_current_user_profile(
    data: UserUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's first and last name."""
    if data.first_name is not None:
        user.first_name = data.first_name.strip() if data.first_name.strip() else None
    if data.last_name is not None:
        user.last_name = data.last_name.strip() if data.last_name.strip() else None

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the authenticated user's password."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long",
        )

    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"status": "success", "message": "Password changed successfully."}


@router.delete("/me")
@router.post("/delete-account")
async def delete_user_account(
    data: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete user account and wipe all owned workspaces, storage files, credentials, and policies."""
    # Verify password before destructive wipe
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Account deletion aborted.",
        )

    # 1. Find all workspaces owned by this user
    ws_result = await db.execute(select(Workspace).where(Workspace.owner_id == user.id))
    owned_workspaces = ws_result.scalars().all()
    ws_ids = [ws.id for ws in owned_workspaces]

    # 2. Purge physical stored files associated with all owned workspaces
    if ws_ids:
        files_result = await db.execute(select(FileRecord).where(FileRecord.workspace_id.in_(ws_ids)))
        files = files_result.scalars().all()
        storage = get_storage_backend()
        for f in files:
            try:
                if f.storage_path:
                    await storage.delete(f.storage_path)
            except Exception:
                pass

    # 3. Delete user record (Database cascades delete to all workspaces, memberships, files, policies, credentials, logs)
    await db.delete(user)
    await db.commit()

    return {
        "status": "success",
        "message": "User account and all associated workspaces, documents, tokens, and data have been permanently wiped.",
    }
