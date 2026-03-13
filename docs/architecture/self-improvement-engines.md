# Deep Dive: Self-Improvement Engines

> How PAGANINI AIOS gets smarter with every interaction.
> Two engines, different layers, complementary loops.

---

## Engine 1: MetaClaw — Behavioral Evolution

### What It Actually Does (Mechanically)

MetaClaw is an OpenAI-compatible proxy that sits between Moltis and the LLM provider.
It operates in two modes:

```
MODE 1: skills_only (default — no GPU, no training)
  Proxy intercepts → injects skills → forwards → learns from session

MODE 2: rl (optional — cloud RL via Tinker)
  Same as above + live LoRA fine-tuning + weight hot-swap
```

### The Skill Loop (skills_only mode)

This is the default. No GPU. No fine-tuning. Pure prompt engineering at scale.

```
TURN-BY-TURN (every interaction):

  1. User query arrives at Moltis
  2. Moltis routes to LLM → request hits MetaClaw proxy
  3. MetaClaw searches skill library for relevant skills
     - Retrieval: template matching OR embedding similarity
     - Selects top_k=6 most relevant skills (configurable)
     - Task-specific cap: top_k=10
  4. Selected skills INJECTED into system prompt
     - Skills are short markdown instructions
     - Example: "When calculating PDD, always apply IFRS9 
       expected credit loss model, not incurred loss"
  5. Enriched prompt forwarded to LLM provider
  6. Response returned to user through Moltis

POST-SESSION (after conversation ends):

  7. MetaClaw feeds the ENTIRE conversation to the same LLM
  8. LLM analyzes: what worked? what patterns emerged?
  9. LLM generates NEW skill files automatically
     - Each skill: trigger condition + instruction + context
  10. New skills saved to ~/.metaclaw/skills/
  11. Next conversation benefits from new skills
```

**Concrete example in PAGANINI:**

```
Session 1: Gestor asks about PDD for energy sector receivables
  → MetaClaw has no energy-specific skills
  → LLM answers from general knowledge
  → Post-session: MetaClaw generates skill:
    "energy-sector-pdd.md: When calculating PDD for energy 
     sector receivables, consider seasonal payment patterns 
     (Q4 typically higher default rates due to dry season 
     affecting hydroelectric revenue)"

Session 2: Same question category
  → MetaClaw finds energy-sector-pdd.md (similarity: 0.87)
  → Injects into prompt
  → Response is measurably more specific and accurate
  → Post-session: skill refined with additional detail

Session 50: Energy PDD queries
  → MetaClaw has 8 energy-specific skills accumulated
  → Responses rival human specialist knowledge
  → Zero fine-tuning. Zero GPU. Just accumulated prompt intelligence.
```

### The RL Loop (rl mode — optional)

For clients who want actual model weight updates:

```
DURING CONVERSATION:

  1-6. Same as skills_only (skills injected, response generated)

  7. Response tokenized → submitted as training sample to Tinker Cloud
  8. Judge LLM (PRM — Process Reward Model) scores response:
     - Was it factually correct?
     - Did it follow fund regulations?
     - Was it complete?
     → Score: 0.0 to 1.0

  9. Tinker runs GRPO (Group Relative Policy Optimization):
     - LoRA fine-tuning on the response
     - Rank: 32 (configurable)
     - Batch: 4 samples accumulated before training step

  10. Updated LoRA weights hot-swapped into serving model
      → No downtime. No restart. Seamless.

  11. For FAILED episodes (PRM score < threshold):
      - Evolver LLM analyzes what went wrong
      - Generates corrective skills
      - Skills added to library for immediate injection

RESULT: Model weights actually change. Not just prompt engineering.
        But skills ALSO improve in parallel. Double improvement.
```

### On-Policy Distillation (OPD — advanced)

For clients running a smaller model but wanting frontier quality:

```
Student (small, fast, cheap): Kimi-K2.5 / Qwen3-7B / local model
Teacher (large, slow, expensive): GPT-5.2 / Claude Opus

Flow:
  1. Student generates response (as usual)
  2. Teacher provides per-token log-probabilities on the SAME response
  3. KL penalty steers student toward teacher's distribution
  4. Student gradually learns to produce teacher-quality responses
  5. Over time: student quality approaches teacher at 1/10th the cost

For PAGANINI: Client starts with frontier model (expensive).
PAGANINI gradually trains a smaller model via OPD.
After N interactions, client switches to smaller model.
Same quality. 90% cost reduction.
```

