#!/usr/bin/env python3
"""
PAGANINI Codex Bridge — Invokes Codex CLI for PAGANINI implementations.

Wraps `npx @openai/codex` with PAGANINI-specific context.
Reads gate context, builds spec, invokes Codex, validates output.

Usage:
  python3 paganini_codex.py "task" --gate-token GATE-xxx
  python3 paganini_codex.py "task" --spec-file tmp/spec.md
  python3 paganini_codex.py "task" --dry-run  (show spec without running)

Requirements:
  - Codex CLI installed (npx @openai/codex)
  - OPENAI_API_KEY or ChatGPT Team auth
  - Gate token from paganini_gate.py
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

WORKSPACE = Path("/home/node/.openclaw/workspace")
PAGANINI_REPO = WORKSPACE / "paganini"
TMP_DIR = WORKSPACE / "tmp" / "codex-specs"


def get_env(key):
    val = os.environ.get(key)
    if val:
        return val
    try:
        with open("/home/node/.openclaw/openclaw.json") as f:
            return json.load(f).get("env", {}).get(key, "")
    except Exception:
        return ""


def build_spec(task: str, gate_token: str, gate_context: str = "") -> str:
    """Build a Codex-ready spec from task + gate context."""

    spec = f"""# Spec: {task}

## Gate Token
`{gate_token}`

## Task
{task}

## Repository
- Path: `{PAGANINI_REPO}`
- Language: Python 3.12+
- Package manager: pip (pyproject.toml)
- Entry point: `paganini` CLI via click

## Architecture Rules
- All code in `packages/` (kernel, rag, agents, ontology, shared, modules, dashboard)
- Use `from __future__ import annotations` in every Python file
- Pure Python preferred — minimize external deps
- Follow existing patterns in the codebase
- Fund-level isolation (fund_id partitioning) for all data
- No hardcoded API keys or secrets

## Existing Components
- `packages/kernel/cli.py` — CLI entry point (click + rich)
- `packages/kernel/engine.py` — Config loader
- `packages/kernel/moltis.py` — Moltis gateway adapter
- `packages/kernel/metaclaw.py` — MetaClaw skill proxy
- `packages/kernel/memory.py` — 4-layer memory API
- `packages/kernel/router.py` — Cognitive router
- `packages/kernel/daemons.py` — Daemon framework
- `packages/rag/pipeline.py` — Hybrid RAG (dense + BM25 + RRF)
- `packages/rag/bm25.py` — BM25 sparse retrieval
- `packages/rag/eval.py` — Evaluation harness (NEVER modify)
- `packages/agents/framework.py` — Agent SOUL loader + dispatcher
- `packages/shared/guardrails.py` — 6-gate guardrail pipeline
- `packages/ontology/schema.py` — FIDC knowledge graph
- `packages/ontology/builder.py` — Entity extractor

## Quality Standards
- Every output passes guardrails (packages/shared/guardrails.py)
- Confidence scores on all responses
- Source citations required
- No hallucination — if data not found, say so
"""

    if gate_context:
        spec += f"\n## Gate Context\n\n{gate_context}\n"

    return spec


def invoke_codex(spec: str, repo: Path, writable: bool = True) -> dict:
    """Invoke Codex CLI with the spec."""

    spec_file = TMP_DIR / f"spec-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}.md"
    spec_file.parent.mkdir(parents=True, exist_ok=True)
    spec_file.write_text(spec)

    cmd = ["npx", "@openai/codex", "--file", str(spec_file)]
    if writable:
        cmd.append("--writable")

    env = os.environ.copy()
    openai_key = get_env("OPENAI_API_KEY")
    if openai_key:
        env["OPENAI_API_KEY"] = openai_key

    print(f"⚡ Invoking Codex...")
    print(f"   Spec: {spec_file}")
    print(f"   Repo: {repo}")
    print(f"   Writable: {writable}")
    print()

    try:
        result = subprocess.run(
            cmd, cwd=str(repo), env=env,
            capture_output=True, text=True, timeout=300
        )
        return {
            "status": "ok" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "spec_file": str(spec_file),
        }
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "spec_file": str(spec_file)}
    except Exception as e:
        return {"status": "error", "error": str(e), "spec_file": str(spec_file)}


def main():
    parser = argparse.ArgumentParser(description="PAGANINI Codex Bridge")
    parser.add_argument("task", help="Task description")
    parser.add_argument("--gate-token", required=True, help="Gate token from paganini_gate.py")
    parser.add_argument("--gate-context", help="Path to gate context file", default=None)
    parser.add_argument("--repo", default=str(PAGANINI_REPO), help="Repo path")
    parser.add_argument("--dry-run", action="store_true", help="Show spec without running")
    parser.add_argument("--no-write", action="store_true", help="Read-only mode")
    args = parser.parse_args()

    # Load gate context if provided
    gate_context = ""
    if args.gate_context:
        gate_context = Path(args.gate_context).read_text()

    # Build spec
    spec = build_spec(args.task, args.gate_token, gate_context)

    if args.dry_run:
        print(spec)
        return

    # Invoke Codex
    result = invoke_codex(spec, Path(args.repo), writable=not args.no_write)

    if result["status"] == "ok":
        print(f"✅ Codex completed successfully")
        if result.get("stdout"):
            print(result["stdout"][:2000])
    else:
        print(f"❌ Codex failed: {result.get('error', result.get('stderr', 'unknown'))}")

    print(f"\n📄 Spec: {result['spec_file']}")


if __name__ == "__main__":
    main()
