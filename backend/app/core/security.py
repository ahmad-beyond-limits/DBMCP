import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with standard salt rounds."""
    # Ensure password bytes
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(subject: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    """Create a short-lived signed JWT access token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Create a longer-lived signed JWT refresh token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT signature and expiration."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.PyJWTError:
        return None


def generate_mcp_token() -> Tuple[str, str, str]:
    """
    Generates a cryptographically secure, high-entropy MCP token.
    Returns: (full_raw_token, prefix, secret_hash)
    Format: mcp_live_<random_prefix>_<random_secret>
    The prefix is safe to display (e.g. mcp_live_a1b2c3d4).
    The raw token is displayed ONCE to user and NEVER saved in database.
    Only secret_hash is saved in the database.
    """
    prefix_id = secrets.token_hex(4)  # 8 chars
    secret_part = secrets.token_urlsafe(32)  # high entropy secret
    raw_token = f"mcp_live_{prefix_id}_{secret_part}"
    prefix = f"mcp_live_{prefix_id}"
    secret_hash = hash_mcp_token(raw_token)
    return raw_token, prefix, secret_hash


def hash_mcp_token(token: str) -> str:
    """Hash an MCP token using HMAC-SHA256 with the server-side MCP_TOKEN_SECRET."""
    return hmac.new(
        settings.MCP_TOKEN_SECRET.encode("utf-8"),
        token.strip().encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def verify_mcp_token(raw_token: str, stored_hash: str) -> bool:
    """Verify an MCP token against its stored HMAC hash in constant time."""
    candidate_hash = hash_mcp_token(raw_token)
    return hmac.compare_digest(candidate_hash, stored_hash)
