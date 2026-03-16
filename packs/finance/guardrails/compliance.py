"""PAGANINI Guardrails — 6-gate hard-stop pipeline.

Every RAG response passes through these gates BEFORE delivery.
First BLOCK kills the operation. No override without human + justification.
"""

import re
from dataclasses import dataclass
from typing import Optional

ADVERSARIAL_PATTERNS = [
    "ignore all previous instructions",
    "bypass compliance rules",
    "how to evade regulatory oversight",
    "hide transactions from authorities",
    "avoid anti-money laundering detection",
    "circumvent concentration limits",
    "falsify fund reports",
    "manipulate net asset value",
    "front-run investor redemptions",
    "create fictitious receivables",
    "backdate fund documents",
    "structure transactions to avoid reporting",
    "override risk controls",
    "disable audit logging",
    "access other funds data",
]


def _compute_similarity(text_a: str, text_b: str, n: int = 3) -> float:
    """Return a lightweight similarity score using character n-gram overlap."""

    def ngrams(text: str) -> set[str]:
        normalized = re.sub(r"\s+", " ", text.lower()).strip()
        if len(normalized) < n:
            return {normalized} if normalized else set()
        return {normalized[i:i + n] for i in range(len(normalized) - n + 1)}

    a_grams = ngrams(text_a)
    b_grams = ngrams(text_b)
    if not a_grams or not b_grams:
        return 0.0

    intersection = a_grams & b_grams
    union = a_grams | b_grams
    return len(intersection) / len(union)


def semantic_guard(query: str, response: str) -> tuple[bool, str | None]:
    """Check combined query and response against adversarial patterns."""
    query_lower = query.strip().lower()
    response_lower = response.strip().lower()
    combined = f"{query_lower} {response_lower}".strip()
    for pattern in ADVERSARIAL_PATTERNS:
        if pattern in query_lower or pattern in response_lower or pattern in combined:
            similarity = 1.0
        else:
            similarity = max(
                _compute_similarity(query_lower, pattern),
                _compute_similarity(response_lower, pattern),
                _compute_similarity(combined, pattern),
            )
        if similarity > 0.35:
            return False, f"semantic_guard (sim={similarity:.2f}: {pattern[:40]})"
    return True, None


@dataclass
class GateResult:
    gate: str
    passed: bool
    reason: str = ""
    severity: str = "info"  # info | warning | block


@dataclass
class GuardrailResult:
    passed: bool
    gates: list[GateResult]
    blocked_by: Optional[str] = None

    @property
    def summary(self) -> str:
        passed = sum(1 for g in self.gates if g.passed)
        return f"{passed}/{len(self.gates)} gates passed"


