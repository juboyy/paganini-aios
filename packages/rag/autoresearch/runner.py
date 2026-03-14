"""AutoResearch — self-optimizing RAG loop for PAGANINI AIOS.

Reads program.md as system prompt, proposes parameter changes via LLM,
runs eval.py, keeps improvements, reverts regressions.

Gate Token: GATE-2026-03-14T224026:4ccad14402ba
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
WORKSPACE = Path(__file__).resolve().parents[4]  # workspace root
RAG_DIR = Path(__file__).resolve().parents[1]    # packages/rag/
AR_DIR = Path(__file__).resolve().parent         # packages/rag/autoresearch/

PROGRAM_MD = AR_DIR / "program.md"
EXPERIMENTS_JSONL = AR_DIR / "experiments.jsonl"
PIPELINE_PY = RAG_DIR / "pipeline.py"
EVAL_PY = RAG_DIR / "eval.py"


# ---------------------------------------------------------------------------
# Configurable defaults (the 16 params)
# ---------------------------------------------------------------------------
DEFAULT_PARAMS: dict[str, Any] = {
    "chunk_size": 384,
    "chunk_overlap": 64,
    "chunk_strategy": "fixed",
    "respect_headers": True,
    "embedding_model": "text-embedding-3-small",
    "embedding_dims": 1536,
    "dense_weight": 0.6,
    "sparse_weight": 0.4,
    "graph_weight": 0.0,
    "fusion_method": "rrf",
    "rrf_k": 60,
    "reranker": "none",
    "top_k": 5,
    "context_assembly": "ranked",
    "query_expansion": False,
    "meta_prompt": "",
}

PARAM_CONSTRAINTS: dict[str, dict] = {
    "chunk_size":        {"type": int,   "min": 128,  "max": 1024},
    "chunk_overlap":     {"type": int,   "min": 0,    "max": 256},
    "chunk_strategy":    {"type": str,   "choices": ["fixed", "sentence", "semantic"]},
    "respect_headers":   {"type": bool},
    "embedding_model":   {"type": str,   "choices": ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]},
    "embedding_dims":    {"type": int,   "choices": [256, 512, 1024, 1536]},
    "dense_weight":      {"type": float, "min": 0.0,  "max": 1.0},
    "sparse_weight":     {"type": float, "min": 0.0,  "max": 1.0},
    "graph_weight":      {"type": float, "min": 0.0,  "max": 1.0},
    "fusion_method":     {"type": str,   "choices": ["rrf", "linear"]},
    "rrf_k":             {"type": int,   "min": 10,   "max": 100},
    "reranker":          {"type": str,   "choices": ["none", "cross-encoder"]},
    "top_k":             {"type": int,   "min": 3,    "max": 20},
    "context_assembly":  {"type": str,   "choices": ["ranked", "mmr", "clustered"]},
    "query_expansion":   {"type": bool},
    "meta_prompt":       {"type": str},
}


# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg: str, verbose: bool = True) -> None:
    if verbose:
        print(f"[autoresearch] {msg}", flush=True)


def log_experiment(entry: dict) -> None:
    """Append one experiment to experiments.jsonl."""
    with EXPERIMENTS_JSONL.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Experiment history
# ---------------------------------------------------------------------------
def load_experiments(n: int = 20) -> list[dict]:
    """Load the last N experiments from experiments.jsonl."""
    if not EXPERIMENTS_JSONL.exists():
        return []
    lines = EXPERIMENTS_JSONL.read_text(encoding="utf-8").strip().splitlines()
    entries = []
    for line in lines:
        line = line.strip()
        if line:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return entries[-n:]


# ---------------------------------------------------------------------------
# Current config reader
# ---------------------------------------------------------------------------
def read_current_params() -> dict[str, Any]:
    """Parse the 16 tunable params from pipeline.py's RAGPipeline.__init__."""
    source = PIPELINE_PY.read_text(encoding="utf-8")
    params = copy.deepcopy(DEFAULT_PARAMS)

    # We extract defaults from the rag_cfg.get("key", default) calls
    import re
    pattern = re.compile(
        r'self\.(\w+)\s*=\s*(?:rag_cfg|config)\.get\(["\'](\w+)["\'],\s*(.+?)\)',
        re.MULTILINE,
    )
    for match in pattern.finditer(source):
        attr, key, raw_default = match.group(1), match.group(2), match.group(3).strip()
        if key in params:
            try:
                # Evaluate the literal safely
                import ast
                params[key] = ast.literal_eval(raw_default)
            except Exception:
                pass  # Keep default if we can't parse

    return params


