# OPEN-CORE MAP — O que é Open Source vs Pago

> Mapa definitivo de cada arquivo/módulo do repo com classificação de visibilidade.
> Use este doc para identificar e separar código antes de abrir o repo.

---

## Princípio Central

```
Open Source = Motor (adoção, contribuição, confiança)
Pago = Combustível (corpus, skills especializadas, agentes premium, suporte)
```

O framework roda **100% funcional** sem nada pago. Mas roda com dados de exemplo.
O valor real está no **corpus regulatório curado, skills treinadas, e agentes especializados**.

---

## Classificação por Arquivo

### 🟢 ABERTO — Fica no GitHub público

Código framework que qualquer dev pode clonar e rodar.

```
packages/
├── kernel/
│   ├── cli.py              🟢 CLI principal — entry point do produto
│   ├── engine.py            🟢 Config loader, LLM abstraction
│   ├── moltis.py            🟢 Adapter Moltis (gateway management)
│   ├── metaclaw.py          🟢 Framework MetaClaw (shell sem skills)
│   ├── router.py            🟢 Cognitive Router (classificação, dispatch)
│   ├── memory.py            🟢 Memory manager (episódico/semântico)
│   ├── pack.py              🟢 PackManager framework (install/list)
│   ├── reports.py           🟢 ReportGenerator framework (render engine)
│   ├── daemons.py           🟢 Daemon framework + scheduler
│   └── __init__.py          🟢
│
├── rag/
│   ├── pipeline.py          🟢 RAG engine (dense + sparse + graph + RRF)
│   ├── bm25.py              🟢 BM25 sparse retrieval
│   ├── eval.py              🟢 Eval harness (gold standard runner)
│   ├── autoresearch/
│   │   ├── runner.py        🟢 AutoResearch loop engine
│   │   ├── program.md       🟢 LLM instructions (genérico)
│   │   └── __init__.py      🟢
│   └── __init__.py          🟢
│
├── ontology/
│   ├── schema.py            🟢 Knowledge graph schema (genérico)
│   ├── builder.py           🟢 KG builder engine
│   └── __init__.py          🟢
│
├── shared/
│   ├── guardrails.py        🔴 PAGO — regras FIDC hardcoded (CVM175 limits)
│   └── __init__.py          🟢
│
├── agents/
│   ├── framework.py         🟢 AgentRegistry + AgentDispatcher (engine)
│   ├── souls/               🔴 PAGO — cada SOUL é IP de domínio (ver detalhes)
│   └── __init__.py          🟢
│
├── integrations/
│   ├── slack_bot.py         🟡 FREEMIUM — bot framework open, templates pagos
│   └── __init__.py          🟢
│
├── dashboard/
│   ├── app.py               🟡 FREEMIUM — MVP open, dashboards avançados pagos
│   └── __init__.py          🟢
│
├── modules/
│   └── __init__.py          🟢 (stub — módulos futuros são pagos)
│
└── __init__.py              🟢

tests/                       🟢 Todos abertos (testes usam mocks, não corpus real)

templates/
├── reports/
│   ├── informe-mensal.qmd   🔴 PAGO — template regulatório curado
│   ├── cadoc-3040.qmd       🔴 PAGO — template BACEN
│   ├── pdd-report.qmd       🔴 PAGO — template IFRS9
│   ├── risk-report.qmd      🔴 PAGO — template risk
│   └── covenant-report.qmd  🔴 PAGO — template covenant

infra/
├── helm/                    🟢 Helm chart (deploy genérico)
├── Dockerfile               🟢 Container build
└── docker-compose.yaml      🟢 Compose stack

scripts/
├── paganini_gate.py         🟢 Pre-execution gate
└── paganini_codex.py        🟢 Codex bridge

docs/
├── architecture/            🟢 Tudo aberto (transparência gera confiança)
├── security/                🟢 Tudo aberto
├── business/
│   ├── pricing.md           🟡 Pode ser público (mostra valor)
│   └── OPEN_CORE_MAP.md     🔒 INTERNO — nunca push (este arquivo)
└── FAQ.md                   🟢

data/
├── corpus/                  🔴 PAGO + GITIGNORED — 164 docs, 6.4MB
├── sample/                  🟢 Dados sintéticos para dev (a criar)
└── eval/
    └── eval_questions.jsonl  🟡 20 perguntas genéricas (OK público)

config.example.yaml          🟢
moltis.example.yaml          🟢
paganini.sh                  🟢 Installer
pyproject.toml               🟢
README.md                    🟢
README.pt-BR.md              🟢
LICENSE                      🟢 Apache 2.0
CONTRIBUTING.md              🟢
.github/workflows/ci.yml     🟢

runtime/                     🔒 GITIGNORED — nunca no repo
secrets/                     🔒 GITIGNORED — nunca no repo
```

