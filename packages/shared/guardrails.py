"""PAGANINI Guardrails — 6-gate hard-stop pipeline.

Every RAG response passes through these gates BEFORE delivery.
First BLOCK kills the operation. No override without human + justification.
"""

from dataclasses import dataclass
from typing import Optional


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
    cvm_240_compliant: bool = False  # CVM Resolution 240/2026 — Recuperação Judicial

    @property
    def summary(self) -> str:
        passed = sum(1 for g in self.gates if g.passed)
        return f"{passed}/{len(self.gates)} gates passed"


class GuardrailPipeline:
    """6-gate hard-stop pipeline for FIDC compliance.

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

    def check(
        self, query: str, response: str, chunks: list, confidence: float
    ) -> GuardrailResult:
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

        blocked = next(
            (g for g in gates if not g.passed and g.severity == "block"), None
        )

        # CVM 240/2026: mark result as compliant if eligibility gate applied CVM 240 rules
        eligibility_gate = next((g for g in gates if g.gate == "eligibility"), None)
        cvm_240_applied = eligibility_gate is not None and (
            "CVM 240" in eligibility_gate.reason or "recuperação judicial" in eligibility_gate.reason.lower()
        )

        return GuardrailResult(
            passed=blocked is None,
            gates=gates,
            blocked_by=blocked.gate if blocked else None,
            cvm_240_compliant=cvm_240_applied,
        )

    def _gate_eligibility(self, response: str) -> GateResult:
        """Gate 1: Check for dangerous eligibility recommendations.

        CVM Resolution 240/2026 (effective March 2026):
        - Performados receivables from companies in judicial recovery (recuperação judicial)
          are NOW classified as "padronizados" — eligible for FIDC acquisition.
        - Co-obligation from a company in RJ does NOT automatically classify as NP.
        - Gate allows performados from RJ cedentes when CVM 240 compliance is confirmed.
        """
        response_lower = response.lower()

        # CVM 240/2026: detect receivables from companies in judicial recovery
        rj_keywords = [
            "recuperação judicial",
            "recuperacao judicial",
            "empresa em rj",
            "cedente em recuperação",
            "cedente em recuperacao",
        ]
        is_rj_context = any(kw in response_lower for kw in rj_keywords)

        if is_rj_context:
            # CVM 240: performados from RJ are now padronizados — ALLOWED
            performado_keywords = ["performado", "crédito performado", "credito performado", "adimplente"]
            is_performado = any(kw in response_lower for kw in performado_keywords)

            # Non-performing from RJ — warn but don't block (may be restructuring scenario)
            inadimplente_keywords = ["inadimplente", "não performado", "nao performado", "em atraso"]
            is_non_performing = any(kw in response_lower for kw in inadimplente_keywords)

            if is_performado and not is_non_performing:
                return GateResult(
                    gate="eligibility",
                    passed=True,
                    reason=(
                        "CVM 240/2026: crédito performado de cedente em recuperação judicial "
                        "classificado como padronizado — elegível para aquisição por FIDCs."
                    ),
                    severity="info",
                )
            elif is_non_performing:
                return GateResult(
                    gate="eligibility",
                    passed=True,
                    reason=(
                        "ATENÇÃO CVM 240/2026: crédito de cedente em RJ com possível inadimplência. "
                        "Verificar se é performado. Créditos não-performados de cedentes em RJ "
                        "devem ser classificados como NP. Due diligence reforçada necessária."
                    ),
                    severity="warning",
                )
            else:
                # RJ context without clear performing/non-performing signal — warn
                return GateResult(
                    gate="eligibility",
                    passed=True,
                    reason=(
                        "CVM 240/2026: cedente em recuperação judicial detectado. "
                        "Confirmar se o recebível é performado (padronizado) ou não-performado (NP) "
                        "antes da aquisição. Co-obrigação de cedente em RJ não classifica automaticamente como NP."
                    ),
                    severity="warning",
                )

        # Standard dangerous eligibility patterns (non-RJ context)
        dangerous = [
            "sem critérios de elegibilidade",
            "dispensar elegibilidade",
            "ignorar critérios",
            "qualquer direito creditório",
            "sem restrição de prazo",
            "aceitar todos os recebíveis",
        ]
        for phrase in dangerous:
            if phrase in response_lower:
                return GateResult(
                    gate="eligibility",
                    passed=False,
                    reason=f"Recomendação perigosa detectada: '{phrase}'",
                    severity="block",
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
                # Exception: if discussing mono-cedente FIDCs (legitimate)
                if "mono-cedente" in response_lower or "monocedente" in response_lower:
                    return GateResult(
                        gate="concentration",
                        passed=True,
                        reason="Concentração 100% mencionada no contexto de FIDC mono-cedente (permitido)",
                        severity="info",
                    )
                return GateResult(
                    gate="concentration",
                    passed=False,
                    reason=f"Sugestão de ignorar limites de concentração: '{phrase}'",
                    severity="block",
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
                    gate="covenant",
                    passed=False,
                    reason=f"Sugestão de descumprir covenant: '{phrase}'",
                    severity="block",
                )
        return GateResult(gate="covenant", passed=True)

    def _gate_pld_aml(self, query: str, response: str) -> GateResult:
        """Gate 4: PLD/AML compliance — block responses that facilitate money laundering."""
        dangerous_query = [
            "como evitar pld",
            "como burlar coaf",
            "esconder transação",
            "lavar dinheiro",
            "ocultar origem",
        ]
        dangerous_response = [
            "para evitar detecção",
            "sem comunicar ao coaf",
            "fracionar para ficar abaixo",
            "ocultar beneficiário",
        ]
        for phrase in dangerous_query:
            if phrase in query.lower():
                return GateResult(
                    gate="pld_aml",
                    passed=False,
                    reason="Query tenta facilitar evasão de PLD/AML",
                    severity="block",
                )
        for phrase in dangerous_response:
            if phrase in response.lower():
                return GateResult(
                    gate="pld_aml",
                    passed=False,
                    reason=f"Resposta contém orientação de evasão: '{phrase}'",
                    severity="block",
                )
        return GateResult(gate="pld_aml", passed=True)

    def _gate_compliance(
        self, response: str, chunks: list, confidence: float
    ) -> GateResult:
        """Gate 5: General compliance — ensure response is grounded in corpus."""
        if confidence < 0.3:
            return GateResult(
                gate="compliance",
                passed=False,
                reason=f"Confiança muito baixa ({confidence:.0%}). Resposta pode não ser baseada no corpus.",
                severity="warning",
            )
        if not chunks:
            return GateResult(
                gate="compliance",
                passed=False,
                reason="Nenhuma fonte encontrada no corpus. Resposta pode ser alucinação.",
                severity="block",
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
                    gate="risk_assessment",
                    passed=False,
                    reason=f"Avaliação de risco irresponsável: '{phrase}'",
                    severity="block",
                )
        return GateResult(gate="risk_assessment", passed=True)
