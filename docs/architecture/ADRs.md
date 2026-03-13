# Architecture Decision Records

## ADR-001: Recursive Language Model (RLM) as Core Engine
**Status:** Accepted
**Date:** 2026-03-13

### Context
Traditional RAG pipelines retrieve chunks and stuff them into context. This causes context rot on large financial corpora (164+ docs, 5.6MB+). FIDC queries require multi-step reasoning across regulations, accounting rules, and fund-specific policies.

### Decision
Adopt the Recursive Language Model (RLM) pattern from Prime Intellect as the core reasoning engine. The RLM manages its own context via Python REPL, delegates to sub-LLMs, and never receives raw corpus in its context window.

### Consequences
- Model-agnostic: any frontier LLM can serve as base
- No fine-tuning required: domain knowledge lives in corpus + scaffolding
- Context stays lean: large data accessed programmatically
- Sub-LLMs handle tool-heavy work (search, fetch, parse)
- Answer built iteratively via diffusion pattern

---

## ADR-002: BYOK (Bring Your Own Key) Architecture
**Status:** Accepted
**Date:** 2026-03-13

### Context
Clients in financial markets have strict data governance. Some require on-prem deployment. Vendor lock-in to a specific LLM provider is unacceptable.

### Decision
All LLM calls go through a provider abstraction layer (LiteLLM). Clients provide their own API keys. The system works with any supported provider: OpenAI, Anthropic, Google, Azure, local models via Ollama.

### Consequences
- Zero vendor lock-in
- Client controls costs
- Client controls data residency
- We sell the system, not the compute

---

## ADR-003: 4-Layer Memory Architecture
**Status:** Accepted
**Date:** 2026-03-13

### Context
Financial operations require multiple types of memory: transaction history (episodic), domain knowledge (semantic), operating procedures (procedural), and entity relationships (relational).

### Decision
Implement 4 memory layers, each accessible via unified Memory API:
1. **Episodic** — time-ordered events (operations, decisions, alerts)
2. **Semantic** — embedded corpus chunks (dense + sparse retrieval)
3. **Procedural** — fund regulations, policies, covenants (structured docs)
4. **Relational** — knowledge graph (entities + typed relations)

### Consequences
- Different query types route to different memory layers
- RLM accesses all layers via Python REPL
- Each fund has isolated memory scope
- Memory persists across sessions via filesystem + database

---

## ADR-004: Guardrails as Hard-Stop Pipeline
**Status:** Accepted
**Date:** 2026-03-13

### Context
In financial operations, suggesting a correction is insufficient. Regulatory violations must be blocked, not warned. The system must enforce constraints, not advise on them.

### Decision
Implement guardrails as a hard-stop pipeline. Every operation passes through gates that can BLOCK (not just WARN). Gates are: eligibility, concentration, covenant, compliance, PLD/AML.

### Consequences
- Operations that violate rules are blocked before execution
- Full audit trail of blocked operations
- Regulatory compliance is enforced, not suggested
- False positives require human override (logged)

---

## ADR-005: Agent Swarm Maps to FIDC Participants
**Status:** Accepted
**Date:** 2026-03-13

### Context
FIDCs have well-defined participant roles: Administrador, Custodiante, Gestor, etc. Each has distinct responsibilities, data access, and decision authority.

### Decision
Agent swarm mirrors FIDC participant structure. Each agent has its own SOUL, tools, memory scope, and guardrails. The Kernel (Cognitive Router) dispatches queries to the appropriate agent.

### Consequences
- Natural mapping to domain expertise
- Access control per agent (custodiante can't approve acquisitions)
- Agents can be deployed independently
- Client can enable/disable agents per fund

---

## ADR-006: Slack as Investor Relations Interface
**Status:** Accepted
**Date:** 2026-03-13

### Context
Cotistas (fund investors) need 24/7 access to fund information. Building a custom portal is expensive. Slack is already used by financial professionals.

### Decision
Investor Relations operates via Slack. Per-fund channels for announcements, DMs for individual cotista queries. Strict data segregation per cotista.

### Consequences
- Zero adoption friction
- 24/7 availability
- Thread-based context for complex queries
- Integration with existing Slack workflows
- Must enforce data isolation in DMs

---

## ADR-007: Filesystem as Persistent State
**Status:** Accepted
**Date:** 2026-03-13

### Context
Cloud databases are dependencies that can fail. Fund state must survive restarts, model changes, and infrastructure migrations. The system must be inspectable by humans.

### Decision
Primary state lives on filesystem as readable files (markdown, JSON, YAML). Database (pgvector/Supabase) is a performance layer, not the source of truth. Filesystem can reconstruct database state.

### Consequences
- Human-readable state (auditors can inspect)
- Git-trackable changes
- Survives database failures
- Simple backup (rsync/scp)
- Database is cache, not source

---

## ADR-008: AutoResearch Loop for Self-Improvement
**Status:** Accepted
**Date:** 2026-03-13

### Context
RAG quality depends on chunking strategy, embedding model, retrieval weights, prompt templates, and many other parameters. Manual tuning is slow and doesn't scale across funds with different characteristics.

### Decision
Adopt the AutoResearch pattern (Karpathy): autonomous loop that modifies RAG pipeline parameters, evaluates against ground-truth eval set, keeps improvements, discards regressions. The `program.md` drives the research agent.

### Consequences
- System improves autonomously over time
- Each fund can have optimized retrieval parameters
- Eval set ensures quality doesn't regress
- Human reviews improvement logs, not individual experiments

---

## ADR-009: Telemetry as Regulatory Requirement
**Status:** Accepted
**Date:** 2026-03-13

### Context
CVM requires traceability of all decisions in fund administration. Every action must be explainable, timestamped, and attributable. This is not optional telemetry — it's a regulatory mandate.

### Decision
Every agent action generates an immutable trace: inputs, reasoning, decision, outputs, cost, latency, model used. Traces are stored on filesystem (JSONL) and synced to database. Dashboard provides visibility.

### Consequences
- Full audit trail for regulators
- Cost tracking per operation (BYOK transparency)
- Performance monitoring per agent
- Anomaly detection on decision patterns
