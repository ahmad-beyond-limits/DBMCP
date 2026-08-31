import re
from typing import Any, Dict, List


# Regex patterns for high-confidence entity detection
PATTERNS = {
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"),
    "phone": re.compile(
        r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    ),
    "credit_card": re.compile(
        r"\b(?:\d{4}[-\s]?){3}\d{4}\b"
    ),
    "iban": re.compile(
        r"\b[A-Z]{2}\d{2}(?:[-\s]?[0-9A-Za-z]){11,30}\b"
    ),
    "api_key": re.compile(
        r"(?:(?:sk_live_|ghp_|AKIA|eyJ[a-zA-Z0-9_-]{10,}\.eyJ)[a-zA-Z0-9_\-\.]{16,})|"
        r"(?:(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{16,})['\"]?)",
        re.IGNORECASE,
    ),
    "person_name": re.compile(
        r"(?:(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)|"
        r"(?:(?:Name|Employee|Owner|Contact|Person|User|Customer|Representative|Author):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+))",
        re.IGNORECASE,
    ),
}


class PIIDetector:
    @staticmethod
    def detect_entities(text: str) -> List[Dict[str, Any]]:
        """
        Scans text and returns detected PII entities with their positions and types.
        Output format: [{"entity_type": "email", "value": "...", "start": int, "end": int}]
        """
        entities: List[Dict[str, Any]] = []

        if not text:
            return entities

        # 1. SSN
        for m in PATTERNS["ssn"].finditer(text):
            entities.append({
                "entity_type": "ssn",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
            })

        # 2. Email
        for m in PATTERNS["email"].finditer(text):
            entities.append({
                "entity_type": "email",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
            })

        # 3. Phone
        for m in PATTERNS["phone"].finditer(text):
            val = m.group(0)
            # Avoid overlapping with SSN
            if not PATTERNS["ssn"].match(val):
                entities.append({
                    "entity_type": "phone",
                    "value": val,
                    "start": m.start(),
                    "end": m.end(),
                })

        # 4. Credit Card
        for m in PATTERNS["credit_card"].finditer(text):
            entities.append({
                "entity_type": "credit_card",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
            })

        # 5. IBAN / Bank Accounts
        for m in PATTERNS["iban"].finditer(text):
            entities.append({
                "entity_type": "iban",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
            })

        # 6. API Keys / Secrets / Tokens
        for m in PATTERNS["api_key"].finditer(text):
            val = m.group(1) if m.lastindex and m.group(1) else m.group(0)
            entities.append({
                "entity_type": "api_key",
                "value": val.strip(),
                "start": m.start(),
                "end": m.end(),
            })

        # 7. Person Name (Prefixes and labels)
        for m in PATTERNS["person_name"].finditer(text):
            val = m.group(1) if m.lastindex and m.group(1) else m.group(0)
            entities.append({
                "entity_type": "person_name",
                "value": val.strip(),
                "start": m.start(),
                "end": m.end(),
            })

        # Sort entities by start index descending to allow clean non-overlapping replacement
        entities.sort(key=lambda x: x["start"])
        return entities
