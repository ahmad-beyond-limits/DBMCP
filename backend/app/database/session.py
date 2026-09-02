import logging
import os
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.core.config import settings

logger = logging.getLogger(__name__)

# Engine configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif "postgresql" in settings.DATABASE_URL:
    connect_args = {"statement_cache_size": 0}

engine_kwargs = {
    "echo": settings.LOG_LEVEL.upper() == "DEBUG",
    "future": True,
    "connect_args": connect_args,
    "pool_pre_ping": True,
}
if "postgresql" in settings.DATABASE_URL:
    engine_kwargs.update({
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20,
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an asynchronous database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables and run automatic safe schema migrations."""
    async with engine.begin() as conn:
        # Import models so Base has all metadata registered
        from app.database import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)

        # Automatic schema migration: ensure `permissions` column exists on `mcp_credentials`
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE mcp_credentials ADD COLUMN IF NOT EXISTS permissions JSON DEFAULT '{}'::json")
                )
                logger.info("Executed schema migration: ensure mcp_credentials.permissions column exists.")
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(
                        text("ALTER TABLE mcp_credentials ADD COLUMN permissions JSON DEFAULT '{}'")
                    )
                except Exception:
                    # In SQLite, duplicate column error is expected if column already exists
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning: {e}")

        # Automatic schema migration: ensure `description` column exists on `workspaces`
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS description VARCHAR(255)")
                )
                logger.info("Executed schema migration: ensure workspaces.description column exists.")
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(
                        text("ALTER TABLE workspaces ADD COLUMN description VARCHAR(255)")
                    )
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning for workspaces.description: {e}")

        # Automatic schema migration: ensure `is_superuser` and `is_active` columns exist on `users`
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE")
                )
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
                )
                # Ensure the first registered user or users matching 'admin' have superuser status
                await conn.execute(
                    text("UPDATE users SET is_superuser = TRUE WHERE username IN ('admin', 'superuser') OR id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)")
                )
                logger.info("Executed schema migration: ensure users.is_superuser and is_active exist.")
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT 0"))
                except Exception:
                    pass
                try:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                except Exception:
                    pass
                try:
                    await conn.execute(text("UPDATE users SET is_superuser = 1 WHERE username IN ('admin', 'superuser') OR id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)"))
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning for users admin columns: {e}")

        # Automatic schema migration: ensure `scope_type` and `user_id` columns exist on `mcp_credentials`, and workspace_id can be NULL
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE mcp_credentials ADD COLUMN IF NOT EXISTS scope_type VARCHAR(32) DEFAULT 'WORKSPACE'")
                )
                await conn.execute(
                    text("ALTER TABLE mcp_credentials ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)")
                )
                await conn.execute(
                    text("ALTER TABLE mcp_credentials ALTER COLUMN workspace_id DROP NOT NULL")
                )
                await conn.execute(
                    text("ALTER TABLE audit_logs ALTER COLUMN workspace_id DROP NOT NULL")
                )
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(text("ALTER TABLE mcp_credentials ADD COLUMN scope_type VARCHAR(32) DEFAULT 'WORKSPACE'"))
                except Exception:
                    pass
                try:
                    await conn.execute(text("ALTER TABLE mcp_credentials ADD COLUMN user_id VARCHAR(36)"))
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning for mcp_credentials scope columns: {e}")

        # Automatic schema migration: ensure `note_id` column exists on `files`
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE files ADD COLUMN IF NOT EXISTS note_id VARCHAR(36) REFERENCES notes(id) ON DELETE CASCADE")
                )
                logger.info("Executed schema migration: ensure files.note_id column exists.")
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(text("ALTER TABLE files ADD COLUMN note_id VARCHAR(36)"))
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning for files.note_id: {e}")

        # Automatic schema migration: ensure `referenced_file_ids` column exists on `notes`
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS referenced_file_ids JSONB DEFAULT '[]'")
                )
                logger.info("Executed schema migration: ensure notes.referenced_file_ids column exists.")
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(text("ALTER TABLE notes ADD COLUMN referenced_file_ids JSON DEFAULT '[]'"))
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning for notes.referenced_file_ids: {e}")


