# Gap Analysis v2 — Landing + Dashboard vs Produto Real
# Data: 2026-03-18 | Fonte: codebase audit direto

## Metodologia
Cruzamento de TODAS as claims na landing page v4 e no dashboard v3
contra o codebase real em `/home/node/.openclaw/workspace/paganini/`.

---

## LANDING PAGE — Gaps

### ✅ MATCH (claim = realidade)
| # | Claim | Evidência |
|---|-------|-----------|
| 1 | 9 agentes autônomos | 9 SOULs em `packages/agents/souls/` ✓ |
| 2 | Cada agente tem SOUL (personalidade + competências + limites) | `AgentSOUL` class com slug, name, role, system_prompt, domains, tools, constraints ✓ |
| 3 | AgentRegistry carrega de diretório | `AgentRegistry.__init__` com `self._load_all()` ✓ |
| 4 | AgentDispatcher roteia por similaridade | `AgentDispatcher` class em framework.py ✓ |
| 5 | Cognitive Router classifica por intent/domain/confidence | `QueryClassification` dataclass com complexity, domains, intent, confidence_estimate, multi_agent, reasoning ✓ |
| 6 | Hybrid RAG (embeddings + BM25) | ChromaDB embeddings + keyword match em memory.py ✓ |
| 7 | MetaClaw (self-learning skills) | `metaclaw.py` com Skill class, pattern matching, score evolution ✓ |
| 8 | RTK token compression | `rtk.py` com exec_compressed(), gain(), status(), install() ✓ |
| 9 | 6-gate guardrail pipeline | `compliance.py` com GateResult, adversarial patterns ✓ |
| 10 | OOP Skills com dependency resolution | `skills/loader.py` v3.0 com árvore de deps, lockfiles, progressive loading ✓ |
| 11 | 11 skills | 11 skill dirs em `skills/` ✓ |
| 12 | Skill lockfile com SHA256 integrity | `skill-lock-fidc.json` com integrity hashes ✓ |
| 13 | CLI com 15+ comandos | cli.py: init, ingest, query, agents, daemons, status, eval, doctor, up, pack, report, autoresearch + subcommands = 17+ ✓ |
| 14 | `curl | sh` installer | install.sh existe ✓ |
| 15 | Docker Compose 4 services | docker-compose.yml com api, dashboard, postgres, chromadb ✓ |
| 16 | AutoResearch eval loop | `autoresearch` command + `packages/rag/autoresearch/runner.py` ✓ |
| 17 | Daemons 24/7 | `daemons.py` com interval parsing, daemon registry ✓ |
| 18 | 107 Python files | `find . -name "*.py" | wc -l` = 107 ✓ |
| 19 | 18.5K lines of code | `wc -l` = 18,511 (landing diz 7.2K — OUTDATED) |
| 20 | 136 test functions em 18 files | Real: 136 funcs in 18 files (landing diz "132") |

### ⚠️ PARCIAL (claim existe mas incompleta)
| # | Claim | Realidade | Gap |
|---|-------|-----------|-----|
| 1 | "Skills publicadas por terceiros. Monetizáveis." | Skills existem localmente. Não existe marketplace/registry real. | **P1**: Sem URL de marketplace, sem `paganini skill publish`, sem revenue share implementado |
| 2 | "Revenue share 70/30" | Modelo descrito na landing. Nada no código. | **P2**: Business logic de monetização não existe |
| 3 | "3 orchestration flows" (Purchase/Report/Onboard) | `onboard.py` existe. Purchase flow e Report flow são lógica distribuída, não orquestrações explícitas. | **P1**: Faltam pipeline definitions explícitas |
| 4 | "Delivery rate 98.3%" | Não há metrição real de delivery rate no código. | **P2**: Sem telemetry framework |
| 5 | "147 tasks/day" | Mock data. Sem task tracking real. | **P2**: Sem counter/metrics |
| 6 | "$0.09/hour cost" | Estimativa. Sem cost tracking implementado. | **P2**: Sem billing/metering |
| 7 | "Spawning 4 sub-agents recursively" | framework.py tem dispatch, mas sub-agent spawning recursivo NÃO está implementado. Dispatcher é single-hop. | **P0**: Core claim não implementada |
| 8 | "Knowledge graph stored → ChromaDB + pgvector" | ChromaDB sim. pgvector referenciado mas não usado no código do Paganini (existe no EC2 pro OraCLI). | **P1**: pgvector não integrado no Paganini |

