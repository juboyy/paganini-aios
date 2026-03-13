# AutoResearch — RAG Optimization Loop
# Based on Karpathy's autoresearch pattern

## Setup

To set up a new optimization run:

1. **Agree on a run tag** (e.g., `mar13`)
2. **Create branch**: `git checkout -b autorag/{tag}`
3. **Read the in-scope files**:
   - `packages/rag/pipeline.py` — the file the agent modifies
   - `packages/rag/eval.py` — fixed evaluation (DO NOT MODIFY)
   - `packages/rag/eval_questions.jsonl` — ground truth Q&A
   - This file (`program.md`) — agent instructions
4. **Verify corpus exists**: `data/corpus/fidc/` (164 files)
5. **Initialize results.tsv** with header row
6. **Run baseline**: `python3 -m packages.rag.eval`

## Experimentation

Each experiment modifies `pipeline.py` and evaluates against `eval.py`.

**What you CAN modify:**
- `packages/rag/pipeline.py` — chunking, embedding, retrieval, prompts, re-ranking

**What you CANNOT modify:**
- `packages/rag/eval.py` — ground truth evaluator
- `packages/rag/eval_questions.jsonl` — eval dataset
- `data/corpus/` — source documents
- This file (`program.md`)

**The goal: maximize eval_score** (weighted: precision@5 40%, recall 30%, faithfulness 30%)

**Parameters to experiment with:**
- Chunk size (256, 512, 1024, 2048)
- Chunk overlap (0, 32, 64, 128)
- Chunking strategy (flat, hierarchical, semantic)
- Embedding model (text-embedding-3-large, gemini, local)
- Retrieval mode (dense, sparse, hybrid)
- RRF k parameter (30, 60, 100)
- Top-k retrieval (5, 10, 20)
- Re-ranking (none, cross-encoder, LLM)
- Prompt template variations
- Query classification strategy
- Graph traversal depth (1, 2, 3)
- Multi-granularity embedding levels

## Output Format

```
eval_score:       0.847
precision_at_5:   0.820
recall:           0.890
faithfulness:     0.830
latency_ms:       1240
total_chunks:     3847
```

## Logging Results

Log to `results.tsv` (tab-separated):
```
commit	eval_score	latency_ms	status	description
a1b2c3d	0.847	1240	keep	baseline (chunk=512, hybrid, top_k=10)
```

## The Loop

LOOP FOREVER:
1. Read results.tsv for history
2. Propose experiment based on what worked/didn't
3. Modify pipeline.py
4. git commit
5. Run: `python3 -m packages.rag.eval > eval.log 2>&1`
6. Extract metrics: `grep "eval_score:" eval.log`
7. If improved: keep, advance branch
8. If worse: git reset
9. Log to results.tsv
10. Repeat

**NEVER STOP** until manually interrupted.

## Simplicity Criterion

All else equal, simpler is better. A 0.01 improvement that adds 50 lines of complexity?
Probably not worth it. Equal results with simpler code? Always keep.
