"""
Orchestrator Agent — the brain of the Paganini AIOS.

Decomposes complex tasks into sub-tasks, coordinates multi-agent execution,
aggregates results, and resolves conflicts.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


class AgentType(str, Enum):
    ADMINISTRADOR = "administrador"
    COMPLIANCE = "compliance"
    CUSTODIA = "custodia"
    DUE_DILIGENCE = "due_diligence"
    GESTOR = "gestor"
    PRICING = "pricing"
    ORCHESTRATOR = "orchestrator"


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class SubTask:
    id: str
    name: str
    agent: AgentType
    action: str
    params: dict[str, Any]
    depends_on: list[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error: str | None = None

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())[:8]


@dataclass
class AgentResult:
    agent: AgentType
    task_id: str
    action: str
    status: TaskStatus
    data: dict[str, Any]
    confidence: float  # 0.0 – 1.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class FlowResult:
    flow_name: str
    status: TaskStatus
    sub_tasks: list[SubTask]
    aggregated: dict[str, Any]
    conflicts: list[dict[str, Any]] = field(default_factory=list)
    duration_ms: int = 0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# ---------------------------------------------------------------------------
# Flow definitions  (agent sequence, required params)
# ---------------------------------------------------------------------------

PURCHASE_FLOW: dict[str, Any] = {
    "name": "purchase",
    "description": "Full receivable purchase pipeline — compliance, pricing, custody, portfolio.",
    "steps": [
        {
            "id": "step_1",
            "name": "eligibility_check",
            "agent": AgentType.COMPLIANCE,
            "action": "check_eligibility",
            "depends_on": [],
        },
        {
            "id": "step_2",
            "name": "pld_aml_check",
            "agent": AgentType.COMPLIANCE,
            "action": "check_pld_aml",
            "depends_on": ["step_1"],
        },
        {
            "id": "step_3",
            "name": "concentration_check",
            "agent": AgentType.COMPLIANCE,
            "action": "check_concentration",
            "depends_on": ["step_1"],
        },
        {
            "id": "step_4",
            "name": "risk_check",
            "agent": AgentType.COMPLIANCE,
            "action": "check_risk",
            "depends_on": ["step_3"],
        },
        {
            "id": "step_5",
            "name": "pricing",
            "agent": AgentType.PRICING,
            "action": "mark_to_market",
            "depends_on": ["step_4"],
        },
        {
            "id": "step_6",
            "name": "pdd_calculation",
            "agent": AgentType.PRICING,
            "action": "calculate_pdd_aging",
            "depends_on": ["step_5"],
        },
        {
            "id": "step_7",
            "name": "custody_registration",
            "agent": AgentType.CUSTODIA,
            "action": "register_title",
            "depends_on": ["step_5"],
        },
        {
            "id": "step_8",
            "name": "nav_update",
            "agent": AgentType.ADMINISTRADOR,
            "action": "calculate_nav",
            "depends_on": ["step_6", "step_7"],
        },
        {
            "id": "step_9",
            "name": "portfolio_allocation",
            "agent": AgentType.GESTOR,
            "action": "calculate_portfolio_allocation",
            "depends_on": ["step_8"],
        },
    ],
}

REPORT_FLOW: dict[str, Any] = {
    "name": "report",
    "description": "Daily fund report — NAV, pricing, custody reconciliation, compliance status.",
    "steps": [
        {
            "id": "step_1",
            "name": "nav_calculation",
            "agent": AgentType.ADMINISTRADOR,
            "action": "calculate_nav",
            "depends_on": [],
        },
        {
            "id": "step_2",
            "name": "pricing_report",
            "agent": AgentType.PRICING,
            "action": "generate_pricing_report",
            "depends_on": ["step_1"],
        },
        {
            "id": "step_3",
            "name": "custody_reconciliation",
            "agent": AgentType.CUSTODIA,
            "action": "reconcile_portfolio",
            "depends_on": ["step_1"],
        },
        {
            "id": "step_4",
            "name": "covenant_check",
            "agent": AgentType.COMPLIANCE,
            "action": "check_covenant",
            "depends_on": ["step_1"],
        },
        {
            "id": "step_5",
            "name": "stress_test",
            "agent": AgentType.GESTOR,
            "action": "stress_test",
            "depends_on": ["step_2"],
        },
        {
            "id": "step_6",
            "name": "daily_report",
            "agent": AgentType.ADMINISTRADOR,
            "action": "generate_daily_report",
            "depends_on": ["step_1", "step_2", "step_3", "step_4", "step_5"],
        },
    ],
}

ONBOARD_FLOW: dict[str, Any] = {
    "name": "onboard",
    "description": "Cedente onboarding — due diligence, PLD/AML, compliance, portfolio impact.",
    "steps": [
        {
            "id": "step_1",
            "name": "cnpj_validation",
            "agent": AgentType.DUE_DILIGENCE,
            "action": "validate_cnpj",
            "depends_on": [],
        },
        {
            "id": "step_2",
            "name": "pep_check",
            "agent": AgentType.DUE_DILIGENCE,
            "action": "check_pep",
            "depends_on": ["step_1"],
        },
        {
            "id": "step_3",
            "name": "financial_analysis",
            "agent": AgentType.DUE_DILIGENCE,
            "action": "analyze_financials",
            "depends_on": ["step_1"],
        },
        {
            "id": "step_4",
            "name": "cedente_scoring",
            "agent": AgentType.DUE_DILIGENCE,
            "action": "score_cedente",
            "depends_on": ["step_2", "step_3"],
        },
        {
            "id": "step_5",
            "name": "pld_aml",
            "agent": AgentType.COMPLIANCE,
            "action": "check_pld_aml",
            "depends_on": ["step_2"],
        },
        {
            "id": "step_6",
            "name": "concentration_impact",
            "agent": AgentType.COMPLIANCE,
            "action": "check_concentration",
            "depends_on": ["step_4"],
        },
        {
            "id": "step_7",
            "name": "portfolio_impact",
            "agent": AgentType.GESTOR,
            "action": "check_concentration_limits",
            "depends_on": ["step_6"],
        },
        {
            "id": "step_8",
            "name": "onboarding_decision",
            "agent": AgentType.DUE_DILIGENCE,
            "action": "run_onboarding_pipeline",
            "depends_on": ["step_4", "step_5", "step_6", "step_7"],
        },
    ],
}

FLOWS: dict[str, dict] = {
    "purchase": PURCHASE_FLOW,
    "report": REPORT_FLOW,
    "onboard": ONBOARD_FLOW,
}

# ---------------------------------------------------------------------------
# Task decomposition rules  (keyword → agent + action mappings)
# ---------------------------------------------------------------------------

TASK_PATTERNS: list[dict[str, Any]] = [
    {
        "keywords": ["comprar", "purchase", "adquirir", "receivable"],
        "agent": AgentType.COMPLIANCE,
        "action": "run_pipeline",
    },
    {
        "keywords": ["nav", "patrimônio", "cota", "quota"],
        "agent": AgentType.ADMINISTRADOR,
        "action": "calculate_nav",
    },
    {
        "keywords": ["pricing", "preço", "mtm", "mark"],
        "agent": AgentType.PRICING,
        "action": "mark_to_market",
    },
    {
        "keywords": ["pdd", "provisão", "aging"],
        "agent": AgentType.PRICING,
        "action": "calculate_pdd_aging",
    },
    {
        "keywords": ["custódia", "custody", "título", "title"],
        "agent": AgentType.CUSTODIA,
        "action": "register_title",
    },
    {
        "keywords": ["due diligence", "cedente", "onboard", "cnpj"],
        "agent": AgentType.DUE_DILIGENCE,
        "action": "run_onboarding_pipeline",
    },
    {
        "keywords": ["carteira", "portfolio", "allocation", "alocação"],
        "agent": AgentType.GESTOR,
        "action": "calculate_portfolio_allocation",
    },
    {
        "keywords": ["stress", "cenário", "risco"],
        "agent": AgentType.GESTOR,
        "action": "stress_test",
    },
    {
        "keywords": ["relatório", "report", "diário"],
        "agent": AgentType.ADMINISTRADOR,
        "action": "generate_daily_report",
    },
    {
        "keywords": ["concentração", "concentration", "limite"],
        "agent": AgentType.COMPLIANCE,
        "action": "check_concentration",
    },
    {
        "keywords": ["covenant", "liquidez", "inadimplência"],
        "agent": AgentType.COMPLIANCE,
        "action": "check_covenant",
    },
    {
        "keywords": ["pep", "aml", "pld", "sanção"],
        "agent": AgentType.COMPLIANCE,
        "action": "check_pld_aml",
    },
]


# ---------------------------------------------------------------------------
# OrchestratorAgent
# ---------------------------------------------------------------------------


class OrchestratorAgent:
    """
    Central orchestration agent.

    Decomposes natural-language tasks into typed SubTask sequences,
    executes named flows, aggregates multi-agent results, and resolves
    conflicts when agents disagree.
    """

    def __init__(self):
        self.flows = FLOWS
        self.task_patterns = TASK_PATTERNS

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def execute(
        self,
        task: str,
        context: dict[str, Any],
        chunks: list[Any] | None = None,
    ) -> dict[str, Any]:
        """
        Main entry point.  Detects whether the task maps to a named flow
        or needs ad-hoc decomposition, then executes accordingly.

        Args:
            task: Natural-language task description.
            context: Shared context dict (portfolio, fund_state, …).
            chunks: Optional document chunks from RAG pipeline.

        Returns:
            Aggregated execution result.
        """
        task_lower = task.lower()

        # Match to a named flow first
        for flow_name in ("purchase", "report", "onboard"):
            if flow_name in task_lower:
                flow_result = self.execute_flow(flow_name, context)
                return {
                    "type": "flow",
                    "flow": flow_name,
                    "status": flow_result.status.value,
                    "result": flow_result.aggregated,
                    "conflicts": flow_result.conflicts,
                    "timestamp": flow_result.timestamp,
                }

        # Ad-hoc decomposition
        sub_tasks = self.decompose_task(task)
        stub_results: list[AgentResult] = [
            AgentResult(
                agent=st.agent,
                task_id=st.id,
                action=st.action,
                status=TaskStatus.COMPLETED,
                data={"params": st.params},
                confidence=0.85,
            )
            for st in sub_tasks
        ]
        aggregated = self.aggregate_results(stub_results)
        return {
            "type": "decomposed",
            "sub_tasks": [
                {
                    "id": st.id,
                    "name": st.name,
                    "agent": st.agent.value,
                    "action": st.action,
                }
                for st in sub_tasks
            ],
            "aggregated": aggregated,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def decompose_task(self, task: str) -> list[SubTask]:
        """
        Break a natural-language task into atomic SubTasks with agent assignments.

        Uses keyword pattern matching against TASK_PATTERNS.  When multiple
        patterns fire, orders them by dependency (simpler actions first).

        Args:
            task: Natural-language task description.

        Returns:
            Ordered list of SubTask objects ready for execution.
        """
        task_lower = task.lower()
        matched: list[SubTask] = []
        seen_actions: set[str] = set()

        for idx, pattern in enumerate(self.task_patterns):
            if any(kw in task_lower for kw in pattern["keywords"]):
                action_key = f"{pattern['agent'].value}:{pattern['action']}"
                if action_key in seen_actions:
                    continue
                seen_actions.add(action_key)

                sub_task = SubTask(
                    id=f"task_{idx:02d}",
                    name=f"{pattern['agent'].value}_{pattern['action']}",
                    agent=pattern["agent"],
                    action=pattern["action"],
                    params={"task_input": task},
                    depends_on=[],
                )
                matched.append(sub_task)

        if not matched:
            # Fallback: route to administrador for general queries
            matched.append(
                SubTask(
                    id="task_fallback",
                    name="general_query",
                    agent=AgentType.ADMINISTRADOR,
                    action="generate_daily_report",
                    params={"task_input": task},
                )
            )

        return matched

    def execute_flow(self, flow_name: str, params: dict[str, Any]) -> FlowResult:
        """
        Execute a named flow (purchase | report | onboard).

        Simulates sequential step execution respecting dependencies.
        In production this would dispatch to real agent instances.

        Args:
            flow_name: One of 'purchase', 'report', 'onboard'.
            params: Context / parameter dict passed to each step.

        Returns:
            FlowResult with step statuses and aggregated output.
        """
        if flow_name not in self.flows:
            raise ValueError(
                f"Unknown flow: {flow_name!r}. Available: {list(self.flows)}"
            )

        flow_def = self.flows[flow_name]
        start_ts = datetime.utcnow()
        sub_tasks: list[SubTask] = []
        completed_ids: set[str] = set()
        results: list[AgentResult] = []
        overall_status = TaskStatus.COMPLETED

        for step in flow_def["steps"]:
            # Dependency resolution
            deps_met = all(dep in completed_ids for dep in step["depends_on"])
            st = SubTask(
                id=step["id"],
                name=step["name"],
                agent=step["agent"],
                action=step["action"],
                params=params,
                depends_on=step["depends_on"],
            )

            if not deps_met:
                st.status = TaskStatus.SKIPPED
                st.error = "Dependency not met — preceding step failed or was skipped."
                overall_status = TaskStatus.FAILED
            else:
                # Simulate execution (in production: dispatch to agent)
                st.status = TaskStatus.COMPLETED
                st.result = {
                    "step": step["name"],
                    "params_received": list(params.keys()),
                }
                completed_ids.add(step["id"])

                results.append(
                    AgentResult(
                        agent=step["agent"],
                        task_id=step["id"],
                        action=step["action"],
                        status=TaskStatus.COMPLETED,
                        data=st.result,
                        confidence=0.9,
                    )
                )

            sub_tasks.append(st)

        aggregated = self.aggregate_results(results)
        conflicts = self.resolve_conflicts(results)

        duration_ms = int((datetime.utcnow() - start_ts).total_seconds() * 1000)

        return FlowResult(
            flow_name=flow_name,
            status=overall_status,
            sub_tasks=sub_tasks,
            aggregated=aggregated,
            conflicts=list(conflicts.get("conflicts", [])),
            duration_ms=duration_ms,
        )

    def aggregate_results(self, results: list[AgentResult]) -> dict[str, Any]:
        """
        Merge outputs from multiple agent results into a single unified dict.

        Strategy:
        - Group by agent type.
        - Confidence-weighted merge when same key appears from multiple agents.
        - Errors and warnings bubble up to top level.

        Args:
            results: List of AgentResult objects.

        Returns:
            Aggregated dict with 'by_agent', 'summary', 'errors', 'warnings'.
        """
        by_agent: dict[str, list[dict]] = {}
        all_errors: list[str] = []
        all_warnings: list[str] = []
        merged_data: dict[str, Any] = {}

        for result in results:
            agent_key = result.agent.value
            if agent_key not in by_agent:
                by_agent[agent_key] = []
            by_agent[agent_key].append(
                {
                    "task_id": result.task_id,
                    "action": result.action,
                    "status": result.status.value,
                    "confidence": result.confidence,
                    "data": result.data,
                }
            )
            all_errors.extend(result.errors)
            all_warnings.extend(result.warnings)

            # Confidence-weighted merge: higher confidence wins on key collision
            for key, value in result.data.items():
                if key not in merged_data:
                    merged_data[key] = {
                        "value": value,
                        "confidence": result.confidence,
                        "source": agent_key,
                    }
                elif result.confidence > merged_data[key]["confidence"]:
                    merged_data[key] = {
                        "value": value,
                        "confidence": result.confidence,
                        "source": agent_key,
                    }

        completed = sum(1 for r in results if r.status == TaskStatus.COMPLETED)
        failed = sum(1 for r in results if r.status == TaskStatus.FAILED)

        return {
            "by_agent": by_agent,
            "merged_data": merged_data,
            "summary": {
                "total_steps": len(results),
                "completed": completed,
                "failed": failed,
                "success_rate": (completed / len(results) * 100) if results else 0.0,
            },
            "errors": all_errors,
            "warnings": all_warnings,
        }

    def resolve_conflicts(self, results: list[AgentResult]) -> dict[str, Any]:
        """
        Detect and resolve conflicts when agents produce contradictory outputs.

        Conflict detection rules:
        1. Same key, different scalar values from different agents → confidence vote.
        2. APPROVE vs REJECT status from different agents → escalate.
        3. NAV discrepancy > 0.1% → flag for human review.

        Args:
            results: List of AgentResult objects.

        Returns:
            Dict with 'conflicts' list and 'resolutions'.
        """
        # Build per-key value map: {key: [(value, confidence, agent)]}
        key_map: dict[str, list[tuple[Any, float, str]]] = {}
        for result in results:
            for key, value in result.data.items():
                if key not in key_map:
                    key_map[key] = []
                key_map[key].append((value, result.confidence, result.agent.value))

        conflicts: list[dict[str, Any]] = []
        resolutions: dict[str, Any] = {}

        for key, entries in key_map.items():
            if len(entries) < 2:
                continue

            # Check for scalar disagreements
            unique_values = {str(v) for v, _, _ in entries}
            if len(unique_values) == 1:
                continue  # All agree

            # Check APPROVE/REJECT conflict
            statuses = {str(v).lower() for v, _, _ in entries}
            if "approve" in statuses and "reject" in statuses:
                conflict = {
                    "type": "approve_reject_conflict",
                    "key": key,
                    "entries": [
                        {"value": str(v), "agent": a, "confidence": c}
                        for v, c, a in entries
                    ],
                    "resolution": "REJECT",  # Conservative: reject wins
                    "reason": "Safety-first: conflicting APPROVE/REJECT → REJECT until human review.",
                }
                conflicts.append(conflict)
                resolutions[key] = "REJECT"
                continue

            # Numeric disagreement → confidence-weighted average
            numeric_entries = []
            for v, c, a in entries:
                try:
                    numeric_entries.append((float(v), c, a))
                except (TypeError, ValueError):
                    pass

            if numeric_entries and len(numeric_entries) == len(entries):
                total_weight = sum(c for _, c, _ in numeric_entries)
                weighted_avg = (
                    sum(v * c for v, c, _ in numeric_entries) / total_weight
                    if total_weight
                    else 0
                )
                max_val = max(v for v, _, _ in numeric_entries)
                min_val = min(v for v, _, _ in numeric_entries)
                discrepancy_pct = (
                    ((max_val - min_val) / max_val * 100) if max_val else 0
                )

                conflict = {
                    "type": "numeric_discrepancy",
                    "key": key,
                    "entries": [
                        {"value": v, "agent": a, "confidence": c}
                        for v, c, a in numeric_entries
                    ],
                    "discrepancy_pct": round(discrepancy_pct, 4),
                    "resolution": round(weighted_avg, 6),
                    "requires_human_review": discrepancy_pct > 0.1,
                    "reason": "Confidence-weighted average applied.",
                }
                conflicts.append(conflict)
                resolutions[key] = round(weighted_avg, 6)
            else:
                # Non-numeric, non-approve/reject: highest confidence wins
                best = max(entries, key=lambda x: x[1])
                conflict = {
                    "type": "value_conflict",
                    "key": key,
                    "entries": [
                        {"value": str(v), "agent": a, "confidence": c}
                        for v, c, a in entries
                    ],
                    "resolution": str(best[0]),
                    "reason": f"Highest-confidence source wins: {best[2]} (confidence={best[1]:.2f}).",
                }
                conflicts.append(conflict)
                resolutions[key] = str(best[0])

        return {"conflicts": conflicts, "resolutions": resolutions}
