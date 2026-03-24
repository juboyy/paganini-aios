"""
Paganini HyperAgent — Self-referential self-improving agent
Adapted from Meta FAIR's HyperAgents (arXiv:2603.19461)

Architecture:
  MetaAgent (OraCLI) → modifies TaskAgent + modifies itself
  TaskAgent → solves domain tasks (FIDC compliance, code, docs)

The meta-level modification procedure is itself editable,
enabling metacognitive self-modification.
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

# ── Domain definitions ──
DOMAINS = {
    "fidc_compliance": {
        "description": "CVM 175 compliance checking, BACEN regulations, PLD/AML",
        "eval_fn": "eval_compliance",
        "metrics": ["accuracy", "coverage", "false_positive_rate"],
    },
    "fidc_pricing": {
        "description": "Receivables pricing, PDD calculation, mark-to-market",
        "eval_fn": "eval_pricing",
        "metrics": ["mae", "mape", "correlation"],
    },
    "fidc_risk": {
        "description": "Credit risk scoring, concentration analysis, covenant monitoring",
        "eval_fn": "eval_risk",
        "metrics": ["auc", "precision", "recall"],
    },
    "code_quality": {
        "description": "Code generation, testing, documentation",
        "eval_fn": "eval_code",
        "metrics": ["pass_rate", "coverage", "lint_score"],
    },
}


class Archive:
    """Tracks the evolution of agents across generations."""

    def __init__(self, path: str = "runtime/hyperagent-archive.jsonl"):
        self.path = path
        self.entries: list[dict] = []
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            with open(self.path) as f:
                for line in f:
                    if line.strip():
                        self.entries.append(json.loads(line))

    def add(self, entry: dict):
        entry["timestamp"] = datetime.utcnow().isoformat()
        entry["generation"] = len(self.entries)
        self.entries.append(entry)
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def get_best(self, domain: str, metric: str = "score") -> Optional[dict]:
        domain_entries = [e for e in self.entries if e.get("domain") == domain]
        if not domain_entries:
            return None
        return max(domain_entries, key=lambda e: e.get(metric, 0))

    def get_lineage(self, gen_id: int) -> list[dict]:
        """Trace the parent chain back to initial."""
        lineage = []
        current = gen_id
        while current is not None:
            entry = next((e for e in self.entries if e.get("generation") == current), None)
            if entry is None:
                break
            lineage.append(entry)
            current = entry.get("parent_id")
        return list(reversed(lineage))


class TaskAgent:
    """Solves domain-specific tasks. Editable by MetaAgent."""

    def __init__(self, agent_code_path: str = "runtime/task_agent_current.py"):
        self.code_path = agent_code_path
        self.version = 0

    def get_code(self) -> str:
        if os.path.exists(self.code_path):
            with open(self.code_path) as f:
                return f.read()
        return self._default_code()

    def update_code(self, new_code: str, diff_description: str = ""):
        """Meta-agent writes new task agent code."""
        # Backup current version
        backup_path = f"{self.code_path}.v{self.version}"
        if os.path.exists(self.code_path):
            with open(self.code_path) as f:
                current = f.read()
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            with open(backup_path, "w") as f:
                f.write(current)

        # Write new version
        os.makedirs(os.path.dirname(self.code_path), exist_ok=True)
        with open(self.code_path, "w") as f:
            f.write(new_code)
        self.version += 1

        return {
            "version": self.version,
            "diff_description": diff_description,
            "code_length": len(new_code),
        }

    def _default_code(self) -> str:
        return '''"""Default TaskAgent — baseline implementation."""

def solve(task_input: dict, domain: str) -> dict:
    """Solve a task in the given domain."""
    return {"response": "baseline", "confidence": 0.5}

def evaluate(prediction: dict, ground_truth: dict) -> float:
    """Evaluate a prediction against ground truth."""
    return 1.0 if prediction.get("response") == ground_truth.get("expected") else 0.0
'''


class MetaAgent:
    """
    Self-referential agent that modifies both the TaskAgent
    AND its own modification procedure.

    Key insight from HyperAgents: the meta-level is editable.
    """

    def __init__(
        self,
        meta_code_path: str = "runtime/meta_agent_current.py",
        archive_path: str = "runtime/hyperagent-archive.jsonl",
    ):
        self.code_path = meta_code_path
        self.archive = Archive(archive_path)
        self.task_agent = TaskAgent()
        self.version = 0
        self.improvements: list[dict] = []

    def forward(
        self,
        domain: str,
        eval_results: dict,
        iteration: int = 0,
        max_iterations: int = 10,
    ) -> dict:
        """
        One step of the self-improvement loop.

        1. Analyze eval results
        2. Decide what to modify (task agent, meta agent, or both)
        3. Generate modifications
        4. Apply and evaluate
        5. Archive the result

        Returns metadata about the improvement step.
        """
        start_time = time.time()

        # 1. Analyze what needs improving
        analysis = self._analyze_performance(domain, eval_results)

        # 2. Decide modification target
        target = self._select_target(analysis, iteration, max_iterations)

        # 3. Generate the improvement
        improvement = self._generate_improvement(
            target=target,
            domain=domain,
            analysis=analysis,
            task_agent_code=self.task_agent.get_code(),
            meta_agent_code=self._get_meta_code(),
            archive_summary=self._summarize_archive(domain),
            iterations_left=max_iterations - iteration,
        )

        # 4. Apply
        if target in ("task_agent", "both"):
            if improvement.get("task_agent_code"):
                self.task_agent.update_code(
                    improvement["task_agent_code"],
                    improvement.get("task_agent_diff", ""),
                )

        if target in ("meta_agent", "both"):
            if improvement.get("meta_agent_code"):
                self._update_meta_code(
                    improvement["meta_agent_code"],
                    improvement.get("meta_agent_diff", ""),
                )

        # 5. Archive
        entry = {
            "domain": domain,
            "iteration": iteration,
            "target": target,
            "analysis": analysis,
            "improvement_description": improvement.get("description", ""),
            "task_agent_version": self.task_agent.version,
            "meta_agent_version": self.version,
            "eval_results": eval_results,
            "duration_s": time.time() - start_time,
            "parent_id": iteration - 1 if iteration > 0 else None,
        }
        self.archive.add(entry)
        self.improvements.append(entry)

        return entry

    def _analyze_performance(self, domain: str, eval_results: dict) -> dict:
        """Analyze what's working and what needs improvement."""
        best = self.archive.get_best(domain)
        analysis = {
            "current_score": eval_results.get("score", 0),
            "best_score": best.get("eval_results", {}).get("score", 0) if best else 0,
            "improving": False,
            "stagnant_generations": 0,
            "weak_areas": [],
            "strong_areas": [],
        }

        if best:
            analysis["improving"] = eval_results.get("score", 0) > best.get(
                "eval_results", {}
            ).get("score", 0)

        # Count stagnant generations
        recent = [
            e
            for e in self.archive.entries[-5:]
            if e.get("domain") == domain
        ]
        if len(recent) >= 3:
            scores = [e.get("eval_results", {}).get("score", 0) for e in recent]
            if max(scores) - min(scores) < 0.01:
                analysis["stagnant_generations"] = len(recent)

        # Identify weak/strong areas from metrics
        domain_config = DOMAINS.get(domain, {})
        for metric in domain_config.get("metrics", []):
            value = eval_results.get(metric, 0)
            if value < 0.5:
                analysis["weak_areas"].append(metric)
            elif value > 0.8:
                analysis["strong_areas"].append(metric)

        return analysis

    def _select_target(
        self, analysis: dict, iteration: int, max_iterations: int
    ) -> str:
        """
        Decide what to modify.

        Early iterations: focus on task agent.
        Stagnation: switch to meta-agent (improve HOW we improve).
        Late iterations: try both.
        """
        if analysis["stagnant_generations"] >= 3:
            return "meta_agent"  # Metacognitive self-modification
        elif iteration < max_iterations * 0.3:
            return "task_agent"  # Early: improve the solver
        elif iteration > max_iterations * 0.7:
            return "both"  # Late: improve everything
        else:
            return "task_agent"  # Default: improve the solver

    def _generate_improvement(self, **kwargs) -> dict:
        """
        Generate an improvement. This is the core method that
        the meta-agent can modify about itself.

        In production, this calls an LLM with the analysis context.
        Here we return a structured improvement plan.
        """
        return {
            "description": f"Improvement for {kwargs.get('domain')} targeting {kwargs.get('target')}",
            "target": kwargs.get("target"),
            "task_agent_code": None,  # LLM would generate this
            "task_agent_diff": "",
            "meta_agent_code": None,  # LLM would generate this
            "meta_agent_diff": "",
        }

    def _get_meta_code(self) -> str:
        if os.path.exists(self.code_path):
            with open(self.code_path) as f:
                return f.read()
        return "# Default meta agent — no modifications yet"

    def _update_meta_code(self, new_code: str, diff_description: str = ""):
        """The meta-agent modifies its own modification procedure."""
        backup_path = f"{self.code_path}.v{self.version}"
        if os.path.exists(self.code_path):
            with open(self.code_path) as f:
                current = f.read()
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            with open(backup_path, "w") as f:
                f.write(current)

        os.makedirs(os.path.dirname(self.code_path), exist_ok=True)
        with open(self.code_path, "w") as f:
            f.write(new_code)
        self.version += 1

    def _summarize_archive(self, domain: str) -> str:
        """Summarize the archive for context injection."""
        entries = [e for e in self.archive.entries if e.get("domain") == domain]
        if not entries:
            return "No previous runs."

        lines = [f"Archive: {len(entries)} generations for domain '{domain}'"]
        for e in entries[-5:]:  # Last 5
            score = e.get("eval_results", {}).get("score", "?")
            target = e.get("target", "?")
            desc = e.get("improvement_description", "")[:80]
            lines.append(f"  Gen {e.get('generation')}: score={score}, target={target}, {desc}")

        best = max(entries, key=lambda e: e.get("eval_results", {}).get("score", 0))
        lines.append(f"Best: Gen {best.get('generation')} score={best.get('eval_results', {}).get('score', 0)}")

        return "\n".join(lines)