### Skill File Format

```markdown
# ~/.metaclaw/skills/covenant-monitoring.md

## Trigger
When asked about covenant compliance, covenant breach risk,
or covenant monitoring for any FIDC fund.

## Instruction  
1. Check current covenant values against defined thresholds
2. Calculate days-to-breach based on current trend
3. If any covenant is within 10% of threshold, flag as WARNING
4. If any covenant has breached, flag as CRITICAL
5. Always cite the specific covenant clause from the fund regulation

## Context
Relevant CVM 175 articles: Art. 23 (obrigações do administrador),
Art. 38 (deveres do gestor). Common covenants: subordination ratio,
default rate, concentration limits, overcollateralization index.
```

### PAGANINI-Specific Guardrails on MetaClaw

```yaml
# metaclaw section in config.yaml
metaclaw:
  mode: skills_only              # skills_only | rl
  proxy_port: 30000

  skills:
    enabled: true
    dir: runtime/metaclaw/skills/
    retrieval_mode: embedding     # template | embedding
    top_k: 6
    task_specific_top_k: 10
    auto_evolve: true

    # PAGANINI additions (not in upstream MetaClaw)
    validation:
      enabled: true
      checks:
        - corpus_contradiction    # Does skill contradict any corpus document?
        - ontology_consistency    # Are entities/relations valid per FIDC ontology?
        - regulatory_compliance   # Does skill comply with CVM 175?
        - existing_conflict       # Does skill contradict any active skill?
        - quality_threshold       # Is skill specific enough? (no generic platitudes)
      on_failure: quarantine      # quarantine | reject | log_only
      quarantine_dir: runtime/metaclaw/quarantine/

    lifecycle:
      max_active_skills: 500
      prune_below_usage: 5        # Skills used <5 times in 30 days → candidate for pruning
      prune_below_score: 0.3      # Skills with avg quality impact <0.3 → pruned
      review_interval: 7d         # Weekly skill review
      drift_detection: true       # Alert if eval score degrades after new skills

    isolation:
      mode: per_fund              # per_fund | per_instance | shared
      # per_fund: each fund has its own skill directory
      # skills from Fund Alpha NEVER appear in Fund Beta context
```

---

## Engine 2: AutoResearch — Retrieval Optimization

### What It Actually Does (Mechanically)

AutoResearch is a self-modifying RAG pipeline. Instead of a human tuning
chunking strategies, embedding models, and ranking algorithms — an LLM
does it autonomously through evolutionary search.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch):
*"You're not programming the program. You're programming the program.md."*

### The Three Files

```
packages/rag/
├── program.md          # INSTRUCTIONS (LLM reads this to know what to do)
├── pipeline.py         # MODIFIABLE CODE (LLM changes this to improve retrieval)
└── eval.py             # FIXED EVALUATION (never touched by LLM — measures quality)
```

**program.md** — tells the LLM what to optimize and how:
```markdown
# AutoResearch: RAG Pipeline Optimization

## Your Task
You are an autonomous researcher optimizing a RAG pipeline for FIDC
(Brazilian Credit Receivables Funds) domain queries.

## What You Can Modify
- pipeline.py: chunking strategy, embedding model, retrieval method,
  reranking, fusion weights, context assembly

## What You Cannot Modify  
- eval.py: the evaluation harness (this is your ground truth)
- eval_questions.jsonl: the test set (this is what you're measured against)

## Current Metrics (baseline)
- precision@5: 0.62
- recall@10: 0.71  
- faithfulness: 0.58
- answer_correctness: 0.65
- composite_score: 0.64

## Optimization Loop
1. Read pipeline.py (understand current implementation)
2. Hypothesize an improvement (e.g., "hierarchical chunking might 
   improve recall for regulatory questions")
3. Modify pipeline.py
4. Run eval.py
5. If composite_score improved → commit change → log result
6. If composite_score degraded → revert → try different hypothesis
7. Repeat

## Constraints
- pipeline.py must remain a valid Python module
- Must use the corpus at data/corpus/fidc/ (164 documents)
- Embeddings must fit in available memory
- Each eval run must complete in < 5 minutes
- Log every experiment in experiments.jsonl
```

