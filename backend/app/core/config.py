import os
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # Application
    APP_ENV: str = Field(default="development", description="Environment (development, staging, production)")
    APP_NAME: str = Field(default="Policy Enforced AI Workspace", description="Human-readable application name")
    APP_URL: str = Field(default="http://localhost:3000", description="Frontend base URL")
    API_URL: str = Field(default="http://localhost:8000", description="Backend API base URL")
    FRONTEND_URL: str = Field(default="http://localhost:3000", description="Frontend origin for CORS")

    # Backend Security
    SECRET_KEY: str = Field(default="dev-insecure-secret-key-32bytes-min-required", description="Primary secret key")
    JWT_SECRET_KEY: str = Field(default="dev-insecure-jwt-key-32bytes-min-required", description="Key used to sign JWTs")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, description="Access token expiration in minutes")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, description="Refresh token expiration in days")

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./workspace.db",
        description="Async connection URL for PostgreSQL (e.g. Supabase) or local SQLite",
    )

    # Supabase
    SUPABASE_URL: Optional[str] = Field(default=None, description="Supabase project URL")
    SUPABASE_ANON_KEY: Optional[str] = Field(default=None, description="Supabase client anon key")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(default=None, description="Supabase server service role key")
    SUPABASE_STORAGE_BUCKET: str = Field(default="workspace-files", description="Bucket name for storage")

    # Workspace & MCP Security
    WORKSPACE_HASH_SECRET: str = Field(
        default="dev-workspace-hash-secret-32bytes-min",
        description="Secret used for workspace salting & deterministic pseudonymisation",
    )
    MCP_TOKEN_SECRET: str = Field(
        default="dev-mcp-token-secret-32bytes-min",
        description="Secret key used for HMAC hashing of MCP tokens",
    )
    MCP_TOKEN_EXPIRE_DAYS: int = Field(default=30, description="Default token lifetime in days")
    MCP_SESSION_SECRET: str = Field(
        default="dev-mcp-session-secret-32bytes-min",
        description="Secret used for MCP session tokens",
    )

    # Encryption
    DATA_ENCRYPTION_KEY: Optional[str] = Field(
        default="dGhpcy1pcy1hLXRlc3QtZW5jcnlwdGlvbi1rZXktMzJieXRlcw==",
        description="Base64 32-byte key for resting data encryption",
    )

    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level (DEBUG, INFO, WARN, ERROR)")

    # File Limits
    MAX_UPLOAD_SIZE_MB: int = Field(default=50, description="Max upload size in MB")
    MAX_FILES_PER_WORKSPACE: int = Field(default=100, description="Max files allowed per workspace")

    # CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,https://poais-mcp.vercel.app,https://dbmcp.onrender.com",
        description="Comma-separated allowed origins",
    )

    # Server Port
    PORT: int = Field(default=8000, description="Server port")

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        # If user provides a standard postgres:// or postgresql:// URL, convert to async driver
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    def validate_production_safety(self) -> None:
        """Fail safely if required secrets are using default development values in production."""
        if self.APP_ENV.lower() == "production":
            insecure_markers = ["dev-insecure", "change-this", "your-"]
            for key in ["SECRET_KEY", "JWT_SECRET_KEY", "WORKSPACE_HASH_SECRET", "MCP_TOKEN_SECRET"]:
                val = getattr(self, key, "")
                if any(marker in val for marker in insecure_markers) or len(val) < 24:
                    raise ValueError(
                        f"CRITICAL SECURITY CONFIGURATION ERROR: {key} is insecure or too short for production environment."
                    )


settings = Settings()
if settings.APP_ENV.lower() == "production":
    settings.validate_production_safety()
