"""FIDC Bayesian Risk Network — Pure Python, zero dependencies.

Causal graph:
  cdi_trend ──────┐
  setor_cedente ──┤
  historico_atrasos─┤──► p_default ──┬──► rating_impact
  rating_cedente ─┘                │
                                   ▼
  concentracao ──┐            pdd_nivel
  pdd_nivel ─────┤──► covenant_trigger ──► rating_impact

Inference via variable elimination on discrete CPTs.
No pgmpy, no torch, no numpy. Just math.
"""

from __future__ import annotations
from typing import Any

# ── Node definitions ──────────────────────────────────────────────

NODES = {
    "cdi_trend": ["up", "stable", "down"],
    "setor_cedente": ["agro", "industrial", "servicos", "financeiro"],
    "historico_atrasos": ["0", "1-2", "3+"],
    "rating_cedente": ["AAA", "AA", "A", "BBB", "below"],
    "concentracao": ["low", "medium", "high"],
    "p_default": ["low", "medium", "high"],
    "pdd_nivel": ["low", "medium", "high"],
    "covenant_trigger": ["no", "yes"],
    "rating_impact": ["none", "downgrade", "severe"],
}

# ── CPTs (Conditional Probability Tables) ─────────────────────────
# Format: {parent_values_tuple: [prob_for_each_child_state]}
# Based on Brazilian FIDC market empirical patterns.

# P(p_default | cdi_trend, setor, atrasos, rating)
# Simplified: weighted combination of marginal effects
_DEFAULT_MARGINALS = {
    "cdi_trend":         {"up": [0.20, 0.40, 0.40], "stable": [0.50, 0.35, 0.15], "down": [0.65, 0.25, 0.10]},
    "setor_cedente":     {"agro": [0.35, 0.40, 0.25], "industrial": [0.45, 0.35, 0.20], "servicos": [0.40, 0.35, 0.25], "financeiro": [0.55, 0.30, 0.15]},
    "historico_atrasos": {"0": [0.70, 0.20, 0.10], "1-2": [0.25, 0.45, 0.30], "3+": [0.05, 0.25, 0.70]},
    "rating_cedente":    {"AAA": [0.80, 0.15, 0.05], "AA": [0.65, 0.25, 0.10], "A": [0.45, 0.35, 0.20], "BBB": [0.25, 0.40, 0.35], "below": [0.10, 0.25, 0.65]},
}
_DEFAULT_WEIGHTS = {"cdi_trend": 0.15, "setor_cedente": 0.15, "historico_atrasos": 0.35, "rating_cedente": 0.35}

# P(pdd_nivel | p_default)
CPT_PDD = {
    "low":    [0.75, 0.20, 0.05],
    "medium": [0.20, 0.55, 0.25],
    "high":   [0.05, 0.25, 0.70],
}

# P(covenant_trigger | concentracao, pdd_nivel)
CPT_COVENANT = {
    ("low", "low"):     [0.92, 0.08],
    ("low", "medium"):  [0.80, 0.20],
    ("low", "high"):    [0.60, 0.40],
    ("medium", "low"):  [0.78, 0.22],
    ("medium", "medium"):[0.55, 0.45],
    ("medium", "high"): [0.30, 0.70],
    ("high", "low"):    [0.60, 0.40],
    ("high", "medium"): [0.35, 0.65],
    ("high", "high"):   [0.12, 0.88],
}

# P(rating_impact | p_default, covenant_trigger)
CPT_RATING = {
    ("low", "no"):      [0.85, 0.12, 0.03],
    ("low", "yes"):     [0.50, 0.38, 0.12],
    ("medium", "no"):   [0.55, 0.35, 0.10],
    ("medium", "yes"):  [0.20, 0.45, 0.35],
    ("high", "no"):     [0.25, 0.40, 0.35],
    ("high", "yes"):    [0.05, 0.25, 0.70],
}


# ── Inference Engine ──────────────────────────────────────────────

def _weighted_combine(evidence: dict[str, str]) -> list[float]:
    """Compute P(p_default) via weighted marginal combination."""
    result = [0.0, 0.0, 0.0]
    total_weight = 0.0
    for parent, weight in _DEFAULT_WEIGHTS.items():
        val = evidence.get(parent)
        if val and val in _DEFAULT_MARGINALS.get(parent, {}):
            marginal = _DEFAULT_MARGINALS[parent][val]
            for i in range(3):
                result[i] += weight * marginal[i]
            total_weight += weight
    if total_weight > 0:
        result = [r / total_weight for r in result]
    else:
        result = [0.33, 0.34, 0.33]
    return result


