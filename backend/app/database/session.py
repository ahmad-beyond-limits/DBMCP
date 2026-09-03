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

        # Automatic schema migration: ensure `audit_logs` column types accommodate long reasons and paths
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE audit_logs ALTER COLUMN reason TYPE TEXT")
                )
                await conn.execute(
                    text("ALTER TABLE audit_logs ALTER COLUMN resource_id TYPE VARCHAR(255)")
                )
                await conn.execute(
                    text("ALTER TABLE audit_logs ALTER COLUMN operation TYPE VARCHAR(128)")
                )
                logger.info("Executed schema migration: ensure audit_logs columns allow expanded sizes.")
        except Exception as e:
            logger.warning(f"Schema migration warning for audit_logs column types: {e}")

        # Schema migration: ensure ai_global_rules table exists with singleton row
        try:
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(text(
                    "CREATE TABLE IF NOT EXISTS ai_global_rules ("
                    "id INTEGER PRIMARY KEY DEFAULT 1, "
                    "rules_text TEXT NOT NULL DEFAULT '', "
                    "updated_by VARCHAR(36), "
                    "updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
                    ")"
                ))
                # Seed singleton row (id=1) if not present
                await conn.execute(text(
                    "INSERT INTO ai_global_rules (id, rules_text) VALUES (1, '') "
                    "ON CONFLICT (id) DO NOTHING"
                ))
                logger.info("Executed schema migration: ensure ai_global_rules singleton exists.")
            elif settings.DATABASE_URL.startswith("sqlite"):
                try:
                    await conn.execute(text(
                        "CREATE TABLE IF NOT EXISTS ai_global_rules ("
                        "id INTEGER PRIMARY KEY DEFAULT 1, "
                        "rules_text TEXT NOT NULL DEFAULT '', "
                        "updated_by VARCHAR(36), "
                        "updated_at DATETIME"
                        ")"
                    ))
                    await conn.execute(text(
                        "INSERT OR IGNORE INTO ai_global_rules (id, rules_text) VALUES (1, '')"
                    ))
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Schema migration warning for ai_global_rules: {e}")

    # Seed starter AI Guidance Playbooks if table is empty
    async with AsyncSessionLocal() as session:

        try:
            from app.database.models import AIGuidancePlaybook
            from sqlalchemy import select, func

            count = (await session.execute(select(func.count(AIGuidancePlaybook.id)))).scalar_one() or 0
            if count == 0:
                starter_playbooks = [
                    AIGuidancePlaybook(
                        title="Analytical Data Synthesis & Metric Calculation",
                        category="analysis",
                        trigger_condition="Activate when the user asks for deep quantitative analysis, data synthesis, KPI calculations, statistical summaries, or comparative trends.",
                        summary="Analytical rigor protocol requiring step-by-step verification, explicit formula disclosure, and zero metric hallucination.",
                        prompt_template=(
                            "You are serving as a Senior Quantitative Analyst. When analyzing datasets, adhere strictly to mathematical "
                            "precision and verifiable data sources. State your analytical methodology, declare data assumptions explicitly, "
                            "and break down complex aggregations into legible, step-by-step calculations. Never guess or hallucinate metrics."
                        ),
                        strict_rules=[
                            "Always cite the exact dataset resource ID and row numbers used for metric calculation.",
                            "Never estimate, round without disclosure, or extrapolate numbers beyond the raw data.",
                            "If data is missing or incomplete, explicitly state the omission rather than imputing values.",
                            "Provide confidence boundaries and state any sample size limitations."
                        ],
                        style_guide=(
                            "Use markdown tables for comparisons. Format figures clearly with appropriate currency or unit symbols. "
                            "Include an Executive Summary at the top followed by Deep Dive analysis and Actionable Insights."
                        ),
                        tags=["analysis", "metrics", "quantitative", "strict"],
                        is_active=True,
                    ),
                    AIGuidancePlaybook(
                        title="Strategic Business & Advisory Protocol",
                        category="advisory",
                        trigger_condition="Activate when the user asks for strategic business advice, investment decisions, operational recommendations, or risk evaluations.",
                        summary="Multi-perspective advisory framework requiring risk-benefit trade-offs, scenario modeling, and factual substantiation.",
                        prompt_template=(
                            "You are acting as an Executive Strategic Advisor. Your role is to deliver high-impact, grounded counsel "
                            "tailored to the organization's goals. Evaluate problems through multiple strategic lenses, weigh operational "
                            "feasibility, and provide balanced recommendations backed by documented workspace evidence."
                        ),
                        strict_rules=[
                            "Never provide unconditional guarantees or absolute claims regarding future market outcomes.",
                            "Always present at least two alternative scenarios (e.g. conservative vs. growth-oriented).",
                            "Mandatorily include a Risk & Assumption Disclosure section.",
                            "Ground all recommendations in verified workspace documents, notes, or audited records."
                        ],
                        style_guide=(
                            "Professional executive advisory tone. Structure response with: 1. Situation Assessment, "
                            "2. Strategic Options, 3. Trade-off Matrix, 4. Recommended Path, and 5. Risk & Assumption Disclosures."
                        ),
                        tags=["advisory", "strategy", "executive", "recommendation"],
                        is_active=True,
                    ),
                    AIGuidancePlaybook(
                        title="Fact Verification & Zero-Hallucination Protocol",
                        category="compliance",
                        trigger_condition="Activate when the user requests factual verification, policy interpretation, compliance checks, or auditing of workspace information.",
                        summary="Strict verification rules ensuring statements are backed by exact quotes or data citations without speculation.",
                        prompt_template=(
                            "You are acting as a Compliance & Truth Verification Officer. Every assertion you make must be directly backed "
                            "by existing workspace documents or immutable policies. If information is absent or ambiguous, clearly state that "
                            "it cannot be verified from available records."
                        ),
                        strict_rules=[
                            "Every asserted claim must be linked to an explicit source document or policy rule.",
                            "If a requested fact cannot be found in workspace resources, explicitly answer 'Not found in available records' — never speculate.",
                            "Do not override or reinterpret explicit policy definitions or privacy redactions."
                        ],
                        style_guide="Direct, neutral, audit-grade language. Use bulleted verification points with source references and verbatim citations.",
                        tags=["compliance", "verification", "audit", "strict"],
                        is_active=True,
                    ),
                ]
                session.add_all(starter_playbooks)
                await session.commit()
                logger.info("Seeded default AI Guidance Playbooks successfully.")
        except Exception as seed_err:
            logger.warning(f"Could not seed AI Guidance Playbooks: {seed_err}")



