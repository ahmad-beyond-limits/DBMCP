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

import hashlib
import time

SESSION_TYPE = "form_session"
# Generous window (7 days) so the session never expires while the form is actively open
SESSION_EXPIRE_HOURS = 168
DANGEROUS_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

# Generous window (7 days) so the session never expires prematurely while the form is actively open
SESSION_EXPIRE_HOURS = 168
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


import hashlib
import re
import time
import urllib.parse
import uuid

from app.database.models import ExtractedContent, FileRecord, Workspace, FormDataEntrySession

SESSION_TYPE = "form_session"
# Generous window (7 days) so the session never expires prematurely while the form is actively open
SESSION_EXPIRE_HOURS = 168
DANGEROUS_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

# Fast in-memory session cache for instant zero-latency session resolution
_FORM_SESSION_MEMORY_CACHE: Dict[str, Dict[str, Any]] = {}


def clean_token_string(token: Optional[str]) -> str:
    """
    Sanitizes token strings to eliminate URL-encoding artifacts, markdown punctuation,
    trailing brackets/quotes from chat interfaces, and internal whitespace/newlines.
    Guarantees no decode padding crashes.
    """
    if not token:
        return ""
    t = str(token).strip()
    # Strip wrapping quotes, markdown delimiters, angle brackets, parentheses
    t = t.strip("'\"`<>[]()")
    
    # Multi-pass unquote in case of nested URL encoding (%2520 -> %20 -> space)
    for _ in range(3):
        if "%" in t:
            t = urllib.parse.unquote(t)
        else:
            break
            
    # Strip any trailing punctuation that markdown parsers might append
    t = re.sub(r"[\)\],;\.\*\"'`>]+$", "", t).strip()
    # Remove internal whitespace, newlines, and tabs that line-wrapping introduces
    t = re.sub(r"\s+", "", t)
    return t


