import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from app.anonymisation.engine import AnonymisationEngine

logger = logging.getLogger(__name__)


def _get_row_val(row: Dict[str, Any], target_col: str) -> Tuple[bool, Any]:
    """Finds key in row matching target_col case-insensitively with stripped whitespace."""
    target_clean = target_col.strip().lower()
    for k, v in row.items():
        if k.strip().lower() == target_clean:
            return True, v
    return False, None


def _matches_filter(row: Dict[str, Any], filters: Dict[str, Any]) -> bool:
    """
    Evaluates filter criteria against a row.
    Performs EXACT matching for strings and numbers (prevents 'male' matching 'female'),
    and supports rich comparison operators ($gt, $gte, $lt, $lte, $eq, $ne, $in, $contains).
    """
    for col, filter_val in filters.items():
        found, row_val = _get_row_val(row, col)
        if not found or row_val is None:
            return False

        # If filter is an operator dict, e.g. {"gt": 80} or {"$ne": "female"}
        if isinstance(filter_val, dict):
            for op, expected in filter_val.items():
                op_clean = op.lstrip("$").lower()
                try:
                    num_row = float(row_val)
                    num_exp = float(expected)
                    if op_clean in ["gt", ">"] and not (num_row > num_exp):
                        return False
                    elif op_clean in ["gte", ">="] and not (num_row >= num_exp):
                        return False
                    elif op_clean in ["lt", "<"] and not (num_row < num_exp):
                        return False
                    elif op_clean in ["lte", "<="] and not (num_row <= num_exp):
                        return False
                    elif op_clean in ["eq", "=="] and not (num_row == num_exp):
                        return False
                    elif op_clean in ["ne", "!="] and not (num_row != num_exp):
                        return False
                except (ValueError, TypeError):
                    str_row = str(row_val).strip().lower()
                    str_exp = str(expected).strip().lower()
                    if op_clean in ["eq", "=="] and str_row != str_exp:
                        return False
                    elif op_clean in ["ne", "!="] and str_row == str_exp:
                        return False
                    elif op_clean in ["contains", "like"] and str_exp not in str_row:
                        return False
                    elif op_clean == "in" and isinstance(expected, list):
                        exp_list = [str(x).strip().lower() for x in expected]
                        if str_row not in exp_list:
                            return False

        # Primitive filter value: string, int, float, bool
        else:
            # 1. Try numerical comparison
            try:
                if float(row_val) == float(filter_val):
                    continue
                else:
                    return False
            except (ValueError, TypeError):
                pass

            # 2. Strict case-insensitive exact string match
            row_str = str(row_val).strip().lower()
            exp_str = str(filter_val).strip().lower()
            if row_str != exp_str:
                return False

    return True


