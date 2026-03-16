"""Tests for guardrail base pipeline."""

from core.guardrails.base import GuardrailGate, GuardrailPipelineBase, GateResult


class PassGate(GuardrailGate):
    @property
    def name(self): return "pass_gate"
    def check(self, query, context): return GateResult(gate_name=self.name, passed=True)


class BlockGate(GuardrailGate):
    @property
    def name(self): return "block_gate"
    def check(self, query, context): return GateResult(gate_name=self.name, passed=False, reason="blocked")


class ErrorGate(GuardrailGate):
    @property
    def name(self): return "error_gate"
    def check(self, query, context): raise RuntimeError("boom")


def test_empty_pipeline_passes():
    p = GuardrailPipelineBase()
    result = p.check("hello")
    assert result.passed is True
    assert result.gates_checked == 0


def test_all_pass():
    p = GuardrailPipelineBase()
    p.register_gate(PassGate())
    p.register_gate(PassGate())
    result = p.check("test query")
    assert result.passed is True
    assert result.gates_checked == 2
    assert result.gates_passed == 2


def test_block_stops_pipeline():
    p = GuardrailPipelineBase()
    p.register_gate(PassGate())
    p.register_gate(BlockGate())
    p.register_gate(PassGate())  # should not run
    result = p.check("suspicious query")
    assert result.passed is False
    assert result.blocked_by == "block_gate"
    assert result.gates_checked == 2  # stopped at 2nd gate


def test_error_gate_blocks():
    p = GuardrailPipelineBase()
    p.register_gate(ErrorGate())
    result = p.check("test")
    assert result.passed is False
    assert "Gate error" in result.block_reason


def test_audit_log():
    p = GuardrailPipelineBase()
    p.register_gate(PassGate())
    p.check("q1")
    p.check("q2")
    assert len(p.audit_log) == 2


def test_summary():
    p = GuardrailPipelineBase()
    p.register_gate(PassGate())
    p.register_gate(BlockGate())
    p.check("test")
    s = p.summary()
    assert len(s["gates"]) == 2
    assert s["total_blocks"] == 1


def test_result_to_dict():
    p = GuardrailPipelineBase()
    p.register_gate(PassGate())
    result = p.check("test")
    d = result.to_dict()
    assert d["passed"] is True
    assert len(d["results"]) == 1
