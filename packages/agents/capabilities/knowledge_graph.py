"""
knowledge_graph.py — Entity Extraction and Graph Management for FIDC documents.

Implements rule-based NER, relationship inference, graph storage (in-memory adjacency),
entity resolution, and graph traversal — all without external dependencies.
"""

from __future__ import annotations

import re
import uuid
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class Entity:
    """A named entity extracted from a financial document."""
    id: str
    entity_type: str          # COMPANY | PERSON | REGULATION | OBLIGATION | FUND | AMOUNT | DATE | CNPJ
    value: str                # Canonical surface form
    normalized: str           # Normalised key (uppercase, stripped)
    cnpj: Optional[str]       # CNPJ if applicable
    source_doc: str           # Source document identifier
    span_start: int           # Character offset start
    span_end: int             # Character offset end
    confidence: float         # [0, 1]
    metadata: dict = field(default_factory=dict)

    def __hash__(self):
        return hash(self.id)

    def __eq__(self, other):
        return isinstance(other, Entity) and self.id == other.id


@dataclass
class Relationship:
    """A directed relationship between two entities."""
    id: str
    source_id: str            # Entity.id of subject
    target_id: str            # Entity.id of object
    relation_type: str        # administers | regulates | owes | guarantees | controls | reports_to
    confidence: float
    evidence: str             # Text snippet supporting inference
    metadata: dict = field(default_factory=dict)