---

## Detalhamento dos Itens Pagos (🔴)

### 1. `packages/shared/guardrails.py` — REGRAS FIDC

**Problema:** Contém limites regulatórios hardcoded da CVM 175.
- Limites de concentração por cedente (10%, 20%)
- Thresholds de elegibilidade
- Regras PLD/AML (PEP, sanções)
- Limites de risco (confidence mínima, VaR)

**Solução:** Separar em duas partes:

```python
# packages/shared/guardrails.py (🟢 ABERTO)
# Engine genérico — recebe regras como config, aplica gates
class GuardrailPipeline:
    def __init__(self, rules: dict): ...
    def check(self, query, response, chunks, confidence): ...

# packs/fidc/rules.yaml (🔴 PAGO — entregue via pack)
eligibility:
  max_concentration_per_cedente: 0.10
  max_single_debtor: 0.20
  min_rating: "BBB"
covenant:
  max_inadimplencia: 0.05
  min_subordinacao: 0.20
pld_aml:
  pep_check: true
  sanctions_list: "coaf_2025"
```

### 2. `packages/agents/souls/*.md` — AGENT SOULs

**9 SOULs** são IP de domínio. Contêm:
- Comportamento especializado por papel (Gestor, Administrador, Custodiante...)
- Heurísticas regulatórias embarcadas
- Domínios e palavras-chave curadas
- Instruções que refletem expertise do setor

**Solução:**

```
# No repo aberto (🟢):
packages/agents/souls/
├── _template.md         # Template genérico: "como criar um SOUL"
└── sample_agent.md      # Agente de exemplo com domain="generic"

# No pack pago (🔴):
packs/fidc/souls/
├── gestor.md
├── administrador.md
├── custodiante.md
├── compliance.md
├── reporting.md
├── due_diligence.md
├── regulatory_watch.md
├── investor_relations.md
└── pricing.md
```

### 3. `templates/reports/*.qmd` — TEMPLATES REGULATÓRIOS

**5 templates** são produto de consultoria regulatória curada:
- Informe mensal de FIDC (formato ANBIMA)
- CADOC 3040 (formato BACEN)
- PDD/IFRS9 (cálculo de provisão)
- Risk report (VaR, concentração)
- Covenant report (inadimplência, subordinação)

**Solução:**

```
# No repo aberto (🟢):
templates/reports/
├── _template.qmd        # Template genérico mostrando estrutura
└── sample-report.qmd    # Relatório de exemplo com campos fake

# No pack pago (🔴):
packs/fidc/templates/
├── informe-mensal.qmd
├── cadoc-3040.qmd
├── pdd-report.qmd
├── risk-report.qmd
└── covenant-report.qmd
```

### 4. `data/corpus/` — O CORPUS (já gitignored)

164 docs markdown. Já está gitignored. Entregue via `paganini install fidc-*`.

### 5. `packages/kernel/daemons.py` — HANDLERS FIDC

**Problema:** Os 3 handlers reais contêm lógica de domínio FIDC:
- `covenant_monitor`: thresholds de inadimplência/subordinação/concentração
- `pdd_calculator`: staging IFRS9 (S1=0.5%, S2=5%, S3=20%)
- `risk_scanner`: VaR 99%, índice de diversificação, liquidez

**Solução:**

