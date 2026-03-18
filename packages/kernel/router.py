"""PAGANINI Cognitive Router — Meta-cognition layer for intelligent agent dispatch.

Wraps and enhances AgentDispatcher with query classification, multi-agent
collaboration, context layer selection, and a feedback learning loop.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from pathlib import Path

from packages.agents.framework import AgentDispatcher, AgentRegistry, AgentSOUL

# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class QueryClassification:
    """Result of cognitive analysis on a query."""

    complexity: str  # simple | moderate | complex | expert
    domains: list[str]  # detected knowledge domains
    intent: str  # factual | analytical | procedural | comparative | creative
    confidence_estimate: float  # 0-1 — how confident we expect the answer to be
    multi_agent: bool  # needs collaboration between agents
    reasoning: str  # why this classification


@dataclass
class RoutingDecision:
    """Full routing decision returned by CognitiveRouter.route()."""

    primary_agent: AgentSOUL
    supporting_agents: list[AgentSOUL]
    classification: QueryClassification
    context_layers: list[str]  # "rag" | "memory" | "knowledge_graph" | "metaclaw"
    suggested_top_k: int  # number of RAG chunks to retrieve


# ---------------------------------------------------------------------------
# Intent patterns (Portuguese + English)
# ---------------------------------------------------------------------------

_INTENT_PATTERNS: dict[str, list[str]] = {
    "factual": [
        r"\bo que [eé]\b",
        r"\bquem [eé]\b",
        r"\bonde [eé]\b",
        r"\bquando [eé]\b",
        r"\bdefin[ia]\b",
        r"\bconceito\b",
        r"\bsignifica\b",
        r"\bwhat is\b",
        r"\bwhat are\b",
        r"\bdefine\b",
    ],
    "comparative": [
        r"\bcompare\b",
        r"\bcompar[ae]\b",
        r"\bdiferença entre\b",
        r"\bvs\.?\b",
        r"\bversus\b",
        r"\bmelhor que\b",
        r"\bpior que\b",
        r"\bdistinção\b",
        r"\bdiferencias\b",
        r"\bcontrast\b",
    ],
    "procedural": [
        r"\bcomo funciona\b",
        r"\bcomo fazer\b",
        r"\bcomo [ae]\b",
        r"\bpassos\b",
        r"\bprocedimento\b",
        r"\bfluxo\b",
        r"\bpasso a passo\b",
        r"\bhow to\b",
        r"\bhow does\b",
        r"\bprocess\b",
        r"\bsteps\b",
    ],
    "analytical": [
        r"\banalise\b",
        r"\banalisa\b",
        r"\bavalie\b",
        r"\bimpacto\b",
        r"\brisco\b",
        r"\bimplicaç\w+\b",
        r"\bconsequência\b",
        r"\bexplique\b",
        r"\bpor que\b",
        r"\banalyze\b",
        r"\banalyse\b",
        r"\bassess\b",
        r"\bevaluate\b",
        r"\bwhy\b",
        r"calcul[ae]",
        r"\bstress test\b",
        r"\bprojet[ao]\b",
    ],
    "creative": [
        r"\bproponha\b",
        r"\bsugira\b",
        r"\bcrie\b",
        r"\bdesenvol\w+\b",
        r"\bapresente um\b",
        r"\bgenerate\b",
        r"\bpropose\b",
        r"\bdesign\b",
        r"\bcreate\b",
        r"\bdraft\b",
    ],
}

# ---------------------------------------------------------------------------
# Complexity signals
# ---------------------------------------------------------------------------

_COMPLEXITY_SIGNALS = {
    "sub_questions": re.compile(r"[?；;]"),
    "comparison": re.compile(r"(vs|versus|compare|diferen[çc]a|contrast)", re.I),
    "calculation": re.compile(
        r"(calcul[ae]|soma|total|percentual|porcentagem|taxa|yield|mtm|pdd|deságio|"
        r"stress test|calculate|compute|quantif)",
        re.I,
    ),
    "temporal": re.compile(
        r"(histórico|evolução|tendência|período|prazo|vencimento|timeline|over time|"
        r"forecast|projeção|série temporal)",
        re.I,
    ),
    "multi_domain": None,  # determined at runtime from domain count
}

# ---------------------------------------------------------------------------
# CognitiveRouter
# ---------------------------------------------------------------------------


class CognitiveRouter:
    """Meta-cognition layer that classifies queries and makes routing decisions."""

    # How many keyword hits in a domain to count it as detected
    _DOMAIN_HIT_THRESHOLD = 1

    # Context layer thresholds
    _CONTEXT_RULES = {
        "rag": lambda c: True,  # always pull RAG
        "memory": lambda c: c.complexity in ("complex", "expert"),
        "knowledge_graph": lambda c: len(c.domains) >= 2,
        "metaclaw": lambda c: c.complexity == "expert" or c.multi_agent,
    }

    # suggested_top_k per complexity
    _TOP_K_MAP = {
        "simple": 4,
        "moderate": 8,
        "complex": 12,
        "expert": 20,
    }

    def __init__(self, config: dict):
        self.config = config
        souls_dir = config.get("souls_dir", "packages/agents/souls")
        self.registry = AgentRegistry(souls_dir=souls_dir)
        self.dispatcher = AgentDispatcher(registry=self.registry)

        # Persistence path for outcome feedback
        outcomes_path = config.get(
            "router_outcomes_path",
            "runtime/state/router_outcomes.jsonl",
        )
        self._outcomes_path = Path(outcomes_path)
        self._outcomes_path.parent.mkdir(parents=True, exist_ok=True)

        # In-memory learned patterns (domain → avg confidence)
        self._patterns: dict[str, list[float]] = {}
        self._load_patterns()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def classify(self, query: str) -> QueryClassification:
        """Analyse a query and return a rich classification."""
        query_lower = query.lower()

        # 1. Domain detection (reuse ROUTING_TABLE from dispatcher)
        domains = self._detect_domains(query_lower)

        # 2. Intent detection
        intent = self._detect_intent(query_lower)

        # 3. Complexity scoring
        complexity, complexity_reasoning = self._score_complexity(query_lower, domains)

        # 4. Multi-agent flag
        multi_agent = len(domains) >= 2 or complexity in ("complex", "expert")

        # 5. Confidence estimate
        confidence_estimate = self._estimate_confidence(
            domains, complexity, query_lower
        )

        # 6. Reasoning narrative
        reasoning = (
            f"Complexity={complexity} ({complexity_reasoning}). "
            f"Intent={intent}. "
            f"Domains={domains or ['general']}. "
            f"Multi-agent={'yes' if multi_agent else 'no'}. "
            f"Est. confidence={confidence_estimate:.2f}."
        )

        return QueryClassification(
            complexity=complexity,
            domains=domains,
            intent=intent,
            confidence_estimate=confidence_estimate,
            multi_agent=multi_agent,
            reasoning=reasoning,
        )

    def route(self, query: str) -> RoutingDecision:
        """Classify the query and return a full routing decision."""
        classification = self.classify(query)

        # Primary agent via dispatcher
        primary_agent, _ = self.dispatcher.route(query)

        # Supporting agents for multi-agent queries
        supporting_agents: list[AgentSOUL] = []
        if classification.multi_agent:
            candidates = self.dispatcher.route_multi(query, max_agents=4)
            for agent, _conf in candidates:
                if agent and agent.slug != (
                    primary_agent.slug if primary_agent else None
                ):
                    supporting_agents.append(agent)

        # Context layers
        context_layers = [
            layer
            for layer, condition in self._CONTEXT_RULES.items()
            if condition(classification)
        ]

        # suggested_top_k — boost for complex queries
        suggested_top_k = self._TOP_K_MAP.get(classification.complexity, 8)
        if classification.multi_agent:
            suggested_top_k = min(suggested_top_k + 4, 24)

        return RoutingDecision(
            primary_agent=primary_agent,
            supporting_agents=supporting_agents,
            classification=classification,
            context_layers=context_layers,
            suggested_top_k=suggested_top_k,
        )

    def record_outcome(
        self,
        query: str,
        classification: QueryClassification,
        actual_confidence: float,
        response_quality: float,
    ) -> None:
        """Persist a routing outcome for future learning.

        Args:
            query: The original query string.
            classification: The QueryClassification used.
            actual_confidence: Observed confidence score (0-1).
            response_quality: Human/model-rated quality (0-1).
        """
        record = {
            "ts": time.time(),
            "query_snippet": query[:120],
            "complexity": classification.complexity,
            "domains": classification.domains,
            "intent": classification.intent,
            "estimated_confidence": classification.confidence_estimate,
            "actual_confidence": actual_confidence,
            "response_quality": response_quality,
            "multi_agent": classification.multi_agent,
        }

        with self._outcomes_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

        # Update in-memory pattern averages per domain
        for domain in classification.domains:
            self._patterns.setdefault(domain, [])
            self._patterns[domain].append(actual_confidence)

    def get_patterns(self) -> list[dict]:
        """Return learned routing patterns (domain → avg observed confidence)."""
        patterns = []
        for domain, confidences in self._patterns.items():
            if confidences:
                patterns.append(
                    {
                        "domain": domain,
                        "sample_count": len(confidences),
                        "avg_confidence": round(sum(confidences) / len(confidences), 3),
                        "min_confidence": round(min(confidences), 3),
                        "max_confidence": round(max(confidences), 3),
                    }
                )
        return sorted(patterns, key=lambda p: p["avg_confidence"], reverse=True)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _detect_domains(self, query_lower: str) -> list[str]:
        """Detect relevant domains from the ROUTING_TABLE keyword map."""
        detected = []
        for slug, keywords in AgentDispatcher.ROUTING_TABLE.items():
            hits = sum(1 for kw in keywords if kw in query_lower)
            if hits >= self._DOMAIN_HIT_THRESHOLD:
                detected.append(slug)
        return detected

    def _detect_intent(self, query_lower: str) -> str:
        """Return the dominant intent for the query."""
        # Score each intent by number of matching patterns
        scores: dict[str, int] = {}
        for intent, patterns in _INTENT_PATTERNS.items():
            count = sum(1 for p in patterns if re.search(p, query_lower))
            if count:
                scores[intent] = count

        if not scores:
            return "factual"  # safe default

        return max(scores, key=scores.get)

    def _score_complexity(
        self, query_lower: str, domains: list[str]
    ) -> tuple[str, str]:
        """Score complexity and return (level, reasoning_str)."""
        score = 0
        signals = []

        # Sub-questions (multiple ? or ;)
        sub_q_count = len(_COMPLEXITY_SIGNALS["sub_questions"].findall(query_lower))
        if sub_q_count >= 2:
            score += sub_q_count - 1
            signals.append(f"{sub_q_count} sub-questions")

        # Comparison language
        if _COMPLEXITY_SIGNALS["comparison"].search(query_lower):
            score += 1
            signals.append("comparison")

        # Calculation required
        if _COMPLEXITY_SIGNALS["calculation"].search(query_lower):
            score += 3
            signals.append("calculation")

        # Temporal reasoning
        if _COMPLEXITY_SIGNALS["temporal"].search(query_lower):
            score += 1
            signals.append("temporal reasoning")

        # Domain crossover
        if len(domains) >= 2:
            score += len(domains)
            signals.append(f"{len(domains)}-domain crossover")
        elif len(domains) == 0:
            # Unknown domain = harder to resolve
            score += 1
            signals.append("unknown domain")

        # Query length proxy for depth
        word_count = len(query_lower.split())
        if word_count > 80:
            score += 2
            signals.append(f"long query ({word_count}w)")
        elif word_count > 40:
            score += 1
            signals.append(f"medium query ({word_count}w)")

        # Map score → level
        if score == 0:
            level = "simple"
        elif score <= 2:
            level = "moderate"
        elif score <= 5:
            level = "complex"
        else:
            level = "expert"

        reasoning = ", ".join(signals) if signals else "no complexity signals"
        return level, reasoning

    def _estimate_confidence(
        self,
        domains: list[str],
        complexity: str,
        query_lower: str,
    ) -> float:
        """Estimate how confident we expect the final answer to be (0-1)."""
        # Base confidence — starts high
        conf = 0.85

        # More domains = less focused = lower confidence
        domain_penalty = max(0.0, (len(domains) - 1) * 0.06)
        conf -= domain_penalty

        # Complexity penalty
        complexity_penalty = {
            "simple": 0.0,
            "moderate": 0.05,
            "complex": 0.12,
            "expert": 0.20,
        }
        conf -= complexity_penalty.get(complexity, 0.0)

        # Specificity bonus: presence of specific regulatory codes / numbers
        specificity_re = re.compile(
            r"\b(\d{3,4}|cvm\s*\d+|resolução\s*\d+|icvm\s*\d+|artigo\s*\d+|§\s*\d+)\b",
            re.I,
        )
        if specificity_re.search(query_lower):
            conf += 0.05

        # Learned domain confidence from past outcomes
        if domains:
            learned_adjustments = []
            for domain in domains:
                past = self._patterns.get(domain, [])
                if past:
                    avg = sum(past) / len(past)
                    # Adjust toward historical avg (blended 30%)
                    learned_adjustments.append(avg)
            if learned_adjustments:
                learned_avg = sum(learned_adjustments) / len(learned_adjustments)
                conf = conf * 0.70 + learned_avg * 0.30

        return round(max(0.05, min(1.0, conf)), 3)

    def _load_patterns(self) -> None:
        """Bootstrap in-memory patterns from persisted outcomes."""
        if not self._outcomes_path.exists():
            return
        try:
            with self._outcomes_path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                        for domain in rec.get("domains", []):
                            self._patterns.setdefault(domain, [])
                            self._patterns[domain].append(
                                rec.get("actual_confidence", 0.5)
                            )
                    except json.JSONDecodeError:
                        continue
        except OSError:
            pass
