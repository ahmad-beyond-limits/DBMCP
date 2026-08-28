import csv
import io
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from docx import Document
from pypdf import PdfReader

from app.anonymisation.pii_detector import PIIDetector

logger = logging.getLogger(__name__)


class ContentExtractor:
    @classmethod
    async def extract(
        cls, content: bytes, file_type: str, filename: str = "document"
    ) -> Tuple[str, Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Extracts plain text and structured data from uploaded files.
        Directly preserves document content for AI agent querying.
        """
        ft = file_type.upper()
        plain_text = ""
        structured_data = None

        if ft == "TXT":
            plain_text = content.decode("utf-8", errors="replace")

        elif ft == "PDF":
            reader = PdfReader(io.BytesIO(content))
            pages = []
            for i, page in enumerate(reader.pages):
                try:
                    text = page.extract_text()
                    if text and text.strip():
                        pages.append(text.strip())
                except Exception:
                    continue
            plain_text = "\n\n".join(pages) if pages else "[PDF Document content ready for AI query]"

        elif ft == "DOCX":
            try:
                doc = Document(io.BytesIO(content))
                paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                plain_text = "\n\n".join(paragraphs)
            except Exception:
                plain_text = "[DOCX Document content ready for AI query]"

        elif ft == "CSV":
            plain_text, structured_data = cls._extract_csv(content)

        elif ft == "JSON":
            plain_text, structured_data = cls._extract_json(content)

        else:
            plain_text = content.decode("utf-8", errors="replace")

        # Detect PII entities across extracted plain text
        detected = PIIDetector.detect_entities(plain_text)
        return plain_text, structured_data, detected

    @classmethod
    def _extract_csv(cls, content: bytes) -> Tuple[str, Dict[str, Any]]:
        text_stream = io.StringIO(content.decode("utf-8", errors="replace"))
        reader = csv.DictReader(text_stream)
        rows = []
        columns = reader.fieldnames or []
        schema = {}
        for row in reader:
            rows.append(row)
            if len(rows) <= 500:
                for k, v in row.items():
                    if k not in schema:
                        try:
                            float(v)
                            schema[k] = "number"
                        except (ValueError, TypeError):
                            schema[k] = "string"

        lines = [",".join(columns)]
        for r in rows[:100]:
            lines.append(",".join([str(r.get(c, "")) for c in columns]))
        plain_text = "\n".join(lines)

        structured_data = {
            "columns": list(columns),
            "schema": schema,
            "row_count": len(rows),
            "rows": rows,
        }
        return plain_text, structured_data

    @classmethod
    def _extract_json(cls, content: bytes) -> Tuple[str, Dict[str, Any]]:
        raw_text = content.decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw_text)
            if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict):
                columns = list(parsed[0].keys())
                schema = {k: type(parsed[0][k]).__name__ for k in columns}
                structured_data = {
                    "columns": columns,
                    "schema": schema,
                    "row_count": len(parsed),
                    "rows": parsed,
                }
            else:
                structured_data = {"raw": parsed}
        except Exception:
            structured_data = {"raw": raw_text}
        return raw_text, structured_data
