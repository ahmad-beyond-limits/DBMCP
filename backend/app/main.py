import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin.router import router as admin_router
from app.audit.router import router as audit_router
from app.auth.router import router as auth_router
from app.core.config import settings
from app.database.session import init_db
from app.mcp.router import router as mcp_router
from app.policies.router import router as policies_router
from app.resources.router import router as resources_router
from app.workspaces.router import router as workspaces_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables safely
    logger.info("Initializing database schema...")
    await init_db()
    logger.info(f"DBMCP Policy Enforced AI Gateway running in [{settings.APP_ENV}] mode.")
    yield
    # Shutdown
    logger.info("Shutting down gateway...")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Production-quality Policy-Enforced AI Data Workspace with MCP access protocol.",
    lifespan=lifespan,
)

# Configure CORS to accept requests from localhost, Vercel deployments, and production URLs
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(workspaces_router)
app.include_router(resources_router)
app.include_router(policies_router)
app.include_router(mcp_router)
app.include_router(audit_router)


@app.get("/")
async def root():
    """Root endpoint for status probes."""
    return {
        "status": "healthy",
        "service": "DBMCP Policy Enforced AI Gateway",
        "version": "1.0.0",
        "protocol": "MCP 2024-11-05",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Render and container probes."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "protocol": "MCP 2024-11-05",
    }
