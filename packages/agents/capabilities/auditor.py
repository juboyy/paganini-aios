"""
auditor.py — Quality Assurance and Cross-Validation for FIDC agent outputs.

Implements NAV validation, cross-agent consistency checks, anomaly detection
(2σ rule), execution trace auditing, calculation verification, and report generation.
"""

from __future__ import annotations

import math
import statistics
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class AuditFinding:
    """A single finding from an audit check."""
    finding_id: str
    severity: str           # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
    category: str           # "NAV_VALIDATION" | "CROSS_AGENT" | "ANOMALY" | "TRACE" | "CALCULATION"
    description: str
    expected: Optional[Any]
    actual: Optional[Any]
    delta: Optional[float]
    timestamp: str          # ISO datetime
    agent_source: str       # Which agent produced the data
    remediation: str        # Recommended action


@dataclass
class AuditResult:
    """Overall result of an audit operation."""
    audit_id: str
    passed: bool
    score: float            # 0–100 quality score
    findings: list[AuditFinding]
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    timestamp: str
    summary: str


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class AuditorAgent:
    """
    Quality assurance and cross-validation agent for the Paganini AIOS.

    Validates computations from all other agents, detects anomalies,
    and ensures guardrails and execution traces are complete.
    """

    # ------------------------------------------------------------------ #
    # Constants                                                            #
    # ------------------------------------------------------------------ #

    REQUIRED_AGENTS = {"risk", "pricing", "compliance", "treasury", "reporting"}
    REQUIRED_GUARDRAILS = {"pdd_ceiling", "nav_floor", "concentration_check", "liquidity_check"}
    MAX_EXECUTION_DEPTH = 5
    MAX_TIMEOUT_ERRORS = 0          # zero tolerance
    ANOMALY_SIGMA_THRESHOLD = 2.0   # flag if > 2σ from mean
    NAV_CALC_TOLERANCE = 0.01       # 1% tolerance for NAV validation
    CALCULATION_DEFAULT_TOLERANCE = 0.01

    # ------------------------------------------------------------------ #
    # Core entry point                                                     #
    # ------------------------------------------------------------------ #

    def execute(self, task: str, context: dict, chunks: list) -> dict:
        """
        Main dispatch for auditor agent.

        Args:
            task:    Task description
            context: Contains agent_results, nav_components, historical_data, trace
            chunks:  Document/data chunks

        Returns:
            dict with status, audit_result, findings, summary
        """
        findings: list[AuditFinding] = []

        # 1. Validate NAV
        nav_components = context.get("nav_components", DEMO_NAV_COMPONENTS)
        nav_result = self.validate_nav(nav_components)
        findings.extend(nav_result.findings)

        # 2. Cross-validate agents
        agent_results = context.get("agent_results", DEMO_AGENT_RESULTS)
        cross_findings = self.cross_validate_agents(agent_results)
        findings.extend(cross_findings)

        # 3. Detect anomalies
        current    = context.get("current_metrics", DEMO_CURRENT_METRICS)
        historical = context.get("historical_metrics", DEMO_HISTORICAL_METRICS)
        anomaly_findings = self.detect_anomalies(current, historical)
        findings.extend(anomaly_findings)

        # 4. Audit execution trace
        trace = context.get("execution_trace", DEMO_EXECUTION_TRACE)
        trace_result = self.audit_execution_trace(trace)
        findings.extend(trace_result.findings)

        # 5. Generate combined report
        combined_result = self._build_audit_result(findings, "execute")
        report_text = self.generate_audit_report(findings)

        return {
            "status": "ok",
            "audit_result": combined_result,
            "report": report_text,
            "summary": combined_result.summary,
        }

    # ------------------------------------------------------------------ #
    # 1. NAV Validation                                                    #
    # ------------------------------------------------------------------ #

    def validate_nav(self, nav_components: dict) -> AuditResult:
        """
        Validate NAV arithmetic and regulatory constraints.

        Checks:
          1. total_assets - total_liabilities ≈ nav (within 1%)
          2. pdd <= total_receivables (cannot provision more than exposure)
          3. subordination >= 0 (subordinated quota cannot be negative)
          4. quotas > 0 (at least one quota outstanding)

        Args:
            nav_components: dict with:
                total_assets (float), total_liabilities (float), nav (float),
                pdd (float), total_receivables (float),
                subordination (float), quotas (float)

        Returns:
            AuditResult
        """
        findings: list[AuditFinding] = []
        now = datetime.utcnow().isoformat()

        total_assets      = float(nav_components.get("total_assets", 0))
        total_liabilities = float(nav_components.get("total_liabilities", 0))
        nav               = float(nav_components.get("nav", 0))
        pdd               = float(nav_components.get("pdd", 0))
        total_receivables = float(nav_components.get("total_receivables", 0))
        subordination     = float(nav_components.get("subordination", 0))
        quotas            = float(nav_components.get("quotas", 0))

        # Check 1: NAV arithmetic
        computed_nav = total_assets - total_liabilities
        nav_delta = abs(computed_nav - nav)
        nav_tolerance_abs = abs(nav) * self.NAV_CALC_TOLERANCE

        if nav_delta > nav_tolerance_abs:
            findings.append(self._finding(
                severity="CRITICAL",
                category="NAV_VALIDATION",
                description=(
                    f"NAV arithmetic mismatch: total_assets ({total_assets:,.2f}) - "
                    f"total_liabilities ({total_liabilities:,.2f}) = {computed_nav:,.2f} "
                    f"but declared NAV = {nav:,.2f} (delta = {nav_delta:,.2f})"
                ),
                expected=computed_nav,
                actual=nav,
                delta=nav_delta,
                agent_source="admin",
                remediation="Recompute NAV from latest asset/liability schedule and reconcile.",
            ))
        else:
            findings.append(self._finding(
                severity="INFO",
                category="NAV_VALIDATION",
                description=f"NAV arithmetic valid (delta = R$ {nav_delta:,.2f}).",
                expected=computed_nav,
                actual=nav,
                delta=nav_delta,
                agent_source="admin",
                remediation="None required.",
            ))

        # Check 2: PDD <= total_receivables
        if pdd > total_receivables:
            findings.append(self._finding(
                severity="CRITICAL",
                category="NAV_VALIDATION",
                description=(
                    f"PDD ({pdd:,.2f}) exceeds total receivables ({total_receivables:,.2f}). "
                    "Cannot provision more than outstanding exposure."
                ),
                expected=total_receivables,
                actual=pdd,
                delta=pdd - total_receivables,
                agent_source="pricing",
                remediation="Review PDD calculation — check for stale or duplicated receivables.",
            ))

        # Check 3: subordination >= 0
        if subordination < 0:
            findings.append(self._finding(
                severity="HIGH",
                category="NAV_VALIDATION",
                description=f"Subordinated quota NAV is negative ({subordination:,.2f}). Quota holders fully absorbed losses.",
                expected=0.0,
                actual=subordination,
                delta=subordination,
                agent_source="admin",
                remediation="Evaluate need for capital call or restructuring of subordinated tranche.",
            ))

        # Check 4: quotas > 0
        if quotas <= 0:
            findings.append(self._finding(
                severity="CRITICAL",
                category="NAV_VALIDATION",
                description=f"Quota count is {quotas}. Fund has no outstanding quotas.",
                expected=">0",
                actual=quotas,
                delta=None,
                agent_source="admin",
                remediation="Investigate quota registry — fund may be in liquidation.",
            ))

        return self._build_audit_result(findings, "validate_nav")

    # ------------------------------------------------------------------ #
    # 2. Cross-Agent Validation                                            #
    # ------------------------------------------------------------------ #

    def cross_validate_agents(self, agent_results: dict) -> list[AuditFinding]:
        """
        Check cross-agent consistency.

        Rules:
          1. pricing.pdd == admin.nav_pdd (within 1%)
          2. compliance.status == "OK" only if risk.rating is investment grade (AAA–BBB)
          3. treasury.cash_balance agrees with admin.cash_balance (within R$ 1)
          4. reporting.nav == admin.nav (exact within 0.01%)

        Args:
            agent_results: dict keyed by agent name

        Returns:
            List of AuditFinding
        """
        findings: list[AuditFinding] = []

        pricing    = agent_results.get("pricing", {})
        admin      = agent_results.get("admin", {})
        compliance = agent_results.get("compliance", {})
        risk       = agent_results.get("risk", {})
        treasury   = agent_results.get("treasury", {})
        reporting  = agent_results.get("reporting", {})

        # Rule 1: PDD agreement
        p_pdd = pricing.get("pdd", None)
        a_pdd = admin.get("nav_pdd", None)
        if p_pdd is not None and a_pdd is not None:
            delta = abs(p_pdd - a_pdd)
            tolerance = max(abs(a_pdd) * 0.01, 1.0)
            if delta > tolerance:
                findings.append(self._finding(
                    severity="HIGH",
                    category="CROSS_AGENT",
                    description=f"PDD mismatch: pricing={p_pdd:,.2f} vs admin={a_pdd:,.2f} (delta={delta:,.2f})",
                    expected=a_pdd,
                    actual=p_pdd,
                    delta=delta,
                    agent_source="pricing",
                    remediation="Reconcile PDD methodology between pricing and admin agents.",
                ))

        # Rule 2: Compliance status vs risk rating
        comp_status  = compliance.get("status", "").upper()
        risk_rating  = risk.get("rating", "")
        INVEST_GRADE = {"AAA", "AA", "A", "BBB"}
        if comp_status == "OK" and risk_rating not in INVEST_GRADE:
            findings.append(self._finding(
                severity="HIGH",
                category="CROSS_AGENT",
                description=(
                    f"Inconsistency: compliance reports 'OK' but risk rating is '{risk_rating}' "
                    f"(below investment grade). Compliance may be stale."
                ),
                expected="investment grade",
                actual=risk_rating,
                delta=None,
                agent_source="compliance",
                remediation="Refresh compliance check using current risk rating.",
            ))

        # Rule 3: Treasury cash vs admin cash
        t_cash = treasury.get("cash_balance", None)
        a_cash = admin.get("cash_balance", None)
        if t_cash is not None and a_cash is not None:
            delta = abs(t_cash - a_cash)
            if delta > 1.0:
                findings.append(self._finding(
                    severity="MEDIUM",
                    category="CROSS_AGENT",
                    description=f"Cash balance divergence: treasury={t_cash:,.2f} vs admin={a_cash:,.2f} (delta=R$ {delta:,.2f})",
                    expected=a_cash,
                    actual=t_cash,
                    delta=delta,
                    agent_source="treasury",
                    remediation="Run bank reconciliation and update admin ledger.",
                ))

        # Rule 4: Reporting NAV vs admin NAV
        r_nav = reporting.get("nav", None)
        a_nav = admin.get("nav", None)
        if r_nav is not None and a_nav is not None:
            delta = abs(r_nav - a_nav)
            tolerance = abs(a_nav) * 0.0001  # 0.01%
            if delta > tolerance:
                findings.append(self._finding(
                    severity="HIGH",
                    category="CROSS_AGENT",
                    description=f"NAV in report ({r_nav:,.2f}) differs from admin NAV ({a_nav:,.2f}) by R$ {delta:,.2f}.",
                    expected=a_nav,
                    actual=r_nav,
                    delta=delta,
                    agent_source="reporting",
                    remediation="Regenerate report using latest admin NAV figure.",
                ))

        return findings

    # ------------------------------------------------------------------ #
    # 3. Anomaly Detection (2σ rule)                                       #
    # ------------------------------------------------------------------ #

    def detect_anomalies(
        self,
        current: dict,
        historical: list[dict],
    ) -> list[AuditFinding]:
        """
        Flag metrics deviating more than 2σ from the 30-day historical mean.

        Monitored metrics:
          - nav_change:           Daily NAV change in BRL
          - pdd_change:           Daily PDD change in BRL
          - redemption_volume:    Daily redemption BRL volume
          - new_receivable_volume: Daily new receivable origination BRL

        Args:
            current:    Today's metrics dict
            historical: List of daily metric dicts (use last 30)

        Returns:
            List of AuditFinding
        """
        findings: list[AuditFinding] = []
        history30 = historical[-30:] if len(historical) >= 30 else historical

        if len(history30) < 5:
            findings.append(self._finding(
                severity="INFO",
                category="ANOMALY",
                description=f"Insufficient history ({len(history30)} days) for anomaly detection. Minimum: 5.",
                expected=5,
                actual=len(history30),
                delta=None,
                agent_source="auditor",
                remediation="Accumulate at least 5 days of historical data.",
            ))
            return findings

        METRICS = ["nav_change", "pdd_change", "redemption_volume", "new_receivable_volume"]

        for metric in METRICS:
            hist_values = [float(h.get(metric, 0)) for h in history30 if metric in h]
            if len(hist_values) < 3:
                continue
            current_val = current.get(metric)
            if current_val is None:
                continue
            current_val = float(current_val)

            mean  = statistics.mean(hist_values)
            try:
                stdev = statistics.stdev(hist_values)
            except statistics.StatisticsError:
                stdev = 0.0

            if stdev == 0:
                continue

            z_score = (current_val - mean) / stdev
            if abs(z_score) > self.ANOMALY_SIGMA_THRESHOLD:
                severity = "HIGH" if abs(z_score) > 3.0 else "MEDIUM"
                findings.append(self._finding(
                    severity=severity,
                    category="ANOMALY",
                    description=(
                        f"Anomaly detected in '{metric}': "
                        f"current={current_val:,.2f}, mean={mean:,.2f}, σ={stdev:,.2f}, "
                        f"z-score={z_score:.2f} (threshold=±{self.ANOMALY_SIGMA_THRESHOLD}σ)"
                    ),
                    expected=mean,
                    actual=current_val,
                    delta=current_val - mean,
                    agent_source="auditor",
                    remediation=(
                        f"Investigate '{metric}' spike. Cross-check with source data and "
                        "confirm whether it reflects real events or data error."
                    ),
                ))

        return findings

    # ------------------------------------------------------------------ #
    # 4. Execution Trace Audit                                             #
    # ------------------------------------------------------------------ #

    def audit_execution_trace(self, trace: dict) -> AuditResult:
        """
        Verify agent execution trace completeness and guardrail compliance.

        Checks:
          - All REQUIRED_AGENTS were invoked
          - All REQUIRED_GUARDRAILS ran
          - No timeout errors
          - Execution depth <= MAX_EXECUTION_DEPTH

        Args:
            trace: dict with:
                agents_invoked (list[str]),
                guardrails_run (list[str]),
                errors (list[dict] with 'type'),
                depth (int)

        Returns:
            AuditResult
        """
        findings: list[AuditFinding] = []
        now = datetime.utcnow().isoformat()

        agents_invoked = set(trace.get("agents_invoked", []))
        guardrails_run = set(trace.get("guardrails_run", []))
        errors         = trace.get("errors", [])
        depth          = trace.get("depth", 0)

        # Check required agents
        missing_agents = self.REQUIRED_AGENTS - agents_invoked
        if missing_agents:
            findings.append(self._finding(
                severity="HIGH",
                category="TRACE",
                description=f"Required agents not invoked: {sorted(missing_agents)}",
                expected=sorted(self.REQUIRED_AGENTS),
                actual=sorted(agents_invoked),
                delta=None,
                agent_source="orchestrator",
                remediation=f"Ensure the following agents are scheduled: {sorted(missing_agents)}",
            ))

        # Check required guardrails
        missing_guardrails = self.REQUIRED_GUARDRAILS - guardrails_run
        if missing_guardrails:
            findings.append(self._finding(
                severity="CRITICAL",
                category="TRACE",
                description=f"Guardrails not executed: {sorted(missing_guardrails)}",
                expected=sorted(self.REQUIRED_GUARDRAILS),
                actual=sorted(guardrails_run),
                delta=None,
                agent_source="orchestrator",
                remediation="Do not accept results without all guardrails passing.",
            ))

        # Check timeout errors
        timeout_errors = [e for e in errors if e.get("type") == "timeout"]
        if timeout_errors:
            findings.append(self._finding(
                severity="HIGH",
                category="TRACE",
                description=f"{len(timeout_errors)} timeout error(s) in execution trace.",
                expected=0,
                actual=len(timeout_errors),
                delta=float(len(timeout_errors)),
                agent_source="orchestrator",
                remediation="Retry timed-out agents. If persistent, escalate to infra team.",
            ))

        # Check other errors
        other_errors = [e for e in errors if e.get("type") != "timeout"]
        if other_errors:
            descriptions = "; ".join(str(e.get("message", ""))[:80] for e in other_errors[:3])
            findings.append(self._finding(
                severity="MEDIUM",
                category="TRACE",
                description=f"{len(other_errors)} non-timeout error(s): {descriptions}",
                expected=0,
                actual=len(other_errors),
                delta=float(len(other_errors)),
                agent_source="orchestrator",
                remediation="Review error messages and rerun affected agents.",
            ))

        # Check depth
        if depth > self.MAX_EXECUTION_DEPTH:
            findings.append(self._finding(
                severity="MEDIUM",
                category="TRACE",
                description=f"Execution depth {depth} exceeds limit {self.MAX_EXECUTION_DEPTH}. Risk of infinite loops.",
                expected=self.MAX_EXECUTION_DEPTH,
                actual=depth,
                delta=float(depth - self.MAX_EXECUTION_DEPTH),
                agent_source="orchestrator",
                remediation="Review recursion in agent orchestration chain.",
            ))

        return self._build_audit_result(findings, "audit_execution_trace")

    # ------------------------------------------------------------------ #
    # 5. Calculation Verification                                          #
    # ------------------------------------------------------------------ #

    def verify_calculation(
        self,
        name: str,
        inputs: dict,
        expected: float,
        actual: float,
        tolerance: float = 0.01,
    ) -> bool:
        """
        Verify a named calculation is within tolerance.

        Args:
            name:      Human-readable calculation name
            inputs:    Input parameters (logged for traceability)
            expected:  Expected result
            actual:    Actual result produced
            tolerance: Relative tolerance (default 1%)

        Returns:
            True if within tolerance, False otherwise
        """
        if expected == 0:
            return abs(actual) <= tolerance

        relative_delta = abs(actual - expected) / abs(expected)
        return relative_delta <= tolerance

    # ------------------------------------------------------------------ #
    # 6. Audit Report Generator                                            #
    # ------------------------------------------------------------------ #

    def generate_audit_report(self, findings: list[AuditFinding]) -> str:
        """
        Generate a structured Markdown audit report.

        Args:
            findings: List of AuditFinding objects

        Returns:
            Markdown string
        """
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        critical = [f for f in findings if f.severity == "CRITICAL"]
        high     = [f for f in findings if f.severity == "HIGH"]
        medium   = [f for f in findings if f.severity == "MEDIUM"]
        low      = [f for f in findings if f.severity == "LOW"]
        info     = [f for f in findings if f.severity == "INFO"]

        overall = "✅ APROVADO" if not critical and not high else "❌ REPROVADO"
        score   = self._compute_score(findings)

        lines = [
            f"# Relatório de Auditoria FIDC",
            f"**Gerado em:** {now}",
            f"**Status:** {overall}",
            f"**Score:** {score:.1f}/100",
            f"",
            f"## Sumário de Achados",
            f"| Severidade | Quantidade |",
            f"|------------|-----------|",
            f"| 🔴 CRITICAL | {len(critical)} |",
            f"| 🟠 HIGH     | {len(high)} |",
            f"| 🟡 MEDIUM   | {len(medium)} |",
            f"| 🟢 LOW      | {len(low)} |",
            f"| ℹ️  INFO     | {len(info)} |",
            f"| **TOTAL**   | **{len(findings)}** |",
            f"",
        ]

        for severity, group in [("CRITICAL 🔴", critical), ("HIGH 🟠", high),
                                  ("MEDIUM 🟡", medium), ("LOW 🟢", low), ("INFO ℹ️", info)]:
            if not group:
                continue
            lines.append(f"## {severity}")
            for f in group:
                lines.extend([
                    f"### {f.description[:80]}",
                    f"- **Categoria:** {f.category}",
                    f"- **Agente:** {f.agent_source}",
                    f"- **Esperado:** {f.expected}",
                    f"- **Actual:** {f.actual}",
                    f"- **Remediação:** {f.remediation}",
                    f"- **Timestamp:** {f.timestamp}",
                    "",
                ])

        lines.append("---")
        lines.append(f"*Auditoria Paganini AIOS — ID {uuid.uuid4().hex[:8]}*")
        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _finding(
        self,
        severity: str,
        category: str,
        description: str,
        expected: Any,
        actual: Any,
        delta: Optional[float],
        agent_source: str,
        remediation: str,
    ) -> AuditFinding:
        return AuditFinding(
            finding_id=uuid.uuid4().hex[:8],
            severity=severity,
            category=category,
            description=description,
            expected=expected,
            actual=actual,
            delta=delta,
            timestamp=datetime.utcnow().isoformat(),
            agent_source=agent_source,
            remediation=remediation,
        )

    def _build_audit_result(self, findings: list[AuditFinding], operation: str) -> AuditResult:
        c = sum(1 for f in findings if f.severity == "CRITICAL")
        h = sum(1 for f in findings if f.severity == "HIGH")
        m = sum(1 for f in findings if f.severity == "MEDIUM")
        l = sum(1 for f in findings if f.severity == "LOW")
        i = sum(1 for f in findings if f.severity == "INFO")
        score  = self._compute_score(findings)
        passed = c == 0 and h == 0
        summary = (
            f"[{operation}] {'PASSED' if passed else 'FAILED'} — "
            f"Score: {score:.1f} | CRITICAL: {c} | HIGH: {h} | MEDIUM: {m}"
        )
        return AuditResult(
            audit_id=uuid.uuid4().hex[:8],
            passed=passed,
            score=score,
            findings=findings,
            critical_count=c,
            high_count=h,
            medium_count=m,
            low_count=l,
            info_count=i,
            timestamp=datetime.utcnow().isoformat(),
            summary=summary,
        )

    def _compute_score(self, findings: list[AuditFinding]) -> float:
        """Compute 0–100 quality score. Deductions: CRITICAL=25, HIGH=10, MEDIUM=5, LOW=2."""
        deductions = sum({
            "CRITICAL": 25,
            "HIGH": 10,
            "MEDIUM": 5,
            "LOW": 2,
            "INFO": 0,
        }.get(f.severity, 0) for f in findings)
        return max(0.0, 100.0 - deductions)


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_NAV_COMPONENTS = {
    "total_assets":      3_200_000.0,
    "total_liabilities":   200_000.0,
    "nav":               3_000_000.0,   # correct: 3.2M - 0.2M = 3M
    "pdd":                 120_000.0,
    "total_receivables": 2_800_000.0,
    "subordination":       500_000.0,
    "quotas":           10_000.0,
}