**pipeline.py** — the code the LLM modifies:
```python
# This file is MODIFIED by the AutoResearch agent.
# Current version represents the best-performing configuration found so far.

class RAGPipeline:
    def __init__(self, corpus_dir: str):
        self.corpus_dir = corpus_dir
        
        # === CHUNKING STRATEGY ===
        # The LLM experiments with different strategies:
        self.chunk_strategy = "hierarchical"  # was: "fixed_512"
        self.chunk_size = 384                 # was: 512
        self.chunk_overlap = 64              # was: 50
        self.respect_headers = True          # was: False
        # Hypothesis: smaller chunks + header respect improves precision
        # for regulatory queries that reference specific articles
        
        # === EMBEDDING ===
        self.embedding_model = "gemini-embedding-001"
        self.embedding_dims = 768            # was: 3072 (truncated for speed)
        
        # === RETRIEVAL ===
        self.retrieval_method = "hybrid"     # dense + sparse + graph
        self.dense_weight = 0.4              # was: 0.5
        self.sparse_weight = 0.3             # was: 0.3
        self.graph_weight = 0.3              # was: 0.2
        self.fusion = "rrf"                  # reciprocal rank fusion
        self.rrf_k = 60                      # was: 40
        # Hypothesis: increasing graph weight improves regulatory questions
        # where entity relationships matter
        
        # === RERANKING ===
        self.reranker = "cross_encoder"      # was: None
        self.reranker_model = "cross-encoder/ms-marco-MiniLM-L-6-v2"
        self.rerank_top_n = 20               # rerank top 20, return top 5
        
        # === CONTEXT ASSEMBLY ===
        self.max_context_tokens = 8000
        self.include_metadata = True         # source doc, section, page
        self.include_parent_chunk = True     # parent chunk for context
        
    def ingest(self):
        """Index corpus. Called once or when corpus changes."""
        ...
    
    def retrieve(self, query: str, top_k: int = 5) -> list[Chunk]:
        """Retrieve relevant chunks for a query."""
        ...
    
    def query(self, question: str) -> Answer:
        """Full RAG: retrieve + generate answer."""
        ...
```

**eval.py** — FIXED, never touched by the LLM:
```python
# THIS FILE IS NEVER MODIFIED BY THE AUTORESEARCH AGENT.
# It is the ground truth against which all pipeline changes are measured.

import json
from pipeline import RAGPipeline

def evaluate(pipeline: RAGPipeline, eval_file: str = "eval_questions.jsonl"):
    results = []
    
    with open(eval_file) as f:
        questions = [json.loads(line) for line in f]
    
    for q in questions:
        answer = pipeline.query(q["question"])
        
        result = {
            "question": q["question"],
            "expected": q["expected_answer"],
            "got": answer.text,
            "retrieved_docs": [c.source for c in answer.chunks],
            "expected_docs": q["expected_sources"],
            
            # Metrics
            "precision_at_5": precision_at_k(answer.chunks, q["expected_sources"], k=5),
            "recall_at_10": recall_at_k(answer.chunks, q["expected_sources"], k=10),
            "faithfulness": faithfulness_score(answer.text, answer.chunks),
            "answer_correctness": correctness_score(answer.text, q["expected_answer"]),
        }
        results.append(result)
    
    # Aggregate
    metrics = {
        "precision_at_5": mean([r["precision_at_5"] for r in results]),
        "recall_at_10": mean([r["recall_at_10"] for r in results]),
        "faithfulness": mean([r["faithfulness"] for r in results]),
        "answer_correctness": mean([r["answer_correctness"] for r in results]),
    }
    metrics["composite_score"] = (
        metrics["precision_at_5"] * 0.25 +
        metrics["recall_at_10"] * 0.25 +
        metrics["faithfulness"] * 0.25 +
        metrics["answer_correctness"] * 0.25
    )
    return metrics, results
```

