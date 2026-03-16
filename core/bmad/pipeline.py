"""Paganini BMAD Pipeline — configurable execution methodology.

Users define pipelines with stages, agents, and gates in config.yaml.
The engine executes stages sequentially, persists results, and enforces gates.

Example config:
    pipelines:
      code_review:
        stages: [context, spec, implement, review, qa, deploy]
        agents: [architect, developer, reviewer]
        gates:
          - stage: review
            requires: approval
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger("paganini.bmad")


# ── Built-in Stage Definitions ──────────────────────────────────────

BUILTIN_STAGES = {
    "context": {"name": "Context Scout", "description": "Gather context from memory, docs, and codebase"},
    "research": {"name": "Research", "description": "Technical research and competitive analysis"},
    "prd": {"name": "PRD", "description": "Product requirements document"},
    "architect": {"name": "Architecture", "description": "System design and data models"},
    "ux": {"name": "UX Design", "description": "Interface specs and user flows"},
    "ba": {"name": "Business Analysis", "description": "Business to technical translation"},
    "sprint": {"name": "Sprint Planning", "description": "Story decomposition and prioritization"},
    "story": {"name": "Story", "description": "User stories with acceptance criteria"},
    "checklist": {"name": "Review Checklist", "description": "Pre-development quality gate"},
    "spec": {"name": "Specification", "description": "Technical specification for implementation"},
    "implement": {"name": "Implementation", "description": "Code implementation"},
    "review": {"name": "Code Review", "description": "Automated review and standards check"},
    "qa": {"name": "QA Testing", "description": "Test strategy and execution"},
    "deploy": {"name": "Deployment", "description": "Build, deploy, smoke tests"},
    "stakeholder": {"name": "Stakeholder Review", "description": "Report for approval"},
    "retro": {"name": "Retrospective", "description": "Lessons learned"},
    "knowledge": {"name": "Knowledge", "description": "Persist learnings to memory"},
    "metrics": {"name": "Metrics", "description": "Log metrics and measurements"},
}


@dataclass
class StageResult:
    """Result of executing a pipeline stage."""
    stage: str
    status: str  # pending | running | passed | failed | blocked | skipped
    started_at: float = 0.0
    finished_at: float = 0.0
    duration_s: float = 0.0
    output: Any = None
    error: str | None = None
    gate_result: str | None = None  # passed | blocked | None


@dataclass
class PipelineRun:
    """A single execution of a pipeline."""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    pipeline_name: str = ""
    stages: list[str] = field(default_factory=list)
    results: dict[str, StageResult] = field(default_factory=dict)
    status: str = "pending"  # pending | running | completed | failed | blocked
    started_at: float = 0.0
    finished_at: float = 0.0
    config: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "pipeline": self.pipeline_name,
            "status": self.status,
            "stages": self.stages,
            "results": {
                k: {
                    "stage": v.stage,
                    "status": v.status,
                    "duration_s": v.duration_s,
                    "error": v.error,
                    "gate_result": v.gate_result,
                }
                for k, v in self.results.items()
            },
            "started_at": self.started_at,
            "finished_at": self.finished_at,
        }


class PipelineEngine:
    """BMAD-CE Pipeline execution engine."""

    def __init__(self, config: dict | None = None, runs_dir: str | Path = "runtime/pipeline"):
        self.config = config or {}
        self.runs_dir = Path(runs_dir)
        self.runs_dir.mkdir(parents=True, exist_ok=True)
        self._custom_stages: dict[str, dict] = {}
        self._stage_handlers: dict[str, Callable] = {}
        self._gate_checks: dict[str, Callable] = {}
        self._runs: dict[str, PipelineRun] = {}

    def register_stage(self, name: str, description: str = "", handler: Callable | None = None):
        """Register a custom stage (from packs or user config)."""
        self._custom_stages[name] = {"name": name, "description": description}
        if handler:
            self._stage_handlers[name] = handler

    def register_gate(self, stage_name: str, check_fn: Callable):
        """Register a gate check for a stage."""
        self._gate_checks[stage_name] = check_fn

    def get_pipeline_config(self, name: str) -> dict | None:
        """Get pipeline config from config.yaml."""
        pipelines = self.config.get("pipelines", {})
        return pipelines.get(name)

    def list_pipelines(self) -> list[str]:
        """List available pipeline names from config."""
        return list(self.config.get("pipelines", {}).keys())

    def list_stages(self) -> dict[str, dict]:
        """List all available stages (builtin + custom)."""
        all_stages = dict(BUILTIN_STAGES)
        all_stages.update(self._custom_stages)
        return all_stages

    def create_run(self, pipeline_name: str, stages: list[str] | None = None) -> PipelineRun:
        """Create a new pipeline run."""
        pipeline_config = self.get_pipeline_config(pipeline_name) or {}
        if stages is None:
            stages = pipeline_config.get("stages", list(BUILTIN_STAGES.keys()))

        run = PipelineRun(
            pipeline_name=pipeline_name,
            stages=stages,
            config=pipeline_config,
        )
        # Initialize stage results
        for stage in stages:
            run.results[stage] = StageResult(stage=stage, status="pending")

        self._runs[run.id] = run
        logger.info("Created pipeline run %s (%s): %d stages", run.id, pipeline_name, len(stages))
        return run

    def execute_stage(self, run_id: str, stage: str, context: dict | None = None) -> StageResult:
        """Execute a single stage in a pipeline run."""
        run = self._runs.get(run_id)
        if not run:
            raise ValueError(f"Run '{run_id}' not found")
        if stage not in run.results:
            raise ValueError(f"Stage '{stage}' not in pipeline")

        result = run.results[stage]

        # Check gate
        if stage in self._gate_checks:
            gate_fn = self._gate_checks[stage]
            try:
                gate_ok = gate_fn(run, context or {})
            except Exception as e:
                gate_ok = False
                result.error = f"Gate check failed: {e}"

            if not gate_ok:
                result.status = "blocked"
                result.gate_result = "blocked"
                logger.warning("Stage '%s' blocked by gate in run %s", stage, run_id)
                return result
            result.gate_result = "passed"

        # Execute
        result.status = "running"
        result.started_at = time.time()
        run.status = "running"

        handler = self._stage_handlers.get(stage)
        if handler:
            try:
                result.output = handler(run, context or {})
                result.status = "passed"
            except Exception as e:
                result.status = "failed"
                result.error = str(e)
                logger.error("Stage '%s' failed in run %s: %s", stage, run_id, e)
        else:
            # No handler — mark as passed (manual/external stage)
            result.status = "passed"

        result.finished_at = time.time()
        result.duration_s = round(result.finished_at - result.started_at, 3)

        # Persist
        self._persist_run(run)
        return result

    def get_run(self, run_id: str) -> PipelineRun | None:
        return self._runs.get(run_id)

    def list_runs(self) -> list[dict]:
        return [r.to_dict() for r in self._runs.values()]

    def _persist_run(self, run: PipelineRun) -> None:
        """Persist run state to disk."""
        import json
        run_dir = self.runs_dir / run.id
        run_dir.mkdir(exist_ok=True)
        with open(run_dir / "run.json", "w") as f:
            json.dump(run.to_dict(), f, indent=2)
