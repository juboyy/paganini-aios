"""RiskService — facade for bayesian_risk and guardrails.

Higher layers import from here instead of from packages.kernel.bayesian_risk
or packages.shared.guardrails directly.
"""

from __future__ import annotations

from typing import Any


class RiskService:
    """Wraps FIDCRiskNetwork and GuardrailPipeline for upper layers."""

    def __init__(self, config: dict) -> None:
        self._config = config
        self._guardrails = None

    # ------------------------------------------------------------------
    # Guardrails
    # ------------------------------------------------------------------

    def _get_guardrails(self) -> Any:
        if self._guardrails is None:
            from packages.shared.guardrails import GuardrailPipeline
            self._guardrails = GuardrailPipeline(self._config)
        return self._guardrails

    def check_guardrails(
        self,
        query: str,
        response: str = "",
        chunks: list | None = None,
        confidence: float = 0.0,
    ) -> Any:
        """Run guardrail checks and return the result object."""
        return self._get_guardrails().check(
            query=query,
            response=response,
            chunks=chunks or [],
            confidence=confidence,
        )

    @property
    def gates_enabled(self) -> dict:
        """Return the enabled/disabled status of each guardrail gate."""
        return self._get_guardrails().gates_enabled

    # ------------------------------------------------------------------
    # Bayesian risk network
    # ------------------------------------------------------------------

    def score_risk(
        self,
        setor_cedente: str = "agro",
        historico_atrasos: str = "0",
        concentracao: str = "low",
        rating_cedente: str = "AA",
        cdi_trend: str = "stable",
    ) -> dict[str, Any]:
        """Score a FIDC operation using the Bayesian Risk Network."""
        from packages.kernel.bayesian_risk import FIDCRiskNetwork
        net = FIDCRiskNetwork()
        return net.score(
            setor_cedente=setor_cedente,
            historico_atrasos=historico_atrasos,
            concentracao=concentracao,
            rating_cedente=rating_cedente,
            cdi_trend=cdi_trend,
        )

    def simulate_risk(self, scenarios: list[dict]) -> list[dict]:
        """Run multiple risk-score scenarios and return results."""
        from packages.kernel.bayesian_risk import FIDCRiskNetwork
        net = FIDCRiskNetwork()
        results = []
        for item in scenarios:
            res = net.score(**item)
            results.append({"scenario": item, "result": res})
        return results
