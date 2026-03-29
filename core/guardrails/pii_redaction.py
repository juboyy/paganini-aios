"""Paganini Guardrail Gate — PII Redaction (PRE-LLM).

Redacts sensitive Brazilian PII from queries before they reach the LLM.
This is a hard non-negotiable gate for finance compliance.

Patterns covered:
  - CPF: XXX.XXX.XXX-XX (formatted) or 11 raw digits (validated)
  - CNPJ: XX.XXX.XXX/XXXX-XX (formatted) or 14 raw digits
  - Phone: +55 XX XXXXX-XXXX, (XX) XXXXX-XXXX, etc.
  - Email: standard RFC-5321 pattern
  - Bank account: agência XXXX / conta XXXXX-X context patterns
  - Card numbers: 16-digit groups (with optional separators)
  - Brazilian RG: XX.XXX.XXX-X or with RG prefix

Placeholders use the form [TYPE_REDACTED_N] so they are reversible.
The mapping is stored in context["_pii_map"] — never sent to LLM.
"""

from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Optional

from core.guardrails.base import GateResult, GuardrailGate

logger = logging.getLogger("paganini.guardrails.pii")

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class RedactedItem:
    """Record of a single PII instance that was redacted."""

    placeholder: str          # e.g. "[CPF_REDACTED_1]"
    pii_type: str             # e.g. "CPF"
    original_value: str       # the raw string that was matched
    start: int                # character offset in original text
    end: int                  # character offset in original text
    counter: int              # sequential number for this type


# ---------------------------------------------------------------------------
# CPF / CNPJ validators (checksum-based to reduce false positives)
# ---------------------------------------------------------------------------


def _validate_cpf(digits: str) -> bool:
    """Return True if *digits* (11-char string) has a valid CPF checksum."""
    if len(digits) != 11 or digits == digits[0] * 11:
        return False
    for i in range(9, 11):
        total = sum(int(digits[j]) * ((i + 1) - j) for j in range(i))
        if int(digits[i]) != (total * 10 % 11) % 10:
            return False
    return True


def _validate_cnpj(digits: str) -> bool:
    """Return True if *digits* (14-char string) has a valid CNPJ checksum."""
    if len(digits) != 14 or digits == digits[0] * 14:
        return False
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6] + weights1
    for weights, idx in ((weights1, 12), (weights2, 13)):
        total = sum(int(digits[i]) * weights[i] for i in range(len(weights)))
        remainder = total % 11
        expected = 0 if remainder < 2 else 11 - remainder
        if int(digits[idx]) != expected:
            return False
    return True


# ---------------------------------------------------------------------------
# Regex pattern registry
# ---------------------------------------------------------------------------

# Each entry: (name, compiled_pattern, validate_fn_or_None)
# Patterns are ordered from most specific to least specific to avoid
# double-matching (e.g., CNPJ before raw 14-digit fallback).

