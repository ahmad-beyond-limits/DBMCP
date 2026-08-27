import csv
import io
import json
from typing import Any, Dict, List, Optional, Tuple

from pypdf import PdfReader
from docx import Document

from app.anonymisation.pii_detector import PIIDetector


class ContentExtractor:
    @staticmethod
    def extract(content: bytes, file_type: str) -> Tuple[str, Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Extracts plain text, structured data (if CSV/JSON), and detected PII entities.
        Returns: (plain_text, structured_data, detected_entities)
        """
        ft = file_type.upper()
        plain_text = ""
        structured_data = None

        if ft == "TXT":
            plain_text = content.decode("utf-8", errors="replace")

        elif ft == "PDF":
            reader = PdfReader(io.BytesIO(content))
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            plain_text = "\n\n".join(pages)

        elif ft == "DOCX":
            doc = Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            plain_text = "\n".join(paragraphs)

        elif ft == "CSV":
            text_stream = io.StringIO(content.decode("utf-8", errors="replace"))
            reader = csv.DictReader(text_stream)
            rows = []
            columns = reader.fieldnames or []
            schema = {}
            for row in reader:
                rows.append(row)
                if len(rows) <= 1000:
                    for k, v in row.items():
                        if k not in schema:
                            # Simple type inference
                            try:
                                float(v)
                                schema[k] = "number"
                            except (ValueError, TypeError):
                                schema[k] = "string"

            # Formatted text preview
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

        elif ft == "JSON":
            raw_text = content.decode("utf-8", errors="replace")
            plain_text = raw_text
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
                structured_data = None

        # Detect PII entities across extracted plain text
        detected = PIIDetector.detect_entities(plain_text)
        return plain_text, structured_data, detected