# ---------------------------------------------------------------------------
# Param validation / normalization
# ---------------------------------------------------------------------------
def validate_params(params: dict[str, Any]) -> dict[str, Any]:
    """Clamp, coerce, and normalize params. Returns cleaned copy."""
    cleaned = copy.deepcopy(DEFAULT_PARAMS)
    cleaned.update(params)

    for key, constraints in PARAM_CONSTRAINTS.items():
        val = cleaned.get(key)
        if val is None:
            continue
        typ = constraints["type"]

        # Type coercion
        if typ is bool:
            if isinstance(val, str):
                val = val.lower() in ("true", "1", "yes")
            else:
                val = bool(val)
        elif typ is int:
            val = int(val)
        elif typ is float:
            val = float(val)
        else:
            val = str(val)

        # Range clamping
        if "min" in constraints:
            val = max(constraints["min"], val)
        if "max" in constraints:
            val = min(constraints["max"], val)

        # Choices validation
        if "choices" in constraints and val not in constraints["choices"]:
            val = DEFAULT_PARAMS[key]  # fall back to default

        cleaned[key] = val

    # chunk_overlap must be < chunk_size
    if cleaned["chunk_overlap"] >= cleaned["chunk_size"]:
        cleaned["chunk_overlap"] = cleaned["chunk_size"] // 4

    # Normalize weights to sum ~= 1.0
    total = cleaned["dense_weight"] + cleaned["sparse_weight"] + cleaned["graph_weight"]
    if total > 0:
        cleaned["dense_weight"] = round(cleaned["dense_weight"] / total, 4)
        cleaned["sparse_weight"] = round(cleaned["sparse_weight"] / total, 4)
        cleaned["graph_weight"] = round(cleaned["graph_weight"] / total, 4)

    return cleaned


# ---------------------------------------------------------------------------
# LLM integration
# ---------------------------------------------------------------------------
def build_llm_prompt(
    program_md: str,
    current_params: dict[str, Any],
    history: list[dict],
    iteration: int,
) -> list[dict]:
    """Build messages list for the LLM call."""
    history_text = ""
    if history:
        history_text = "\n## Recent Experiments\n\n"
        for exp in history[-10:]:
            outcome = exp.get("outcome", "?")
            delta = exp.get("delta", 0.0)
            hyp = exp.get("hypothesis", "")
            changed = {k: v for k, v in exp.get("params", {}).items()
                       if v != DEFAULT_PARAMS.get(k)}
            history_text += (
                f"- Iteration {exp.get('iteration', '?')} [{outcome}] Δ={delta:+.4f}: "
                f"{hyp} | changed={json.dumps(changed)}\n"
            )

    user_content = (
        f"## Current Iteration: {iteration}\n\n"
        f"## Current Parameters\n```json\n{json.dumps(current_params, indent=2)}\n```\n"
        f"{history_text}\n"
        "Propose your next experiment. Output ONLY the JSON block."
    )

    return [
        {"role": "system", "content": program_md},
        {"role": "user", "content": user_content},
    ]


def call_llm(messages: list[dict], verbose: bool = False) -> str:
    """Call LLM via packages.kernel.moltis.get_llm_fn."""
    try:
        from packages.kernel.moltis import get_llm_fn  # type: ignore
        llm = get_llm_fn()
        response = llm(messages)
        return response
    except ImportError:
        # Fallback: try direct OpenAI if moltis unavailable
        log("moltis not available, falling back to openai direct", verbose)
        import os
        try:
            from openai import OpenAI  # type: ignore
            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
            result = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,  # type: ignore[arg-type]
                temperature=0.7,
                max_tokens=1024,
            )
            return result.choices[0].message.content or ""
        except Exception as e:
            raise RuntimeError(f"LLM call failed: {e}") from e


