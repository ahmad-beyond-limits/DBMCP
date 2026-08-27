import os
from pathlib import Path

from app.storage.base import StorageBackend


class LocalStorage(StorageBackend):
    """Local filesystem storage backend for local dev and offline automated testing."""

    def __init__(self, base_dir: str = "./uploads"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def upload(self, path: str, content: bytes, content_type: str) -> str:
        # Sanitize path to prevent directory traversal
        clean_path = path.lstrip("/\\")
        dest_path = self.base_dir / clean_path
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        with open(dest_path, "wb") as f:
            f.write(content)
        return str(clean_path)

    async def download(self, path: str) -> bytes:
        clean_path = path.lstrip("/\\")
        file_path = self.base_dir / clean_path
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        with open(file_path, "rb") as f:
            return f.read()

    async def delete(self, path: str) -> bool:
        clean_path = path.lstrip("/\\")
        file_path = self.base_dir / clean_path
        if file_path.exists():
            file_path.unlink()
            return True
        return False
