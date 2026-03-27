#!/usr/bin/env python3
"""
PAGANINI E2E Test — Kernel → CognitiveRouter → Modal Inference

Tests the full pipeline:
1. Load config.yaml
2. Route query through CognitiveRouter (classify complexity)
3. Hit Modal endpoint (7B or 27B based on routing)
4. Validate OpenAI-compatible response format
"""

import json
import sys
import time
from pathlib import Path

import httpx
import yaml

ROOT = Path(__file__).resolve().parent.parent

# ── Load Config ──────────────────────────────────────────────────────────
config_path = ROOT / "config.yaml"
with open(config_path) as f:
    config = yaml.safe_load(f)

print("=" * 60)
print("PAGANINI E2E TEST")
print("=" * 60)
print(f"Config: {config_path}")
print(f"Model:  {config['provider']['model']}")
print(f"URL:    {config['provider']['base_url']}")
print()

# ── CognitiveRouter (inline, no heavy deps) ──────────────────────────────
COMPLEXITY_KEYWORDS = {
    "expert": ["stress test", "calcule", "analise o regulamento", "monte carlo",
               "compare todos", "projete o fluxo", "impacto sistêmico"],
    "complex": ["analise", "avalie", "risco", "impacto", "compare",
                "subordinação e risco", "fluxo de caixa"],
    "moderate": ["como funciona", "explique", "diferença", "processo",
                 "procedimento", "etapas"],
}

def classify_complexity(query: str) -> str:
    q = query.lower()
    for level in ["expert", "complex", "moderate"]:
        if any(kw in q for kw in COMPLEXITY_KEYWORDS[level]):
            return level
    return "simple"

def get_endpoint(complexity: str) -> tuple[str, str]:
    routing = config.get("routing", {})
    if not routing.get("enabled"):
        return config["provider"]["base_url"], config["provider"]["model"]
    threshold = routing.get("complexity_threshold", "moderate")
    levels = ["simple", "moderate", "complex", "expert"]
    if levels.index(complexity) >= levels.index(threshold):
        m = routing["models"]["complex"]
        return m["base_url"], m["model"]
    m = routing["models"]["simple"]
    return m["base_url"], m["model"]

# ── Test Queries ─────────────────────────────────────────────────────────
QUERIES = [
    # (query, expected_complexity)
    ("O que é um FIDC?", "simple"),
    ("Como funciona a subordinação em FIDC?", "moderate"),
    ("Analise os riscos de concentração em um FIDC com lastro em duplicatas", "complex"),
]

results = []
for query, expected in QUERIES:
    actual = classify_complexity(query)
    url, model = get_endpoint(actual)
    
    print(f"┌─ Query: {query}")
    print(f"│  Complexity: {actual} (expected: {expected})")
    print(f"│  Routed to: {model}")
    print(f"│  Endpoint: ...{url[-50:]}")
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Especialista em FIDCs brasileiros. Responda em português, direto ao ponto."},
            {"role": "user", "content": query},
        ],
        "max_tokens": 500,
        "temperature": 0.6,
    }
    
    t0 = time.time()
    try:
        r = httpx.post(url, json=payload, timeout=120)
        r.raise_for_status()
        data = r.json()
        t1 = time.time()
        
        # Validate OpenAI format
        has_choices = "choices" in data
        has_usage = "usage" in data
        
        if has_choices:
            content = data["choices"][0]["message"]["content"]
            tokens = data.get("usage", {}).get("total_tokens", "?")
            speed = data.get("timing", {}).get("tokens_per_second", "?")
        else:
            # Legacy format
            content = data.get("text", "?")
            tokens = data.get("usage", {}).get("total_tokens", "?")
            speed = data.get("timing", {}).get("tokens_per_second", "?")
        
        status = "✅"
        results.append({
            "query": query[:40],
            "complexity": actual,
            "model": model,
            "latency": round(t1 - t0, 1),
            "tokens": tokens,
            "speed": speed,
            "format": "openai" if has_choices else "legacy",
            "ok": True,
        })
        
        print(f"│  Status: {status} | {t1-t0:.1f}s | {speed} tok/s | {tokens} tokens")
        print(f"│  Format: {'OpenAI ✅' if has_choices else 'Legacy ⚠️'}")
        print(f"│  Response: {content[:150]}...")
        
    except Exception as e:
        t1 = time.time()
        status = "❌"
        results.append({
            "query": query[:40],
            "complexity": actual,
            "model": model,
            "latency": round(t1 - t0, 1),
            "error": str(e)[:80],
            "ok": False,
        })
        print(f"│  Status: {status} | Error: {e}")
    
    print(f"└{'─' * 58}")
    print()

# ── Summary ──────────────────────────────────────────────────────────────
print("=" * 60)
print("SUMMARY")
print("=" * 60)
passed = sum(1 for r in results if r["ok"])
total = len(results)
print(f"Tests: {passed}/{total} passed")
for r in results:
    icon = "✅" if r["ok"] else "❌"
    print(f"  {icon} [{r['complexity']:>8}] {r['query']:<40} → {r.get('latency', '?')}s")

if passed == total:
    print("\n🎉 All tests passed! Pipeline is connected.")
else:
    print(f"\n⚠️  {total - passed} test(s) failed.")
    sys.exit(1)
