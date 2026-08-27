from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Abstract interface for file binary storage."""

    @abstractmethod
    async def upload(self, path: str, content: bytes, content_type: str) -> str:
        """Upload content to storage at path. Returns stored path or identifier."""
        pass

    @abstractmethod
    async def download(self, path: str) -> bytes:
        """Download binary content from storage at path."""
        pass

    @abstractmethod
    async def delete(self, path: str) -> bool:
        """Delete file from storage at path."""
        pass
