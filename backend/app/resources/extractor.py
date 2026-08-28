import csv
import io
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from docx import Document
import openpyxl
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

        elif ft in ["XLSX", "XLS"]:
            plain_text, structured_data = cls._extract_xlsx(content)

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
            "table_detected": len(columns) > 0,
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
                    "table_detected": True,
                }
            else:
                structured_data = {"raw": parsed, "table_detected": False}
        except Exception:
            structured_data = {"raw": raw_text, "table_detected": False}
        return raw_text, structured_data

    @classmethod
    def _extract_xlsx(cls, content: bytes) -> Tuple[str, Dict[str, Any]]:
        """
        Extracts tabular data across all sheets of an Excel (.xlsx / .xls) workbook.
        If structured tables are detected, extracts columns, schemas, and dictionary rows.
        If unstructured text, gracefully returns raw text content.
        """
        plain_text_sections = []
        sheets_data: Dict[str, Any] = {}
        primary_columns: List[str] = []
        primary_schema: Dict[str, str] = {}
        primary_rows: List[Dict[str, Any]] = []

        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            for sheet_name in wb.sheetnames:
                sheet = wb[sheet_name]
                raw_rows = list(sheet.iter_rows(values_only=True))

                # Filter empty rows
                non_empty_rows = [
                    [str(c).strip() if c is not None else "" for c in r]
                    for r in raw_rows
                    if any(c is not None and str(c).strip() != "" for c in r)
                ]

                if not non_empty_rows:
                    continue

                if len(non_empty_rows) >= 2:
                    # Header row
                    raw_headers = non_empty_rows[0]
                    headers = []
                    for i, h in enumerate(raw_headers):
                        h_clean = str(h).strip() if h else f"Column_{i + 1}"
                        headers.append(h_clean if h_clean else f"Column_{i + 1}")

                    sheet_rows = []
                    sheet_schema: Dict[str, str] = {}

                    for r in non_empty_rows[1:]:
                        row_dict = {}
                        for i, col_name in enumerate(headers):
                            val = r[i] if i < len(r) else ""
                            row_dict[col_name] = val
                            if col_name not in sheet_schema and val != "":
                                try:
                                    float(val)
                                    sheet_schema[col_name] = "number"
                                except (ValueError, TypeError):
                                    sheet_schema[col_name] = "string"
                        sheet_rows.append(row_dict)

                    sheets_data[sheet_name] = {
                        "columns": headers,
                        "schema": sheet_schema,
                        "row_count": len(sheet_rows),
                        "rows": sheet_rows,
                        "table_detected": True,
                    }

                    if not primary_columns:
                        primary_columns = headers
                        primary_schema = sheet_schema
                        primary_rows = sheet_rows

                    # Build text representation for this sheet
                    lines = [f"--- Sheet: {sheet_name} ---", ",".join(headers)]
                    for r in sheet_rows[:100]:
                        lines.append(",".join([str(r.get(c, "")) for c in headers]))
                    plain_text_sections.append("\n".join(lines))
                else:
                    # Single line or unstructured text in sheet
                    text_lines = [f"--- Sheet: {sheet_name} ---"] + [",".join(r) for r in non_empty_rows]
                    plain_text_sections.append("\n".join(text_lines))

            plain_text = "\n\n".join(plain_text_sections) if plain_text_sections else "[Empty Excel Workbook]"

            structured_data = {
                "columns": primary_columns,
                "schema": primary_schema,
                "row_count": len(primary_rows),
                "rows": primary_rows,
                "sheets": sheets_data,
                "table_detected": len(primary_columns) > 0,
            }
            return plain_text, structured_data

        except Exception as e:
            logger.error(f"Error parsing Excel workbook: {e}", exc_info=True)
            fallback_text = "[Excel document content uploaded - raw binary ready]"
            return fallback_text, {"raw": fallback_text, "table_detected": False}