def run_hyperagent_loop(
    domain: str = "fidc_compliance",
    max_generations: int = 10,
    output_dir: str = "runtime/hyperagent-outputs",
):
    """
    Main loop: iteratively improve agents through self-modification.

    This is the Paganini adaptation of HyperAgents' generate_loop.
    No Docker (we run in the same environment).
    No separate git repo (modifications are tracked via archive).
    """
    os.makedirs(output_dir, exist_ok=True)

    meta = MetaAgent(
        meta_code_path=os.path.join(output_dir, "meta_agent.py"),
        archive_path=os.path.join(output_dir, "archive.jsonl"),
    )

    print(f"Starting HyperAgent loop: domain={domain}, max_gen={max_generations}")

    for gen in range(max_generations):
        print(f"\n{'='*60}")
        print(f"Generation {gen}/{max_generations}")
        print(f"{'='*60}")

        # Evaluate current agent
        # In production, this runs the task agent on eval set
        eval_results = {
            "score": 0.5 + (gen * 0.03),  # Placeholder
            "accuracy": 0.6 + (gen * 0.02),
            "coverage": 0.7 + (gen * 0.01),
        }

        # Run meta-agent improvement step
        entry = meta.forward(
            domain=domain,
            eval_results=eval_results,
            iteration=gen,
            max_iterations=max_generations,
        )

        print(f"Target: {entry['target']}")
        print(f"Score: {entry['eval_results']['score']:.3f}")
        print(f"Task Agent v{entry['task_agent_version']}, Meta Agent v{entry['meta_agent_version']}")
        print(f"Duration: {entry['duration_s']:.1f}s")

    print(f"\n{'='*60}")
    print(f"Loop complete. {len(meta.archive.entries)} generations archived.")
    print(f"Archive: {meta.archive.path}")

    return meta


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Paganini HyperAgent Loop")
    parser.add_argument("--domain", default="fidc_compliance", choices=list(DOMAINS.keys()))
    parser.add_argument("--max-gen", type=int, default=10)
    parser.add_argument("--output-dir", default="runtime/hyperagent-outputs")
    args = parser.parse_args()

    run_hyperagent_loop(
        domain=args.domain,
        max_generations=args.max_gen,
        output_dir=args.output_dir,
    )
