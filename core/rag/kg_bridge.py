"""Knowledge Graph Bridge — connects the full KnowledgeGraphAgent to the RAG pipeline.

Replaces the simple regex NER in graph_rag.py with the full 8-type NER from
packages/agents/capabilities/knowledge_graph.py (CNPJ, COMPANY, REGULATION,
FUND, PERSON, AMOUNT, DATE, OBLIGATION).

Usage::

    from core.rag.kg_bridge import KnowledgeGraphBridge

    bridge = KnowledgeGraphBridge(persist_path="runtime/data/kg.json")
    bridge.ingest_chunks(chunks)
    
    # Query: BFS traversal → related chunks
    results = bridge.query("FIDC Panamericano", max_hops=2)
    
    # Stats
    stats = bridge.stats()
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from packages.agents.capabilities.knowledge_graph import (
    KnowledgeGraphAgent,
    Entity,
    Relationship,
    IngestResult,
)

__all__ = ["KnowledgeGraphBridge"]


class KnowledgeGraphBridge:
    """Bridge between KnowledgeGraphAgent and the RAG pipeline.
    
    Provides:
      - Full 8-type NER (CNPJ, COMPANY, REGULATION, FUND, etc.)
      - Entity resolution with Jaccard dedup
      - Relationship inference (administers, regulates, owes, etc.)
      - BFS graph traversal for multi-hop RAG
      - JSON persistence
      - Chunk ↔ entity mapping for RAG integration
    """

    def __init__(self, persist_path: str = "runtime/data/kg.json"):
        self._agent = KnowledgeGraphAgent()
        self._persist_path = Path(persist_path)
        self._persist_path.parent.mkdir(parents=True, exist_ok=True)
        
        # chunk_id → list of entity_ids (for RAG integration)
        self._chunk_entities: dict[str, list[str]] = {}
        # entity_id → list of chunk_ids (reverse index)
        self._entity_chunks: dict[str, list[str]] = {}
        
        # Load persisted graph if exists
        self._load()

    def ingest_chunks(self, chunks: list) -> dict:
        """Ingest RAG chunks into the knowledge graph.
        
        Args:
            chunks: List of Chunk objects (with .text, .source, .section, .metadata)
        
        Returns:
            dict with total entities, relationships, and per-chunk stats
        """
        total_entities = 0
        total_relationships = 0
        total_new = 0
        
        for i, chunk in enumerate(chunks):
            text = getattr(chunk, 'text', chunk.get('text', '')) if isinstance(chunk, dict) else chunk.text
            source = getattr(chunk, 'source', chunk.get('source', 'unknown')) if isinstance(chunk, dict) else chunk.source
            section = getattr(chunk, 'section', chunk.get('section', '')) if isinstance(chunk, dict) else getattr(chunk, 'section', '')
            metadata = getattr(chunk, 'metadata', chunk.get('metadata', {})) if isinstance(chunk, dict) else chunk.metadata
            
            if not text or not text.strip():
                continue
            
            chunk_id = f"{source}:{section}:{i}"
            
            # Full NER extraction + relationship building
            result: IngestResult = self._agent.ingest_document(
                text=text,
                source=chunk_id,
                metadata={
                    "type": metadata.get("doc_type", "regulatory"),
                    "section": section,
                    **metadata,
                },
            )
            
            # Build chunk ↔ entity mapping
            entities = self._agent.extract_entities(text, metadata.get("doc_type", "regulatory"))
            entity_ids = []
            for ent in entities:
                # Find the canonical entity in the graph (may have been resolved/merged)
                canonical_id = self._agent._entity_index.get(ent.normalized)
                if canonical_id:
                    entity_ids.append(canonical_id)
            
            if entity_ids:
                self._chunk_entities[chunk_id] = entity_ids
                for eid in entity_ids:
                    self._entity_chunks.setdefault(eid, []).append(chunk_id)
            
            total_entities += result.entities_extracted
            total_relationships += result.relationships_built
            total_new += result.new_entities
        
        return {
            "total_entities_extracted": total_entities,
            "total_relationships": total_relationships,
            "new_entities": total_new,
            "chunks_processed": len(chunks),
            "chunks_with_entities": len(self._chunk_entities),
        }

    def query(self, query: str, max_hops: int = 2) -> list[dict]:
        """BFS traversal from query-matching entities.
        
        Args:
            query: Search string
            max_hops: Maximum graph traversal depth
            
        Returns:
            List of dicts with entity info, relationships, and related chunk_ids
        """
        results = self._agent.query_graph(query, max_hops=max_hops)
        
        # Enrich with chunk IDs
        for node in results:
            eid = node["entity"]["id"]
            node["chunk_ids"] = self._entity_chunks.get(eid, [])
        
        return results

    def get_related_chunk_ids(self, query: str, max_hops: int = 2) -> list[str]:
        """Get chunk IDs related to a query via graph traversal.
        
        This is the main integration point with the RAG pipeline:
        1. Find entities matching the query
        2. Traverse graph to find related entities
        3. Return chunk IDs that contain those entities
        
        Args:
            query: Search string
            max_hops: Maximum traversal depth
            
        Returns:
            Deduplicated list of chunk_ids ordered by hop distance
        """
        results = self.query(query, max_hops=max_hops)
        
        seen = set()
        ordered_ids = []
        
        # Sort by hops (closer = more relevant)
        for node in sorted(results, key=lambda n: n.get("hops_from_seed", 0)):
            for cid in node.get("chunk_ids", []):
                if cid not in seen:
                    seen.add(cid)
                    ordered_ids.append(cid)
        
        return ordered_ids

    def stats(self) -> dict:
        """Return graph statistics."""
        graph_stats = self._agent.get_graph_stats()
        graph_stats["chunks_indexed"] = len(self._chunk_entities)
        graph_stats["entity_chunk_links"] = sum(
            len(cids) for cids in self._entity_chunks.values()
        )
        return graph_stats

    def save(self) -> None:
        """Persist graph to JSON."""
        data = {
            "entities": {
                eid: {
                    "id": e.id,
                    "entity_type": e.entity_type,
                    "value": e.value,
                    "normalized": e.normalized,
                    "cnpj": e.cnpj,
                    "source_doc": e.source_doc,
                    "span_start": e.span_start,
                    "span_end": e.span_end,
                    "confidence": e.confidence,
                    "metadata": e.metadata,
                }
                for eid, e in self._agent._entities.items()
            },
            "relationships": {
                rid: {
                    "id": r.id,
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "relation_type": r.relation_type,
                    "confidence": r.confidence,
                    "evidence": r.evidence,
                    "metadata": r.metadata,
                }
                for rid, r in self._agent._relationships.items()
            },
            "entity_index": dict(self._agent._entity_index),
            "cnpj_index": dict(self._agent._cnpj_index),
            "adjacency": {k: list(v) for k, v in self._agent._adjacency.items()},
            "chunk_entities": self._chunk_entities,
            "entity_chunks": self._entity_chunks,
        }
        self._persist_path.write_text(json.dumps(data, ensure_ascii=False, indent=2))

    def _load(self) -> None:
        """Load persisted graph from JSON if exists."""
        if not self._persist_path.exists():
            return
        
        try:
            data = json.loads(self._persist_path.read_text())
        except (json.JSONDecodeError, IOError):
            return
        
        # Restore entities
        for eid, edata in data.get("entities", {}).items():
            entity = Entity(
                id=edata["id"],
                entity_type=edata["entity_type"],
                value=edata["value"],
                normalized=edata["normalized"],
                cnpj=edata.get("cnpj"),
                source_doc=edata.get("source_doc", ""),
                span_start=edata.get("span_start", 0),
                span_end=edata.get("span_end", 0),
                confidence=edata.get("confidence", 0.5),
                metadata=edata.get("metadata", {}),
            )
            self._agent._entities[eid] = entity
        
        # Restore relationships
        for rid, rdata in data.get("relationships", {}).items():
            rel = Relationship(
                id=rdata["id"],
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                relation_type=rdata["relation_type"],
                confidence=rdata.get("confidence", 0.5),
                evidence=rdata.get("evidence", ""),
                metadata=rdata.get("metadata", {}),
            )
            self._agent._relationships[rid] = rel
        
        # Restore indexes
        self._agent._entity_index = data.get("entity_index", {})
        self._agent._cnpj_index = data.get("cnpj_index", {})
        self._agent._adjacency = {
            k: list(v) for k, v in data.get("adjacency", {}).items()
        }
        
        # Restore chunk mappings
        self._chunk_entities = data.get("chunk_entities", {})
        self._entity_chunks = data.get("entity_chunks", {})
