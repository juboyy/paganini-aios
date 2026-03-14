#!/usr/bin/env python3
"""
PAGANINI Gate — Pre-execution gate adapted for the PAGANINI AIOS repo.

Replaces GitNexus with local code intelligence (grep + AST).
Replaces Linear with local issue tracking (gate-log.jsonl).
Replaces Revenue-OS paths with PAGANINI repo paths.

Usage:
  python3 paganini_gate.py "task description"
  python3 paganini_gate.py "task" --tier quick
  python3 paganini_gate.py "task" --repo /path/to/paganini-aios

Output:
  - Tier classification
  - Code context (symbols, dependencies, blast radius via grep/AST)
  - Memory context (past decisions, related work)
  - Gate pass token
  - Context file for spec building
"""

import argparse
import ast
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

WORKSPACE = Path("/home/node/.openclaw/workspace")
PAGANINI_REPO = WORKSPACE / "paganini"
MEMORY_MD = WORKSPACE / "MEMORY.md"
GATE_LOG = WORKSPACE / "memory" / "gate-log.jsonl"

TIER_KEYWORDS = {
    "micro": ["typo", "config", "env", "single line", "variable", "constant", "rename", "fix import"],
    "quick": ["fix", "bug", "hotfix", "small", "patch", "tweak", "adjust", "format", "add param"],
    "feature": ["implement", "add", "create", "build", "integrate", "refactor", "rewrite", "new", "module"],
    "epic": ["migration", "architecture", "multi-day", "cross-system", "full redesign", "v2", "overhaul", "pipeline"],
}

PIPELINE = {
    "micro": "Context → Fix → Commit → Log",
    "quick": "Stage 1 → 10 → 11 → 13 → 17",
    "feature": "Stage 1 → 2 → 4 → 8 → 10 → 11 → 12 → 13 → 14 → 17",
    "epic": "All 18 stages. Subagents mandatory.",
}


def classify_tier(task: str, explicit: str | None = None) -> str:
    if explicit and explicit in TIER_KEYWORDS:
        return explicit
    task_lower = task.lower()
    scores = {t: sum(1 for kw in kws if kw in task_lower) for t, kws in TIER_KEYWORDS.items()}
    return max(scores, key=scores.get) if max(scores.values()) > 0 else "quick"


def grep_symbols(task: str, repo: Path) -> list[dict]:
    """Find related code symbols using grep + Python AST."""
    results = []

    # Extract potential symbol names from task
    symbols = re.findall(r'`([a-zA-Z_][a-zA-Z0-9_.]*)`', task)
    symbols += re.findall(r'\b([A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]*)+)\b', task)  # CamelCase
    symbols += re.findall(r'\b([a-z]+_[a-z_]+)\b', task)  # snake_case
    symbols = list(dict.fromkeys(symbols))[:8]

    for sym in symbols:
        try:
            out = subprocess.run(
                ["grep", "-rn", "--include=*.py", sym, str(repo / "packages")],
                capture_output=True, text=True, timeout=10
            )
            if out.stdout.strip():
                lines = out.stdout.strip().split("\n")[:5]
                results.append({"symbol": sym, "hits": len(lines), "context": "\n".join(lines)})
        except Exception:
            pass

    return results


def find_affected_files(task: str, repo: Path) -> list[dict]:
    """Find files likely affected by the task using keyword matching."""
    results = []
    task_lower = task.lower()

    # Extract keywords (3+ chars, not stopwords)
    stop = {"the", "and", "for", "with", "that", "from", "into", "como", "para", "que", "com", "uma", "dos", "das"}
    keywords = [w for w in re.findall(r'[a-záàãâéêíóôõúç]{3,}', task_lower) if w not in stop][:10]

    py_files = list((repo / "packages").rglob("*.py"))
    for f in py_files:
        try:
            content = f.read_text(encoding="utf-8").lower()
            hits = sum(1 for kw in keywords if kw in content)
            if hits >= 2:
                results.append({
                    "file": str(f.relative_to(repo)),
                    "keyword_hits": hits,
                    "size": f.stat().st_size,
                })
        except Exception:
            pass

    results.sort(key=lambda x: x["keyword_hits"], reverse=True)
    return results[:10]


def analyze_dependencies(file_path: Path) -> dict:
    """Parse Python AST to find imports and function definitions."""
    try:
        tree = ast.parse(file_path.read_text(encoding="utf-8"))
    except Exception:
        return {"imports": [], "functions": [], "classes": []}

    imports = []
    functions = []
    classes = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append(node.module)
        elif isinstance(node, ast.FunctionDef):
            functions.append(node.name)
        elif isinstance(node, ast.ClassDef):
            classes.append(node.name)

    return {"imports": imports, "functions": functions, "classes": classes}


def gather_code_context(task: str, repo: Path) -> dict:
    """Full code intelligence for PAGANINI repo (replaces GitNexus)."""
    symbols = grep_symbols(task, repo)
    affected = find_affected_files(task, repo)

    # Analyze dependencies for top affected files
    deps = []
    for af in affected[:5]:
        fp = repo / af["file"]
        if fp.exists():
            dep = analyze_dependencies(fp)
            dep["file"] = af["file"]
            deps.append(dep)

    return {
        "symbols": symbols,
        "affected_files": affected,
        "dependencies": deps,
    }


