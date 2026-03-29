"""AutoResearch — self-optimizing RAG loop for PAGANINI AIOS.

Domain-agnostic: loads domain context from pack's rag_domain.yaml and renders
program.md.j2 as the LLM system prompt. Each domain gets isolated experiment
logs and best-config files.

Usage:
    python3 runner.py --domain finance --iterations 20
    python3 runner.py --domain generic --eval-set my_eval.jsonl
    python3 runner.py                     # auto-detects from config.yaml

Gate Token: GATE-2026-03-14T224026:4ccad14402ba
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
WORKSPACE = Path(__file__).resolve().parents[4]  # workspace root
PAGANINI_ROOT = Path(__file__).resolve().parents[3]  # paganini/
RAG_DIR = Path(__file__).resolve().parents[1]  # packages/rag/
AR_DIR = Path(__file__).resolve().parent  # packages/rag/autoresearch/
PACKS_DIR = PAGANINI_ROOT / "packs"

PROGRAM_TEMPLATE = AR_DIR / "program.md.j2"
PROGRAM_MD_LEGACY = AR_DIR / "program.md"  # fallback if template missing
PIPELINE_PY = RAG_DIR / "pipeline.py"
EVAL_PY = RAG_DIR / "eval.py"
GLOBAL_CONFIG = PAGANINI_ROOT / "config.yaml"


# ---------------------------------------------------------------------------
# Domain config loader
# ---------------------------------------------------------------------------
class DomainConfig:
    """Loads and holds domain context from a pack's rag_domain.yaml."""

    def __init__(
        self,
        name: str = "generic",
        language: str = "en",
        description: str = "",
        doc_types: list[str] | None = None,
        synonyms: dict[str, list[str]] | None = None,
        domain_terms: list[str] | None = None,
        entity_types: dict | None = None,
        regulatory_bodies: list[str] | None = None,
    ):
        self.name = name
        self.language = language
        self.description = description
        self.doc_types = doc_types or []
        self.synonyms = synonyms or {}
        self.domain_terms = domain_terms or []
        self.entity_types = entity_types or {}
        self.regulatory_bodies = regulatory_bodies or []

    @classmethod
    def from_yaml(cls, path: Path) -> "DomainConfig":
        """Load from a rag_domain.yaml file."""
        try:
            import yaml  # type: ignore
        except ImportError:
            # Fallback: parse simple YAML fields manually
            return cls._from_yaml_fallback(path)

        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return cls(
            name=data.get("name", "generic"),
            language=data.get("language", "en"),
            description=data.get("description", ""),
            doc_types=data.get("doc_types", []),
            synonyms=data.get("synonyms", {}),
            domain_terms=data.get("domain_terms", []),
            entity_types=data.get("entity_types", {}),
            regulatory_bodies=data.get("regulatory_bodies", []),
        )

    @classmethod
    def _from_yaml_fallback(cls, path: Path) -> "DomainConfig":
        """Minimal YAML parser for name/language when PyYAML unavailable."""
        text = path.read_text(encoding="utf-8")
        name = "generic"
        lang = "en"
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("name:"):
                name = line.split(":", 1)[1].strip().strip("\"'")
            elif line.startswith("language:"):
                lang = line.split(":", 1)[1].strip().strip("\"'")
        return cls(name=name, language=lang)

    @classmethod
    def generic(cls) -> "DomainConfig":
        return cls(name="generic", language="en")


def detect_domain_from_config() -> str:
    """Read config.yaml to guess the active domain/pack."""
    if not GLOBAL_CONFIG.exists():
        return "generic"
    text = GLOBAL_CONFIG.read_text(encoding="utf-8")
    # Look for pack: or domain: keys
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("pack:"):
            return line.split(":", 1)[1].strip().strip("\"'")
        if line.startswith("domain:"):
            return line.split(":", 1)[1].strip().strip("\"'")
    return "generic"


def load_domain(domain_name: str) -> DomainConfig:
    """Load domain config from packs/<domain>/rag_domain.yaml."""
    # Try exact pack name
    domain_yaml = PACKS_DIR / domain_name / "rag_domain.yaml"
    if domain_yaml.exists():
        return DomainConfig.from_yaml(domain_yaml)

    # Try manifest.yaml for description
    manifest = PACKS_DIR / domain_name / "manifest.yaml"
    if manifest.exists():
        cfg = DomainConfig(name=domain_name)
        try:
            import yaml  # type: ignore
            data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
            cfg.description = data.get("description", "")
        except ImportError:
            pass
        return cfg

    # Fallback to generic
    generic_yaml = PACKS_DIR / "generic" / "rag_domain.yaml"
    if generic_yaml.exists():
        return DomainConfig.from_yaml(generic_yaml)

    return DomainConfig.generic()


