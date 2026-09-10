import copy
import csv
import io
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

import openpyxl
from app.audit.service import AuditService
from app.core.config import settings
from app.database.models import ExtractedContent, FileRecord, Workspace
from app.forms.schemas import FormFieldDefinition, FormSessionResponse, FormSubmitResponse
from app.storage.supabase_storage import get_storage_backend
from app.structured.query_engine import _matches_filter, _get_row_val

logger = logging.getLogger(__name__)

SESSION_TYPE = "form_session"
SESSION_EXPIRE_HOURS = 2
DANGEROUS_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def sanitize_cell_value(val: Any) -> Any:
    """
    Guards against CSV and Formula injection (CWE-1236).
    If a cell value is a string starting with =, +, -, @, \\t, \\r:
    - If it parses as a standard number (e.g. -42 or +3.14), preserve it as numeric (safe).
    - Otherwise, prefix with a single quote "'" to neutralize spreadsheet macro evaluation.
    """
    if val is None:
        return ""
    if isinstance(val, (int, float, bool)):
        return val
    s = str(val)
    if s.startswith(DANGEROUS_FORMULA_PREFIXES):
        try:
            float(s.strip())
            return val
        except (ValueError, TypeError):
            # Prepend quote to neutralize formula
            return "'" + s
    return val


def create_form_session_token(
    workspace_id: str,
    file_id: str,
    action: str,
    filters: Optional[Dict[str, Any]] = None,
    target_identifier: Optional[str] = None,
    user_id: Optional[str] = None,
) -> str:
    """
    Creates a cryptographically signed, tamper-proof, short-lived JWT token
    binding the session to the target file and workspace.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=SESSION_EXPIRE_HOURS)
    payload = {
        "type": SESSION_TYPE,
        "sub": str(user_id) if user_id else "mcp_client_user",
        "workspace_id": str(workspace_id),
        "file_id": str(file_id),
        "action": action,
        "filters": filters or {},
        "target_identifier": target_identifier or "",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_form_session_token(token: str) -> Dict[str, Any]:
    """
    Validates token signature and expiration.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != SESSION_TYPE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid form session token type.",
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Form session has expired. Please ask the assistant to generate a new form.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or tampered form session token.",
        )


def infer_field_definition(col: str, sample_values: List[Any], current_val: Optional[Any] = None) -> FormFieldDefinition:
    """
    Infers the field type (number, date, boolean, select, text), options, and human-friendly label.
    """
    clean_label = col.replace("_", " ").replace("-", " ").title()
    valid_samples = [v for v in sample_values if v is not None and str(v).strip() != ""]

    # 1. Boolean check
    if valid_samples and all(str(v).strip().lower() in ("true", "false", "1", "0", "yes", "no") for v in valid_samples):
        return FormFieldDefinition(
            name=col,
            label=clean_label,
            type="boolean",
            current_value=current_val,
            placeholder=f"Select {clean_label}",
        )

    # 2. Number check
    is_numeric = False
    if valid_samples:
        try:
            for v in valid_samples:
                float(str(v).strip())
            is_numeric = True
        except (ValueError, TypeError):
            is_numeric = False

    if is_numeric:
        return FormFieldDefinition(
            name=col,
            label=clean_label,
            type="number",
            current_value=current_val,
            placeholder=f"Enter {clean_label.lower()} (number)",
        )

    # 3. Date check
    col_lower = col.lower()
    if any(k in col_lower for k in ("date", "dob", "birth", "deadline", "timestamp", "created_at")):
        return FormFieldDefinition(
            name=col,
            label=clean_label,
            type="date",
            current_value=current_val,
            placeholder="YYYY-MM-DD",
        )

    # 4. Select dropdown check (categoric fields with limited distinct options)
    str_samples = [str(v).strip() for v in valid_samples]
    unique_vals = list(dict.fromkeys(str_samples))
    if len(valid_samples) >= 3 and 1 < len(unique_vals) <= 12 and all(len(u) < 40 for u in unique_vals):
        return FormFieldDefinition(
            name=col,
            label=clean_label,
            type="select",
            options=unique_vals,
            current_value=current_val,
            placeholder=f"Select {clean_label.lower()}",
        )

    # 5. Default text
    return FormFieldDefinition(
        name=col,
        label=clean_label,
        type="text",
        current_value=current_val,
        placeholder=f"Enter {clean_label.lower()}",
    )