def gather_memory(task: str) -> list[str]:
    """Search memory files for related context."""
    hits = []
    task_words = set(task.lower().split())

    # MEMORY.md
    try:
        content = MEMORY_MD.read_text()
        for line in content.split("\n"):
            if len(task_words & set(line.lower().split())) >= 2 and len(line.strip()) > 10:
                hits.append(line.strip())
    except Exception:
        pass

    # Daily logs
    memory_dir = WORKSPACE / "memory"
    if memory_dir.exists():
        for f in sorted(memory_dir.glob("2026-*.md"), reverse=True)[:3]:
            try:
                content = f.read_text()
                for line in content.split("\n"):
                    if len(task_words & set(line.lower().split())) >= 2 and len(line.strip()) > 10:
                        hits.append(f"[{f.name}] {line.strip()}")
            except Exception:
                pass

    return hits[:15]


def generate_token(task: str) -> str:
    now = datetime.now(timezone.utc).isoformat()
    h = hashlib.sha256(f"{now}:{task}".encode()).hexdigest()[:12]
    return f"GATE-{now[:19].replace(':', '')}:{h}"


def log_gate(entry: dict):
    GATE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(GATE_LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")


def main():
    parser = argparse.ArgumentParser(description="PAGANINI Pre-Execution Gate")
    parser.add_argument("task", help="Task description")
    parser.add_argument("--repo", help="Repository path", default=str(PAGANINI_REPO))
    parser.add_argument("--tier", help="Force tier", default=None)
    args = parser.parse_args()

    task = args.task
    repo = Path(args.repo)
    now = datetime.now(timezone.utc)

    print(f"{'='*60}")
    print(f"🚦 PAGANINI PRE-EXECUTION GATE")
    print(f"{'='*60}")
    print(f"📋 Task: {task}")
    print(f"📂 Repo: {repo}")
    print(f"🕐 Time: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()

    # 1. Classify
    tier = classify_tier(task, args.tier)
    print(f"📊 Tier: {tier.upper()}")
    print(f"📦 Pipeline: {PIPELINE[tier]}")
    print()

    # 2. Code Context
    print(f"{'─'*60}")
    print("🔍 STAGE 1: Context Scout (Code Intelligence)")
    print(f"{'─'*60}")
    code_ctx = gather_code_context(task, repo)
    sym_count = len(code_ctx["symbols"])
    aff_count = len(code_ctx["affected_files"])
    print(f"  ✅ {sym_count} symbols found, {aff_count} affected files")
    for s in code_ctx["symbols"][:3]:
        print(f"    📌 {s['symbol']}: {s['hits']} hits")
    for af in code_ctx["affected_files"][:5]:
        print(f"    📄 {af['file']} ({af['keyword_hits']} keyword matches)")
    for dep in code_ctx["dependencies"][:3]:
        print(f"    🔗 {dep['file']}: {len(dep['classes'])} classes, {len(dep['functions'])} functions")
    print()

    # 3. Memory Context
    print(f"{'─'*60}")
    print("🧠 STAGE 1: Context Scout (Memory)")
    print(f"{'─'*60}")
    memory_hits = gather_memory(task)
    if memory_hits:
        print(f"  ✅ {len(memory_hits)} related memories")
        for h in memory_hits[:5]:
            print(f"    💭 {h[:120]}")
    else:
        print("  ℹ No related memories found")
    print()

    # 4. Gate Token
    token = generate_token(task)
    print(f"{'='*60}")
    print(f"✅ GATE PASSED: {token}")
    print(f"{'='*60}")
    print()

    codex_note = ""
    if tier != "micro":
        codex_note = "Next: Write spec → Codex implements → QA → Push"
        print(f"⚡ {codex_note}")
    else:
        print("⚡ Next: Fix and commit (inline OK for micro tier)")

    # 5. Log
    entry = {
        "timestamp": now.isoformat(),
        "task": task,
        "tier": tier,
        "token": token,
        "repo": str(repo),
        "symbols_found": sym_count,
        "affected_files": aff_count,
        "memory_hits": len(memory_hits),
    }
    log_gate(entry)

    # 6. Context file
    ctx_file = WORKSPACE / "tmp" / f"paganini-gate-{now.strftime('%H%M%S')}.md"
    ctx_file.parent.mkdir(parents=True, exist_ok=True)
    with open(ctx_file, "w") as f:
        f.write(f"# Gate Context: {task}\n\n")
        f.write(f"**Token**: `{token}`\n")
        f.write(f"**Tier**: {tier}\n")
        f.write(f"**Pipeline**: {PIPELINE[tier]}\n\n")
        f.write("## Code Intelligence\n\n")
        for s in code_ctx["symbols"]:
            f.write(f"### {s['symbol']} ({s['hits']} hits)\n```\n{s['context'][:1500]}\n```\n\n")
        f.write("### Affected Files\n")
        for af in code_ctx["affected_files"]:
            f.write(f"- `{af['file']}` ({af['keyword_hits']} matches, {af['size']} bytes)\n")
        f.write("\n### Dependencies\n")
        for dep in code_ctx["dependencies"]:
            f.write(f"- `{dep['file']}`: classes={dep['classes']}, functions={dep['functions'][:10]}\n")
        f.write("\n## Memory Context\n\n")
        for h in memory_hits:
            f.write(f"- {h}\n")

    print(f"📄 Context saved: {ctx_file}")
    return token


if __name__ == "__main__":
    main()
