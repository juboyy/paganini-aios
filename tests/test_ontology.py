"""Tests for KnowledgeGraph and OntologyBuilder."""
from __future__ import annotations

import pytest
from packages.ontology.schema import (
    KnowledgeGraph,
    Entity,
    EntityType,
    Relation,
    RelationType,
)
from packages.ontology.builder import OntologyBuilder


# ---------------------------------------------------------------------------
# KnowledgeGraph tests
# ---------------------------------------------------------------------------

def test_add_and_get_entity():
    """add_entity + get_entity roundtrip works correctly."""
    kg = KnowledgeGraph()
    entity = Entity(id="e1", type=EntityType.PARTICIPANTE, name="Custodiante")
    kg.add_entity(entity)
    retrieved = kg.get_entity("e1")
    assert retrieved is not None
    assert retrieved.name == "Custodiante"
    assert retrieved.type == EntityType.PARTICIPANTE


def test_add_relation_and_get_neighbors():
    """add_relation exposes neighbors via get_neighbors."""
    kg = KnowledgeGraph()
    cvm = Entity(id="cvm", type=EntityType.REGULACAO, name="CVM 175")
    fidc = Entity(id="fidc", type=EntityType.FUNDO, name="FIDC Teste")
    kg.add_entity(cvm)
    kg.add_entity(fidc)
    rel = Relation(source_id="cvm", target_id="fidc", relation_type=RelationType.REGULA)
    kg.add_relation(rel)
    neighbors = kg.get_neighbors("cvm")
    assert any(n.id == "fidc" for n in neighbors)


def test_get_neighbors_filtered_by_relation_type():
    """get_neighbors with relation_type filter only returns matching relations."""
    kg = KnowledgeGraph()
    a = Entity(id="a", type=EntityType.PARTICIPANTE, name="Gestor")
    b = Entity(id="b", type=EntityType.FUNDO, name="FIDC X")
    c = Entity(id="c", type=EntityType.ATIVO, name="Recebível")
    kg.add_entity(a)
    kg.add_entity(b)
    kg.add_entity(c)
    kg.add_relation(Relation(source_id="a", target_id="b", relation_type=RelationType.MONITORA))
    kg.add_relation(Relation(source_id="b", target_id="c", relation_type=RelationType.COMPOE))
    # Filter for MONITORA from entity a → only b
    neighbors = kg.get_neighbors("a", relation_type=RelationType.MONITORA)
    assert len(neighbors) == 1
    assert neighbors[0].id == "b"


def test_save_and_load_roundtrip(tmp_dir):
    """save/load preserves entities and relations."""
    kg = KnowledgeGraph()
    kg.add_entity(Entity(id="r1", type=EntityType.REGULACAO, name="Resolução CVM 175"))
    kg.add_entity(Entity(id="p1", type=EntityType.PARTICIPANTE, name="Administrador"))
    kg.add_relation(Relation(source_id="r1", target_id="p1", relation_type=RelationType.REGULA))
    path = tmp_dir / "kg.json"
    kg.save(path)
    kg2 = KnowledgeGraph.load(path)
    assert kg2.get_entity("r1") is not None
    assert kg2.get_entity("p1") is not None
    neighbors = kg2.get_neighbors("r1")
    assert any(n.id == "p1" for n in neighbors)


# ---------------------------------------------------------------------------
# OntologyBuilder tests
# ---------------------------------------------------------------------------

def test_ontology_builder_extracts_cvm_articles():
    """OntologyBuilder.extract_entities finds CVM article references in text."""
    builder = OntologyBuilder()
    text = "Conforme o Artigo 45 da Resolução CVM nº 175, o limite de concentração é de 10%."
    entities = builder.extract_entities(text, source="test.md")
    regulacoes = [e for e in entities if e.type == EntityType.REGULACAO]
    assert len(regulacoes) >= 1


def test_ontology_builder_extracts_participants():
    """OntologyBuilder identifies FIDC participants (custodiante, gestor, etc.)."""
    builder = OntologyBuilder()
    text = "O custodiante é responsável pela guarda. O gestor toma decisões de investimento."
    entities = builder.extract_entities(text, source="test.md")
    participants = [e for e in entities if e.type == EntityType.PARTICIPANTE]
    assert len(participants) >= 1


def test_ontology_builder_extracts_fund_types():
    """OntologyBuilder recognises FIDC as a fund entity."""
    builder = OntologyBuilder()
    text = "O FIDC Multicedente deve diversificar sua carteira. O FIDC-NP tem regras especiais."
    entities = builder.extract_entities(text, source="test.md")
    fundos = [e for e in entities if e.type == EntityType.FUNDO]
    assert len(fundos) >= 1


def test_knowledge_graph_stats():
    """stats() correctly counts entities and relations by type."""
    kg = KnowledgeGraph()
    kg.add_entity(Entity(id="e1", type=EntityType.FUNDO, name="FIDC A"))
    kg.add_entity(Entity(id="e2", type=EntityType.PARTICIPANTE, name="Gestor"))
    kg.add_relation(Relation(source_id="e2", target_id="e1", relation_type=RelationType.MONITORA))
    stats = kg.stats()
    assert stats["total_entities"] == 2
    assert stats["total_relations"] == 1
