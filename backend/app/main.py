import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.middleware.cors import CORSMiddleware

from app.account_mcp.router import router as account_mcp_router
from app.admin.router import router as admin_router
from app.audit.router import router as audit_router
from app.auth.router import router as auth_router
from app.core.config import settings
from app.database.session import init_db
from app.mcp.router import router as mcp_router
from app.notes.router import router as notes_router
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


POAIS_ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">
  <defs>
    <linearGradient id="poaisGradPrimary" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="45%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="poaisGradSecondary" x1="34" y1="2" x2="2" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#06B6D4" />
      <stop offset="50%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
    <linearGradient id="poaisGlassFill" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(99, 102, 241, 0.25)" />
      <stop offset="100%" stop-color="rgba(6, 182, 212, 0.18)" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="32" height="32" rx="9" fill="#1E2022" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />
  <rect x="2" y="2" width="32" height="32" rx="9" fill="url(#poaisGlassFill)" />
  <path
    d="M18 6.5L27.5 11V18.2C27.5 24 23.5 28.5 18 30.5C12.5 28.5 8.5 24 8.5 18.2V11L18 6.5Z"
    stroke="url(#poaisGradPrimary)"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <ellipse cx="18" cy="18" rx="11" ry="4.5" transform="rotate(-32 18 18)" stroke="url(#poaisGradSecondary)" stroke-width="1.8" stroke-linecap="round" />
  <ellipse cx="18" cy="18" rx="11" ry="4.5" transform="rotate(32 18 18)" stroke="url(#poaisGradPrimary)" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="18 4" />
  <circle cx="18" cy="18" r="3.2" fill="url(#poaisGradPrimary)" />
  <circle cx="18" cy="18" r="1.4" fill="#FFFFFF" />
</svg>"""


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Production-quality Policy-Enforced AI Data Workspace with MCP access protocol.",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
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
app.include_router(account_mcp_router)
app.include_router(admin_router)
app.include_router(workspaces_router)
app.include_router(notes_router)
app.include_router(resources_router)
app.include_router(policies_router)
app.include_router(mcp_router)
app.include_router(audit_router)


@app.get("/icon.svg", include_in_schema=False)
@app.get("/favicon.ico", include_in_schema=False)
async def get_favicon():
    """Returns the official POAIS brand vector icon."""
    return Response(
        content=POAIS_ICON_SVG,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400"}
    )


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI with POAIS brand icon and styling."""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=f"{app.title} - OpenAPI Docs",
        swagger_favicon_url="/icon.svg",
    )


@app.get("/redoc", include_in_schema=False)
async def custom_redoc_html():
    """Custom ReDoc UI with POAIS brand icon."""
    return get_redoc_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=f"{app.title} - ReDoc",
        redoc_favicon_url="/icon.svg",
    )


@app.get("/")
async def root():
    """Root endpoint for status probes."""
    return {
        "status": "healthy",
        "service": "DBMCP Policy Enforced AI Gateway",
        "version": "1.0.0",
        "protocol": "MCP 2024-11-05",
        "icon": "/icon.svg",
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
