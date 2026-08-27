import json
from typing import Any, Dict, List, Optional, Tuple

from app.anonymisation.engine import AnonymisationEngine


class StructuredQueryEngine:
    """
    Controlled query processor for tabular/structured data (CSV, JSON).
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
        for col, col_type in raw_schema.items():
            if col.lower() not in [d.lower() for d in denied_fields]:
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
        Executes a controlled select with optional filters, projection, and transformations.
        Returns: (success: bool, error_message: Optional[str], rows: Optional[List])
        """
        rows: List[Dict[str, Any]] = structured_data.get("rows", [])
        denied_set = {d.lower() for d in denied_fields}

        # 1. Validate requested projected columns
        target_cols = columns
        if target_cols:
            for col in target_cols:
                if col.lower() in denied_set:
                    return False, f"Access to restricted column '{col}' is denied", None
        else:
            # If no columns specified, default to all non-denied columns
            raw_cols = structured_data.get("columns", [])
            target_cols = [c for c in raw_cols if c.lower() not in denied_set]

        # 2. Validate filters to prevent indirect leakage
        if filters:
            for col in filters.keys():
                if col.lower() in denied_set:
                    return False, f"Filtering on restricted column '{col}' is denied to prevent indirect information leakage", None

        # 3. Apply filters
        filtered_rows = []
        for r in rows:
            matches = True
            if filters:
                for k, v in filters.items():
                    # Support exact match or containment
                    row_val = str(r.get(k, "")).lower()
                    filter_val = str(v).lower()
                    if filter_val not in row_val:
                        matches = False
                        break
            if matches:
                filtered_rows.append(r)
                if len(filtered_rows) >= max(1, min(limit, 500)):
                    break

        # 4. Project columns and apply field-level anonymisation/transformations
        output_rows = []
        for r in filtered_rows:
            new_row = {}
            for col in target_cols:
                raw_val = r.get(col)
                rule = transformations.get(col.lower(), "ALLOW").upper()

                if rule == "DENY" or rule == "REMOVE":
                    continue
                elif rule == "MASK":
                    new_row[col] = AnonymisationEngine._mask_value(str(raw_val), col.lower())
                elif rule == "PSEUDONYMIZE":
                    new_row[col] = AnonymisationEngine._pseudonymize_value(str(raw_val), col.lower(), workspace_id)
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
        column: str,
        agg_func: str,
        denied_fields: List[str],
    ) -> Tuple[bool, Optional[str], Optional[Any]]:
        """
        Executes controlled aggregation (count, sum, avg, min, max).
        Strictly prevents aggregations on denied columns (indirect leakage).
        """
        denied_set = {d.lower() for d in denied_fields}
        if column.lower() in denied_set:
            return False, f"Aggregation on restricted column '{column}' is denied to prevent indirect information leakage", None

        rows: List[Dict[str, Any]] = structured_data.get("rows", [])
        values = []
        for r in rows:
            v = r.get(column)
            if v is not None:
                try:
                    values.append(float(v))
                except (ValueError, TypeError):
                    values.append(v)

        fn = agg_func.lower()
        if fn == "count":
            return True, None, len(values)

        num_values = [v for v in values if isinstance(v, (int, float))]
        if not num_values:
            return False, f"No numeric values available for aggregation on column '{column}'", None

        if fn == "sum":
            return True, None, sum(num_values)
        elif fn == "avg" or fn == "average":
            return True, None, sum(num_values) / len(num_values)
        elif fn == "min":
            return True, None, min(num_values)
        elif fn == "max":
            return True, None, max(num_values)
        else:
            return False, f"Unsupported aggregation function '{agg_func}'", None