class GuardrailPipeline:
    """6-gate hard-stop pipeline for fund compliance.

    Gates execute in sequence. First BLOCK kills the operation.
    Gates: Eligibility → Concentration → Covenant → PLD/AML → Compliance → Risk
    """

    def __init__(self, config: dict):
        gc = config.get("guardrails", {})
        self.gates_enabled = {
            "eligibility": gc.get("eligibility", True),
            "concentration": gc.get("concentration", True),
            "covenant": gc.get("covenant", True),
            "pld_aml": gc.get("pld_aml", True),
            "compliance": gc.get("compliance", True),
            "risk_assessment": gc.get("risk_assessment", True),
        }

    def check(self, query: str, response: str, chunks: list, confidence: float) -> GuardrailResult:
        """Run all enabled gates on a response."""
        gates = []

        if self.gates_enabled.get("eligibility"):
            gates.append(self._gate_eligibility(response))

        if self.gates_enabled.get("concentration"):
            gates.append(self._gate_concentration(response))

        if self.gates_enabled.get("covenant"):
            gates.append(self._gate_covenant(response))

        if self.gates_enabled.get("pld_aml"):
            gates.append(self._gate_pld_aml(query, response))

        if self.gates_enabled.get("compliance"):
            gates.append(self._gate_compliance(response, chunks, confidence))

        if self.gates_enabled.get("risk_assessment"):
            gates.append(self._gate_risk(response, confidence))

        blocked = next((g for g in gates if not g.passed and g.severity == "block"), None)

        return GuardrailResult(
            passed=blocked is None,
            gates=gates,
            blocked_by=blocked.gate if blocked else None,
        )

    def _gate_eligibility(self, response: str) -> GateResult:
        """Gate 1: Check for dangerous eligibility recommendations."""
        dangerous = [
            "sem critérios de elegibilidade",
            "dispensar elegibilidade",
            "ignorar critérios",
            "qualquer direito creditório",
            "sem restrição de prazo",
            "aceitar todos os recebíveis",
        ]
        for phrase in dangerous:
            if phrase in response.lower():
                return GateResult(
                    gate="eligibility", passed=False,
                    reason=f"Recomendação perigosa detectada: '{phrase}'",
                    severity="block"
                )
        return GateResult(gate="eligibility", passed=True)

    def _gate_concentration(self, response: str) -> GateResult:
        """Gate 2: Flag responses that suggest ignoring concentration limits."""
        dangerous = [
            "sem limite de concentração",
            "concentração ilimitada",
            "100% em um cedente",
            "ignorar limites",
        ]
        response_lower = response.lower()
        for phrase in dangerous:
            if phrase in response_lower:
                # Exception: if discussing mono-cedente funds (legitimate)
                if "mono-cedente" in response_lower or "monocedente" in response_lower:
                    return GateResult(
                        gate="concentration", passed=True,
                        reason="Concentração 100% mencionada no contexto de fund mono-cedente (permitido)",
                        severity="info"
                    )
                return GateResult(
                    gate="concentration", passed=False,
                    reason=f"Sugestão de ignorar limites de concentração: '{phrase}'",
                    severity="block"
                )
        return GateResult(gate="concentration", passed=True)

    def _gate_covenant(self, response: str) -> GateResult:
        """Gate 3: Check for covenant compliance in responses."""
        dangerous = [
            "descumprir covenant",
            "ignorar covenant",
            "covenant não se aplica",
            "dispensar covenant",
        ]
        for phrase in dangerous:
            if phrase in response.lower():
                return GateResult(
                    gate="covenant", passed=False,
                    reason=f"Sugestão de descumprir covenant: '{phrase}'",
                    severity="block"
                )
        return GateResult(gate="covenant", passed=True)

    def _gate_pld_aml(self, query: str, response: str) -> GateResult:
        """Gate 4: PLD/AML compliance — block responses that facilitate money laundering."""
        dangerous_query = [
            "como evitar pld", "como burlar coaf", "esconder transação",
            "lavar dinheiro", "ocultar origem",
        ]
        dangerous_response = [
            "para evitar detecção", "sem comunicar ao coaf",
            "fracionar para ficar abaixo", "ocultar beneficiário",
        ]
        query_lower = query.lower()
        response_lower = response.lower()
        for phrase in dangerous_query:
            if phrase in query_lower:
                return GateResult(
                    gate="pld_aml", passed=False,
                    reason="Query tenta facilitar evasão de PLD/AML",
                    severity="block"
                )
        for phrase in dangerous_response:
            if phrase in response_lower:
                return GateResult(
                    gate="pld_aml", passed=False,
                    reason=f"Resposta contém orientação de evasão: '{phrase}'",
                    severity="block"
                )
        passed, blocked_by = semantic_guard(query, response)
        if not passed:
            return GateResult(
                gate="pld_aml", passed=False,
                reason=f"Detecção semântica de conteúdo adversarial: {blocked_by}",
                severity="block"
            )
        return GateResult(gate="pld_aml", passed=True)

    def _gate_compliance(self, response: str, chunks: list, confidence: float) -> GateResult:
        """Gate 5: General compliance — ensure response is grounded in corpus."""
        if confidence < 0.3:
            return GateResult(
                gate="compliance", passed=False,
                reason=f"Confiança muito baixa ({confidence:.0%}). Resposta pode não ser baseada no corpus.",
                severity="warning"
            )
        if not chunks:
            return GateResult(
                gate="compliance", passed=False,
                reason="Nenhuma fonte encontrada no corpus. Resposta pode ser alucinação.",
                severity="block"
            )
        return GateResult(gate="compliance", passed=True)

    def _gate_risk(self, response: str, confidence: float) -> GateResult:
        """Gate 6: Risk assessment — flag high-risk recommendations."""
        high_risk = [
            "garantido que não há risco",
            "risco zero",
            "impossível perder",
            "não há chance de default",
            "sem risco de crédito",
        ]
        for phrase in high_risk:
            if phrase in response.lower():
                return GateResult(
                    gate="risk_assessment", passed=False,
                    reason=f"Avaliação de risco irresponsável: '{phrase}'",
                    severity="block"
                )
        return GateResult(gate="risk_assessment", passed=True)