class StructuredQueryEngine:
    """
    Controlled query processor for tabular/structured data (CSV, Excel, JSON).
    Prevents direct and indirect information leakage by enforcing field-level policies.
    """

    @classmethod
    def get_safe_schema(
        cls,
        data: Dict[str, Any],
        denied_fields: List[str],
    ) -> Dict[str, Any]:
        """Returns column names and types excluding any denied columns."""
        raw_schema = data.get("schema", {})
        clean_schema = {}
        denied_set = {d.strip().lower() for d in denied_fields}
        for col, col_type in raw_schema.items():
            if col.strip().lower() not in denied_set:
                clean_schema[col] = col_type
        return {
            "row_count": data.get("row_count", 0),
            "columns": clean_schema,
        }

    @classmethod
    def execute_query(
        cls,
        structured_data: Dict[str, Any],
        columns: Optional[List[str]],
        filters: Optional[Dict[str, Any]],
        limit: int,
        transformations: Dict[str, str],
        denied_fields: List[str],
        workspace_id: str,
    ) -> Tuple[bool, Optional[str], Optional[List[Dict[str, Any]]]]:
        """
        Executes a controlled select with exact filters, projection, and transformations.
        Returns: (success: bool, error_message: Optional[str], rows: Optional[List])
        """
        rows: List[Dict[str, Any]] = structured_data.get("rows", [])
        denied_set = {d.strip().lower() for d in denied_fields}

        # 1. Validate requested projected columns
        target_cols = columns
        if target_cols:
            for col in target_cols:
                if col.strip().lower() in denied_set:
                    return False, f"Access to restricted column '{col}' is denied", None
        else:
            # If no columns specified, default to all non-denied columns
            raw_cols = structured_data.get("columns", [])
            target_cols = [c for c in raw_cols if c.strip().lower() not in denied_set]

        # 2. Validate filters to prevent indirect leakage
        if filters:
            for col in filters.keys():
                if col.strip().lower() in denied_set:
                    return False, f"Filtering on restricted column '{col}' is denied to prevent indirect information leakage", None

        # 3. Apply exact filters
        filtered_rows = []
        for r in rows:
            if not filters or _matches_filter(r, filters):
                filtered_rows.append(r)
                if len(filtered_rows) >= max(1, min(limit, 500)):
                    break

        # 4. Project columns and apply field-level anonymisation/transformations
        output_rows = []
        for r in filtered_rows:
            new_row = {}
            for col in target_cols:
                found, raw_val = _get_row_val(r, col)
                rule = transformations.get(col.strip().lower(), "ALLOW").upper()

                if rule == "DENY" or rule == "REMOVE":
                    continue
                elif rule == "MASK":
                    new_row[col] = AnonymisationEngine._mask_value(str(raw_val), col.strip().lower())
                elif rule == "PSEUDONYMIZE":
                    new_row[col] = AnonymisationEngine._pseudonymize_value(str(raw_val), col.strip().lower(), workspace_id)
                elif rule == "REDACT":
                    new_row[col] = "[REDACTED]"
                else:
                    new_row[col] = raw_val
            output_rows.append(new_row)

        return True, None, output_rows

    @classmethod
    def execute_aggregation(
        cls,
        structured_data: Dict[str, Any],
        column: Optional[str],
        agg_func: str,
        filters: Optional[Dict[str, Any]],
        denied_fields: List[str],
    ) -> Tuple[bool, Optional[str], Optional[Any]]:
        """
        Executes controlled aggregation (count, sum, avg, min, max) with optional filter filtering.
        Strictly prevents aggregations on denied columns (indirect leakage).
        """
        denied_set = {d.strip().lower() for d in denied_fields}
        target_col = column.strip() if column else ""

        if target_col and target_col.lower() in denied_set:
            return False, f"Aggregation on restricted column '{target_col}' is denied to prevent indirect information leakage", None

        if filters:
            for fcol in filters.keys():
                if fcol.strip().lower() in denied_set:
                    return False, f"Filtering on restricted column '{fcol}' during aggregation is denied", None

        rows: List[Dict[str, Any]] = structured_data.get("rows", [])

        # 1. Apply filters first!
        matching_rows = [r for r in rows if not filters or _matches_filter(r, filters)]

        fn = agg_func.strip().lower() if agg_func else "count"

        if fn == "count":
            if not target_col:
                return True, None, len(matching_rows)
            # Count non-null values for column
            val_count = 0
            for r in matching_rows:
                found, v = _get_row_val(r, target_col)
                if found and v is not None and str(v).strip() != "":
                    val_count += 1
            return True, None, val_count

        # For math aggregations (sum, avg, min, max), extract numeric values
        if not target_col:
            return False, f"Aggregation function '{agg_func}' requires a 'column' parameter", None

        num_values = []
        for r in matching_rows:
            found, v = _get_row_val(r, target_col)
            if found and v is not None:
                try:
                    num_values.append(float(v))
                except (ValueError, TypeError):
                    pass

        if not num_values:
            return False, f"No numeric values available for aggregation on column '{target_col}' (matching rows: {len(matching_rows)})", None

        if fn == "sum":
            return True, None, sum(num_values)
        elif fn in ["avg", "average", "mean"]:
            return True, None, sum(num_values) / len(num_values)
        elif fn == "min":
            return True, None, min(num_values)
        elif fn == "max":
            return True, None, max(num_values)
        else:
            return False, f"Unsupported aggregation function '{agg_func}'", None
