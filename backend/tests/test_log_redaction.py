import io
import logging
import pytest

from app.core.logging_redactor import (
    redact_sensitive_text,
    SensitiveDataFilter,
    SensitiveDataFormatter,
)


def test_redact_mcp_token():
    raw = "User connected with mcp_live_wsp_12345678_abcdef0123456789abcdef"
    sanitized = redact_sensitive_text(raw)
    assert "abcdef0123456789" not in sanitized
    assert "mcp_live_[REDACTED]" in sanitized


def test_redact_jwt_and_bearer_token():
    raw_jwt = "Token is eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    sanitized = redact_sensitive_text(raw_jwt)
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in sanitized
    assert "[REDACTED_JWT_TOKEN]" in sanitized

    raw_bearer = "Authorization: Bearer secret_bearer_token_xyz_12345"
    sanitized_bearer = redact_sensitive_text(raw_bearer)
    assert "secret_bearer_token_xyz_12345" not in sanitized_bearer


def test_redact_database_url_passwords():
    raw_db = "Connecting to postgresql+asyncpg://postgres:SuperSecretSupabasePass123!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    sanitized = redact_sensitive_text(raw_db)
    assert "SuperSecretSupabasePass123!" not in sanitized
    assert "[REDACTED_DB_PASSWORD]" in sanitized


def test_redact_json_passwords_and_secrets():
    payload = '{"username": "admin", "password": "SecretPassword999", "refresh_token": "some_token_value_abc"}'
    sanitized = redact_sensitive_text(payload)
    assert "SecretPassword999" not in sanitized
    assert "some_token_value_abc" not in sanitized
    assert '"password": "[REDACTED]"' in sanitized
    assert '"refresh_token": "[REDACTED]"' in sanitized


def test_redact_api_keys_and_query_parameters():
    raw_url = "GET /api/data?token=mcp_live_9999_secrettoken&api_key=sk-1234567890abcdef12345678"
    sanitized = redact_sensitive_text(raw_url)
    assert "mcp_live_9999_secrettoken" not in sanitized
    assert "sk-1234567890abcdef12345678" not in sanitized


def test_logging_filter_and_formatter_integration():
    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    handler.setFormatter(SensitiveDataFormatter("%(message)s"))
    handler.addFilter(SensitiveDataFilter())

    test_logger = logging.getLogger("test_security_redactor")
    test_logger.handlers = [handler]
    test_logger.setLevel(logging.INFO)
    test_logger.propagate = False

    test_logger.info("Attempted login with password: 'UnsafePassword123' and token: mcp_live_ws_secret987")
    output = log_stream.getvalue()

    assert "UnsafePassword123" not in output
    assert "mcp_live_ws_secret987" not in output
    assert "[REDACTED]" in output