```python
# packages/kernel/daemons.py (🟢 ABERTO)
# Framework: DaemonRunner, DaemonRegistry, scheduler, logging
# Handlers genéricos: health_check, data_backup, memory_cleanup

# packs/fidc/daemons/
# covenant_handler.py   (🔴 PAGO)
# pdd_handler.py        (🔴 PAGO)
# risk_handler.py       (🔴 PAGO)
```

### 6. `eval_questions.jsonl` — EVAL SET

**20 perguntas** gold-standard. Algumas revelam interpretação regulatória.

**Solução:** Manter 5-7 perguntas genéricas no repo aberto. As 20 completas vão no pack.

---

## Ação de Separação (Quando For Abrir o Repo)

### Fase 1: Extrair IP para `packs/fidc/`

```bash
mkdir -p packs/fidc/{souls,templates,daemons,rules,eval}

# 1. Mover SOULs
mv packages/agents/souls/*.md packs/fidc/souls/
# Criar template genérico no lugar

# 2. Mover templates
mv templates/reports/*.qmd packs/fidc/templates/
# Criar template genérico no lugar

# 3. Extrair regras de guardrails.py
# → Refatorar para carregar de rules.yaml
# → Mover rules.yaml para packs/fidc/rules/

# 4. Extrair handlers de daemons.py
# → Separar 3 handlers FIDC em arquivos próprios
# → Mover para packs/fidc/daemons/

# 5. Reduzir eval_questions.jsonl
# → Manter 5 genéricas, mover 20 para packs/fidc/eval/
```

### Fase 2: Ajustar código para carregar de packs

```python
# pack.py: Ao instalar pack, copia souls/, templates/, daemons/, rules/
# para os diretórios esperados pelo framework

class PackManager:
    def install(self, pack_id):
        pack = self._download(pack_id)  # De registry.aios.finance
        self._install_souls(pack.souls)
        self._install_templates(pack.templates)
        self._install_daemons(pack.daemons)
        self._install_rules(pack.rules)
        self._install_corpus(pack.corpus)
        self._install_eval(pack.eval_set)
```

### Fase 3: Gitignore packs/

```gitignore
# Packs (paid content, downloaded at runtime)
packs/
!packs/README.md
```

### Fase 4: Scrub git history

```bash
# Antes de tornar público:
git filter-repo --path packages/agents/souls/ --invert-paths
git filter-repo --path templates/reports/ --invert-paths
# Verificar com trufflehog + gitleaks
```

---

## Precificação Revisada

O pricing.md atual mistura SaaS + usage + setup. Isso confunde.

### Problemas no pricing atual:
1. **Dois modelos conflitantes** — license mensal (SaaS) E pay-per-query (usage). Pick one.
2. **AUM-based pricing é complexo demais** para seed stage — difícil de vender/explicar.
3. **Setup fee alto** (R$15K-40K) mata conversão. Deveria ser absorvido no MRR.
4. **Sem tier gratuito** — zero atração orgânica.
5. **Sem self-service** — tudo requer contato comercial.
6. **Pack pricing desconectado** do pricing geral.

### Proposta Revisada:

```
┌──────────────────────────────────────────────────────────┐
│                    PAGANINI AIOS                          │
├──────────┬──────────────┬───────────────┬────────────────┤
│          │  Community   │  Professional │   Enterprise   │
│          │   (grátis)   │  R$8K/mês     │   R$25K/mês    │
├──────────┼──────────────┼───────────────┼────────────────┤
│ Framework│     ✅       │      ✅       │      ✅        │
│ RAG      │ ✅ (sample)  │  ✅ (corpus)  │  ✅ (corpus)   │
│ Agentes  │ 1 genérico   │  9 FIDC       │  9 + custom    │
│ Guardrail│ Framework    │  Regras FIDC  │  + custom      │
│ Daemons  │ Framework    │  3 handlers   │  + custom      │
│ Templates│ 1 exemplo    │  5 QMD        │  + custom      │
│ MetaClaw │ skills_only  │  + rl mode    │  + opd mode    │
│ AutoRAG  │     ✅       │      ✅       │      ✅        │
│ Dashboard│ API only     │  Full UI      │  + white-label │
│ Slack Bot│     ❌       │      ✅       │  + custom      │
│ Suporte  │ GitHub       │  Slack 4h SLA │  Dedicado 1h   │
│ Fundos   │ 1 (demo)     │  Até 10       │  Ilimitado     │
│ Onboard  │ Self-serve   │  Assistido    │  White-glove   │
│ Corpus   │ ❌ (sample)  │  FIDC 164 docs│  + custom      │
│ KG       │ Framework    │  FIDC ontol.  │  + domain ext. │
│ Updates  │ Community    │  Priority     │  Early access  │
├──────────┼──────────────┼───────────────┼────────────────┤
│ Instalação│ CLI          │  CLI          │  Managed       │
│ LLM      │ BYOK         │  BYOK         │  BYOK/managed  │
│ Infra    │ Self-hosted  │  Self-hosted  │  Self/managed  │
└──────────┴──────────────┴───────────────┴────────────────┘
```