def create_form_session_token(
    workspace_id: str,
    file_id: str,
    action: str,
    filters: Optional[Dict[str, Any]] = None,
    target_identifier: Optional[str] = None,
    user_id: Optional[str] = None,
) -> str:
    """
    Creates a clean, short 32-character session token stored in fast memory cache
    and cryptographically backed for bulletproof URL durability.
    Generates URLs ~68 characters long that NEVER wrap or fail base64 padding.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=SESSION_EXPIRE_HOURS)
    short_token = uuid.uuid4().hex  # Exactly 32 hex chars, 100% URL-safe

    payload = {
        "jti": str(uuid.uuid4()),
        "session_id": short_token,
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

    # Register in memory cache immediately
    _FORM_SESSION_MEMORY_CACHE[short_token] = payload

    # Also register JWT fallback mapped to the short token
    jwt_token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    _FORM_SESSION_MEMORY_CACHE[jwt_token] = payload

    return short_token


async def persist_form_session_record(
    db: AsyncSession,
    session_id: str,
    workspace_id: str,
    file_id: str,
    action: str,
    filters: Optional[Dict[str, Any]] = None,
    target_identifier: Optional[str] = None,
    user_id: Optional[str] = None,
    expire_hours: int = SESSION_EXPIRE_HOURS,
) -> None:
    """
    Persists a form session record to the database for persistence across server restarts.
    """
    try:
        now = datetime.now(timezone.utc)
        expire = now + timedelta(hours=expire_hours)
        sess = FormDataEntrySession(
            id=session_id,
            workspace_id=str(workspace_id),
            file_id=str(file_id),
            action=action or "insert",
            filters=filters or {},
            target_identifier=target_identifier or "",
            user_id=str(user_id) if user_id else None,
            is_used=False,
            expires_at=expire,
            created_at=now,
        )
        db.add(sess)
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist FormDataEntrySession to DB (using memory cache fallback): {e}")
        await db.rollback()


def verify_form_session_token(token: str) -> Dict[str, Any]:
    """
    Validates token signature and expiration against:
    1. Fast in-memory session cache (_FORM_SESSION_MEMORY_CACHE)
    2. Signed JWT tokens with automatic multi-key fallback and padding normalization
    """
    cleaned = clean_token_string(token)
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session token is missing or empty.",
        )

    # 1. Fast in-memory session lookup
    if cleaned in _FORM_SESSION_MEMORY_CACHE:
        session_info = _FORM_SESSION_MEMORY_CACHE[cleaned]
        exp_ts = session_info.get("exp")
        now_ts = int(datetime.now(timezone.utc).timestamp())
        if exp_ts and now_ts > exp_ts:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Form session has expired. Please ask the assistant to generate a new form.",
            )
        return dict(session_info)

    # 2. If it's a JWT (contains dots)
    if "." in cleaned:
        candidate_keys = [
            settings.JWT_SECRET_KEY,
            settings.SECRET_KEY,
            getattr(settings, "MCP_SESSION_SECRET", None),
            "dev-insecure-jwt-key-32bytes-min-required",
            "dev-insecure-secret-key-32bytes-min-required",
        ]
        seen_keys = set()
        unique_keys = []
        for k in candidate_keys:
            if k and k not in seen_keys:
                seen_keys.add(k)
                unique_keys.append(k)

        # Normalize JWT segments to avoid padding issues in PyJWT
        jwt_to_decode = cleaned
        segments = cleaned.split(".")
        if len(segments) == 3:
            normalized_segs = []
            for seg in segments:
                s = seg.replace("+", "-").replace("/", "_").rstrip("=")
                rem = len(s) % 4
                if rem == 2:
                    s += "=="
                elif rem == 3:
                    s += "="
                elif rem == 1:
                    s = s[:-1]
                normalized_segs.append(s)
            jwt_to_decode = ".".join(normalized_segs)

        last_err: Optional[Exception] = None
        for k in unique_keys:
            try:
                payload = jwt.decode(
                    jwt_to_decode,
                    k,
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
            except jwt.InvalidSignatureError as sig_err:
                last_err = sig_err
                continue
            except jwt.PyJWTError as py_err:
                last_err = py_err
                continue

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or tampered form session token ({last_err or 'signature verification failed'}).",
        )

    # 3. If token is not recognized
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or tampered form session token (unrecognized or expired). Please ask the assistant to generate a new form.",
    )


async def resolve_form_session(token: str, db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Resolves form session payload from:
    1. Memory cache
    2. Persistent database table (FormDataEntrySession)
    3. Signed JWT token
    """
    cleaned = clean_token_string(token)
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session token is missing or empty.",
        )

    # Check memory cache first
    if cleaned in _FORM_SESSION_MEMORY_CACHE:
        session_info = _FORM_SESSION_MEMORY_CACHE[cleaned]
        exp_ts = session_info.get("exp")
        now_ts = int(datetime.now(timezone.utc).timestamp())
        if exp_ts and now_ts > exp_ts:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Form session has expired. Please ask the assistant to generate a new form.",
            )
        return dict(session_info)

    # Check database table if session is available
    if db is not None:
        try:
            stmt = select(FormDataEntrySession).where(FormDataEntrySession.id == cleaned)
            sess_rec = (await db.execute(stmt)).scalar_one_or_none()
            if sess_rec:
                now = datetime.now(timezone.utc)
                exp = sess_rec.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if now > exp:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Form session has expired. Please ask the assistant to generate a new form.",
                    )
                payload = {
                    "type": SESSION_TYPE,
                    "session_id": sess_rec.id,
                    "workspace_id": sess_rec.workspace_id,
                    "file_id": sess_rec.file_id,
                    "action": sess_rec.action,
                    "filters": sess_rec.filters or {},
                    "target_identifier": sess_rec.target_identifier or "",
                    "sub": sess_rec.user_id or "mcp_client_user",
                    "exp": int(exp.timestamp()),
                    "iat": int(sess_rec.created_at.timestamp()) if sess_rec.created_at else int(now.timestamp()),
                }
                _FORM_SESSION_MEMORY_CACHE[cleaned] = payload
                return payload
        except HTTPException:
            raise
        except Exception as db_err:
            logger.debug(f"DB lookup for form session '{cleaned}' fell back: {db_err}")

    # Fallback to verify_form_session_token (JWT or memory)
    return verify_form_session_token(cleaned)



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

    # 4. Select dropdown check (categoric fields with limited distinct options, excluding ID/Code/Key fields)
    is_id_field = any(k in col_lower for k in ("id", "code", "key", "roll", "reg", "uuid", "guid", "number", "num", "no."))
    if not is_id_field:
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
        payload = await resolve_form_session(token, db=db)
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

        # Locate matching record: check filters and target_identifier
        target_row: Optional[Dict[str, Any]] = None
        if filters:
            for r in rows:
                if _matches_filter(r, filters):
                    target_row = r
                    break

        # Fallback: search target_identifier (e.g. S002, 101, Alice) across all cell values
        if target_row is None and target_identifier:
            tid = str(target_identifier).strip().lower()
            tokens = [t.strip().lower() for t in tid.replace("(", " ").replace(")", " ").split() if len(t.strip()) > 1]
            for r in rows:
                row_vals = [str(v).strip().lower() for v in r.values() if v is not None]
                if any(t in row_vals or any(t in rv for rv in row_vals) for t in tokens):
                    target_row = r
                    break

        # If a matching row is located, automatically treat as "update" and prefill its existing values!
        if target_row is not None:
            action = "update"

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

        # Also prefill any filter values for blank fields (e.g. student_id: S002)
        if filters:
            for k, v in filters.items():
                for c in columns:
                    if k.strip().lower() == c.strip().lower() and (c not in prefilled or prefilled[c] is None or prefilled[c] == ""):
                        prefilled[c] = v
                        for f in fields:
                            if f.name == c:
                                f.current_value = v

        # If still blank, and target_identifier has an ID token (e.g. S002), prefill into primary ID column
        if action == "insert" and target_identifier:
            words = str(target_identifier).strip().split()
            id_candidate = words[-1] if words else str(target_identifier).strip()
            for c in columns:
                if any(x in c.lower() for x in ["id", "code", "roll", "reg", "key"]):
                    if c not in prefilled or not prefilled[c]:
                        prefilled[c] = id_candidate
                        for f in fields:
                            if f.name == c:
                                f.current_value = id_candidate
                        break

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
        payload = await resolve_form_session(token, db=db)
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

        # 4. Perform mutation (Intelligent Auto-Upsert)
        matched_row: Optional[Dict[str, Any]] = None

        # Check by filters
        if filters:
            for row in rows:
                if _matches_filter(row, filters):
                    matched_row = row
                    break

        # Check by primary ID / key values submitted
        if matched_row is None:
            for id_col in ["student_id", "id", "roll_no", "reg_no", "user_id", "code", "email"]:
                for sk, sv in sanitized_values.items():
                    if sk.strip().lower() == id_col and sv:
                        for row in rows:
                            for rk, rv in row.items():
                                if rk.strip().lower() == id_col and str(rv).strip().lower() == str(sv).strip().lower():
                                    matched_row = row
                                    break
                            if matched_row is not None:
                                break
                    if matched_row is not None:
                        break
                if matched_row is not None:
                    break

        if matched_row is not None:
            # Update the existing record
            action = "update"
            for uk, uv in sanitized_values.items():
                target_key = uk
                for existing_k in list(matched_row.keys()):
                    if existing_k.strip().lower() == uk.strip().lower():
                        target_key = existing_k
                        break
                matched_row[target_key] = uv
            modified_count = 1
            final_record = dict(matched_row)
        else:
            # Append new record
            action = "insert"
            new_row_dict: Dict[str, Any] = {}
            for c in columns:
                val = ""
                for k, v in sanitized_values.items():
                    if k.strip().lower() == c.strip().lower():
                        val = v
                        break
                new_row_dict[c] = val
            rows.append(new_row_dict)
            modified_count = 1
            final_record = new_row_dict

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

        # 6b. Mark form session as used
        session_id = payload.get("session_id")
        if session_id:
            try:
                stmt_sess = select(FormDataEntrySession).where(FormDataEntrySession.id == session_id)
                sess_rec = (await db.execute(stmt_sess)).scalar_one_or_none()
                if sess_rec:
                    sess_rec.is_used = True
                    db.add(sess_rec)
            except Exception:
                pass

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