def list_domains() -> list[str]:
    """List available domain packs."""
    if not PACKS_DIR.exists():
        return ["generic"]
    domains = []
    for d in sorted(PACKS_DIR.iterdir()):
        if d.is_dir() and not d.name.startswith(("_", ".")):
            domains.append(d.name)
    return domains or ["generic"]


# ---------------------------------------------------------------------------
# Template rendering
# ---------------------------------------------------------------------------
def render_program(domain: DomainConfig) -> str:
    """Render program.md.j2 with domain context. Falls back to static program.md."""
    if not PROGRAM_TEMPLATE.exists():
        # Legacy: use static program.md
        if PROGRAM_MD_LEGACY.exists():
            return PROGRAM_MD_LEGACY.read_text(encoding="utf-8")
        raise FileNotFoundError("No program.md.j2 or program.md found")

    template_text = PROGRAM_TEMPLATE.read_text(encoding="utf-8")

    try:
        from jinja2 import Template  # type: ignore
        tmpl = Template(template_text, undefined=__import__("jinja2").Undefined)
        return tmpl.render(**_template_vars(domain))
    except ImportError:
        # Manual substitution for simple {{ var }} patterns
        return _render_manual(template_text, domain)


def _template_vars(domain: DomainConfig) -> dict[str, Any]:
    """Build template variable dict from DomainConfig."""
    # Domain terms as bullet list
    terms_list = ""
    if domain.domain_terms:
        terms_list = "\n".join(f"- {t}" for t in domain.domain_terms[:30])

    # Synonyms sample (first 5)
    syn_sample = ""
    if domain.synonyms:
        items = list(domain.synonyms.items())[:5]
        syn_sample = "\n".join(
            f"- **{k}** → {', '.join(v[:3])}" for k, v in items
        )

    # Corpus description based on doc_types
    corpus_desc = "domain-specific documents"
    if domain.doc_types:
        types = ", ".join(domain.doc_types[:6])
        corpus_desc = f"documents ({types}, etc.)"

    return {
        "domain_name": domain.name,
        "domain_language": domain.language,
        "domain_description": domain.description,
        "corpus_description": corpus_desc,
        "domain_terms": bool(domain.domain_terms),
        "domain_terms_list": terms_list,
        "synonyms_sample": syn_sample,
    }


def _render_manual(template: str, domain: DomainConfig) -> str:
    """Simple {{ var }} replacement without Jinja2."""
    tvars = _template_vars(domain)
    result = template

    # Handle {% if var %}...{% endif %} blocks (simple, non-nested)
    def replace_if(m: re.Match) -> str:
        var = m.group(1).strip()
        body = m.group(2)
        val = tvars.get(var)
        if val:
            # Replace {{ vars }} inside body
            for k, v in tvars.items():
                body = body.replace("{{ " + k + " }}", str(v))
                body = body.replace("{{" + k + "}}", str(v))
            return body
        return ""

    result = re.sub(
        r"\{%\s*if\s+(\w+)\s*%\}(.*?)\{%\s*endif\s*%\}",
        replace_if,
        result,
        flags=re.DOTALL,
    )

    # Replace remaining {{ var }} and {{ var | default("x") }}
    def replace_var(m: re.Match) -> str:
        expr = m.group(1).strip()
        # Handle default filter
        default_match = re.match(r"(\w+)\s*\|\s*default\([\"'](.+?)[\"']\)", expr)
        if default_match:
            var = default_match.group(1)
            default_val = default_match.group(2)
            return str(tvars.get(var, default_val))
        return str(tvars.get(expr, ""))

    result = re.sub(r"\{\{(.+?)\}\}", replace_var, result)

    return result


# ---------------------------------------------------------------------------
# Per-domain file paths
# ---------------------------------------------------------------------------
def _domain_experiments_path(domain_name: str) -> Path:
    """Per-domain experiments log."""
    if domain_name == "generic" or domain_name == "fidc":
        return AR_DIR / "experiments.jsonl"  # backwards compat
    return AR_DIR / f"experiments-{domain_name}.jsonl"


def _domain_best_config_path(domain_name: str) -> Path:
    """Per-domain best config."""
    if domain_name == "generic" or domain_name == "fidc":
        return AR_DIR / "best_config.json"
    return AR_DIR / f"best_config-{domain_name}.json"