def parse_llm_response(response: str) -> dict:
    """Extract JSON from LLM response."""
    import re

    # Try to find a JSON block
    json_block = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response, re.DOTALL)
    if json_block:
        return json.loads(json_block.group(1))

    # Try raw JSON
    raw_json = re.search(r"\{.*\}", response, re.DOTALL)
    if raw_json:
        return json.loads(raw_json.group(0))

    raise ValueError(f"No JSON found in LLM response:\n{response[:500]}")


# ---------------------------------------------------------------------------
# Eval runner
# ---------------------------------------------------------------------------
def run_eval(params: dict[str, Any], eval_set: str, verbose: bool = False) -> dict:
    """Run eval.py with a temporary config and return metrics."""
    import subprocess
    import tempfile

    # Build a minimal config dict that eval.py / pipeline.py can consume
    config = {
        "rag": {
            "chunk_size": params["chunk_size"],
            "chunk_overlap": params["chunk_overlap"],
            "chunk_strategy": params["chunk_strategy"],
            "respect_headers": params["respect_headers"],
            "dense_weight": params["dense_weight"],
            "sparse_weight": params["sparse_weight"],
            "fusion_method": params["fusion_method"],
            "rrf_k": params["rrf_k"],
            "top_k": params["top_k"],
            "context_assembly": params["context_assembly"],
            "query_expansion": params["query_expansion"],
            "meta_prompt": params["meta_prompt"],
        },
        "embedding": {
            "model": params["embedding_model"],
            "dims": params["embedding_dims"],
        },
        "reranker": params["reranker"],
    }

    # Write temp config
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as tmp:
        json.dump(config, tmp)
        tmp_config_path = tmp.name

    try:
        t0 = time.time()
        result = subprocess.run(
            [
                sys.executable,
                str(EVAL_PY),
                "--config", tmp_config_path,
                "--eval-set", eval_set,
                "--output-json",
            ],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(WORKSPACE),
        )
        latency_ms = (time.time() - t0) * 1000

        if result.returncode != 0:
            log(f"eval.py stderr: {result.stderr[:500]}", verbose)
            raise RuntimeError(f"eval.py exited {result.returncode}")

        # Parse JSON output from eval.py
        output = result.stdout.strip()
        # Find last JSON object in stdout (eval.py may print progress before final JSON)
        import re
        json_matches = list(re.finditer(r"\{[^{}]+\}", output, re.DOTALL))
        if not json_matches:
            raise ValueError(f"No JSON in eval output: {output[:300]}")

        metrics = json.loads(json_matches[-1].group(0))
        metrics["latency_ms"] = latency_ms
        return metrics

    finally:
        Path(tmp_config_path).unlink(missing_ok=True)


def composite_score(metrics: dict) -> float:
    """Weighted composite from eval metrics."""
    p = metrics.get("precision_at_k", 0.0)
    r = metrics.get("recall", 0.0)
    a = metrics.get("answer_coverage", 0.0)
    return 0.40 * p + 0.35 * r + 0.25 * a


# ---------------------------------------------------------------------------
# Best config persistence
# ---------------------------------------------------------------------------
BEST_CONFIG_PATH = AR_DIR / "best_config.json"


def load_best_config() -> dict[str, Any] | None:
    if BEST_CONFIG_PATH.exists():
        return json.loads(BEST_CONFIG_PATH.read_text(encoding="utf-8"))
    return None


