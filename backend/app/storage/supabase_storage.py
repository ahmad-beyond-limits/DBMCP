import logging
from typing import Optional
from app.core.config import settings
from app.storage.base import StorageBackend
from app.storage.local_storage import LocalStorage

logger = logging.getLogger(__name__)


class SupabaseStorage(StorageBackend):
    """Supabase Storage client using server-side service role key."""

    def __init__(self, url: str, key: str, bucket: str):
        from supabase import create_client, Client
        self.client: Client = create_client(url, key)
        self.bucket = bucket

    async def upload(self, path: str, content: bytes, content_type: str) -> str:
        clean_path = path.lstrip("/\\")
        # supabase storage upload
        res = self.client.storage.from_(self.bucket).upload(
            path=clean_path,
            file=content,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return clean_path

    async def download(self, path: str) -> bytes:
        clean_path = path.lstrip("/\\")
        res = self.client.storage.from_(self.bucket).download(clean_path)
        return res

    async def delete(self, path: str) -> bool:
        clean_path = path.lstrip("/\\")
        try:
            self.client.storage.from_(self.bucket).remove([clean_path])
            return True
        except Exception as e:
            logger.error(f"Error deleting file from Supabase storage: {e}")
            return False


def get_storage_backend() -> StorageBackend:
    """Returns SupabaseStorage if credentials configured, otherwise LocalStorage fallback."""
    if (
        settings.SUPABASE_URL
        and settings.SUPABASE_SERVICE_ROLE_KEY
        and not settings.SUPABASE_URL.startswith("https://your-project")
    ):
        try:
            return SupabaseStorage(
                url=settings.SUPABASE_URL,
                key=settings.SUPABASE_SERVICE_ROLE_KEY,
                bucket=settings.SUPABASE_STORAGE_BUCKET,
            )
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase storage client, falling back to local: {e}")
            return LocalStorage()
    return LocalStorage()