def _domain_eval_set(domain_name: str) -> str:
    """Find eval set for domain. Checks pack dir first, then RAG dir."""
    # Pack-specific eval
    pack_eval = PACKS_DIR / domain_name / "eval_questions.jsonl"
    if pack_eval.exists():
        return str(pack_eval)
    # Fallback to RAG dir
    rag_eval = RAG_DIR / "eval_questions.jsonl"
    if rag_eval.exists():
        return str(rag_eval)
    return "eval_questions.jsonl"


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
    "chunk_size": {"type": int, "min": 128, "max": 1024},
    "chunk_overlap": {"type": int, "min": 0, "max": 256},
    "chunk_strategy": {"type": str, "choices": ["fixed", "sentence", "semantic"]},
    "respect_headers": {"type": bool},
    "embedding_model": {
        "type": str,
        "choices": [
            "text-embedding-3-small",
            "text-embedding-3-large",
            "text-embedding-ada-002",
        ],
    },
    "embedding_dims": {"type": int, "choices": [256, 512, 1024, 1536]},
    "dense_weight": {"type": float, "min": 0.0, "max": 1.0},
    "sparse_weight": {"type": float, "min": 0.0, "max": 1.0},
    "graph_weight": {"type": float, "min": 0.0, "max": 1.0},
    "fusion_method": {"type": str, "choices": ["rrf", "linear"]},
    "rrf_k": {"type": int, "min": 10, "max": 100},
    "reranker": {"type": str, "choices": ["none", "cross-encoder"]},
    "top_k": {"type": int, "min": 3, "max": 20},
    "context_assembly": {"type": str, "choices": ["ranked", "mmr", "clustered"]},
    "query_expansion": {"type": bool},
    "meta_prompt": {"type": str},
}


# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg: str, verbose: bool = True) -> None:
    if verbose:
        print(f"[autoresearch] {msg}", flush=True)


def log_experiment(entry: dict, experiments_path: Path | None = None) -> None:
    """Append one experiment to experiments.jsonl."""
    path = experiments_path or (AR_DIR / "experiments.jsonl")
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Experiment history
# ---------------------------------------------------------------------------
def load_experiments(n: int = 20, experiments_path: Path | None = None) -> list[dict]:
    """Load the last N experiments from experiments.jsonl."""
    path = experiments_path or (AR_DIR / "experiments.jsonl")
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").strip().splitlines()
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

    pattern = re.compile(
        r'self\.(\w+)\s*=\s*(?:rag_cfg|config)\.get\(["\'](\w+)["\'],\s*(.+?)\)',
        re.MULTILINE,
    )
    for match in pattern.finditer(source):
        _attr, key, raw_default = match.group(1), match.group(2), match.group(3).strip()
        if key in params:
            try:
                import ast
                params[key] = ast.literal_eval(raw_default)
            except Exception:
                pass

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

        if "min" in constraints:
            val = max(constraints["min"], val)
        if "max" in constraints:
            val = min(constraints["max"], val)
        if "choices" in constraints and val not in constraints["choices"]:
            val = DEFAULT_PARAMS[key]

        cleaned[key] = val

    if cleaned["chunk_overlap"] >= cleaned["chunk_size"]:
        cleaned["chunk_overlap"] = cleaned["chunk_size"] // 4

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
            changed = {
                k: v
                for k, v in exp.get("params", {}).items()
                if v != DEFAULT_PARAMS.get(k)
            }
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
    json_block = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response, re.DOTALL)
    if json_block:
        return json.loads(json_block.group(1))

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
                "--config",
                tmp_config_path,
                "--eval-set",
                eval_set,
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

        output = result.stdout.strip()
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
def load_best_config(path: Path | None = None) -> dict[str, Any] | None:
    p = path or (AR_DIR / "best_config.json")
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return None


