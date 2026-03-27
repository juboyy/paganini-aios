"""GraphRAG Foundation — knowledge graph for multi-hop retrieval.

Builds a lightweight entity-relationship graph on top of the existing chunk
corpus so the pipeline can answer questions that require connecting
information from multiple documents (multi-hop reasoning).

Architecture
------------
* **Entity extraction** — domain-driven NER patterns loaded from
  :class:`~core.rag.domain.DomainConfig`.  Without a domain, falls back to
  basic proper-noun / number heuristics.
* **Adjacency graph** — entity → set of chunk-ids that mention it.
* **Reverse map** — chunk-id → set of entities it contains.
* **Multi-hop traversal** — starting from the entities in the query, expand
  one hop to adjacent chunks that share those entities, then optionally
  expand a second hop.
* **Persistence** — graph stored as a single JSON file (no external DB).

Usage::

    from core.rag.graph_rag import GraphRAG
    from core.rag.domain import load_domain

    domain = load_domain(pack_name="finance")
    g = GraphRAG(graph_path="runtime/data/graph.json", domain=domain)
    g.build_from_chunks(chunks)
    g.save()

    # At query time:
    extra_chunks = g.retrieve(query, base_chunks)
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

from core.rag.domain import DomainConfig, GENERIC_DOMAIN

__all__ = [
    "EntityType",
    "Entity",
    "GraphRAG",
    "is_multi_hop_query",
]


# ---------------------------------------------------------------------------
# Entity type constants (kept for backward-compat)
# ---------------------------------------------------------------------------

EntityType = str

FUNDO = "FUNDO"
REGULACAO = "REGULACAO"
CEDENTE = "CEDENTE"
COTISTA = "COTISTA"
INDICADOR = "INDICADOR"
AGENTE = "AGENTE"

_ALL_TYPES = {FUNDO, REGULACAO, CEDENTE, COTISTA, INDICADOR, AGENTE}

# ---------------------------------------------------------------------------
# Generic fallback NER patterns (domain-agnostic)
# ---------------------------------------------------------------------------

_GENERIC_PATTERNS: list[tuple[EntityType, re.Pattern]] = [
    # Proper nouns (sequences of Title-case words)
    ("ENTITY", re.compile(
        r"\b(?:[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+){1,4})\b"
    )),
    # Years and ISO dates
    ("DATE", re.compile(r"\b20\d{2}(?:-[01]\d(?:-[0-3]\d)?)?\b")),
    # Standalone acronyms (2-6 uppercase letters)
    ("ACRONYM", re.compile(r"\b[A-Z]{2,6}\b")),
]

# Multi-hop signal keywords (language-flexible)
_MULTI_HOP_SIGNALS = re.compile(
    r"rela[cç][aã]o entre|como .+ afeta|impacto de .+ em|"
    r"quem é responsável|além disso|adicionalmente|também|"
    r"e como|qual a diferen[cç]a entre|comparando|"
    r"connect|related|affects|impacts|between .+ and|"
    r"how .+ relates|difference between|compared to",
    re.I,
)


def _compile_entity_patterns(domain: DomainConfig) -> list[tuple[EntityType, re.Pattern]]:
    """Build NER patterns from domain config, falling back to generic patterns."""
    if not domain.entity_types:
        return _GENERIC_PATTERNS

    compiled: list[tuple[EntityType, re.Pattern]] = []
    for entity_type, patterns in domain.entity_types.items():
        if not patterns:
            continue
        # Join multiple patterns for the same type with OR
        combined = "|".join(patterns)
        try:
            compiled.append((entity_type, re.compile(combined, re.I)))
        except re.error:
            # Malformed pattern in YAML — skip silently
            pass

    return compiled if compiled else _GENERIC_PATTERNS


def is_multi_hop_query(query: str) -> bool:
    """Heuristic: does this query likely require multi-hop reasoning?

    Args:
        query: User query string.

    Returns:
        ``True`` if the query likely needs graph traversal.
    """
    if _MULTI_HOP_SIGNALS.search(query):
        return True
    return False


# ---------------------------------------------------------------------------
# Entity dataclass
# ---------------------------------------------------------------------------

class Entity:
    """A named entity extracted from a chunk.

    Attributes:
        text: Raw surface form of the entity.
        entity_type: Entity type label (e.g. FUNDO, REGULACAO, …).
        normalized: Lower-cased, whitespace-collapsed form used as graph key.
    """

    __slots__ = ("text", "entity_type", "normalized")

    def __init__(self, text: str, entity_type: EntityType):
        self.text = text.strip()
        self.entity_type = entity_type
        self.normalized = re.sub(r"\s+", " ", text.strip().lower())

    def __repr__(self) -> str:
        return f"Entity({self.entity_type}: {self.text!r})"

    def to_dict(self) -> dict[str, str]:
        return {"text": self.text, "type": self.entity_type, "key": self.normalized}


# ---------------------------------------------------------------------------
# GraphRAG
# ---------------------------------------------------------------------------

class GraphRAG:
    """Knowledge graph for multi-hop RAG retrieval.

    The graph is a pair of adjacency maps:

    * ``entity_to_chunks``: entity_key → set of chunk_ids
    * ``chunk_to_entities``: chunk_id → set of entity_keys

    Args:
        graph_path: Path to the JSON file used for persistence.
        max_hops: Maximum graph traversal depth (1 or 2). Default is 1.
        max_extra_chunks: Cap on extra chunks graph traversal may add.
        domain: Optional :class:`~core.rag.domain.DomainConfig` whose
                ``entity_types`` drive NER.  When ``None``, uses generic
                proper-noun / acronym heuristics.
    """

    def __init__(
        self,
        graph_path: str | Path = "runtime/data/graph.json",
        max_hops: int = 1,
        max_extra_chunks: int = 3,
        domain: Optional[DomainConfig] = None,
    ):
        self.graph_path = Path(graph_path)
        self.max_hops = max_hops
        self.max_extra_chunks = max_extra_chunks
        self._domain = domain or GENERIC_DOMAIN
        self._patterns = _compile_entity_patterns(self._domain)

        self.entity_to_chunks: dict[str, set[str]] = defaultdict(set)
        self.chunk_to_entities: dict[str, set[str]] = defaultdict(set)
        self.entity_metadata: dict[str, dict[str, str]] = {}
        self._chunk_store: dict[str, dict[str, Any]] = {}

        self._try_load()

    # ------------------------------------------------------------------
    # Build / update
    # ------------------------------------------------------------------

    def build_from_chunks(self, chunks: list) -> dict[str, int]:
        """Extract entities from chunks and build the graph.

        Can be called incrementally — new chunks are added; existing
        chunk-ids are overwritten (idempotent).

        Args:
            chunks: :class:`~core.rag.pipeline.Chunk` objects.

        Returns:
            Stats dict: ``{"chunks_processed": N, "entities_found": M}``.
        """
        stats = {"chunks_processed": 0, "entities_found": 0}

        for chunk in chunks:
            chunk_id = self._chunk_id(chunk)
            self._chunk_store[chunk_id] = {
                "text": chunk.text,
                "source": getattr(chunk, "source", ""),
                "section": getattr(chunk, "section", ""),
                "score": getattr(chunk, "score", 0.0),
                "metadata": chunk.metadata if hasattr(chunk, "metadata") else {},
            }

            entities = self.extract_entities(chunk.text)
            for entity in entities:
                key = entity.normalized
                self.entity_to_chunks[key].add(chunk_id)
                self.chunk_to_entities[chunk_id].add(key)
                if key not in self.entity_metadata:
                    self.entity_metadata[key] = entity.to_dict()
                stats["entities_found"] += 1

            stats["chunks_processed"] += 1

        return stats

    # ------------------------------------------------------------------
    # Entity extraction
    # ------------------------------------------------------------------

    def extract_entities(self, text: str) -> list[Entity]:
        """Extract named entities from text using domain-driven patterns.

        Args:
            text: Raw text (chunk content or query).

        Returns:
            List of :class:`Entity` objects found.
        """
        entities: list[Entity] = []
        seen_keys: set[str] = set()

        for entity_type, pattern in self._patterns:
            for match in pattern.finditer(text):
                raw = match.group(0).strip()
                raw = re.sub(r"\s+", " ", raw)
                raw = raw.rstrip(".,;:")
                if len(raw) < 3:
                    continue
                key = raw.lower()
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                entities.append(Entity(raw, entity_type))

        return entities

    # ------------------------------------------------------------------
    # Retrieval / traversal
    # ------------------------------------------------------------------

    def retrieve(
        self,
        query: str,
        base_chunks: list,
        force: bool = False,
    ) -> list:
        """Return additional chunks found through graph traversal.

        Args:
            query: User query (used for entity extraction).
            base_chunks: Chunks already retrieved by the main pipeline.
            force: If ``True``, skip the :func:`is_multi_hop_query` check.

        Returns:
            List of additional chunk-like objects.  May be empty.
        """
        if not force and not is_multi_hop_query(query):
            return []

        query_entities = self.extract_entities(query)
        if not query_entities:
            return []

        base_ids: set[str] = {self._chunk_id(c) for c in base_chunks}
        candidate_ids: set[str] = set()

        for entity in query_entities:
            related = self.entity_to_chunks.get(entity.normalized, set())
            candidate_ids.update(related - base_ids)

        if self.max_hops >= 2 and candidate_ids:
            hop2_ids: set[str] = set()
            for cid in candidate_ids:
                for ekey in self.chunk_to_entities.get(cid, set()):
                    hop2_ids.update(self.entity_to_chunks.get(ekey, set()))
            candidate_ids.update(hop2_ids - base_ids - candidate_ids)

        result = []
        for cid in list(candidate_ids)[: self.max_extra_chunks]:
            stored = self._chunk_store.get(cid)
            if stored:
                result.append(_StoredChunk(cid, stored))

        return result

    def entity_neighbours(self, entity_key: str) -> list[str]:
        """Return all chunk-ids that mention a given entity."""
        return list(self.entity_to_chunks.get(entity_key.lower(), []))

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self) -> None:
        """Persist the graph to :attr:`graph_path` as JSON."""
        self.graph_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "entity_to_chunks": {k: list(v) for k, v in self.entity_to_chunks.items()},
            "chunk_to_entities": {k: list(v) for k, v in self.chunk_to_entities.items()},
            "entity_metadata": self.entity_metadata,
            "chunk_store": self._chunk_store,
        }
        self.graph_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def _try_load(self) -> None:
        """Load the graph from disk if the file exists."""
        if not self.graph_path.exists():
            return
        try:
            data = json.loads(self.graph_path.read_text(encoding="utf-8"))
            self.entity_to_chunks = defaultdict(set, {
                k: set(v) for k, v in data.get("entity_to_chunks", {}).items()
            })
            self.chunk_to_entities = defaultdict(set, {
                k: set(v) for k, v in data.get("chunk_to_entities", {}).items()
            })
            self.entity_metadata = data.get("entity_metadata", {})
            self._chunk_store = data.get("chunk_store", {})
        except (json.JSONDecodeError, KeyError):
            pass

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------

    def stats(self) -> dict[str, int]:
        """Return graph statistics."""
        type_counts: dict[str, int] = defaultdict(int)
        for meta in self.entity_metadata.values():
            type_counts[meta.get("type", "UNKNOWN")] += 1
        return {
            "total_entities": len(self.entity_metadata),
            "total_chunks_indexed": len(self._chunk_store),
            "total_edges": sum(len(v) for v in self.entity_to_chunks.values()),
            **{f"entities_{k.lower()}": v for k, v in type_counts.items()},
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _chunk_id(chunk) -> str:
        """Derive a stable ID from chunk source + section + text prefix."""
        import hashlib
        source = getattr(chunk, "source", "")
        section = getattr(chunk, "section", "")
        text_prefix = chunk.text[:100] if hasattr(chunk, "text") else str(chunk)[:100]
        return hashlib.md5(f"{source}:{section}:{text_prefix}".encode()).hexdigest()


# ---------------------------------------------------------------------------
# Lightweight chunk adapter for graph-retrieved results
# ---------------------------------------------------------------------------

class _StoredChunk:
    """Minimal Chunk-compatible object built from the graph's chunk store."""

    def __init__(self, chunk_id: str, data: dict[str, Any]):
        self.id = chunk_id
        self.text = data.get("text", "")
        self.source = data.get("source", "graph")
        self.section = data.get("section", "")
        self.score = data.get("score", 0.3)
        self.metadata = data.get("metadata", {})
        self.metadata["graph_retrieved"] = True

    def __repr__(self) -> str:
        return f"_StoredChunk({self.source}:{self.section}, {len(self.text)} chars)"
