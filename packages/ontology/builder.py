from __future__ import annotations

import re
from pathlib import Path

from .schema import (
    Entity,
    EntityType,
    KnowledgeGraph,
    Relation,
    RelationType,
)


# ---------------------------------------------------------------------------
# Regex patterns for entity extraction
# ---------------------------------------------------------------------------

_PATTERNS: list[tuple[EntityType, list[re.Pattern]]] = [
    (
        EntityType.REGULACAO,
        [
            re.compile(r"Resolu(?:ção|cao)\s+CVM\s+[Nn]º?\s*\.?\s*\d+", re.IGNORECASE),
            re.compile(r"Art(?:igo)?\.?\s*\d+", re.IGNORECASE),
            re.compile(r"Instru(?:ção|cao)\s+CVM\s+[Nn]º?\s*\.?\s*\d+", re.IGNORECASE),
            re.compile(r"Of[íi]cio\s+Circular\s+[Nn]º?\s*\.?\s*\d+", re.IGNORECASE),
            re.compile(r"ICVM\s+\d+", re.IGNORECASE),
        ],
    ),
    (
        EntityType.FUNDO,
        [
            re.compile(r"FIDC[-\s]?NP\b", re.IGNORECASE),
            re.compile(r"FIDC\s+Multicedente", re.IGNORECASE),
            re.compile(r"FIDC\s+Infra\b", re.IGNORECASE),
            re.compile(r"FIDC\s+ESG\b", re.IGNORECASE),
            re.compile(r"FIDC\s+Padronizado", re.IGNORECASE),
            re.compile(r"FIDC\s+N[ã a]o[-\s]Padronizado", re.IGNORECASE),
            re.compile(r"Fundo\s+de\s+Investimento\s+em\s+Direitos\s+Credit[oó]rios", re.IGNORECASE),
            re.compile(r"\bFIDC\b", re.IGNORECASE),
        ],
    ),
    (
        EntityType.PARTICIPANTE,
        [
            re.compile(r"\badministrador\b", re.IGNORECASE),
            re.compile(r"\bcustodiante\b", re.IGNORECASE),
            re.compile(r"\bgestor\b", re.IGNORECASE),
            re.compile(r"\bcedente\b", re.IGNORECASE),
            re.compile(r"\bsacado\b", re.IGNORECASE),
            re.compile(r"\bauditoria\b", re.IGNORECASE),
            re.compile(r"\bagente\s+de\s+cobran[çc]a\b", re.IGNORECASE),
            re.compile(r"\bcotista\b", re.IGNORECASE),
        ],
    ),
    (
        EntityType.CONTABILIDADE,
        [
            re.compile(r"\bPDD\b"),
            re.compile(r"\bPCE\b"),
            re.compile(r"\bIFRS\s*9\b", re.IGNORECASE),
            re.compile(r"\bCOFIs\b", re.IGNORECASE),
            re.compile(r"\bprov[isão]+\b", re.IGNORECASE),
            re.compile(r"\bfair\s+value\b", re.IGNORECASE),
            re.compile(r"\bamortiza[çc][ãa]o\b", re.IGNORECASE),
            re.compile(r"\bDTVM\b"),
        ],
    ),
    (
        EntityType.RELATORIO,
        [
            re.compile(r"CADOC\s*3040", re.IGNORECASE),
            re.compile(r"ICVM\s*489", re.IGNORECASE),
            re.compile(r"informe\s+mensal", re.IGNORECASE),
            re.compile(r"informe\s+di[aá]rio", re.IGNORECASE),
            re.compile(r"\bCOFIs\b", re.IGNORECASE),
            re.compile(r"relat[oó]rio\s+de\s+gest[ãa]o", re.IGNORECASE),
            re.compile(r"demonstra[çc][ãõo]+\s+financeira", re.IGNORECASE),
        ],
    ),
    (
        EntityType.COVENANT,
        [
            re.compile(r"\bcovenant\b", re.IGNORECASE),
            re.compile(r"raz[ãa]o\s+de\s+garantia", re.IGNORECASE),
            re.compile(r"[íi]ndice\s+de\s+inadimpl[eê]ncia", re.IGNORECASE),
            re.compile(r"\btrigger\s+event\b", re.IGNORECASE),
            re.compile(r"\bevent[o]?\s+de\s+avalia[çc][ãa]o\b", re.IGNORECASE),
            re.compile(r"cl[aá]usula\s+contratual", re.IGNORECASE),
            re.compile(r"inadimpl[eê]ncia\s+m[aá]xima", re.IGNORECASE),
        ],
    ),
    (
        EntityType.RISCO,
        [
            re.compile(r"risco\s+de\s+cr[eé]dito", re.IGNORECASE),
            re.compile(r"risco\s+de\s+mercado", re.IGNORECASE),
            re.compile(r"risco\s+de\s+liquidez", re.IGNORECASE),
            re.compile(r"risco\s+operacional", re.IGNORECASE),
            re.compile(r"risco\s+legal", re.IGNORECASE),
            re.compile(r"risco\s+de\s+concentra[çc][ãa]o", re.IGNORECASE),
            re.compile(r"\bdefault\b", re.IGNORECASE),
            re.compile(r"inadimpl[eê]ncia", re.IGNORECASE),
        ],
    ),
]