**eval_questions.jsonl** — gold standard Q&A pairs:
```jsonl
{"question": "Qual o limite de concentração por cedente na CVM 175?", "expected_answer": "Segundo Art. 23 da CVM 175, o regulamento do fundo deve estabelecer limites de concentração por cedente...", "expected_sources": ["cvm175/art23.md", "cvm175/art38.md"], "category": "regulatory", "difficulty": "easy"}
{"question": "Como calcular PDD segundo IFRS9 para um FIDC?", "expected_answer": "A provisão para devedores duvidosos (PDD) deve seguir o modelo de perdas esperadas...", "expected_sources": ["accounting/pdd-analysis.md", "accounting/ifrs9.md"], "category": "accounting", "difficulty": "medium"}
{"question": "Quais as diferenças entre cota sênior, mezanino e subordinada?", "expected_answer": "As cotas de um FIDC são organizadas em cascata de subordinação...", "expected_sources": ["cotas/estrutura-subordinacao.md", "cotas/risk-return.md"], "category": "structural", "difficulty": "easy"}
```

### The Optimization Loop

```
LOOP (runs continuously in background):

  ┌─────────────────────────────────────────┐
  │  1. LLM reads program.md               │
  │     (understands what to optimize)      │
  └──────────────┬──────────────────────────┘
                 │
  ┌──────────────▼──────────────────────────┐
  │  2. LLM reads pipeline.py              │
  │     (understands current implementation)│
  └──────────────┬──────────────────────────┘
                 │
  ┌──────────────▼──────────────────────────┐
  │  3. LLM reads experiments.jsonl         │
  │     (what was tried before, results)    │
  └──────────────┬──────────────────────────┘
                 │
  ┌──────────────▼──────────────────────────┐
  │  4. LLM hypothesizes improvement        │
  │     "Hierarchical chunking with header  │
  │      respect should improve regulatory  │
  │      question precision"                │
  └──────────────┬──────────────────────────┘
                 │
  ┌──────────────▼──────────────────────────┐
  │  5. LLM modifies pipeline.py           │
  │     (changes chunk_strategy, params)    │
  └──────────────┬──────────────────────────┘
                 │
  ┌──────────────▼──────────────────────────┐
  │  6. eval.py runs automatically          │
  │     (tests against 50-100 gold Q&A)     │
  └──────────────┬──────────────────────────┘
                 │
          ┌──────┴──────┐
          │             │
    IMPROVED?      DEGRADED?
          │             │
          ▼             ▼
    COMMIT change   REVERT change
    Log to           Log failure
    experiments.jsonl  reason
          │             │
          └──────┬──────┘
                 │
  ┌──────────────▼──────────────────────────┐
  │  7. Update program.md with new baseline │
  │     metrics (if improved)               │
  └──────────────┬──────────────────────────┘
                 │
                 └─── REPEAT ───┘
```

### What AutoResearch Experiments With

| Parameter | Range | Impact |
|-----------|-------|--------|
| `chunk_size` | 128-1024 tokens | Smaller = precise, larger = contextual |
| `chunk_overlap` | 0-256 tokens | More overlap = less info loss at boundaries |
| `chunk_strategy` | fixed / sentence / paragraph / hierarchical / semantic | How documents are split |
| `respect_headers` | true / false | Treat markdown headers as chunk boundaries |
| `embedding_model` | gemini / openai / local | Vector quality vs cost vs speed |
| `embedding_dims` | 256-3072 | Accuracy vs memory vs search speed |
| `dense_weight` | 0.0-1.0 | Weight of embedding similarity in hybrid search |
| `sparse_weight` | 0.0-1.0 | Weight of BM25/tsvector in hybrid search |
| `graph_weight` | 0.0-1.0 | Weight of knowledge graph traversal |
| `fusion_method` | rrf / linear / learned | How to combine multiple retrieval signals |
| `rrf_k` | 1-100 | RRF smoothing parameter |
| `reranker` | none / cross-encoder / llm-rerank | Post-retrieval reranking strategy |
| `top_k` | 3-20 | Number of chunks to retrieve |
| `context_assembly` | flat / hierarchical / tree | How to arrange chunks for the LLM |
| `query_expansion` | none / hypothetical / multi-query | Expand query before retrieval |
| `meta_prompt` | classify-first / direct | Classify query type before retrieval |