DEMO_AGENT_RESULTS = {
    "pricing":    {"pdd": 120_500.0},
    "admin":      {"nav_pdd": 120_000.0, "cash_balance": 500_000.0, "nav": 3_000_000.0},
    "compliance": {"status": "OK"},
    "risk":       {"rating": "A"},
    "treasury":   {"cash_balance": 500_100.0},
    "reporting":  {"nav": 3_000_000.0},
}

DEMO_CURRENT_METRICS = {
    "nav_change":             -150_000.0,   # large drop — anomaly
    "pdd_change":               5_000.0,
    "redemption_volume":       50_000.0,
    "new_receivable_volume":  200_000.0,
}

DEMO_HISTORICAL_METRICS = [
    {
        "nav_change":            -10_000 + (i * 500),
        "pdd_change":             1_000.0,
        "redemption_volume":     20_000.0,
        "new_receivable_volume": 180_000.0,
    }
    for i in range(30)
]

DEMO_EXECUTION_TRACE = {
    "agents_invoked": ["risk", "pricing", "compliance", "treasury"],  # missing "reporting"
    "guardrails_run": ["pdd_ceiling", "nav_floor", "concentration_check", "liquidity_check"],
    "errors":         [],
    "depth":          3,
}


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent = AuditorAgent()
    result = agent.execute("demo audit", {}, [])
    print("=== AUDITOR AGENT DEMO ===")
    ar = result["audit_result"]
    print(f"Status: {'PASSED ✓' if ar.passed else 'FAILED ✗'}")
    print(f"Score: {ar.score:.1f}/100")
    print(f"Findings: CRITICAL={ar.critical_count} | HIGH={ar.high_count} | MEDIUM={ar.medium_count}")
    print()
    for f in ar.findings[:5]:
        print(f"  [{f.severity}] {f.description[:80]}")
    print()
    print(result["report"][:800])
