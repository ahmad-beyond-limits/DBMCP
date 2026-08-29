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

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.LOG_LEVEL.upper() == "DEBUG",
    future=True,
    connect_args=connect_args,
)

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

        # Automatic schema migration: ensure `first_name` and `last_name` columns exist on `users`
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(64)")
                )
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(64)")
                )
                logger.info("Executed schema migration: ensure users.first_name and last_name columns exist.")
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR(64)"))
                except Exception:
                    pass
                try:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR(64)"))
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning for users name columns: {e}")