@dataclass
class IngestResult:
    """Result of document ingestion pipeline."""
    document_id: str
    source: str
    entities_extracted: int
    entities_after_dedup: int
    relationships_built: int
    new_entities: int
    new_relationships: int
    duration_ms: float
    entity_types: dict[str, int]
    errors: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class KnowledgeGraphAgent:
    """
    Knowledge graph agent for FIDC regulatory and operational documents.

    Stores entities and relationships in an in-memory adjacency structure.
    Designed to be persisted externally (serialise graph to JSON/DB).

    Entity types recognised:
        COMPANY    — Razão social, Ltda, S.A., EIRELI, ME, etc.
        PERSON     — CPF pattern or proper-name heuristics
        REGULATION — CVM/BACEN/ANBIMA norms and resolutions
        OBLIGATION — Obligation and covenant mentions
        FUND       — FIDC fund names
        AMOUNT     — BRL monetary amounts
        DATE       — Dates in BR formats
        CNPJ       — Brazilian company tax ID
    """

    # ------------------------------------------------------------------ #
    # NER patterns (compiled once)                                        #
    # ------------------------------------------------------------------ #

    _PATTERNS: dict[str, list[re.Pattern]] = {
        "CNPJ": [
            re.compile(r"\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}\b"),
        ],
        "AMOUNT": [
            re.compile(r"R\$\s*[\d.,]+(?:\s*(?:mil(?:hões|hão)?|bilh(?:ões|ão)?))?", re.IGNORECASE),
            re.compile(r"\b[\d]{1,3}(?:\.\d{3})*,\d{2}\b"),
        ],
        "DATE": [
            re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"),
            re.compile(r"\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}\b", re.IGNORECASE),
        ],
        "REGULATION": [
            re.compile(r"\bCVM\s+(?:Instrução|Resolução|Deliberação|Ofício|Circular)\s+[Nn]?[º°]?\s*\d+(?:[/-]\d+)?", re.IGNORECASE),
            re.compile(r"\bResolução\s+CVM\s+[Nn]?[º°]?\s*\d+", re.IGNORECASE),
            re.compile(r"\bBACEN\s+(?:Resolução|Circular|Carta-Circular)\s+[Nn]?[º°]?\s*\d+", re.IGNORECASE),
            re.compile(r"\bANBIMA\s+(?:Código|Deliberação)\s+\S+", re.IGNORECASE),
            re.compile(r"\bLei\s+(?:Complementar\s+)?[Nn]?[º°]?\s*\d{4,5}(?:/\d{2,4})?", re.IGNORECASE),
            re.compile(r"\bINSTRUÇÃO\s+CVM\s+\d+", re.IGNORECASE),
        ],
        "FUND": [
            re.compile(r"\bFIDC\s+[\w\s-]{2,40}", re.IGNORECASE),
            re.compile(r"Fundo\s+de\s+Investimento\s+em\s+Direitos\s+Credit[oó]rios\s+[\w\s-]{2,40}", re.IGNORECASE),
            re.compile(r"Fundo\s+de\s+Investimento\s+[\w\s-]{2,30}", re.IGNORECASE),
        ],
        "COMPANY": [
            re.compile(r"\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ&][a-záàâãéêíóôõúçA-Z&]{1,})*\s+(?:S\.A\.|S/A|Ltda\.?|LTDA\.?|EIRELI|ME|EPP|S\.A\.|S\.C\.A\.|CIA|Cia\.)\b"),
        ],
        "PERSON": [
            # CPF pattern
            re.compile(r"\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b"),
            # Common name patterns for Brazilian names (simplified)
            re.compile(r"\b(?:Sr\.|Sra\.|Dr\.|Dra\.)\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+){1,4}\b"),
        ],
        "OBLIGATION": [
            re.compile(r"\b(?:obrigação|dívida|débito|crédito|nota promiss[oó]ria|CRI|CRA|debenture|debênture)\b", re.IGNORECASE),
            re.compile(r"\bcovenant\b", re.IGNORECASE),
            re.compile(r"\bratio\s+de\s+\w+", re.IGNORECASE),
        ],
    }

    # Relationship trigger words
    _RELATION_TRIGGERS: dict[str, list[str]] = {
        "administers":  ["administra", "administrado por", "gestora", "gestor"],
        "regulates":    ["regulamenta", "regulado por", "supervisiona", "fiscaliza"],
        "owes":         ["deve", "devedor", "inadimplente", "sacado"],
        "guarantees":   ["garante", "garantia", "fiador", "avalista"],
        "controls":     ["controla", "controlador", "acionista majoritário", "sócio"],
        "reports_to":   ["reporta", "informa", "prestação de contas", "cedente"],
    }

    def __init__(self):
        # In-memory graph
        self._entities: dict[str, Entity] = {}          # id → Entity
        self._relationships: dict[str, Relationship] = {}  # id → Relationship
        # Index: normalized_value → Entity.id  (for dedup)
        self._entity_index: dict[str, str] = {}
        # CNPJ index
        self._cnpj_index: dict[str, str] = {}
        # Adjacency: entity_id → list of Relationship.id
        self._adjacency: dict[str, list[str]] = {}

    # ------------------------------------------------------------------ #
    # Core entry point                                                     #
    # ------------------------------------------------------------------ #

    def execute(self, task: str, context: dict, chunks: list) -> dict:
        """
        Main dispatch. Ingests all chunks and returns graph stats.

        Args:
            task: Task description
            context: Context dict (fund info, doc metadata)
            chunks: List of {'text': str, 'source': str, 'metadata': dict}

        Returns:
            dict with status, ingested_docs, stats, summary
        """
        ingest_results = []
        for chunk in chunks:
            text     = chunk.get("text", "")
            source   = chunk.get("source", "unknown")
            metadata = chunk.get("metadata", {})
            if text.strip():
                res = self.ingest_document(text, source, metadata)
                ingest_results.append(res)

        # Demo: ingest sample if no chunks
        if not chunks:
            res = self.ingest_document(DEMO_DOCUMENT, "demo_cvm_circular", {"type": "regulatory"})
            ingest_results.append(res)

        stats = self.get_graph_stats()
        return {
            "status": "ok",
            "ingested_docs": len(ingest_results),
            "stats": stats,
            "summary": (
                f"Graph: {stats['total_entities']} entities, "
                f"{stats['total_relationships']} relationships"
            ),
        }

    # ------------------------------------------------------------------ #
    # 1. Entity Extraction (NER)                                           #
    # ------------------------------------------------------------------ #

    def extract_entities(
        self,
        text: str,
        doc_type: str = "regulatory",
    ) -> list[Entity]:
        """
        Rule-based NER for Brazilian financial documents.

        Priority order: CNPJ → REGULATION → FUND → AMOUNT → DATE → COMPANY → PERSON → OBLIGATION

        Args:
            text:     Raw document text
            doc_type: "regulatory" | "operational" | "cedente_report"

        Returns:
            List of Entity objects (may contain overlapping spans)
        """
        entities: list[Entity] = []
        source_id = hashlib.md5(text[:200].encode()).hexdigest()[:8]

        for entity_type, patterns in self._PATTERNS.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    value = match.group().strip()
                    if len(value) < 2:
                        continue

                    normalized = re.sub(r"\s+", " ", value).upper().strip()
                    cnpj = self._extract_cnpj_from_value(value) if entity_type in ("CNPJ", "COMPANY") else None

                    eid = str(uuid.uuid4())
                    entity = Entity(
                        id=eid,
                        entity_type=entity_type,
                        value=value,
                        normalized=normalized,
                        cnpj=cnpj,
                        source_doc=source_id,
                        span_start=match.start(),
                        span_end=match.end(),
                        confidence=self._confidence_for_type(entity_type),
                        metadata={"doc_type": doc_type},
                    )
                    entities.append(entity)

        # Remove duplicate spans (longest match wins)
        entities = self._deduplicate_spans(entities)
        return entities

    def _extract_cnpj_from_value(self, value: str) -> Optional[str]:
        """Extract raw CNPJ digits from a string."""
        digits = re.sub(r"\D", "", value)
        return digits if len(digits) == 14 else None

    def _confidence_for_type(self, entity_type: str) -> float:
        """Rule-based confidence by entity type."""
        return {
            "CNPJ":       0.98,
            "REGULATION": 0.95,
            "FUND":       0.90,
            "AMOUNT":     0.92,
            "DATE":       0.90,
            "COMPANY":    0.80,
            "PERSON":     0.75,
            "OBLIGATION": 0.70,
        }.get(entity_type, 0.60)

    def _deduplicate_spans(self, entities: list[Entity]) -> list[Entity]:
        """Remove overlapping spans; keep longest match."""
        sorted_ents = sorted(entities, key=lambda e: (e.span_start, -(e.span_end - e.span_start)))
        result: list[Entity] = []
        last_end = -1
        for e in sorted_ents:
            if e.span_start >= last_end:
                result.append(e)
                last_end = e.span_end
        return result

    # ------------------------------------------------------------------ #
    # 2. Relationship Building                                             #
    # ------------------------------------------------------------------ #

    def build_relationships(
        self,
        entities: list[Entity],
    ) -> list[Relationship]:
        """
        Infer relationships between entities using proximity + trigger words.

        Strategy:
          - Group entities by source document
          - For each pair of entities within 200-char window, check triggers
          - Assign relation type based on matched trigger keywords

        Args:
            entities: List of Entity objects (typically from one document)

        Returns:
            List of Relationship objects
        """
        relationships: list[Relationship] = []
        # Work within each source document
        by_source: dict[str, list[Entity]] = {}
        for e in entities:
            by_source.setdefault(e.source_doc, []).append(e)

        WINDOW = 200  # character proximity window

        for source, ents in by_source.items():
            for i, e1 in enumerate(ents):
                for e2 in ents[i + 1:]:
                    # Only relate substantive entity types
                    if e1.entity_type in ("AMOUNT", "DATE") and e2.entity_type in ("AMOUNT", "DATE"):
                        continue

                    span_gap = abs(e1.span_start - e2.span_start)
                    if span_gap > WINDOW:
                        continue

                    # Determine relation based on entity type pairs and triggers
                    relation, confidence, evidence = self._infer_relation(e1, e2)
                    if relation is None:
                        continue

                    rel = Relationship(
                        id=str(uuid.uuid4()),
                        source_id=e1.id,
                        target_id=e2.id,
                        relation_type=relation,
                        confidence=confidence,
                        evidence=evidence,
                    )
                    relationships.append(rel)

        return relationships

    def _infer_relation(
        self,
        e1: Entity,
        e2: Entity,
    ) -> tuple[Optional[str], float, str]:
        """Return (relation_type, confidence, evidence) or (None, 0, '') if no match."""
        pair = (e1.entity_type, e2.entity_type)

        # Typed relation rules
        if pair == ("COMPANY", "FUND") or pair == ("FUND", "COMPANY"):
            return "administers", 0.75, f"{e1.value} ↔ {e2.value}"
        if pair == ("REGULATION", "FUND") or pair == ("FUND", "REGULATION"):
            return "regulates", 0.85, f"{e1.value} regulates {e2.value}"
        if pair == ("COMPANY", "OBLIGATION") or pair == ("PERSON", "OBLIGATION"):
            return "owes", 0.70, f"{e1.value} owes {e2.value}"
        if pair == ("PERSON", "COMPANY"):
            return "controls", 0.65, f"{e1.value} controls {e2.value}"
        if pair == ("COMPANY", "COMPANY"):
            return "reports_to", 0.60, f"{e1.value} reports_to {e2.value}"
        if pair == ("REGULATION", "COMPANY") or pair == ("COMPANY", "REGULATION"):
            return "regulates", 0.80, f"{e1.value} ↔ {e2.value}"

        return None, 0.0, ""

    # ------------------------------------------------------------------ #
    # 3. Document Ingestion                                                #
    # ------------------------------------------------------------------ #

    def ingest_document(
        self,
        text: str,
        source: str,
        metadata: dict,
    ) -> IngestResult:
        """
        Full ingestion pipeline: extract → resolve → build relationships → store.

        Args:
            text:     Raw document text
            source:   Document source identifier (file path, URL, API ref)
            metadata: Additional metadata dict

        Returns:
            IngestResult dataclass
        """
        import time
        t0 = time.perf_counter()

        doc_type = metadata.get("type", "regulatory")
        doc_id   = hashlib.sha256(f"{source}:{text[:100]}".encode()).hexdigest()[:12]
        errors: list[str] = []

        # 1. Extract
        raw_entities = self.extract_entities(text, doc_type)

        # 2. Entity resolution (deduplicate against existing graph)
        resolved = self.entity_resolution(raw_entities)
        entities_after_dedup = len(resolved)

        # 3. Store entities, count new
        new_entities = 0
        for ent in resolved:
            ent.source_doc = source
            ent.metadata.update(metadata)
            if ent.normalized not in self._entity_index:
                self._entities[ent.id]           = ent
                self._entity_index[ent.normalized] = ent.id
                if ent.cnpj:
                    self._cnpj_index[ent.cnpj] = ent.id
                self._adjacency[ent.id]          = []
                new_entities += 1

        # 4. Build relationships on resolved entities
        try:
            relationships = self.build_relationships(resolved)
        except Exception as exc:
            relationships = []
            errors.append(f"relationship_build: {exc}")

        # 5. Store relationships
        new_relationships = 0
        for rel in relationships:
            if rel.id not in self._relationships:
                self._relationships[rel.id] = rel
                self._adjacency.setdefault(rel.source_id, []).append(rel.id)
                self._adjacency.setdefault(rel.target_id, []).append(rel.id)
                new_relationships += 1

        # Entity type distribution
        type_dist: dict[str, int] = {}
        for e in resolved:
            type_dist[e.entity_type] = type_dist.get(e.entity_type, 0) + 1

        t1 = time.perf_counter()
        return IngestResult(
            document_id=doc_id,
            source=source,
            entities_extracted=len(raw_entities),
            entities_after_dedup=entities_after_dedup,
            relationships_built=len(relationships),
            new_entities=new_entities,
            new_relationships=new_relationships,
            duration_ms=round((t1 - t0) * 1000, 2),
            entity_types=type_dist,
            errors=errors,
        )

    # ------------------------------------------------------------------ #
    # 4. Graph Query (BFS traversal)                                       #
    # ------------------------------------------------------------------ #

    def query_graph(
        self,
        query: str,
        max_hops: int = 2,
    ) -> list[dict]:
        """
        BFS traversal starting from entities matching the query string.

        Args:
            query:    Search string (matched against entity values)
            max_hops: Maximum number of hops from seed nodes

        Returns:
            List of dicts: {entity, relationships, hops_from_seed}
        """
        query_norm = query.upper().strip()

        # Find seed entities
        seeds = [
            e for e in self._entities.values()
            if query_norm in e.normalized or e.normalized in query_norm
        ]

        if not seeds:
            return []

        visited_entities: set[str] = set()
        result: list[dict] = []
        queue: list[tuple[str, int]] = [(e.id, 0) for e in seeds]

        while queue:
            eid, hops = queue.pop(0)
            if eid in visited_entities or hops > max_hops:
                continue
            visited_entities.add(eid)

            entity = self._entities.get(eid)
            if not entity:
                continue

            # Gather connected relationships
            connected_rels = [
                self._relationships[rid]
                for rid in self._adjacency.get(eid, [])
                if rid in self._relationships
            ]

            result.append({
                "entity": {
                    "id": entity.id,
                    "type": entity.entity_type,
                    "value": entity.value,
                    "cnpj": entity.cnpj,
                },
                "relationships": [
                    {
                        "type": r.relation_type,
                        "source": self._entities[r.source_id].value if r.source_id in self._entities else r.source_id,
                        "target": self._entities[r.target_id].value if r.target_id in self._entities else r.target_id,
                        "confidence": r.confidence,
                    }
                    for r in connected_rels
                ],
                "hops_from_seed": hops,
            })

            # Enqueue neighbors
            for rel in connected_rels:
                neighbor_id = rel.target_id if rel.source_id == eid else rel.source_id
                if neighbor_id not in visited_entities:
                    queue.append((neighbor_id, hops + 1))

        return result

    # ------------------------------------------------------------------ #
    # 5. Entity Resolution                                                 #
    # ------------------------------------------------------------------ #

    def entity_resolution(
        self,
        entities: list[Entity],
    ) -> list[Entity]:
        """
        Merge duplicate entities within a batch and against the stored graph.

        Deduplication rules:
          1. Exact CNPJ match → merge (keep highest-confidence)
          2. Normalised value exact match → merge
          3. Name similarity > 0.85 (Jaccard on tokens) → merge

        Args:
            entities: Raw entity list (may contain duplicates)

        Returns:
            Deduplicated entity list with canonical ids
        """
        resolved: list[Entity] = []
        seen_normalized: dict[str, Entity] = {}
        seen_cnpj: dict[str, Entity] = {}

        for ent in entities:
            # 1. Check CNPJ match vs graph
            if ent.cnpj and ent.cnpj in self._cnpj_index:
                existing_id = self._cnpj_index[ent.cnpj]
                existing    = self._entities[existing_id]
                # Update confidence if new match is higher
                if ent.confidence > existing.confidence:
                    existing.confidence = ent.confidence
                continue  # skip — already in graph

            # 2. Check CNPJ match within batch
            if ent.cnpj and ent.cnpj in seen_cnpj:
                canonical = seen_cnpj[ent.cnpj]
                if ent.confidence > canonical.confidence:
                    canonical.confidence = ent.confidence
                continue

            # 3. Normalised value match vs graph
            if ent.normalized in self._entity_index:
                continue  # already in graph

            # 4. Normalised value match within batch
            if ent.normalized in seen_normalized:
                canonical = seen_normalized[ent.normalized]
                if ent.confidence > canonical.confidence:
                    canonical.confidence = ent.confidence
                continue

            # 5. Jaccard similarity check within batch
            merged = False
            for key, canonical in seen_normalized.items():
                if canonical.entity_type != ent.entity_type:
                    continue
                sim = self._jaccard_similarity(ent.normalized, key)
                if sim >= 0.85:
                    if ent.confidence > canonical.confidence:
                        canonical.confidence = ent.confidence
                    merged = True
                    break
            if merged:
                continue

            # New unique entity
            seen_normalized[ent.normalized] = ent
            if ent.cnpj:
                seen_cnpj[ent.cnpj] = ent
            resolved.append(ent)

        return resolved

    def _jaccard_similarity(self, a: str, b: str) -> float:
        """Token-level Jaccard similarity between two strings."""
        tokens_a = set(a.split())
        tokens_b = set(b.split())
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = tokens_a & tokens_b
        union        = tokens_a | tokens_b
        return len(intersection) / len(union)

    # ------------------------------------------------------------------ #
    # 6. Graph Statistics                                                  #
    # ------------------------------------------------------------------ #

    def get_graph_stats(self) -> dict:
        """
        Return summary statistics of the in-memory graph.

        Returns:
            dict with total_entities, total_relationships, entity_type_distribution,
            avg_degree, top_connected_entities
        """
        type_dist: dict[str, int] = {}
        for ent in self._entities.values():
            type_dist[ent.entity_type] = type_dist.get(ent.entity_type, 0) + 1

        degrees = {eid: len(rels) for eid, rels in self._adjacency.items()}
        avg_degree = (sum(degrees.values()) / len(degrees)) if degrees else 0.0

        top_connected = sorted(
            [
                {"entity": self._entities[eid].value, "degree": deg}
                for eid, deg in degrees.items()
                if eid in self._entities
            ],
            key=lambda x: x["degree"],
            reverse=True,
        )[:5]

        return {
            "total_entities": len(self._entities),
            "total_relationships": len(self._relationships),
            "entity_type_distribution": type_dist,
            "avg_degree": round(avg_degree, 2),
            "top_connected_entities": top_connected,
        }