def save_best_config(params: dict[str, Any], score: float, path: Path | None = None) -> None:
    p = path or (AR_DIR / "best_config.json")
    p.write_text(
        json.dumps({"params": params, "score": score}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def run_autoresearch(
    iterations: int = 10,
    eval_set: Optional[str] = None,
    domain: Optional[str] = None,
    verbose: bool = True,
) -> None:
    # Resolve domain
    domain_name = domain or detect_domain_from_config()
    domain_cfg = load_domain(domain_name)
    log(f"Domain: {domain_cfg.name} ({domain_cfg.language})", verbose)

    # Resolve paths per domain
    experiments_path = _domain_experiments_path(domain_cfg.name)
    best_config_path = _domain_best_config_path(domain_cfg.name)
    eval_path = eval_set or _domain_eval_set(domain_cfg.name)

    log(
        f"AutoResearch starting — {iterations} iterations, "
        f"domain={domain_cfg.name}, eval_set={eval_path}",
        verbose,
    )

    # Render program prompt with domain context
    program_md = render_program(domain_cfg)
    current_params = read_current_params()
    current_params = validate_params(current_params)

    # Establish baseline
    log("Running baseline eval…", verbose)
    try:
        baseline_metrics = run_eval(current_params, eval_path, verbose)
        baseline_score = composite_score(baseline_metrics)
        log(
            f"Baseline score: {baseline_score:.4f} | metrics={baseline_metrics}",
            verbose,
        )
    except Exception as e:
        log(f"Baseline eval failed: {e}. Using score=0.0", verbose)
        baseline_metrics = {}
        baseline_score = 0.0

    best_params = copy.deepcopy(current_params)
    best_score = baseline_score
    save_best_config(best_params, best_score, best_config_path)

    history = load_experiments(experiments_path=experiments_path)

    for i in range(1, iterations + 1):
        log(f"\n── Iteration {i}/{iterations} ──", verbose)

        messages = build_llm_prompt(program_md, current_params, history, i)
        try:
            raw_response = call_llm(messages, verbose)
            log(f"LLM response received ({len(raw_response)} chars)", verbose)
        except Exception as e:
            log(f"LLM call failed: {e} — skipping iteration", verbose)
            continue

        try:
            proposal = parse_llm_response(raw_response)
            hypothesis = proposal.get("hypothesis", "(no hypothesis)")
            proposed_params = validate_params(proposal.get("params", {}))
            log(f"Hypothesis: {hypothesis}", verbose)
        except Exception as e:
            log(f"Failed to parse LLM response: {e} — skipping", verbose)
            continue

        log("Running eval with proposed params…", verbose)
        try:
            new_metrics = run_eval(proposed_params, eval_path, verbose)
            new_score = composite_score(new_metrics)
            log(f"New score: {new_score:.4f} (best so far: {best_score:.4f})", verbose)
        except Exception as e:
            log(f"Eval failed: {e} — logging as error, continuing", verbose)
            log_experiment(
                {
                    "timestamp": _ts(),
                    "iteration": i,
                    "domain": domain_cfg.name,
                    "hypothesis": hypothesis,
                    "params": proposed_params,
                    "score_before": best_score,
                    "score_after": None,
                    "delta": None,
                    "outcome": "error",
                    "metrics": {"error": str(e)},
                    "reverted": True,
                },
                experiments_path,
            )
            history = load_experiments(experiments_path=experiments_path)
            continue

        delta = new_score - best_score
        improved = new_score > best_score

        entry: dict[str, Any] = {
            "timestamp": _ts(),
            "iteration": i,
            "domain": domain_cfg.name,
            "hypothesis": hypothesis,
            "params": proposed_params,
            "score_before": round(best_score, 6),
            "score_after": round(new_score, 6),
            "delta": round(delta, 6),
            "outcome": (
                "improved" if improved else ("neutral" if delta == 0 else "degraded")
            ),
            "metrics": new_metrics,
            "reverted": not improved,
        }
        log_experiment(entry, experiments_path)

        if improved:
            log(f"✓ Accepted — Δ={delta:+.4f}", verbose)
            best_params = copy.deepcopy(proposed_params)
            best_score = new_score
            current_params = copy.deepcopy(proposed_params)
            save_best_config(best_params, best_score, best_config_path)
        else:
            log(f"✗ Reverted — Δ={delta:+.4f}", verbose)

        history = load_experiments(experiments_path=experiments_path)

    log("\n── AutoResearch complete ──", verbose)
    log(f"Domain: {domain_cfg.name}", verbose)
    log(f"Best score: {best_score:.4f}", verbose)
    log(f"Best config saved to: {best_config_path}", verbose)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="AutoResearch — self-optimizing RAG loop for PAGANINI AIOS"
    )
    parser.add_argument(
        "--domain",
        type=str,
        default=None,
        help=(
            f"Domain pack to optimize (available: {', '.join(list_domains())}). "
            "Auto-detects from config.yaml if omitted."
        ),
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
        default=None,
        help="Path to eval Q&A file (default: auto from pack or eval_questions.jsonl)",
    )
    parser.add_argument(
        "--list-domains",
        action="store_true",
        help="List available domain packs and exit",
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

    if args.list_domains:
        print("Available domains:")
        for d in list_domains():
            cfg = load_domain(d)
            label = f"  {d} ({cfg.language})"
            if cfg.description:
                label += f" — {cfg.description[:60]}"
            print(label)
        return

    verbose = args.verbose and not args.quiet
    run_autoresearch(
        iterations=args.iterations,
        eval_set=args.eval_set,
        domain=args.domain,
        verbose=verbose,
    )


if __name__ == "__main__":
    main()
