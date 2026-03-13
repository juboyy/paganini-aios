# PAGANINI AIOS — System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  Slack (IR) │ CLI │ API │ Dashboard │ Webhooks          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                 KERNEL (RLM Engine)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Cognitive   │  │   Python     │  │  Sub-LLM      │  │
│  │  Router      │  │   REPL       │  │  Orchestrator │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │           │
│  ┌──────▼──────────────────────────────────▼─────────┐  │
│  │              Provider Abstraction (LiteLLM)        │  │
│  │         BYOK: OpenAI │ Anthropic │ Google │ Local  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   AGENT SWARM                            │
│                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │Administrador│ │Custodiante │ │     Gestor         │   │
│  │ compliance  │ │ registro   │ │  risco, aquisição  │   │
│  │ governança  │ │ conciliação│ │  decisão           │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ Compliance  │ │ Reporting  │ │  Due Diligence     │   │
│  │ PLD/AML     │ │ CADOC/CVM  │ │  KYC, scoring      │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ Regulatory  │ │  Pricing   │ │  Investor          │   │
│  │ Watch       │ │  Engine    │ │  Relations (Slack) │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   MEMORY (4 Layers)                      │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │  Episodic    │  │  Semantic   │  │  Procedural   │   │
│  │  (timeline)  │  │  (embeddings│  │  (regulations │   │
│  │  operations  │  │   + BM25)   │  │   covenants)  │   │
│  └─────────────┘  └─────────────┘  └───────────────┘   │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Relational (Knowledge Graph)        │    │
│  │     kg_nodes + kg_edges (typed, traversable)     │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  GUARDRAILS                               │
│  Eligibility │ Concentration │ Covenant │ PLD │ Compliance│
│  (hard-stop pipeline — BLOCK, not WARN)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  INFRASTRUCTURE                          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │ Daemons  │  │Telemetry │  │  Self-Improvement     │  │
│  │ covenant │  │ OTel     │  │  autoresearch loop    │  │
│  │ pdd      │  │ traces   │  │  memory reflection    │  │
│  │ recon    │  │ costs    │  │  pattern learning     │  │
│  │ market   │  │ ROI      │  │  self-audit           │  │
│  └──────────┘  └──────────┘  └───────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Filesystem (source of truth)            │   │
│  │  state/ │ corpus/ │ logs/ │ traces/ │ configs/    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Query Flow
```
User Query → Cognitive Router → classify(intent, complexity, fund)
    → select agent(s)
    → agent enters RLM loop:
        1. REPL: search memory layers
        2. REPL: traverse knowledge graph
        3. spawn sub-LLMs for synthesis
        4. guardrail check on response
        5. build answer iteratively
    → trace logged
    → response delivered (Slack/CLI/API)
```

### Operation Flow (e.g., Cessão)
```
Cessão Request → Eligibility Gate → Concentration Gate → Covenant Gate
    → PLD/AML Gate → Compliance Gate
    → IF all pass: APPROVE + log trace
    → IF any fail: BLOCK + log reason + alert
```

### Ingest Flow
```
New Document → Structural Parser → Hierarchical Chunks
    → Entity Extraction (LLM) → Knowledge Graph update
    → Multi-granularity Embedding → Vector store update
    → Sparse index update (BM25/tsvector)
    → Memory reflection: cross-reference with existing knowledge
```

### Self-Improvement Flow
```
LOOP (autoresearch):
    1. Read program.md (strategy)
    2. Modify pipeline params (chunking, retrieval, prompts)
    3. Run eval suite against ground-truth
    4. If improved: keep (git commit)
    5. If regressed: discard (git reset)
    6. Log to results.tsv
    7. Repeat
```

## Deployment Models

### Model A: Managed SaaS
- We host everything (infra, corpus, agents)
- Client provides: API keys (BYOK), fund data, regulations
- We provide: system, updates, support, monitoring
- Pricing: per-fund/month + per-query usage

### Model B: On-Prem
- Client hosts everything (Docker compose)
- We provide: packaged system, setup support, updates
- Client provides: infra, API keys, data
- Pricing: license + support contract

### Model C: Hybrid
- Corpus + state on client infra (data sovereignty)
- Compute on our infra (API gateway)
- Client provides: API keys, data stays local
- Pricing: platform fee + compute usage
