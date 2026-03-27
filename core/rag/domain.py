"""Domain configuration for pack-driven RAG modules.

Pack authors supply a ``DomainConfig`` — either by instantiating it directly or
by loading a YAML file from a pack directory.  The RAG modules consume a
``DomainConfig`` at construction time and use it instead of hardcoded knowledge.

Quickstart::

    from core.rag.domain import load_domain

    # FIDC pack
    domain = load_domain(pack_name="finance")

    # Generic (no domain knowledge, everything still works)
    domain = load_domain()

    # Explicit YAML path
    domain = load_domain(config_path="/path/to/rag_domain.yaml")
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

__all__ = [
    "DomainConfig",
    "load_domain",
    "GENERIC_DOMAIN",
]


# ---------------------------------------------------------------------------
# DomainConfig schema
# ---------------------------------------------------------------------------

@dataclass
class DomainConfig:
    """All domain-specific knowledge consumed by the RAG modules.

    Every field has a sane default so the core pipeline works out-of-the-box
    without any pack — just with reduced domain precision.

    Attributes:
        name: Short identifier for the domain (``"fidc"``, ``"legal"``, …).
        language: BCP 47 language tag (``"pt-BR"``, ``"en-US"``, …).

        doc_types: Ordered list of document type labels the domain recognises.
        doc_type_patterns: Map of label → list of substring patterns used by
            :mod:`~core.rag.chunk_headers` to detect the document type.

        synonyms: Map of canonical term → list of synonyms used by
            :mod:`~core.rag.multi_query` to expand queries.

        regulatory_bodies: List of authority acronyms (e.g. ``["CVM", "ANBIMA"]``).
        regulatory_patterns: Map of authority acronym → list of patterns used by
            :mod:`~core.rag.metadata_filter` and :mod:`~core.rag.chunk_headers`.

        domain_terms: List of domain-specific terms that receive a bonus score in
            :mod:`~core.rag.reranker`.

        entity_types: Map of entity type label → list of regex pattern strings
            used by :mod:`~core.rag.graph_rag` for NER.
    """

    name: str = "generic"
    language: str = "en"

    # chunk_headers
    doc_types: list[str] = field(default_factory=list)
    doc_type_patterns: dict[str, list[str]] = field(default_factory=dict)

    # multi_query
    synonyms: dict[str, list[str]] = field(default_factory=dict)

    # metadata_filter
    regulatory_bodies: list[str] = field(default_factory=list)
    regulatory_patterns: dict[str, list[str]] = field(default_factory=dict)

    # reranker
    domain_terms: list[str] = field(default_factory=list)

    # graph_rag
    entity_types: dict[str, list[str]] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Generic (empty) domain — works for any corpus with zero domain knowledge
# ---------------------------------------------------------------------------

GENERIC_DOMAIN = DomainConfig(
    name="generic",
    language="en",
    doc_types=[],
    doc_type_patterns={},
    synonyms={},
    regulatory_bodies=[],
    regulatory_patterns={},
    domain_terms=[],
    entity_types={},
)


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_domain(
    pack_name: Optional[str] = None,
    config_path: Optional[str] = None,
    packs_root: Optional[str] = None,
) -> DomainConfig:
    """Load a :class:`DomainConfig` from a pack YAML file.

    Resolution order:

    1. If *config_path* is given, load that file directly.
    2. If *pack_name* is given, look for
       ``<packs_root>/<pack_name>/rag_domain.yaml``.
       *packs_root* defaults to the ``packs/`` directory alongside this
       package (i.e. ``<repo_root>/packs/``).
    3. If neither is given, return :data:`GENERIC_DOMAIN` (no domain).

    Args:
        pack_name: Name of the pack directory under *packs_root*
                   (e.g. ``"finance"``).
        config_path: Absolute or relative path to a YAML config file.
        packs_root: Override the default packs root directory.

    Returns:
        A fully populated :class:`DomainConfig`.

    Raises:
        FileNotFoundError: When the resolved YAML file does not exist.
        ValueError: When the YAML is structurally invalid.
    """
    if config_path is None and pack_name is None:
        return GENERIC_DOMAIN

    if config_path is None:
        # Resolve packs root: <this_file>/../../packs/
        if packs_root is None:
            here = Path(__file__).resolve().parent          # core/rag/
            repo_root = here.parent.parent                  # <project root>
            packs_root = str(repo_root / "packs")
        config_path = str(Path(packs_root) / pack_name / "rag_domain.yaml")

    yaml_path = Path(config_path)
    if not yaml_path.exists():
        raise FileNotFoundError(
            f"Domain config not found: {yaml_path}\n"
            f"Create it or call load_domain() without arguments for the generic domain."
        )

    try:
        import yaml  # type: ignore
    except ImportError as exc:
        raise ImportError(
            "PyYAML is required to load domain configs: pip install pyyaml"
        ) from exc

    raw: dict = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}

    if not isinstance(raw, dict):
        raise ValueError(f"Expected a YAML mapping at the root of {yaml_path}")

    return DomainConfig(
        name=str(raw.get("name", pack_name or "generic")),
        language=str(raw.get("language", "en")),
        doc_types=_as_str_list(raw.get("doc_types", [])),
        doc_type_patterns=_as_str_list_dict(raw.get("doc_type_patterns", {})),
        synonyms=_as_str_list_dict(raw.get("synonyms", {})),
        regulatory_bodies=_as_str_list(raw.get("regulatory_bodies", [])),
        regulatory_patterns=_as_str_list_dict(raw.get("regulatory_patterns", {})),
        domain_terms=_as_str_list(raw.get("domain_terms", [])),
        entity_types=_as_str_list_dict(raw.get("entity_types", {})),
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _as_str_list(value: object) -> list[str]:
    """Coerce a YAML value to a flat list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str):
        return [value]
    return [str(value)]


def _as_str_list_dict(value: object) -> dict[str, list[str]]:
    """Coerce a YAML mapping to ``{str: [str, ...]}``."""
    if not isinstance(value, dict):
        return {}
    result: dict[str, list[str]] = {}
    for k, v in value.items():
        result[str(k)] = _as_str_list(v)
    return result
