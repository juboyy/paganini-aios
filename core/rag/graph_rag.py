"""GraphRAG Foundation — knowledge graph for multi-hop retrieval.

Builds a lightweight entity-relationship graph on top of the existing chunk
corpus so the pipeline can answer questions that require connecting
information from multiple documents (multi-hop reasoning).

Architecture
------------
* **Entity extraction** — rule-based NER for Brazilian financial domain
  (FUNDO, REGULACAO, CEDENTE, COTISTA, INDICADOR, AGENTE).
* **Adjacency graph** — entity → set of chunk-ids that mention it.
* **Reverse map** — chunk-id → set of entities it contains.
* **Multi-hop traversal** — starting from the entities in the query, expand
  one hop to adjacent chunks that share those entities, then optionally
  expand a second hop.
* **Persistence** — graph stored as a single JSON file (no external DB).

Usage::

    from core.rag.graph_rag import GraphRAG

    g = GraphRAG(graph_path="runtime/data/graph.json")
    g.build_from_chunks(chunks)          # called after ingest
    g.save()

    # At query time:
    extra_chunks = g.retrieve(query, base_chunks, chunk_store)
    # extra_chunks: additional Chunk objects via graph traversal
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

__all__ = [
    "EntityType",
    "Entity",
    "GraphRAG",
    "is_multi_hop_query",
]

# ---------------------------------------------------------------------------
# Entity types
# ---------------------------------------------------------------------------

EntityType = str  # one of the constants below

FUNDO = "FUNDO"
REGULACAO = "REGULACAO"
CEDENTE = "CEDENTE"
COTISTA = "COTISTA"
INDICADOR = "INDICADOR"
AGENTE = "AGENTE"

_ALL_TYPES = {FUNDO, REGULACAO, CEDENTE, COTISTA, INDICADOR, AGENTE}

# ---------------------------------------------------------------------------
# NER patterns — Brazilian financial domain, Portuguese-first
# ---------------------------------------------------------------------------

_PATTERNS: list[tuple[EntityType, re.Pattern]] = [
    # Fundos de investimento
    (FUNDO, re.compile(
        r"FIDC\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)"
        r"|FUNDO\s+(?:DE\s+)?INVEST\w+\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)"
        r"|FII\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)"
        r"|FICFIDC\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)",
        re.I,
    )),
    # Regulatory instruments
    (REGULACAO, re.compile(
        r"Instru[çc][ãa]o CVM\s*n[°º.]?\s*\d+"
        r"|Resolu[çc][ãa]o\s+(?:CMN|CVM|BACEN)\s*n[°º.]?\s*\d+"
        r"|Circular BACEN\s*n[°º.]?\s*\d+"
        r"|Lei\s+(?:Federal\s+)?n[°º.]?\s*[\d\.]+(?:/\d{4})?"
        r"|ICVM[\s-]?\d+",
        re.I,
    )),
    # Cedentes / originators
    (CEDENTE, re.compile(
        r"cedente[s]?\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)"
        r"|originador\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)",
        re.I,
    )),
    # Cotistas / investors
    (COTISTA, re.compile(
        r"cotista[s]?\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)"
        r"|investidor\s+(?:qualificado|profissional|institucional)\s+[\w\s\-\.]+?(?=\s*[,;:\|\n]|$)",
        re.I,
    )),
    # Financial indicators
    (INDICADOR, re.compile(
        r"\b(?:CDI|IPCA|IGP-M|SELIC|DI|TJLP|TR|INPC)\b"
        r"|\bCDI[+\-]\s*[\d,\.]+%"
        r"|\bIPCA[+\-]\s*[\d,\.]+%",
        re.I,
    )),
    # Market participants / agents
    (AGENTE, re.compile(
        r"(?:Administrador|Gestora?|Custodiante|Auditor|Agente\s+Fiduci[aá]rio|"
        r"Coordenador\s+L[ií]der|Distribuidora|Estruturador)\s+"
        r"(?:[A-Z][A-Za-z\s]+?(?:\s+(?:S\.A\.|DTVM|CTVM|Ltda\.?))?)"
        r"(?=\s*[,;:\|\n]|$)",
        re.I,
    )),
]

# Multi-hop signal keywords
_MULTI_HOP_SIGNALS = re.compile(
    r"rela[cç][aã]o entre|como .+ afeta|impacto de .+ em|"
    r"quem é responsável|além disso|adicionalmente|também|"
    r"e como|qual a diferen[cç]a entre|comparando|"
    r"connect|related|affects|impacts|between .+ and",
    re.I,
)


def is_multi_hop_query(query: str) -> bool:
    """Heuristic: does this query likely require multi-hop reasoning?

    Checks for connective language, comparative structures, and mentions
    of multiple distinct entities.

    Args:
        query: User query string.

    Returns:
        ``True`` if the query likely needs graph traversal.
    """
    if _MULTI_HOP_SIGNALS.search(query):
        return True
    # If the query mentions 2+ distinct fund/regulation names, likely multi-hop
    entity_hits = sum(1 for _, pat in _PATTERNS if pat.search(query))
    return entity_hits >= 2


# ---------------------------------------------------------------------------
# Entity dataclass
# ---------------------------------------------------------------------------

class Entity:
    """A named entity extracted from a chunk.

    Attributes:
        text: Raw surface form of the entity.
        entity_type: One of the EntityType constants (FUNDO, REGULACAO, …).
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

    These are stored as a JSON file for zero-dependency persistence.

    Args:
        graph_path: Path to the JSON file used for persistence.
                    Created automatically on first :meth:`save`.
        max_hops: Maximum graph traversal depth (1 or 2). Default is 1.
        max_extra_chunks: Cap on how many extra chunks graph traversal may
                         add to the result set.
    """

    def __init__(
        self,
        graph_path: str | Path = "runtime/data/graph.json",
        max_hops: int = 1,
        max_extra_chunks: int = 3,
    ):
        self.graph_path = Path(graph_path)
        self.max_hops = max_hops
        self.max_extra_chunks = max_extra_chunks

        # Core graph structures
        self.entity_to_chunks: dict[str, set[str]] = defaultdict(set)
        self.chunk_to_entities: dict[str, set[str]] = defaultdict(set)
        self.entity_metadata: dict[str, dict[str, str]] = {}  # key → {text, type}

        # Chunk store: chunk_id → chunk text + metadata (populated during build)
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

    @staticmethod
    def extract_entities(text: str) -> list[Entity]:
        """Extract named entities from text using rule-based patterns.

        Args:
            text: Raw text (chunk content or query).

        Returns:
            List of :class:`Entity` objects found.
        """
        entities: list[Entity] = []
        seen_keys: set[str] = set()

        for entity_type, pattern in _PATTERNS:
            for match in pattern.finditer(text):
                raw = match.group(0).strip()
                # Basic cleaning: collapse whitespace, strip trailing punctuation
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
                         Used to avoid duplicates.
            force: If ``True``, skip the :func:`is_multi_hop_query` check
                   and always perform graph traversal.

        Returns:
            List of additional :class:`~core.rag.pipeline.Chunk`-like objects
            (plain dicts with ``.text``, ``.source``, etc. attributes set via
            a lightweight adapter).  May be empty if nothing new is found.
        """
        if not force and not is_multi_hop_query(query):
            return []

        # Extract entities from the query
        query_entities = self.extract_entities(query)
        if not query_entities:
            return []

        # Seed: chunk-ids from base results
        base_ids: set[str] = {self._chunk_id(c) for c in base_chunks}
        candidate_ids: set[str] = set()

        # Hop 1: find chunks that share query entities
        for entity in query_entities:
            related = self.entity_to_chunks.get(entity.normalized, set())
            candidate_ids.update(related - base_ids)

        if self.max_hops >= 2 and candidate_ids:
            # Hop 2: from hop-1 chunks, collect their entities, then expand again
            hop2_ids: set[str] = set()
            for cid in candidate_ids:
                for ekey in self.chunk_to_entities.get(cid, set()):
                    hop2_ids.update(self.entity_to_chunks.get(ekey, set()))
            candidate_ids.update(hop2_ids - base_ids - candidate_ids)

        # Build result chunks from store, capped at max_extra_chunks
        result = []
        for cid in list(candidate_ids)[: self.max_extra_chunks]:
            stored = self._chunk_store.get(cid)
            if stored:
                result.append(_StoredChunk(cid, stored))

        return result

    def entity_neighbours(self, entity_key: str) -> list[str]:
        """Return all chunk-ids that mention a given entity.

        Args:
            entity_key: Normalised entity key (lower-cased surface form).

        Returns:
            List of chunk-ids.
        """
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
        self.graph_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

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
            pass  # Corrupt file — start fresh

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
        self.score = data.get("score", 0.3)  # graph-retrieved → moderate confidence
        self.metadata = data.get("metadata", {})
        self.metadata["graph_retrieved"] = True

    def __repr__(self) -> str:
        return f"_StoredChunk({self.source}:{self.section}, {len(self.text)} chars)"
