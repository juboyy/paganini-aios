"""PAGANINI Eval — Fixed evaluation harness for AutoResearch.

THIS FILE IS NEVER MODIFIED BY THE LLM.
It measures ground truth. pipeline.py changes; eval.py stays fixed.
"""

import json
import time
from pathlib import Path
from typing import Optional

from packages.rag.pipeline import RAGPipeline


def load_eval_set(path: str = "eval_questions.jsonl") -> list[dict]:
    """Load gold Q&A pairs.
    
    Format: {"question": "...", "expected": "...", "sources": ["file1.md"], "category": "regulatorio"}
    """
    entries = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


def precision_at_k(retrieved_sources: list[str], expected_sources: list[str], k: int = 5) -> float:
    """How many of the top-k retrieved sources are in the expected set."""
    if not expected_sources:
        return 1.0  # No expected sources = any retrieval is fine
    top_k = retrieved_sources[:k]
    hits = sum(1 for s in top_k if any(exp in s for exp in expected_sources))
    return hits / min(k, len(expected_sources))


def recall(retrieved_sources: list[str], expected_sources: list[str]) -> float:
    """How many expected sources were found anywhere in retrieved."""
    if not expected_sources:
        return 1.0
    hits = sum(1 for exp in expected_sources if any(exp in s for s in retrieved_sources))
    return hits / len(expected_sources)


def answer_contains_key_facts(answer_text: str, expected_text: str) -> float:
    """Simple keyword overlap score between answer and expected.
    
    Not a substitute for LLM-as-judge, but a fast automated check.
    """
    if not expected_text:
        return 1.0
    expected_words = set(expected_text.lower().split())
    answer_words = set(answer_text.lower().split())
    # Remove stop words
    stop = {"o", "a", "de", "do", "da", "em", "no", "na", "que", "é", "e", "para", "por",
            "com", "um", "uma", "os", "as", "dos", "das", "se", "ou", "ao", "à", "são",
            "the", "of", "in", "and", "to", "is", "for", "on", "with", "a", "an"}
    expected_words -= stop
    answer_words -= stop
    if not expected_words:
        return 1.0
    overlap = len(expected_words & answer_words)
    return overlap / len(expected_words)


def run_eval(pipeline: RAGPipeline, eval_path: str = "eval_questions.jsonl",
             llm_fn=None, top_k: int = 5) -> dict:
    """Run full evaluation suite.
    
    Returns metrics dict with per-question and aggregate scores.
    """
    eval_set = load_eval_set(eval_path)
    results = []
    
    for entry in eval_set:
        question = entry["question"]
        expected = entry.get("expected", "")
        expected_sources = entry.get("sources", [])
        category = entry.get("category", "general")

        t0 = time.time()
        chunks = pipeline.retrieve(question, top_k=top_k)
        retrieved_sources = [c.source for c in chunks]

        p_at_k = precision_at_k(retrieved_sources, expected_sources, k=top_k)
        rec = recall(retrieved_sources, expected_sources)

        answer_score = 0.0
        answer_text = ""
        if llm_fn:
            answer = pipeline.query(question, llm_fn=llm_fn)
            answer_text = answer.text
            answer_score = answer_contains_key_facts(answer_text, expected)

        elapsed = (time.time() - t0) * 1000

        results.append({
            "question": question,
            "category": category,
            "precision_at_k": p_at_k,
            "recall": rec,
            "answer_score": answer_score,
            "latency_ms": elapsed,
            "chunks_found": len(chunks),
            "top_source": retrieved_sources[0] if retrieved_sources else "",
            "top_score": chunks[0].score if chunks else 0,
        })

    # Aggregate
    n = len(results)
    avg = lambda key: sum(r[key] for r in results) / n if n else 0

    metrics = {
        "total_questions": n,
        "avg_precision_at_k": round(avg("precision_at_k"), 4),
        "avg_recall": round(avg("recall"), 4),
        "avg_answer_score": round(avg("answer_score"), 4),
        "avg_latency_ms": round(avg("latency_ms"), 1),
        "avg_top_score": round(avg("top_score"), 4),
        "by_category": {},
        "results": results,
    }

    # Per-category breakdown
    categories = set(r["category"] for r in results)
    for cat in categories:
        cat_results = [r for r in results if r["category"] == cat]
        cn = len(cat_results)
        metrics["by_category"][cat] = {
            "count": cn,
            "precision_at_k": round(sum(r["precision_at_k"] for r in cat_results) / cn, 4),
            "recall": round(sum(r["recall"] for r in cat_results) / cn, 4),
            "answer_score": round(sum(r["answer_score"] for r in cat_results) / cn, 4),
        }

    return metrics


def print_report(metrics: dict):
    """Print a human-readable eval report."""
    print(f"\n{'='*60}")
    print(f"  PAGANINI RAG Evaluation Report")
    print(f"{'='*60}")
    print(f"  Questions:       {metrics['total_questions']}")
    print(f"  Precision@5:     {metrics['avg_precision_at_k']:.2%}")
    print(f"  Recall:          {metrics['avg_recall']:.2%}")
    print(f"  Answer Score:    {metrics['avg_answer_score']:.2%}")
    print(f"  Avg Latency:     {metrics['avg_latency_ms']:.0f}ms")
    print(f"  Avg Top Score:   {metrics['avg_top_score']:.4f}")

    if metrics["by_category"]:
        print(f"\n  {'Category':<20} {'P@5':>6} {'Recall':>8} {'Answer':>8} {'N':>4}")
        print(f"  {'-'*46}")
        for cat, vals in sorted(metrics["by_category"].items()):
            print(f"  {cat:<20} {vals['precision_at_k']:>5.0%} {vals['recall']:>7.0%} "
                  f"{vals['answer_score']:>7.0%} {vals['count']:>4}")

    print(f"{'='*60}\n")


if __name__ == "__main__":
    import sys
    config = {"data_dir": "runtime/data", "rag": {
        "chunk_size": 384, "chunk_overlap": 64, "respect_headers": True, "top_k": 5}}
    pipeline = RAGPipeline(config)

    if pipeline.collection.count() == 0:
        print("No chunks indexed. Run: paganini ingest <corpus_dir>")
        sys.exit(1)

    eval_path = sys.argv[1] if len(sys.argv) > 1 else "eval_questions.jsonl"
    metrics = run_eval(pipeline, eval_path)
    print_report(metrics)

    # Save results
    with open("eval_results.json", "w") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)
    print(f"Results saved to eval_results.json")
