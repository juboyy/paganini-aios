"""PAGANINI Universal Pipeline Engine — Domain-agnostic task execution.

Abstracts the BMAD-CE 18-stage methodology into a declarative,
domain-pluggable pipeline. Any vertical (FIDC, code, legal, health)
defines its stages, agents, and execution engines via YAML.

Pipeline = Context → Spec → Execute → Validate → Learn
Everything else is domain-specific wiring.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional

# ── Stage Abstraction ──────────────────────────────────────────────


class StageKind(str, Enum):
    """Universal stage types that map to any domain."""

    CONTEXT = "context"  # Gather context (memory, search, prior decisions)
    RESEARCH = "research"  # Domain research, competitive analysis
    DESIGN = "design"  # Architecture, data models, system design
    SPEC = "spec"  # Specification: the source of truth
    PLAN = "plan"  # Decompose spec into tasks
    EXECUTE = "execute"  # Do the work (code, analysis, generation)
    REVIEW = "review"  # Peer review, quality gate
    VALIDATE = "validate"  # Automated validation (tests, guardrails)
    DEPLOY = "deploy"  # Publish, deploy, deliver
    KNOWLEDGE = "knowledge"  # Persist what was learned
    REPORT = "report"  # Stakeholder communication
    FEEDBACK = "feedback"  # Production feedback → next iteration


@dataclass
class Stage:
    """A single pipeline stage definition."""

    id: int
    name: str
    kind: StageKind
    agent: str  # Agent slug responsible
    description: str = ""
    required: bool = True  # Must this stage run?
    artifacts: list[str] = field(default_factory=list)  # Expected outputs
    depends_on: list[int] = field(default_factory=list)  # Stage IDs
    guardrails: list[str] = field(default_factory=list)  # Guardrail gates to check


@dataclass
class Tier:
    """Task classification tier with its stage subset."""

    name: str
    criteria: str  # When to use this tier
    stages: list[int]  # Stage IDs to execute
    max_minutes: int = 0  # Time budget (0 = unlimited)


@dataclass
class PipelineConfig:
    """Complete pipeline definition for a domain."""

    domain: str  # e.g., "fidc", "code", "legal"
    version: str
    stages: list[Stage]
    tiers: list[Tier]
    execution_engine: str  # Module path for the executor
    intelligence_layer: str  # Module path for context/search
    guardrail_gates: list[str] = field(default_factory=list)


# ── Pipeline Executor ──────────────────────────────────────────────


@dataclass
class StageResult:
    """Result of executing a single stage."""

    stage_id: int
    stage_name: str
    status: str  # "pass" | "fail" | "skip"
    duration_ms: float
    artifacts: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class PipelineRun:
    """Complete pipeline execution record."""

    run_id: str
    domain: str
    tier: str
    task: str
    started_at: float
    completed_at: Optional[float] = None
    stages: list[StageResult] = field(default_factory=list)
    status: str = "running"  # "running" | "completed" | "failed"
    gate_token: Optional[str] = None

    @property
    def duration_ms(self) -> float:
        if self.completed_at:
            return (self.completed_at - self.started_at) * 1000
        return (time.time() - self.started_at) * 1000

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "domain": self.domain,
            "tier": self.tier,
            "task": self.task,
            "status": self.status,
            "duration_ms": round(self.duration_ms, 1),
            "stages": [
                {
                    "id": s.stage_id,
                    "name": s.stage_name,
                    "status": s.status,
                    "duration_ms": round(s.duration_ms, 1),
                    "error": s.error,
                }
                for s in self.stages
            ],
            "gate_token": self.gate_token,
        }


class PipelineEngine:
    """Universal pipeline executor. Domain-agnostic."""

    def __init__(self, config: PipelineConfig):
        self.config = config
        self._stage_handlers: dict[str, Callable] = {}
        self._runs: list[PipelineRun] = []
        self._log_path = Path("runtime/pipeline-log.jsonl")

    def register_handler(self, stage_kind: str, handler: Callable) -> None:
        """Register a domain-specific handler for a stage kind."""
        self._stage_handlers[stage_kind] = handler

    def classify(self, task: str, complexity: str = "auto") -> Tier:
        """Classify a task into a tier based on criteria."""
        if complexity != "auto":
            for tier in self.config.tiers:
                if tier.name.lower() == complexity.lower():
                    return tier

        # Auto-classify by keyword heuristics
        task_lower = task.lower()
        if any(
            w in task_lower for w in ["typo", "fix", "config", "rename", "update value"]
        ):
            return self._tier_by_name("micro")
        elif any(w in task_lower for w in ["bug", "hotfix", "patch", "small"]):
            return self._tier_by_name("quick")
        elif any(w in task_lower for w in ["epic", "multi", "redesign", "migration"]):
            return self._tier_by_name("epic")
        else:
            return self._tier_by_name("feature")

    def execute(
        self,
        task: str,
        tier: Optional[Tier] = None,
        context: Optional[dict] = None,
        dry_run: bool = False,
    ) -> PipelineRun:
        """Execute a pipeline run for the given task."""
        import hashlib

        if tier is None:
            tier = self.classify(task)

        run_id = f"run-{int(time.time())}-{hashlib.md5(task.encode()).hexdigest()[:6]}"
        gate_token = f"GATE-{time.strftime("%Y%m%dT%H%M%S")}:{hashlib.md5(run_id.encode()).hexdigest()[:12]}"

        run = PipelineRun(
            run_id=run_id,
            domain=self.config.domain,
            tier=tier.name,
            task=task,
            started_at=time.time(),
            gate_token=gate_token,
        )

        stages_to_run = [s for s in self.config.stages if s.id in tier.stages]

        for stage in stages_to_run:
            if dry_run:
                run.stages.append(
                    StageResult(
                        stage_id=stage.id,
                        stage_name=stage.name,
                        status="skip",
                        duration_ms=0,
                    )
                )
                continue

            t0 = time.time()
            handler = self._stage_handlers.get(stage.kind.value)

            if handler is None:
                run.stages.append(
                    StageResult(
                        stage_id=stage.id,
                        stage_name=stage.name,
                        status="skip",
                        duration_ms=(time.time() - t0) * 1000,
                        error=f"No handler for {stage.kind.value}",
                    )
                )
                continue

            try:
                artifacts = handler(
                    task=task,
                    stage=stage,
                    context=context or {},
                    run=run,
                )
                run.stages.append(
                    StageResult(
                        stage_id=stage.id,
                        stage_name=stage.name,
                        status="pass",
                        duration_ms=(time.time() - t0) * 1000,
                        artifacts=artifacts or {},
                    )
                )
            except Exception as e:
                run.stages.append(
                    StageResult(
                        stage_id=stage.id,
                        stage_name=stage.name,
                        status="fail",
                        duration_ms=(time.time() - t0) * 1000,
                        error=str(e),
                    )
                )
                run.status = "failed"
                break

        if run.status != "failed":
            run.status = "completed"
        run.completed_at = time.time()

        self._runs.append(run)
        self._log_run(run)
        return run

    def _tier_by_name(self, name: str) -> Tier:
        for t in self.config.tiers:
            if t.name.lower() == name.lower():
                return t
        return self.config.tiers[-1]  # fallback to last (most complete)

    def _log_run(self, run: PipelineRun) -> None:
        self._log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._log_path, "a") as f:
            f.write(json.dumps(run.to_dict(), ensure_ascii=False) + "\n")

    @property
    def runs(self) -> list[PipelineRun]:
        return self._runs


# ── YAML Loader ────────────────────────────────────────────────────


def load_pipeline(path: str | Path) -> PipelineConfig:
    """Load a pipeline definition from YAML."""
    import yaml

    with open(path) as f:
        data = yaml.safe_load(f)

    stages = []
    for s in data.get("stages", []):
        stages.append(
            Stage(
                id=s["id"],
                name=s["name"],
                kind=StageKind(s["kind"]),
                agent=s.get("agent", "orchestrator"),
                description=s.get("description", ""),
                required=s.get("required", True),
                artifacts=s.get("artifacts", []),
                depends_on=s.get("depends_on", []),
                guardrails=s.get("guardrails", []),
            )
        )

    tiers = []
    for t in data.get("tiers", []):
        tiers.append(
            Tier(
                name=t["name"],
                criteria=t.get("criteria", ""),
                stages=t["stages"],
                max_minutes=t.get("max_minutes", 0),
            )
        )

    return PipelineConfig(
        domain=data["domain"],
        version=data.get("version", "1.0"),
        stages=stages,
        tiers=tiers,
        execution_engine=data.get("execution_engine", ""),
        intelligence_layer=data.get("intelligence_layer", ""),
        guardrail_gates=data.get("guardrail_gates", []),
    )
