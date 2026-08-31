import io
import logging
import os
import re
import urllib.parse
from typing import Optional, Tuple
import httpx
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)

MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".docx",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "application/json": ".json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-excel": ".xlsx",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
}


class CloudLinkImporter:
    @staticmethod
    def detect_provider(url: str) -> str:
        """Detect the cloud hosting provider from URL pattern."""
        u = url.lower()
        if "drive.google.com" in u:
            return "google_drive"
        if "docs.google.com/document" in u:
            return "google_docs"
        if "docs.google.com/spreadsheets" in u:
            return "google_sheets"
        if "docs.google.com/presentation" in u:
            return "google_slides"
        if "dropbox.com" in u or "dl.dropboxusercontent.com" in u:
            return "dropbox"
        return "direct_url"

    @classmethod
    def transform_to_download_url(cls, raw_url: str) -> Tuple[str, Optional[str], Optional[str]]:
        """
        Transforms a sharing URL into a direct raw download stream URL.
        Returns (direct_url, suggested_filename, default_ext).
        """
        url = raw_url.strip()
        provider = cls.detect_provider(url)

        if provider == "google_drive":
            # Extract file ID from patterns:
            # /file/d/{id}/view, /file/d/{id}, id={id}
            match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
            if not match:
                match = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
            if match:
                file_id = match.group(1)
                direct_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm=t"
                return direct_url, f"gdrive_file_{file_id[:8]}", None
            return url, None, None

        elif provider == "google_docs":
            match = re.search(r"/document/d/([a-zA-Z0-9_-]+)", url)
            if match:
                doc_id = match.group(1)
                direct_url = f"https://docs.google.com/document/d/{doc_id}/export?format=pdf"
                return direct_url, f"google_doc_{doc_id[:8]}.pdf", ".pdf"
            return url, None, ".pdf"

        elif provider == "google_sheets":
            match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
            if match:
                sheet_id = match.group(1)
                direct_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
                return direct_url, f"google_sheet_{sheet_id[:8]}.csv", ".csv"
            return url, None, ".csv"

        elif provider == "google_slides":
            match = re.search(r"/presentation/d/([a-zA-Z0-9_-]+)", url)
            if match:
                slide_id = match.group(1)
                direct_url = f"https://docs.google.com/presentation/d/{slide_id}/export/pdf"
                return direct_url, f"google_slides_{slide_id[:8]}.pdf", ".pdf"
            return url, None, ".pdf"

        elif provider == "dropbox":
            # Replace dl=0 with raw=1 or dl=1
            parsed = urllib.parse.urlparse(url)
            query_params = urllib.parse.parse_qs(parsed.query)
            query_params["dl"] = ["1"]
            query_params.pop("raw", None)
            new_query = urllib.parse.urlencode(query_params, doseq=True)
            direct_url = urllib.parse.urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment
            ))
            filename = os.path.basename(parsed.path) or "dropbox_file"
            return direct_url, filename, None

        # Direct web URL
        parsed = urllib.parse.urlparse(url)
        filename = os.path.basename(parsed.path) or "cloud_resource"
        return url, filename, None

    @classmethod
    async def fetch_and_stream(
        cls,
        url: str,
        custom_name: Optional[str] = None
    ) -> Tuple[bytes, str, str]:
        """
        Fetches the cloud file content, verifies file size, and resolves filename & content-type.
        Returns: (content_bytes, resolved_filename, content_type)
        """
        direct_url, suggested_name, default_ext = cls.transform_to_download_url(url)
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
        }

        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
                response = await client.get(direct_url, headers=headers)
                
                # Check for Google Drive large file confirmation redirect if required
                if "drive.google.com" in str(response.url) and "confirm=" not in str(response.url) and response.status_code == 200:
                    confirm_match = re.search(r"confirm=([0-9a-zA-Z_-]+)", response.text)
                    if confirm_match:
                        confirm_code = confirm_match.group(1)
                        if "id=" in direct_url:
                            direct_url += f"&confirm={confirm_code}"
                        else:
                            direct_url += f"?confirm={confirm_code}"
                        response = await client.get(direct_url, headers=headers)

                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Unable to download cloud file. Source server returned status {response.status_code}. Ensure the link is shared publicly ('Anyone with link can view').",
                    )

                content = response.content
                if len(content) > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Imported file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB",
                    )

                # Determine filename from Content-Disposition header
                filename = custom_name.strip() if custom_name and custom_name.strip() else None
                content_disposition = response.headers.get("content-disposition", "")
                if not filename and "filename=" in content_disposition:
                    fn_match = re.search(r'filename\*?=(?:UTF-8\'\')?["\']?([^"\';]+)["\']?', content_disposition)
                    if fn_match:
                        filename = urllib.parse.unquote(fn_match.group(1).strip())

                if not filename:
                    filename = suggested_name or "imported_cloud_file"

                # Check Content-Type header
                raw_content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
                
                # Ensure filename has an appropriate extension
                current_ext = os.path.splitext(filename)[1].lower()
                if not current_ext:
                    if raw_content_type in MIME_TO_EXT:
                        filename += MIME_TO_EXT[raw_content_type]
                    elif default_ext:
                        filename += default_ext
                    else:
                        # Inspect first bytes for signatures
                        if content.startswith(b"%PDF"):
                            filename += ".pdf"
                        elif content.startswith(b"\x89PNG"):
                            filename += ".png"
                        elif content.startswith(b"\xff\xd8\xff"):
                            filename += ".jpg"
                        elif content.startswith(b"PK\x03\x04"):
                            filename += ".docx"
                        elif content.startswith(b"{") or content.startswith(b"["):
                            filename += ".json"
                        else:
                            filename += ".txt"

                content_type = raw_content_type or "application/octet-stream"
                return content, filename, content_type

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to import cloud link: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to fetch cloud link: {str(e)}. Please verify the link is accessible and shared publicly.",
            )
