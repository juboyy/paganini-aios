from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class EntityType(str, Enum):
    REGULACAO = "Regulacao"
    FUNDO = "Fundo"
    COTA = "Cota"
    ATIVO = "Ativo"
    PARTICIPANTE = "Participante"
    PROCESSO = "Processo"
    RISCO = "Risco"
    RELATORIO = "Relatorio"
    COVENANT = "Covenant"
    CONTABILIDADE = "Contabilidade"


class RelationType(str, Enum):
    REGULA = "regula"
    COMPOE = "compoe"
    SUBORDINADA_A = "subordinada_a"
    ORIGINA = "origina"
    DEVE = "deve"
    CUSTODIA = "custodia"
    REPORTA = "reporta"
    MONITORA = "monitora"
    PROVISIONA = "provisiona"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class Entity:
    id: str
    type: EntityType
    name: str
    attributes: dict = field(default_factory=dict)
    source_doc: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "name": self.name,
            "attributes": self.attributes,
            "source_doc": self.source_doc,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Entity:
        return cls(
            id=data["id"],
            type=EntityType(data["type"]),
            name=data["name"],
            attributes=data.get("attributes", {}),
            source_doc=data.get("source_doc", ""),
        )


@dataclass
class Relation:
    source_id: str
    target_id: str
    relation_type: RelationType
    weight: float = 1.0
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "relation_type": self.relation_type.value,
            "weight": self.weight,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Relation:
        return cls(
            source_id=data["source_id"],
            target_id=data["target_id"],
            relation_type=RelationType(data["relation_type"]),
            weight=data.get("weight", 1.0),
            metadata=data.get("metadata", {}),
        )


# ---------------------------------------------------------------------------
# Knowledge Graph
# ---------------------------------------------------------------------------


class KnowledgeGraph:
    """In-memory knowledge graph for the FIDC domain ontology."""

    def __init__(self) -> None:
        self._entities: dict[str, Entity] = {}
        self._relations: list[Relation] = []
        # Adjacency index: entity_id -> list of Relation (outgoing + incoming)
        self._adj: dict[str, list[Relation]] = {}

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def add_entity(self, entity: Entity) -> None:
        """Add or replace an entity in the graph."""
        self._entities[entity.id] = entity
        if entity.id not in self._adj:
            self._adj[entity.id] = []

    def add_relation(self, relation: Relation) -> None:
        """Add a relation between two entities."""
        self._relations.append(relation)
        # Index on both source and target for bidirectional traversal
        self._adj.setdefault(relation.source_id, []).append(relation)
        if relation.target_id != relation.source_id:
            self._adj.setdefault(relation.target_id, []).append(relation)

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def get_entity(self, entity_id: str) -> Optional[Entity]:
        """Return entity by id, or None if not found."""
        return self._entities.get(entity_id)

    def get_neighbors(
        self,
        entity_id: str,
        relation_type: Optional[RelationType] = None,
    ) -> list[Entity]:
        """Return neighboring entities connected via any (or a specific) relation type."""
        neighbors: list[Entity] = []
        for rel in self._adj.get(entity_id, []):
            if relation_type is not None and rel.relation_type != relation_type:
                continue
            # Determine the other end of the relation
            neighbor_id = rel.target_id if rel.source_id == entity_id else rel.source_id
            entity = self._entities.get(neighbor_id)
            if entity is not None:
                neighbors.append(entity)
        return neighbors

    def search_entities(
        self,
        query: str,
        entity_type: Optional[EntityType] = None,
    ) -> list[Entity]:
        """Simple case-insensitive substring search over name and attributes."""
        q = query.lower()
        results: list[Entity] = []
        for entity in self._entities.values():
            if entity_type is not None and entity.type != entity_type:
                continue
            # Match on name
            if q in entity.name.lower():
                results.append(entity)
                continue
            # Match on any attribute value (serialised as string)
            for v in entity.attributes.values():
                if q in str(v).lower():
                    results.append(entity)
                    break
        return results

    def get_subgraph(self, entity_id: str, depth: int = 2) -> dict:
        """
        BFS traversal returning a subgraph dict with:
          - entities: {id: entity_dict}
          - relations: [relation_dict, ...]
        """
        visited_entities: set[str] = set()
        visited_relations: set[int] = set()  # index into self._relations

        queue: deque[tuple[str, int]] = deque([(entity_id, 0)])
        visited_entities.add(entity_id)

        while queue:
            current_id, current_depth = queue.popleft()
            if current_depth >= depth:
                continue
            for rel in self._adj.get(current_id, []):
                rel_idx = id(rel)
                if rel_idx not in visited_relations:
                    visited_relations.add(rel_idx)
                neighbor_id = (
                    rel.target_id if rel.source_id == current_id else rel.source_id
                )
                if neighbor_id not in visited_entities:
                    visited_entities.add(neighbor_id)
                    queue.append((neighbor_id, current_depth + 1))

        entities_out = {
            eid: self._entities[eid].to_dict()
            for eid in visited_entities
            if eid in self._entities
        }
        relations_out = [
            rel.to_dict()
            for rel in self._relations
            if rel.source_id in visited_entities and rel.target_id in visited_entities
        ]

        return {"entities": entities_out, "relations": relations_out}

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str | Path) -> None:
        """Serialise graph to JSON."""
        data = {
            "entities": [e.to_dict() for e in self._entities.values()],
            "relations": [r.to_dict() for r in self._relations],
        }
        Path(path).write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    @classmethod
    def load(cls, path: str | Path) -> KnowledgeGraph:
        """Deserialise graph from JSON."""
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        kg = cls()
        for e_dict in data.get("entities", []):
            kg.add_entity(Entity.from_dict(e_dict))
        for r_dict in data.get("relations", []):
            kg.add_relation(Relation.from_dict(r_dict))
        return kg

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def stats(self) -> dict:
        """Return counts by entity type and relation type."""
        entity_counts: dict[str, int] = {et.value: 0 for et in EntityType}
        for entity in self._entities.values():
            entity_counts[entity.type.value] += 1

        relation_counts: dict[str, int] = {rt.value: 0 for rt in RelationType}
        for rel in self._relations:
            relation_counts[rel.relation_type.value] += 1

        return {
            "total_entities": len(self._entities),
            "total_relations": len(self._relations),
            "entities_by_type": entity_counts,
            "relations_by_type": relation_counts,
        }