# ---------------------------------------------------------------------------
# Demo document
# ---------------------------------------------------------------------------

DEMO_DOCUMENT = """
CIRCULAR BACEN Nº 3.978, de 23 de janeiro de 2020.

Dispõe sobre a política de prevenção à lavagem de dinheiro e ao financiamento do terrorismo (PLD/FT)
de que trata a Resolução CVM Nº 175, de 23 de dezembro de 2022.

O FIDC Paganini Multissetorial LTDA (CNPJ 12.345.678/0001-90), administrado pela
Gestora Paganini Capital S.A. (CNPJ 98.765.432/0001-11), deve observar as obrigações
previstas na presente circular, incluindo a prestação de contas ao BACEN até 30/06/2026.

O cedente Empresa Alpha S.A. (CNPJ 11.222.333/0001-44) reporta mensalmente ao FIDC.
A nota promissória de R$ 1.500.000,00 com vencimento em 15 de março de 2026 está
garantida pelo Sr. João da Silva Responsável, fiador do instrumento.

Resolução BACEN Nº 4.966 estabelece os limites de concentração para fundos estruturados.
Lei Nº 14.430/2022 regulamenta os direitos creditórios no mercado brasileiro.
"""


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent = KnowledgeGraphAgent()
    result = agent.execute("demo graph build", {}, [])
    print("=== KNOWLEDGE GRAPH AGENT DEMO ===")
    print(f"Summary: {result['summary']}")
    stats = result["stats"]
    print(f"\nEntity types: {stats['entity_type_distribution']}")
    print(f"Avg degree: {stats['avg_degree']}")
    if stats["top_connected_entities"]:
        print(f"Top connected: {stats['top_connected_entities'][0]}")

    # Query demo
    query_res = agent.query_graph("Paganini", max_hops=2)
    print(f"\nQuery 'Paganini' → {len(query_res)} nodes found")
    for node in query_res[:3]:
        print(f"  {node['entity']['type']}: {node['entity']['value'][:60]}")