class FormService:
    @classmethod
    async def get_session_data(cls, db: AsyncSession, token: str) -> FormSessionResponse:
        """
        Retrieves form schema and pre-filled data for a validated form session token.
        Ensures workspace boundary isolation and zero data leakage.
        """
        payload = verify_form_session_token(token)
        workspace_id = payload["workspace_id"]
        file_id = payload["file_id"]
        action = payload["action"]
        filters = payload.get("filters", {})
        target_identifier = payload.get("target_identifier")

        # Verify workspace
        ws = (await db.execute(select(Workspace).where(Workspace.id == workspace_id))).scalar_one_or_none()
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

        # Verify file in workspace
        stmt = select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.workspace_id == workspace_id,
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset file not found in workspace")

        # Verify structured content
        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        if not extracted or not extracted.structured_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Structured data schema not available for this file")

        structured = dict(extracted.structured_data)
        rows: List[Dict[str, Any]] = list(structured.get("rows", []))
        columns: List[str] = list(structured.get("columns", []))

        # If columns empty, derive from rows
        if not columns and rows:
            columns = list(rows[0].keys())

        # Locate matching record if updating
        target_row: Optional[Dict[str, Any]] = None
        if action == "update":
            for r in rows:
                if not filters or _matches_filter(r, filters):
                    target_row = r
                    break

        # Build column sample map for type inference
        sample_map: Dict[str, List[Any]] = {c: [] for c in columns}
        for r in rows[:50]:
            for c in columns:
                found, val = _get_row_val(r, c)
                if found and val is not None:
                    sample_map[c].append(val)

        fields: List[FormFieldDefinition] = []
        prefilled: Dict[str, Any] = {}

        for col in columns:
            current_val = None
            if target_row is not None:
                found, val = _get_row_val(target_row, col)
                if found:
                    current_val = val
                    prefilled[col] = val

            field_def = infer_field_definition(col, sample_map.get(col, []), current_val=current_val)
            fields.append(field_def)

        # Construct title
        if action == "update":
            title = f"Update Record: {target_identifier or file_rec.original_filename}"
            desc = f"Modify values for {target_identifier or 'the selected record'} in {file_rec.original_filename}."
        else:
            title = f"Add New Entry to {file_rec.original_filename}"
            desc = f"Fill in the fields below to add a new record to {file_rec.original_filename}."

        expires_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        return FormSessionResponse(
            session_token=token,
            workspace_id=workspace_id,
            workspace_name=ws.name,
            file_id=file_rec.id,
            filename=file_rec.original_filename,
            action=action,
            title=title,
            description=desc,
            target_identifier=target_identifier,
            fields=fields,
            prefilled_values=prefilled,
            expires_at=expires_dt.isoformat(),
        )

    @classmethod
    async def submit_form(
        cls,
        db: AsyncSession,
        token: str,
        submitted_values: Dict[str, Any],
        client_ip: Optional[str] = None,
    ) -> FormSubmitResponse:
        """
        Validates, sanitizes, and commits user-submitted form data to the dataset.
        Neutralizes formula injection (CWE-1236) and syncs storage backends.
        """
        payload = verify_form_session_token(token)
        workspace_id = payload["workspace_id"]
        file_id = payload["file_id"]
        action = payload["action"]
        filters = payload.get("filters", {})
        user_id = payload.get("sub")

        # 1. Fetch file record within tenant workspace
        stmt = select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.workspace_id == workspace_id,
        )
        file_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not file_rec:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset file not found")

        # 2. Fetch extracted content
        c_stmt = select(ExtractedContent).where(ExtractedContent.file_id == file_rec.id)
        extracted = (await db.execute(c_stmt)).scalar_one_or_none()
        if not extracted or not extracted.structured_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Structured dataset not found")

        structured = dict(extracted.structured_data)
        rows: List[Dict[str, Any]] = list(structured.get("rows", []))
        columns: List[str] = list(structured.get("columns", []))

        # 3. Sanitize submitted values to prevent CSV/Formula injection
        sanitized_values: Dict[str, Any] = {}
        for k, v in submitted_values.items():
            sanitized_values[str(k).strip()] = sanitize_cell_value(v)

        # Expand column list if any new key was provided
        for col in sanitized_values.keys():
            if not any(c.strip().lower() == col.strip().lower() for c in columns):
                columns.append(col)

        modified_count = 0
        final_record: Dict[str, Any] = {}

        # 4. Perform mutation
        if action == "update":
            matched = False
            for row in rows:
                if not filters or _matches_filter(row, filters):
                    matched = True
                    for uk, uv in sanitized_values.items():
                        target_key = uk
                        for existing_k in list(row.keys()):
                            if existing_k.strip().lower() == uk.strip().lower():
                                target_key = existing_k
                                break
                        row[target_key] = uv
                    modified_count += 1
                    final_record = dict(row)
                    break  # Modify the single targeted record

            if not matched:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target record matching the filter criteria could not be found to update.",
                )

        elif action == "insert":
            # Build complete row with columns
            new_row_dict: Dict[str, Any] = {}
            for c in columns:
                # Find in sanitized_values
                val = ""
                for k, v in sanitized_values.items():
                    if k.strip().lower() == c.strip().lower():
                        val = v
                        break
                new_row_dict[c] = val

            rows.append(new_row_dict)
            modified_count = 1
            final_record = new_row_dict

        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported action '{action}'")

        # 5. Persist updated structured data and plain text
        new_structured = {
            "columns": list(columns),
            "rows": copy.deepcopy(rows),
            "row_count": len(rows),
            "schema": structured.get("schema", {}),
            "table_detected": structured.get("table_detected", True),
        }
        extracted.structured_data = new_structured
        flag_modified(extracted, "structured_data")

        # Re-generate plain_text CSV representation
        lines = [",".join(columns)]
        for r in rows:
            lines.append(",".join([str(r.get(c, "")) for c in columns]))
        extracted.plain_text = "\n".join(lines)
        db.add(extracted)

        # 6. Overwrite raw file in storage backend
        try:
            storage = get_storage_backend()
            new_binary: bytes = b""
            content_type = file_rec.content_type or "application/octet-stream"

            if file_rec.file_type == "CSV" or file_rec.original_filename.lower().endswith(".csv"):
                out_stream = io.StringIO()
                writer = csv.DictWriter(out_stream, fieldnames=columns)
                writer.writeheader()
                for r in rows:
                    writer.writerow({c: r.get(c, "") for c in columns})
                new_binary = out_stream.getvalue().encode("utf-8")
                content_type = "text/csv"

            elif file_rec.file_type == "JSON" or file_rec.original_filename.lower().endswith(".json"):
                new_binary = json.dumps(rows, indent=2).encode("utf-8")
                content_type = "application/json"

            elif file_rec.file_type in ["XLSX", "XLS"] or file_rec.original_filename.lower().endswith((".xlsx", ".xls")):
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Sheet1"
                ws.append(columns)
                for r in rows:
                    ws.append([r.get(c, "") for c in columns])
                out_bytes = io.BytesIO()
                wb.save(out_bytes)
                new_binary = out_bytes.getvalue()
                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

            if new_binary and file_rec.storage_path:
                await storage.upload(file_rec.storage_path, new_binary, content_type)
                file_rec.file_size = len(new_binary)
                db.add(file_rec)
        except Exception as storage_err:
            logger.error(
                f"Error updating file storage for {file_rec.original_filename}: {storage_err}",
                exc_info=True,
            )

        # 7. Commit database changes
        await db.commit()

        # 8. Security audit logging
        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            operation="FORM_DATA_ENTRY_SUBMIT",
            actor_type="WEB_FORM",
            user_id=user_id if user_id and user_id != "mcp_client_user" else None,
            resource_type="dataset",
            resource_id=file_rec.id,
            decision="ALLOW",
            reason=f"Form submitted successfully: action '{action}' on {file_rec.original_filename}",
            request_metadata={
                "action": action,
                "client_ip": client_ip,
                "modified_count": modified_count,
            },
        )

        return FormSubmitResponse(
            status="success",
            message=f"Successfully {'updated' if action == 'update' else 'added'} record in {file_rec.original_filename}",
            action=action,
            filename=file_rec.original_filename,
            affected_records=modified_count,
            record=final_record,
        )