def save_best_config(params: dict[str, Any], score: float) -> None:
    BEST_CONFIG_PATH.write_text(
        json.dumps({"params": params, "score": score}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def run_autoresearch(
    iterations: int = 10,
    eval_set: str = "eval_questions.jsonl",
    verbose: bool = True,
) -> None:
    log(f"AutoResearch starting — {iterations} iterations, eval_set={eval_set}", verbose)

    program_md = PROGRAM_MD.read_text(encoding="utf-8")
    current_params = read_current_params()
    current_params = validate_params(current_params)

    # Establish baseline
    log("Running baseline eval…", verbose)
    try:
        baseline_metrics = run_eval(current_params, eval_set, verbose)
        baseline_score = composite_score(baseline_metrics)
        log(f"Baseline score: {baseline_score:.4f} | metrics={baseline_metrics}", verbose)
    except Exception as e:
        log(f"Baseline eval failed: {e}. Using score=0.0", verbose)
        baseline_metrics = {}
        baseline_score = 0.0

    best_params = copy.deepcopy(current_params)
    best_score = baseline_score
    save_best_config(best_params, best_score)

    history = load_experiments()

    for i in range(1, iterations + 1):
        log(f"\n── Iteration {i}/{iterations} ──", verbose)

        # Build prompt and call LLM
        messages = build_llm_prompt(program_md, current_params, history, i)
        try:
            raw_response = call_llm(messages, verbose)
            log(f"LLM response received ({len(raw_response)} chars)", verbose)
        except Exception as e:
            log(f"LLM call failed: {e} — skipping iteration", verbose)
            continue

        # Parse proposal
        try:
            proposal = parse_llm_response(raw_response)
            hypothesis = proposal.get("hypothesis", "(no hypothesis)")
            proposed_params = validate_params(proposal.get("params", {}))
            log(f"Hypothesis: {hypothesis}", verbose)
        except Exception as e:
            log(f"Failed to parse LLM response: {e} — skipping", verbose)
            continue

        # Run eval with proposed params
        log("Running eval with proposed params…", verbose)
        try:
            new_metrics = run_eval(proposed_params, eval_set, verbose)
            new_score = composite_score(new_metrics)
            log(f"New score: {new_score:.4f} (best so far: {best_score:.4f})", verbose)
        except Exception as e:
            log(f"Eval failed: {e} — logging as error, continuing", verbose)
            log_experiment({
                "timestamp": _ts(),
                "iteration": i,
                "hypothesis": hypothesis,
                "params": proposed_params,
                "score_before": best_score,
                "score_after": None,
                "delta": None,
                "outcome": "error",
                "metrics": {"error": str(e)},
                "reverted": True,
            })
            history = load_experiments()
            continue

        delta = new_score - best_score
        improved = new_score > best_score

        entry: dict[str, Any] = {
            "timestamp": _ts(),
            "iteration": i,
            "hypothesis": hypothesis,
            "params": proposed_params,
            "score_before": round(best_score, 6),
            "score_after": round(new_score, 6),
            "delta": round(delta, 6),
            "outcome": "improved" if improved else ("neutral" if delta == 0 else "degraded"),
            "metrics": new_metrics,
            "reverted": not improved,
        }
        log_experiment(entry)

        if improved:
            log(f"✓ Accepted — Δ={delta:+.4f}", verbose)
            best_params = copy.deepcopy(proposed_params)
            best_score = new_score
            current_params = copy.deepcopy(proposed_params)
            save_best_config(best_params, best_score)
        else:
            log(f"✗ Reverted — Δ={delta:+.4f}", verbose)
            # current_params stays at best_params (unchanged)

        history = load_experiments()

    log(f"\n── AutoResearch complete ──", verbose)
    log(f"Best score: {best_score:.4f}", verbose)
    log(f"Best config saved to: {BEST_CONFIG_PATH}", verbose)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="AutoResearch — self-optimizing RAG loop for PAGANINI AIOS"
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=10,
        help="Number of optimization iterations (default: 10)",
    )
    parser.add_argument(
        "--eval-set",
        type=str,
        default="eval_questions.jsonl",
        help="Path to the eval Q&A file (default: eval_questions.jsonl)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=True,
        help="Print progress (default: on)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress output",
    )
    args = parser.parse_args()

    verbose = args.verbose and not args.quiet
    run_autoresearch(
        iterations=args.iterations,
        eval_set=args.eval_set,
        verbose=verbose,
    )


if __name__ == "__main__":
    main()