_PATTERNS: list[tuple[str, re.Pattern, Optional[callable]]] = [
    # CPF formatted: 000.000.000-00
    (
        "CPF",
        re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"),
        lambda m: _validate_cpf(re.sub(r"\D", "", m)),
    ),
    # CNPJ formatted: 00.000.000/0000-00
    (
        "CNPJ",
        re.compile(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b"),
        lambda m: _validate_cnpj(re.sub(r"\D", "", m)),
    ),
    # RG formatted with prefix: RG 12.345.678-9
    (
        "RG",
        re.compile(
            r"\b(?:RG|R\.G\.)\s*:?\s*\d{1,2}\.?\d{3}\.?\d{3}[-\s]?\d?\b",
            re.IGNORECASE,
        ),
        None,
    ),
    # RG formatted standalone: 12.345.678-9
    (
        "RG",
        re.compile(r"\b\d{2}\.\d{3}\.\d{3}-\d\b"),
        None,
    ),
    # Brazilian phone: requires either a +55 prefix, parenthesised DDD,
    # or a hyphen/space separator between the two number groups — so that
    # raw digit-only strings like CPFs are not false-positively matched.
    (
        "PHONE",
        re.compile(
            r"""
            (?:
                \+55\s?(?:\(?\d{2}\)?\s?)(?:9\d{4}|\d{4,5})[-\s]?\d{4}  # +55 prefix
              | \(\d{2}\)\s?(?:9\d{4}|\d{4,5})[-\s]?\d{4}                # (DDD) format
              | \d{2}\s(?:9\d{4}|\d{4,5})[-\s]\d{4}                       # DDD with space then separator
            )
            \b
            """,
            re.VERBOSE,
        ),
        None,
    ),
    # Email
    (
        "EMAIL",
        re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"),
        None,
    ),
    # Bank agency: agência 1234 / ag. 1234
    (
        "BANK_AGENCY",
        re.compile(
            r"ag[eê]ncia\s*:?\s*\d{4}(?:-\d)?",
            re.IGNORECASE,
        ),
        None,
    ),
    # Bank account: conta 12345-6
    (
        "BANK_ACCOUNT",
        re.compile(
            r"conta\s*(?:corrente|poupan[cç]a)?\s*:?\s*\d{5,12}[-\s]?\d?\b",
            re.IGNORECASE,
        ),
        None,
    ),
    # Credit/debit card: 16 digits in groups of 4
    (
        "CARD",
        re.compile(
            r"\b(?:\d{4}[-\s]){3}\d{4}\b"
        ),
        None,
    ),
    # CPF raw: exactly 11 consecutive digits (validated)
    (
        "CPF",
        re.compile(r"(?<!\d)\d{11}(?!\d)"),
        lambda m: _validate_cpf(m),
    ),
    # CNPJ raw: exactly 14 consecutive digits (validated)
    (
        "CNPJ",
        re.compile(r"(?<!\d)\d{14}(?!\d)"),
        lambda m: _validate_cnpj(m),
    ),
]


# ---------------------------------------------------------------------------
# Core redaction logic
# ---------------------------------------------------------------------------


def redact_text(text: str) -> tuple[str, list[RedactedItem]]:
    """Scan *text* for PII and replace each match with a placeholder.

    Returns:
        A tuple of (redacted_text, list_of_redacted_items).
        The list preserves encounter order and can be used to restore the
        original text via :func:`restore_text`.
    """
    if not text:
        return text, []

    # Track which character spans are already redacted to avoid double-hits.
    occupied: list[tuple[int, int]] = []
    items: list[RedactedItem] = []
    # counters per PII type
    counters: dict[str, int] = {}

    # Collect all raw matches first, then resolve conflicts.
    raw_matches: list[tuple[int, int, str, str]] = []  # (start, end, type, original)

    for pii_type, pattern, validator in _PATTERNS:
        for m in pattern.finditer(text):
            original = m.group()
            if validator and not validator(original):
                continue
            raw_matches.append((m.start(), m.end(), pii_type, original))

    # Sort by start position; on tie prefer longer (more specific) match.
    raw_matches.sort(key=lambda x: (x[0], -(x[1] - x[0])))

    for start, end, pii_type, original in raw_matches:
        # Skip if overlaps an already-occupied span.
        if any(s < end and start < e for s, e in occupied):
            continue

        counters[pii_type] = counters.get(pii_type, 0) + 1
        placeholder = f"[{pii_type}_REDACTED_{counters[pii_type]}]"
        items.append(
            RedactedItem(
                placeholder=placeholder,
                pii_type=pii_type,
                original_value=original,
                start=start,
                end=end,
                counter=counters[pii_type],
            )
        )
        occupied.append((start, end))

    # Build redacted string by replacing from right to left (preserves offsets).
    if not items:
        return text, items

    result = text
    for item in sorted(items, key=lambda x: x.start, reverse=True):
        result = result[: item.start] + item.placeholder + result[item.end :]

    return result, items


def restore_text(text: str, items: list[RedactedItem]) -> str:
    """Replace placeholders in *text* with the original PII values.

    Useful for audit purposes only — never call this before sending to LLM.
    """
    for item in items:
        text = text.replace(item.placeholder, item.original_value, 1)
    return text


# ---------------------------------------------------------------------------
# GuardrailGate implementation
# ---------------------------------------------------------------------------


class PIIRedactionGate(GuardrailGate):
    """Pre-LLM gate: redacts Brazilian PII from the query.

    After passing, the redacted query is stored in
    ``context["query_redacted"]`` and the PII mapping in
    ``context["_pii_map"]`` (never forwarded to the LLM).

    The gate always passes (it is a transform, not a block) unless
    *block_on_pii* is True, in which case the presence of PII causes a
    hard block — useful for strict-mode deployments.
    """

    _lock: threading.Lock = threading.Lock()

    def __init__(self, block_on_pii: bool = False) -> None:
        """
        Args:
            block_on_pii: If True, block the pipeline when PII is found
                instead of transparently redacting it.
        """
        self._block_on_pii = block_on_pii

    @property
    def name(self) -> str:
        return "pii_redaction"

    @property
    def description(self) -> str:
        return "Redacts Brazilian PII (CPF, CNPJ, phone, email, …) before LLM"

    def check(self, query: str, context: dict) -> GateResult:
        """Redact PII from *query* and store results in *context*.

        Mutates *context* in-place:
          - ``context["query_redacted"]``: the sanitised query string
          - ``context["_pii_map"]``: list of :class:`RedactedItem` objects

        Returns:
            GateResult — always passed=True unless *block_on_pii* is set
            and PII was found.
        """
        redacted, items = redact_text(query)

        with self._lock:
            context["query_redacted"] = redacted
            context["_pii_map"] = items

        if items:
            types_found = sorted({i.pii_type for i in items})
            summary = ", ".join(f"{t}×{sum(1 for x in items if x.pii_type == t)}" for t in types_found)
            logger.warning(
                "PII redacted [gate=pii_redaction types=%s count=%d]",
                summary,
                len(items),
            )
            _audit(query[:40] + "…" if len(query) > 40 else query, items)

            if self._block_on_pii:
                return GateResult(
                    gate_name=self.name,
                    passed=False,
                    reason=f"Query contains PII: {summary}",
                    details={
                        "pii_types": types_found,
                        "pii_count": len(items),
                        "redacted_query": redacted,
                    },
                )

        return GateResult(
            gate_name=self.name,
            passed=True,
            reason="" if not items else f"Redacted {len(items)} PII item(s)",
            details={
                "pii_found": len(items),
                "pii_types": sorted({i.pii_type for i in items}),
            },
        )


# ---------------------------------------------------------------------------
# Audit trail (in-process ring buffer — production should forward to SIEM)
# ---------------------------------------------------------------------------

_audit_log: list[dict] = []
_audit_lock = threading.Lock()
_MAX_AUDIT = 500


def _audit(query_snippet: str, items: list[RedactedItem]) -> None:
    entry = {
        "ts": time.time(),
        "query_snippet": query_snippet,
        "redacted": [
            {"type": i.pii_type, "placeholder": i.placeholder}
            for i in items
        ],
    }
    with _audit_lock:
        _audit_log.append(entry)
        if len(_audit_log) > _MAX_AUDIT:
            _audit_log[:] = _audit_log[-_MAX_AUDIT // 2 :]


def get_audit_log() -> list[dict]:
    """Return a copy of the PII redaction audit log."""
    with _audit_lock:
        return list(_audit_log)
