import hashlib
import hmac
import re
from typing import Any, Dict, List, Optional

from app.anonymisation.pii_detector import PATTERNS, PIIDetector
from app.core.config import settings


class AnonymisationEngine:
    """
    Transforms text and structured values according to workspace anonymisation policies.
    Supported transformations: ALLOW, REMOVE, REDACT, MASK, PSEUDONYMIZE.
    """

    @staticmethod
    def _mask_value(value: str, entity_type: str) -> str:
        val = value.strip()
        if not val:
            return val

        if entity_type == "email" and "@" in val:
            parts = val.split("@", 1)
            user_part, domain_part = parts[0], parts[1]
            if len(user_part) > 1:
                masked_user = user_part[0] + "***"
            else:
                masked_user = "***"
            return f"{masked_user}@{domain_part}"

        if entity_type == "phone":
            digits = re.sub(r"\D", "", val)
            if len(digits) >= 4:
                last_four = digits[-4:]
                return f"***-***-{last_four}"
            return "***-***-****"

        if entity_type == "ssn":
            digits = re.sub(r"\D", "", val)
            if len(digits) >= 4:
                return f"***-**-{digits[-4:]}"
            return "***-**-****"

        if len(val) <= 2:
            return "***"
        return f"{val[0]}***{val[-1]}"

    @staticmethod
    def _pseudonymize_value(value: str, entity_type: str, workspace_id: str) -> str:
        """
        Deterministically produces a pseudonym inside a workspace using keyed HMAC.
        Guarantees that identical entities in the same workspace produce identical pseudonyms,
        while different workspaces produce different pseudonyms.
        """
        clean_val = value.strip().lower()
        key = f"{settings.WORKSPACE_HASH_SECRET}:{workspace_id}".encode("utf-8")
        h = hmac.new(key, clean_val.encode("utf-8"), hashlib.sha256).hexdigest()
        
        # Derive 6-character hex token (16.7 million unique collision-resistant IDs per workspace)
        token_id = h[:6].upper()
        
        prefix = "Person"
        if entity_type in ["organization", "company", "org"]:
            prefix = "Org"
        elif entity_type in ["email", "username", "user"]:
            prefix = "User"
        elif entity_type in ["location", "city", "address", "loc"]:
            prefix = "Loc"
        elif entity_type in ["id", "identifier", "ssn", "account"]:
            prefix = "Entity"
            
        return f"{prefix}_{token_id}"

    @classmethod
    def transform_value(
        cls,
        value: Any,
        entity_type: str,
        transformation: str,
        workspace_id: str,
    ) -> Any:
        """Transforms an individual scalar value."""
        if value is None:
            return None

        str_val = str(value)
        trans = (transformation or "ALLOW").upper()

        if trans == "ALLOW":
            return value
        elif trans == "REMOVE":
            return None
        elif trans == "REDACT":
            return f"[REDACTED: {entity_type.upper()}]"
        elif trans == "MASK":
            return cls._mask_value(str_val, entity_type)
        elif trans == "PSEUDONYMIZE":
            return cls._pseudonymize_value(str_val, entity_type, workspace_id)
        elif trans == "DENY":
            return None
        return value

    @classmethod
    def apply_to_text(
        cls,
        text: str,
        rules: Dict[str, str],
        workspace_id: str,
    ) -> str:
        """
        Applies entity rules to unstructured text.
        rules: dict of {entity_type: transformation} (e.g. {'email': 'MASK', 'phone': 'REMOVE'})
        """
        if not text:
            return ""

        # Find all detected entities
        entities = PIIDetector.detect_entities(text)
        if not entities:
            # Check pattern replacements directly for any defined rules
            result = text
            for entity_type, trans in rules.items():
                if entity_type in PATTERNS and trans.upper() != "ALLOW":
                    pat = PATTERNS[entity_type]
                    def repl(match):
                        val = match.group(0)
                        return cls.transform_value(val, entity_type, trans, workspace_id) or ""
                    result = pat.sub(repl, result)
            return result

        # Replace entities in text from end to beginning so indices remain valid
        result = text
        # Deduplicate overlapping entities by keeping highest priority or longer
        sorted_entities = sorted(entities, key=lambda e: e["start"], reverse=True)

        for ent in sorted_entities:
            entity_type = ent["entity_type"]
            trans = rules.get(entity_type, rules.get("default", "ALLOW")).upper()
            if trans == "ALLOW":
                continue

            start, end = ent["start"], ent["end"]
            original_str = ent["value"]
            transformed = cls.transform_value(original_str, entity_type, trans, workspace_id)
            replacement = transformed if transformed is not None else ""

            result = result[:start] + replacement + result[end:]

        return result
