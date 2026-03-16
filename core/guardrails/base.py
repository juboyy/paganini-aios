"""Paganini Guardrail Pipeline — base interface for compliance gates.

Core provides the pipeline infrastructure. Packs register their gates.
Pipeline executes gates sequentially. First block stops execution.

Usage:
    pipeline = GuardrailPipelineBase()
    pipeline.register_gate(MyGate())
    result = pipeline.check(query, context)
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

logger = logging.getLogger("paganini.guardrails")


@dataclass
class GateResult:
    """Result from a single guardrail gate."""
    gate_name: str
    passed: bool
    reason: str = ""
    details: dict = field(default_factory=dict)
    latency_ms: float = 0.0


@dataclass
class PipelineResult:
    """Result from the full guardrail pipeline."""
    passed: bool
    gates_checked: int = 0
    gates_passed: int = 0
    blocked_by: str | None = None
    block_reason: str = ""
    results: list[GateResult] = field(default_factory=list)
    latency_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "gates_checked": self.gates_checked,
            "gates_passed": self.gates_passed,
            "blocked_by": self.blocked_by,
            "block_reason": self.block_reason,
            "latency_ms": self.latency_ms,
            "results": [
                {"gate": r.gate_name, "passed": r.passed, "reason": r.reason}
                for r in self.results
            ],
        }


class GuardrailGate(ABC):
    """Abstract base class for a guardrail gate."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Gate identifier."""
        ...

    @property
    def description(self) -> str:
        return ""

    @abstractmethod
    def check(self, query: str, context: dict) -> GateResult:
        """Check if the query passes this gate."""
        ...


class GuardrailPipelineBase:
    """Sequential guardrail pipeline. Stops at first block."""

    def __init__(self):
        self._gates: list[GuardrailGate] = []
        self._audit_log: list[dict] = []

    def register_gate(self, gate: GuardrailGate) -> None:
        """Add a gate to the pipeline."""
        self._gates.append(gate)
        logger.debug("Registered guardrail gate: %s", gate.name)

    @property
    def gates(self) -> list[GuardrailGate]:
        return list(self._gates)

    def check(self, query: str, context: dict | None = None) -> PipelineResult:
        """Run all gates sequentially. Stop at first block."""
        context = context or {}
        start = time.time()
        results: list[GateResult] = []
        passed_count = 0

        for gate in self._gates:
            gate_start = time.time()
            try:
                result = gate.check(query, context)
            except Exception as e:
                result = GateResult(
                    gate_name=gate.name,
                    passed=False,
                    reason=f"Gate error: {e}",
                )
            result.latency_ms = round((time.time() - gate_start) * 1000, 1)
            results.append(result)

            if result.passed:
                passed_count += 1
            else:
                # Blocked — stop pipeline
                pipeline_result = PipelineResult(
                    passed=False,
                    gates_checked=len(results),
                    gates_passed=passed_count,
                    blocked_by=gate.name,
                    block_reason=result.reason,
                    results=results,
                    latency_ms=round((time.time() - start) * 1000, 1),
                )
                self._log_audit(query, pipeline_result)
                return pipeline_result

        pipeline_result = PipelineResult(
            passed=True,
            gates_checked=len(results),
            gates_passed=passed_count,
            results=results,
            latency_ms=round((time.time() - start) * 1000, 1),
        )
        self._log_audit(query, pipeline_result)
        return pipeline_result

    def _log_audit(self, query: str, result: PipelineResult) -> None:
        """Record audit trail."""
        entry = {
            "timestamp": time.time(),
            "query": query[:200],  # truncate for safety
            "passed": result.passed,
            "blocked_by": result.blocked_by,
            "gates_checked": result.gates_checked,
        }
        self._audit_log.append(entry)
        if len(self._audit_log) > 1000:
            self._audit_log = self._audit_log[-500:]

    @property
    def audit_log(self) -> list[dict]:
        return list(self._audit_log)

    def summary(self) -> dict:
        return {
            "gates": [g.name for g in self._gates],
            "total_checks": len(self._audit_log),
            "total_blocks": sum(1 for e in self._audit_log if not e["passed"]),
        }