**Each experiment produces one entry in experiments.jsonl:**
```json
{
  "id": "exp-047",
  "timestamp": "2026-03-15T14:23:00Z",
  "hypothesis": "Semantic chunking with sentence boundary respect improves faithfulness for accounting questions",
  "changes": {"chunk_strategy": "semantic", "respect_sentences": true},
  "previous_score": 0.68,
  "new_score": 0.71,
  "delta": +0.03,
  "result": "improved",
  "category_breakdown": {
    "regulatory": {"precision": 0.75, "recall": 0.82},
    "accounting": {"precision": 0.69, "recall": 0.74},
    "structural": {"precision": 0.80, "recall": 0.85}
  },
  "reverted": false
}
```

---

## How Both Engines Work Together

```
                    USER QUERY
                        │
                        ▼
              ┌─────────────────┐
              │ COGNITIVE ROUTER │
              │ Classify + Route │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  AGENT (SOUL)   │
              │  Processes query │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  RAG PIPELINE   │◄─── AutoResearch optimized this
              │  (pipeline.py)  │     (chunking, embedding, ranking)
              │  Retrieves      │
              │  relevant chunks│
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  METACLAW PROXY │◄─── MetaClaw optimized this
              │  Injects skills │     (behavioral patterns, domain knowledge)
              │  Enriched prompt│
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  LLM PROVIDER   │
              │  Generates      │
              │  response       │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  QUALITY GATE   │
              │  (Sense)        │
              └────────┬────────┘
                       │
                    RESPONSE
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   MetaClaw logs   AutoResearch   Memory
   interaction     monitors       Reflection
   → new skills    eval drift     → knowledge
   (next query     → re-optimize  graph update
    is better)     if degraded)   (next day
                                   is smarter)
```

### Layer Separation (No Conflicts)

| Concern | AutoResearch | MetaClaw |
|---------|-------------|----------|
| **What it optimizes** | HOW information is found (retrieval) | HOW information is used (behavior) |
| **What it changes** | pipeline.py (code) | skill files (markdown) |
| **Evaluation** | eval.py (retrieval metrics) | PRM judge (response quality) |
| **Experiment unit** | Pipeline configuration change | One conversation session |
| **Rollback** | Revert pipeline.py to previous version | Delete/quarantine skill file |
| **Frequency** | Continuous background loop | After every conversation |
| **State** | experiments.jsonl | ~/.metaclaw/skills/ |
| **Isolation** | Shared (one pipeline for all funds) | Per-fund (isolated skill libraries) |

**AutoResearch makes retrieval better → MetaClaw makes responses better → Memory Reflection makes knowledge deeper.**

Three dimensions. Compounding. Every day the system is measurably better than yesterday.

---

## Measurability

### AutoResearch Metrics (tracked per experiment)
```
composite_score = precision@5 × 0.25 
                + recall@10 × 0.25 
                + faithfulness × 0.25 
                + answer_correctness × 0.25

Target: composite_score > 0.85 (from baseline ~0.60)
```

### MetaClaw Metrics (tracked per session)
```
skill_injection_rate = sessions_with_skills / total_sessions
skill_hit_rate = relevant_skills_found / skills_searched
response_quality = PRM_judge_score (0.0 to 1.0)
skill_growth_rate = new_skills_per_week

Target: response_quality > 0.90 after 100 sessions
```

### Combined Dashboard
```
┌─────────────────────────────────────────────┐
│  PAGANINI Intelligence Dashboard            │
├─────────────────────────────────────────────┤
│  Retrieval Score:  ████████░░ 0.78 (+0.14)  │
│  Response Quality: █████████░ 0.87 (+0.22)  │
│  Knowledge Depth:  ███████░░░ 0.71 (+0.31)  │
│  Active Skills:    247                       │
│  Experiments Run:  143                       │
│  Eval Questions:   87                        │
│  Days Active:      47                        │
│                                              │
│  Trend: ↗️ improving 3.2%/week              │
└─────────────────────────────────────────────┘
```
