import time
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import HTTPException, Request, status


class RateLimiterInterface:
    """Abstract interface for rate limiting (supports in-memory MVP and future Redis/distributed)."""

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        raise NotImplementedError


class InMemoryRateLimiter(RateLimiterInterface):
    """
    In-memory sliding window rate limiter.
    Note: In multi-worker or multi-instance deployments (beyond Render single-instance MVP),
    this interface should be backed by a distributed store such as Redis.
    """

    def __init__(self):
        self._history: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        from app.core.config import settings
        if settings.APP_ENV.lower() == "testing":
            return True

        now = time.time()
        window_start = now - window_seconds

        # Clean older records
        records = [t for t in self._history[key] if t > window_start]
        if len(records) >= max_requests:
            self._history[key] = records
            return False

        records.append(now)
        self._history[key] = records
        return True

    def reset(self, key: Optional[str] = None):
        if key:
            self._history.pop(key, None)
        else:
            self._history.clear()


limiter = InMemoryRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extracts client IP honoring Cloudflare and standard reverse proxy headers."""
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


def rate_limit(max_requests: int, window_seconds: int, scope: str = "default"):
    """
    FastAPI dependency for endpoint rate limiting based on client IP / actor key.
    """
    async def dependency(request: Request):
        client_ip = get_client_ip(request)
        key = f"{scope}:{client_ip}"
        if not limiter.is_allowed(key, max_requests, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {scope}. Please retry later.",
                headers={"Retry-After": str(window_seconds)},
            )
        return True

    return dependency