# Participant role → canonical name mapping
_PARTICIPANT_NAMES: dict[str, str] = {
    "administrador": "Administrador",
    "custodiante": "Custodiante",
    "gestor": "Gestor",
    "cedente": "Cedente",
    "sacado": "Sacado",
    "auditoria": "Auditoria",
    "cotista": "Cotista",
}

# Relation heuristics: (source_type, target_type) → RelationType
_RELATION_MAP: dict[tuple[EntityType, EntityType], RelationType] = {
    (EntityType.REGULACAO, EntityType.FUNDO): RelationType.REGULA,
    (EntityType.REGULACAO, EntityType.PROCESSO): RelationType.REGULA,
    (EntityType.COTA, EntityType.FUNDO): RelationType.COMPOE,
    (EntityType.COTA, EntityType.COTA): RelationType.SUBORDINADA_A,
    (EntityType.PARTICIPANTE, EntityType.ATIVO): RelationType.ORIGINA,
    (EntityType.RELATORIO, EntityType.FUNDO): RelationType.REPORTA,
    (EntityType.RELATORIO, EntityType.REGULACAO): RelationType.REPORTA,
    (EntityType.COVENANT, EntityType.FUNDO): RelationType.MONITORA,
    (EntityType.CONTABILIDADE, EntityType.ATIVO): RelationType.PROVISIONA,
}


def _make_id(prefix: str, text: str) -> str:
    """Generate a deterministic but collision-resistant id."""
    slug = re.sub(r"\W+", "_", text.strip().lower())[:40]
    return f"{prefix}:{slug}"


class OntologyBuilder:
    """Extract entities and relations from fund domain markdown documents."""

    def extract_entities(self, text: str, source: str = "") -> list[Entity]:
        """
        Scan *text* for fund domain patterns and return a deduplicated list
        of Entity objects.  *source* is the originating document path/name.
        """
        entities: dict[str, Entity] = {}

        for entity_type, patterns in _PATTERNS:
            for pattern in patterns:
                for match in pattern.finditer(text):
                    raw = match.group(0).strip()
                    # Normalise participant names
                    name = _PARTICIPANT_NAMES.get(raw.lower(), raw)
                    eid = _make_id(entity_type.value.lower(), name)
                    if eid not in entities:
                        entities[eid] = Entity(
                            id=eid,
                            type=entity_type,
                            name=name,
                            attributes={"raw_match": raw},
                            source_doc=source,
                        )

        return list(entities.values())

    def extract_relations(
        self,
        entities: list[Entity],
        text: str,
    ) -> list[Relation]:
        """
        Infer relations by detecting entity co-occurrence within the same
        paragraph/section and applying type-based heuristics.
        """
        if not entities:
            return []

        # Split text into sections (paragraphs or heading blocks)
        sections = re.split(r"\n{2,}|(?=\n#+\s)", text)

        relations: list[Relation] = []
        seen: set[tuple[str, str, str]] = set()

        for section in sections:
            # Find which entities appear in this section
            present: list[Entity] = [
                e for e in entities if e.name.lower() in section.lower()
                or (e.attributes.get("raw_match", "").lower() in section.lower())
            ]

            # Pair every entity in the section with every other
            for i, src in enumerate(present):
                for tgt in present[i + 1:]:
                    if src.id == tgt.id:
                        continue

                    rel_type = _RELATION_MAP.get(
                        (src.type, tgt.type),
                        _RELATION_MAP.get((tgt.type, src.type)),
                    )
                    if rel_type is None:
                        continue

                    # Determine directionality from the map
                    if (src.type, tgt.type) in _RELATION_MAP:
                        source_id, target_id = src.id, tgt.id
                    else:
                        source_id, target_id = tgt.id, src.id

                    key = (source_id, target_id, rel_type.value)
                    if key in seen:
                        continue
                    seen.add(key)

                    relations.append(
                        Relation(
                            source_id=source_id,
                            target_id=target_id,
                            relation_type=rel_type,
                            weight=1.0,
                            metadata={"source_doc": src.source_doc},
                        )
                    )

        return relations

    def build_from_corpus(self, corpus_dir: str | Path) -> KnowledgeGraph:
        """
        Process every *.md* file in *corpus_dir* (recursively) and return a
        populated KnowledgeGraph.
        """
        kg = KnowledgeGraph()
        corpus_path = Path(corpus_dir)

        for md_file in sorted(corpus_path.rglob("*.md")):
            text = md_file.read_text(encoding="utf-8", errors="replace")
            source = str(md_file.relative_to(corpus_path))

            entities = self.extract_entities(text, source=source)
            for entity in entities:
                kg.add_entity(entity)

            relations = self.extract_relations(entities, text)
            for relation in relations:
                kg.add_relation(relation)

        return kg
