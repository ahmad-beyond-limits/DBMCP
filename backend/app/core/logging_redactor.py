import logging
import re
from typing import Any, Dict, Pattern, List, Tuple

# Comprehensive regex patterns for sensitive tokens, credentials, and secrets
SENSITIVE_PATTERNS: List[Tuple[Pattern, str]] = [
    # 1. MCP tokens (e.g. mcp_live_abc123_xyz789 or mcp_live_acc_123_456)
    (re.compile(r"mcp_live_[a-zA-Z0-9_-]+", re.IGNORECASE), "mcp_live_[REDACTED]"),
    
    # 2. JWT / Bearer tokens (Header.Payload.Signature)
    (re.compile(r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+"), "[REDACTED_JWT_TOKEN]"),
    (re.compile(r"(Bearer\s+)[a-zA-Z0-9._\-~+/=]+", re.IGNORECASE), r"\1[REDACTED_BEARER_TOKEN]"),
    
    # 3. Database connection URLs with passwords (e.g., postgresql+asyncpg://user:password@host/db)
    (re.compile(r"((?:postgres(?:ql)?(?:\+asyncpg)?|mysql|sqlite|redis|mongodb)://[^:]+:)([^@/]+)(@)", re.IGNORECASE), r"\1[REDACTED_DB_PASSWORD]\3"),
    
    # 4. JSON / Dict fields for passwords, secrets, tokens, api keys
    (re.compile(r'("?(?:password|password_hash|secret|access_token|refresh_token|raw_token|api_key|secret_key|private_key|client_secret)"?\s*[:=]\s*)"(?:[^"\\]|\\.)*"', re.IGNORECASE), r'\1"[REDACTED]"'),
    (re.compile(r"('?(?:password|password_hash|secret|access_token|refresh_token|raw_token|api_key|secret_key|private_key|client_secret)'?\s*[:=]\s*)'(?:[^'\\]|\\.)*'", re.IGNORECASE), r"\1'[REDACTED]'"),
    
    # 5. Generic API keys (e.g., sk-..., key-..., sb_...)
    (re.compile(r"\b(sk-[a-zA-Z0-9]{20,})\b", re.IGNORECASE), "sk-[REDACTED_KEY]"),
    (re.compile(r"\b(sbp_[a-zA-Z0-9]{20,})\b", re.IGNORECASE), "sbp_[REDACTED_KEY]"),
    
    # 6. HTTP Authorization and Cookie headers in logs
    (re.compile(r"(Authorization\s*:\s*)[^\r\n,]+", re.IGNORECASE), r"\1[REDACTED_AUTH_HEADER]"),
    (re.compile(r"(Cookie\s*:\s*)[^\r\n]+", re.IGNORECASE), r"\1[REDACTED_COOKIE_HEADER]"),
    (re.compile(r"(X-API-Key\s*:\s*)[^\r\n,]+", re.IGNORECASE), r"\1[REDACTED_API_KEY]"),
    
    # 7. URL query string parameters (e.g., ?token=... or &api_key=...)
    (re.compile(r"([?&](?:token|access_token|refresh_token|key|api_key|secret|password)=)[^&\s]+", re.IGNORECASE), r"\1[REDACTED]"),
]


def redact_sensitive_text(text: str) -> str:
    """Sanitizes text by replacing all known sensitive tokens and credentials with redacted placeholders."""
    if not isinstance(text, str) or not text:
        return text
    
    sanitized = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)
    return sanitized


class SensitiveDataFilter(logging.Filter):
    """
    Logging Filter that intercepts and redacts sensitive tokens, credentials,
    passwords, and authorization headers from all LogRecord messages and arguments.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_text(record.msg)
            
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: redact_sensitive_text(v) if isinstance(v, str) else v for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(redact_sensitive_text(arg) if isinstance(arg, str) else arg for arg in record.args)
            elif isinstance(record.args, list):
                record.args = [redact_sensitive_text(arg) if isinstance(arg, str) else arg for arg in record.args]
                
        return True


class SensitiveDataFormatter(logging.Formatter):
    """
    Custom Formatter that applies redaction to the fully formatted log record,
    including exception traces and stack frames.
    """
    def format(self, record: logging.LogRecord) -> str:
        formatted = super().format(record)
        return redact_sensitive_text(formatted)


def setup_secure_logging(log_level: str = "INFO"):
    """
    Configures secure logging platform-wide. Attaches redaction filters and formatters
    to root loggers and framework loggers (Uvicorn, FastAPI, SQLAlchemy).
    """
    level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    redacting_filter = SensitiveDataFilter()
    redacting_formatter = SensitiveDataFormatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    # Apply to existing root handlers or create a default StreamHandler
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(redacting_formatter)
        handler.addFilter(redacting_filter)
        root_logger.addHandler(handler)
    else:
        for handler in root_logger.handlers:
            handler.setFormatter(redacting_formatter)
            handler.addFilter(redacting_filter)

    # Attach to specific framework loggers
    framework_loggers = [
        "uvicorn",
        "uvicorn.access",
        "uvicorn.error",
        "fastapi",
        "sqlalchemy.engine",
        "app",
    ]
    for logger_name in framework_loggers:
        l = logging.getLogger(logger_name)
        l.addFilter(redacting_filter)
        for h in l.handlers:
            h.setFormatter(redacting_formatter)
            h.addFilter(redacting_filter)