### Por que essa estrutura funciona:

1. **Community gratuito** = atrai devs, cria ecossistema, gera GitHub stars
2. **Professional = pacotes de domínio** = revenue principal, per-fund billing
3. **Enterprise = consultoria + customização** = high-touch, high-margin
4. **BYOK em todos os tiers** = zero markup de compute, confiança total
5. **Self-serve Community** = sem fricção de vendas, organic growth
6. **Pack system = upsell natural** = "quer mais agentes? instale fidc-professional"

### Unit Economics Revisados:

| Métrica | Valor |
|---------|-------|
| Community → Pro conversion | ~5% (benchmark open-core) |
| Target Community users Y1 | 500 |
| Target Pro funds Y1 | 25 (5% de 500) |
| Avg Pro MRR/fund | R$8K |
| Pro ARR | R$2.4M |
| Enterprise deals Y1 | 3-5 |
| Enterprise avg annual | R$300K |
| Enterprise ARR | R$900K-1.5M |
| **Total ARR Y1** | **R$3.3-3.9M** |
| Gross margin | ~90% (BYOK = no compute) |
| CAC (Pro) | ~R$15K (inbound from Community) |
| CAC (Enterprise) | ~R$50K (outbound + POC) |
| LTV/CAC (Pro) | 6.4x (12mo × R$8K / R$15K) |

---

## Marcação no Código

Para facilitar a separação futura, usar markers nos arquivos que contêm IP:

```python
# === PAGANINI-PAID: fidc ===
# This section contains domain-specific logic distributed via pack.
# In the open-source version, this is replaced by a plugin loader.
def covenant_monitor(run_state, daemon_state, logger, ...):
    ...
# === END PAGANINI-PAID ===
```

Isso permite um script automatizado de extração:
```bash
python3 scripts/extract_paid.py --pack fidc --output packs/fidc/
# Lê todos os markers, extrai blocos, substitui por plugin loader
```

---

## Resumo Executivo

| Categoria | Qtd Arquivos | Linhas | Classificação |
|-----------|-------------|--------|---------------|
| Framework (engine) | 18 .py | ~4,200 | 🟢 OPEN |
| Agentes FIDC (SOULs) | 9 .md | ~450 | 🔴 PAID |
| Guardrail rules | 1 .py (parcial) | ~100 | 🔴 PAID |
| Daemon handlers | 1 .py (parcial) | ~300 | 🔴 PAID |
| Report templates | 5 .qmd | ~340 | 🔴 PAID |
| Corpus | 164 .md | ~6.4MB | 🔴 PAID |
| Eval set (full) | 1 .jsonl | 20 Q&As | 🔴 PAID |
| Infra/docs/config | 15+ files | ~2,000 | 🟢 OPEN |
| Tests | 8 .py | ~550 | 🟢 OPEN |
| **Total open** | **~41 files** | **~6,750** | — |
| **Total paid** | **~180 files** | **~7,600** | — |

O framework open-source é **funcional e completo** sem os arquivos pagos.
A diferença é: roda com dados fake vs roda com inteligência real de FIDC.

---

*Documento interno. Não incluir no repo público.*
*Última atualização: 2026-03-15*