def _marginalize(cpt: dict, parent_dist: list[float], parent_states: list[str]) -> list[float]:
    """Marginalize a CPT over a parent distribution."""
    child_size = len(next(iter(cpt.values())))
    result = [0.0] * child_size
    for i, state in enumerate(parent_states):
        if state in cpt:
            for j in range(child_size):
                result[j] += parent_dist[i] * cpt[state][j]
    return result


def _marginalize_2(cpt: dict, dist1: list[float], states1: list[str],
                    dist2: list[float], states2: list[str]) -> list[float]:
    """Marginalize a CPT over two parent distributions."""
    child_size = len(next(iter(cpt.values())))
    result = [0.0] * child_size
    for i, s1 in enumerate(states1):
        for j, s2 in enumerate(states2):
            key = (s1, s2)
            if key in cpt:
                p_joint = dist1[i] * dist2[j]
                for k in range(child_size):
                    result[k] += p_joint * cpt[key][k]
    return result


def _dist_to_dict(dist: list[float], states: list[str]) -> dict[str, float]:
    """Convert distribution list to labeled dict."""
    return {s: round(p, 4) for s, p in zip(states, dist)}


def _risk_score(p_default_dist: list[float], covenant_dist: list[float],
                rating_dist: list[float]) -> float:
    """Composite risk score 0-1. Weighted combination of worst-case probabilities."""
    # P(default=high) * 0.5 + P(covenant=yes) * 0.25 + P(rating=severe) * 0.25
    return round(
        p_default_dist[2] * 0.50 +
        covenant_dist[1] * 0.25 +
        rating_dist[2] * 0.25,
        4
    )


def _risk_level(score: float) -> str:
    if score < 0.15:
        return "LOW"
    if score < 0.30:
        return "MEDIUM-LOW"
    if score < 0.50:
        return "MEDIUM"
    if score < 0.70:
        return "MEDIUM-HIGH"
    return "HIGH"


def _recommendation(level: str) -> str:
    return {
        "LOW": "Proceed — standard monitoring sufficient",
        "MEDIUM-LOW": "Proceed — enhanced monitoring recommended",
        "MEDIUM": "Proceed with caution — active risk management required",
        "MEDIUM-HIGH": "Review required — consider portfolio rebalancing",
        "HIGH": "Hold — detailed risk committee review before proceeding",
    }.get(level, "Unknown")


# ── Public API ────────────────────────────────────────────────────

class FIDCRiskNetwork:
    """Bayesian risk scorer for FIDC operations."""

    def score(self, **evidence) -> dict[str, Any]:
        """Score risk given evidence.

        Args:
            cdi_trend: up/stable/down
            setor_cedente: agro/industrial/servicos/financeiro
            historico_atrasos: 0/1-2/3+
            rating_cedente: AAA/AA/A/BBB/below
            concentracao: low/medium/high
        """
        # 1. P(default)
        p_default = _weighted_combine(evidence)

        # 2. P(pdd | default)
        p_pdd = _marginalize(CPT_PDD, p_default, NODES["p_default"])

        # 3. P(covenant | concentracao, pdd)
        conc = evidence.get("concentracao", "medium")
        conc_dist = [1.0 if s == conc else 0.0 for s in NODES["concentracao"]]
        p_covenant = _marginalize_2(
            CPT_COVENANT, conc_dist, NODES["concentracao"],
            p_pdd, NODES["pdd_nivel"]
        )

        # 4. P(rating_impact | default, covenant)
        p_rating = _marginalize_2(
            CPT_RATING, p_default, NODES["p_default"],
            p_covenant, NODES["covenant_trigger"]
        )

        score = _risk_score(p_default, p_covenant, p_rating)
        level = _risk_level(score)

        return {
            "p_default": _dist_to_dict(p_default, NODES["p_default"]),
            "pdd_nivel": _dist_to_dict(p_pdd, NODES["pdd_nivel"]),
            "covenant_trigger": _dist_to_dict(p_covenant, NODES["covenant_trigger"]),
            "rating_impact": _dist_to_dict(p_rating, NODES["rating_impact"]),
            "risk_score": score,
            "risk_level": level,
            "recommendation": _recommendation(level),
            "evidence": {k: v for k, v in evidence.items() if v},
        }

    def simulate_batch(self, scenarios: list[dict]) -> list[dict]:
        """Score multiple scenarios for comparison."""
        return [{"scenario": i + 1, **self.score(**s)} for i, s in enumerate(scenarios)]