### ❌ GAP (claim sem suporte no código)
| # | Claim | Status |
|---|-------|--------|
| 1 | **Recursive sub-agent spawning** — "agents que spawnam agents" | `AgentDispatcher.dispatch()` é single-hop: seleciona 1 agente, executa, retorna. Não há spawn recursivo. Nenhum agent chama outro agent no código. | **P0 CRÍTICO** |
| 2 | **`paganini skill install <name>`** | CLI tem `pack_install` mas não `skill install`. Confusão pack vs skill. | **P1** |
| 3 | **`paganini skill publish`** | Não existe. | **P2** |
| 4 | **Banking Pack Q3, Asset Management Q4, Insurance 2027** | Roadmap puro. Nenhum código. | OK — é roadmap declarado |
| 5 | **Report templates** | `packs/finance/templates/` não existe. `reports.py` existe mas sem templates. | **P1** |
| 6 | **"Cada sub-agente herda contexto, tem acesso à memória do pai"** | Sem implementação de herança de contexto entre agentes. | **P0** |
| 7 | **"34 entities extracted, 67 relationships"** (ingest demo) | O `ingest` command ingesta documentos no ChromaDB. Não extrai entidades/relationships em graph. | **P1** |
| 8 | **Covenant Monitor daemon** | `daemons.py` tem framework, mas nenhum daemon "covenant_monitor" está implementado. | **P1** |
| 9 | **PDD Aging por 7 buckets** | Não há lógica de aging bucket no código. | **P1** |

---

## DASHBOARD — Gaps

### ✅ MATCH (visualização = realidade)
| # | Page | Status |
|---|------|--------|
| 1 | Agent Fleet — 9 agentes com SOULs | ✓ reflete `packages/agents/souls/` |
| 2 | Guardrails — 6 gates | ✓ reflete `compliance.py` |
| 3 | Skills — dependency tree, lockfile, types | ✓ reflete `skills/loader.py` + `skill-lock-fidc.json` |
| 4 | Memory — 3D Knowledge Graph | ✓ componente funcional |
| 5 | Settings — doctor checks, RTK, RAG config | ✓ reflete cli.py `doctor` command |

### ⚠️ PARCIAL
| # | Page | Gap |
|---|------|-----|
| 1 | Command Center — "Live Execution Trace" | Animação simulada, não trace real do backend |
| 2 | Telemetry — "$3.42/day cost" | Mock. Sem metering real |
| 3 | Fund Ops — Covenant Gauges, PDD Aging | Visualização bonita, dados fake. Backend não calcula |
| 4 | Pipeline — "CLASSIFY → ROUTE → EXECUTE → GUARDRAIL → DELIVER" | O Router classifica e o Guardrail valida, mas não há pipeline stage tracking |
| 5 | Symphony — Delegation Matrix | Mostra delegações, mas código real é single-hop |

### ❌ GAP CRÍTICO
| # | Issue | Impacto |
|---|-------|---------|
| 1 | **Dashboard não conecta ao backend** | Todas as API routes retornam mock data. Nenhum fetch real ao Python backend. |
| 2 | **Sem WebSocket/SSE** | "LIVE" indicator é mentira. Sem streaming real. |
| 3 | **Sem autenticação** | Dashboard público. Qualquer um acessa. |

---

## NÚMEROS DESATUALIZADOS
| Claim (landing) | Real | Fix |
|---|---|---|
| "105 Python files" | 107 | Atualizar para 107 |
| "7,200 LOC" | 18,511 | Atualizar para 18.5K (MUITO melhor!) |
| "132 tests" | 136 test functions, 18 files | Atualizar para 136 |

---

## PRIORIZAÇÃO

### P0 — Corrigir AGORA (claims core falsas)
1. **Recursive sub-agent spawning**: O claim central do produto ("agentes que spawnam agentes") não existe no dispatcher. Implementar `recursive_dispatch()` no framework.py.
2. **Context inheritance**: Sub-agentes precisam herdar contexto do pai.

### P1 — Corrigir esta semana
3. **Unificar skill vs pack**: CLI mistura os conceitos. Decidir nomenclatura e alinhar.
4. **Report templates**: Criar diretório `packs/finance/templates/` com pelo menos 2 templates.
5. **Entity extraction no ingest**: O `ingest` deveria extrair entidades (empresas, CNPJs, obrigações) e criar edges no knowledge graph.
6. **Covenant Monitor daemon**: Implementar pelo menos 1 daemon real.
7. **PDD Aging logic**: Implementar cálculo de PDD por faixa de atraso.
8. **pgvector no Paganini**: Ou integra, ou remove a referência.

### P2 — Backlog
9. **Marketplace infrastructure** (registry, publish, install)
10. **Cost metering** (token tracking por agente)
11. **Task counter** (delivery rate real)
12. **Dashboard ↔ Backend connection** (substituir mocks por API calls reais)
13. **WebSocket para "LIVE"**
14. **Auth no dashboard**

### NÚMERO EASY WINS (landing)
15. Atualizar: 107 files, 18.5K LOC, 136 tests
