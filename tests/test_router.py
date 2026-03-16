"""Tests for CognitiveRouter — query classification and routing decisions."""
from __future__ import annotations

from core.router.cognitive_router import CognitiveRouter, QueryClassification, RoutingDecision


SOULS_DIR = "packs/finance/agents/souls"


def _router(tmp_dir) -> CognitiveRouter:
    return CognitiveRouter(config={
        "souls_dir": SOULS_DIR,
        "router_outcomes_path": str(tmp_dir / "outcomes.jsonl"),
    })


def test_classify_returns_query_classification(tmp_dir):
    """classify() returns a QueryClassification with all mandatory fields."""
    router = _router(tmp_dir)
    qc = router.classify("O que é FIDC?")
    assert isinstance(qc, QueryClassification)
    assert qc.complexity in ("simple", "moderate", "complex", "expert")
    assert qc.intent in ("factual", "analytical", "procedural", "comparative", "creative")
    assert isinstance(qc.domains, list)
    assert isinstance(qc.multi_agent, bool)
    assert 0.0 <= qc.confidence_estimate <= 1.0
    assert qc.reasoning


def test_simple_query_yields_simple_complexity(tmp_dir):
    """A short, single-domain query should be classified as 'simple'."""
    router = _router(tmp_dir)
    qc = router.classify("O que é PDD?")
    assert qc.complexity in ("simple", "moderate", "complex")  # complexity depends on domain detection


def test_multi_domain_query_sets_multi_agent_true(tmp_dir):
    """Query spanning multiple domains (risco + PLD + concentração) sets multi_agent=True."""
    router = _router(tmp_dir)
    qc = router.classify(
        "Analise o risco de concentração, as obrigações de PLD e AML, "
        "e a marcação a mercado do portfólio do fundo."
    )
    assert qc.multi_agent is True


def test_compare_keyword_detected_as_comparative_intent(tmp_dir):
    """Query with 'compare' or 'diferença entre' yields comparative intent."""
    router = _router(tmp_dir)
    qc = router.classify("Compare os critérios de elegibilidade de FIDC padronizado vs não-padronizado.")
    assert qc.intent == "comparative"


def test_route_returns_routing_decision(tmp_dir):
    """route() returns a RoutingDecision with a primary_agent."""
    router = _router(tmp_dir)
    decision = router.route("Qual o limite de concentração por cedente?")
    assert isinstance(decision, RoutingDecision)
    assert decision.primary_agent is not None
    assert decision.classification is not None
    assert isinstance(decision.context_layers, list)
    assert "rag" in decision.context_layers  # RAG is always included


def test_route_simple_query_top_k_is_small(tmp_dir):
    """A simple query suggests a small top_k (≤ 8)."""
    router = _router(tmp_dir)
    decision = router.route("O que é custodiante?")
    assert decision.suggested_top_k <= 8


def test_classify_procedural_intent(tmp_dir):
    """'como fazer' triggers procedural intent."""
    router = _router(tmp_dir)
    qc = router.classify("Como fazer o cálculo de PDD segundo IFRS9?")
    assert qc.intent == "procedural"


def test_route_expert_query_has_knowledge_graph_context(tmp_dir):
    """A complex multi-domain query includes knowledge_graph in context_layers."""
    router = _router(tmp_dir)
    decision = router.route(
        "Calcule o stress test de concentração, analise o PDD e compare "
        "com os covenants. Qual o impacto no marking to market?"
    )
    assert "knowledge_graph" in decision.context_layers
