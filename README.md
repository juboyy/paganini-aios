<div align="center">

# 🎻 PAGANINI AIOS

### Autonomous Code Agent Platform

[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-3776ab.svg)](https://python.org)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Dashboard](https://img.shields.io/badge/dashboard-live-blue.svg)](https://dashboard-v2-pearl-rho.vercel.app)
[![HuggingFace](https://img.shields.io/badge/🤗_HuggingFace-Models-yellow.svg)](https://huggingface.co/sttjr)

[Dashboard v2](https://dashboard-v2-pearl-rho.vercel.app) · [Dashboard v1 (demo)](https://paganini-demo.vercel.app) · [Docs](docs/) · [Instalar](#instalação) · [🇧🇷 Português](README.pt-BR.md)

</div>

---

## O Que É

Paganini é uma **plataforma de agentes autônomos de código** — um sistema operacional de IA onde agentes especializados executam tarefas de software de ponta a ponta: code review, geração de specs, deploy pipelines, testes, segurança. Os agentes aprendem com cada interação e evoluem sem fine-tuning.

Sobre esse motor de código, verticais de domínio são instaladas como **packs**. O primeiro pack de produção é **FIDC** (fundos de investimento brasileiros) — 9 agentes financeiros, 6 guardrails regulatórios, 164 documentos de corpus.

```
┌─────────────────────────────────────────────────────────┐
│                    DOMAIN PACKS                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   FIDC   │  │  Crypto  │  │  Supply  │   ...        │
│  │ 9 agents │  │  (soon)  │  │  Chain   │              │
│  │ 6 gates  │  │          │  │  (soon)  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
├─────────────────────────────────────────────────────────┤
│                   CODE LAYER (Core)                      │
│  12 Code Agents · Code Review · Spec Gen · Deploy       │
│  Test Gen · Security Scan · Doc Gen · Git Intelligence   │
│  Context Scout · Pipeline Automation                     │
├─────────────────────────────────────────────────────────┤
│                    ENGINE                                │
│  Cognitive Router · Hybrid RAG · MetaClaw (LoRA/Skills) │
│  Memory Reflection · Guardrail Pipeline · BYOK LLM      │
└─────────────────────────────────────────────────────────┘
```

---

## Instalação

**Um comando. Máquina crua. Zero configuração manual.**

```bash
export GOOGLE_API_KEY=sua-chave-gemini
curl -sSL https://raw.githubusercontent.com/juboyy/paganini-aios/main/demo.sh | bash
```

```
[1/9] ✓ Dependências do sistema (Python, git, venv)
[2/9] ✓ Moltis Runtime Engine (binário nativo)
[3/9] ✓ Código-fonte
[4/9] ✓ Ambiente Python + 87 dependências
[5/9] ✓ CLI global (paganini funciona de qualquer diretório)
[6/9] ✓ Configuração LLM (auto-detecta API key)
[7/9] ✓ Indexação de corpus (67 chunks)
[8/9] ✓ Persistência
[9/9] ✓ Diagnóstico (11/11 checks verdes)
```

---

## Teste Rápido

```bash
paganini doctor                                    # 11 checks — tudo verde
paganini agents                                    # 9 agentes especializados
paganini query "Qual a PDD mínima para FIDC?"      # IA responde com RAG + confiança
paganini pack list                                 # Packs disponíveis
paganini up                                        # Dashboard + Telegram + Daemons
```

**Resposta real (89% confiança):**

```
╭──────────────────── 📋 Resposta (89% confiança) ─────────────────────╮
│                                                                       │
│  O administrador fiduciário em um FIDC é responsável pela             │
│  constituição, administração e funcionamento do fundo, com            │
│  diligência e lealdade [Fonte 1]. Deve monitorar DIARIAMENTE         │
│  todos os covenants e reportar desenquadramentos em até 1 dia        │
│  útil [Fonte 2].                                                     │
│                                                                       │
╰───────────────────────────────────────────────────────────────────────╯
```

---

## Duas Camadas, Um Sistema

### 💻 Code Layer — O Motor (Open Source)

12 agentes de código que formam o core da plataforma. Disponíveis em todos os planos.

| Agente | O Que Faz |
|--------|----------|
| **OraCLI** | Orquestrador central — classifica, roteia, delega |
| **Code Agent** | Implementação, PRs, specs técnicos |
| **Codex** | Motor de execução de código (sandbox) |
| **Architect** | Design de sistemas, contratos de API, modelos de dados |
| **QA Agent** | Estratégia de testes, execução, regressão |
| **Security Agent** | Scan de vulnerabilidades, secrets, controle de acesso |
| **PM Agent** | Sprint planning, stories, priorização |
| **Docs Agent** | Documentação, knowledge base |
| **Infra Agent** | Deploy, Docker, monitoring, CI/CD |
| **Data Agent** | Schemas, migrações, analytics |
| **General Agent** | Triage, UX review, research |
| **Context Scout** | Busca semântica em código, memória, docs |

**Skills de código incluídos:** code-review, spec-generator, test-generator, deploy-pipeline, security-scan, doc-generator, context-scout, git-intelligence.

### 🏦 Finance Layer — O Primeiro Pack (FIDC)

9 agentes de domínio financeiro construídos sobre a Code Layer. Cada um tem identidade própria (SOUL), escopo regulatório, e guardrails específicos.

| | Agente | Especialidade |
|---|-------|--------------| 
| 📋 | **Administrador** | CVM 175, governança, filings regulatórios |
| 🔐 | **Custodiante** | Reconciliação, sobrecolateralização, registro |
| 📊 | **Gestor** | Análise de risco, modelagem PDD, otimização de portfólio |
| ⚖️ | **Compliance** | PLD/AML, COAF, sanções, LGPD |
| 📄 | **Reporting** | CADOC 3040, ICVM 489, informe mensal |
| 🔍 | **Due Diligence** | KYC, scoring de crédito, pesquisa judicial |
| 📡 | **Regulatory Watch** | Scan diário CVM/ANBIMA/BACEN |
| 💬 | **Investor Relations** | Bot Slack 24/7, relatórios de performance |
| 💰 | **Pricing** | Mark-to-market, deságio, stress testing |

**Skills de domínio incluídos:** covenant-check, cvm-regulation-lookup, daily-report-gen, guardrails-pld, market-analysis, pld-aml-block, regulacao-cvm175.

**Guardrail Pipeline (6 gates):** Eligibility → Concentration → Covenant → PLD/AML → Compliance → Risk

---

## Auto-Aprendizado

### 🧬 MetaClaw — 3 Modos de Evolução

| Modo | O Que Faz | Requisitos |
|------|-----------|------------|
| **skills_only** (default) | Intercepta cada interação. Injeta skills aprendidos. Gera novos automaticamente. | Apenas rede. Sem GPU. |
| **rl** | + Fine-tuning **LoRA ao vivo** via Tinker Cloud. **Operacional** — 23 runs de treino concluídos. Modelo PRM avalia respostas com reward function dual (R_code + R_finance + R_shared). Pesos trocados sem downtime. | Tinker API key |
| **opd** | + Destilação teacher-student. Modelo frontier ensina modelo menor. Mesma qualidade, 1/10 do custo. | Endpoint do modelo teacher |

### 🔍 AutoResearch — RAG Que Se Otimiza

Pipeline auto-modificável. Um LLM roda experimentos autônomos para otimizar 16 parâmetros de recuperação (chunk size, embedding model, fusion weights, reranking). Busca evolucionária sobre o espaço de configuração.

### 🧠 Memory Reflection

Daemon diário. Revisa operações → extrai padrões → constrói grafo de conhecimento → promove memória episódica para semântica. O que o sistema aprende hoje beneficia todas as queries amanhã.

---

## Treinamento de Modelos

O Paganini não apenas usa LLMs — **treina os seus próprios**. O pipeline completo vai do corpus bruto até modelos publicados no HuggingFace e prontos para inferência pelos agentes.

### Pipeline

```
Corpus FIDC (6.993 chunks)
        │
        ▼
Dataset Generation (13.697 pares Q&A dual-domain)
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
   SFT (Supervised)                    GRPO (Reinforcement)
   Qwen3.5-27B · A100 80GB             Tinker API · LoRA rank 32
   8.400 samples · 87,75% acc          13.697 samples · R_dual
   loss 0,454                          R_code + R_finance + R_shared
        │                                      │
        ▼                                      ▼
sttjr/paganini-qwen35-27b-sft-lora    sttjr/paganini-qwen35-27b-grpo-lora
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
               Agent Inference
```

### SFT — Supervised Fine-Tuning

| Parâmetro | Valor |
|-----------|-------|
| **Modelo base** | Qwen3.5-27B |
| **Hardware** | RunPod A100 80GB |
| **Amostras** | 8.400 |
| **Acurácia final** | 87,75% |
| **Loss final** | 0,454 |
| **HuggingFace** | [`sttjr/paganini-qwen35-27b-sft-lora`](https://huggingface.co/sttjr/paganini-qwen35-27b-sft-lora) |

### GRPO — Reinforcement Learning

| Parâmetro | Valor |
|-----------|-------|
| **Método** | Group Relative Policy Optimization (GRPO) |
| **Infraestrutura** | Tinker API — Thinking Machines Lab |
| **Amostras** | 13.697 (dual-domain: código + finanças) |
| **LoRA rank** | 32 |
| **Reward function** | R_total = R_code + R_finance + R_shared |
| **Runs concluídos** | 23 |
| **HuggingFace** | [`sttjr/paganini-qwen35-27b-grpo-lora`](https://huggingface.co/sttjr/paganini-qwen35-27b-grpo-lora) |

Os modelos estão disponíveis publicamente em [huggingface.co/sttjr](https://huggingface.co/sttjr).

---

## Modelo de Negócio — Open Core

| | Starter | Professional | Enterprise |
|---|:---:|:---:|:---:|
| **Preço** | **Grátis (OSS)** | R$ 8K/mês | R$ 25K/mês |
| **Code Agents** | 12 | 12 | 12 + custom |
| **Domain Agents** | 3 | 9 | 9 + custom |
| **Skills** | Core (8) | 15 (8 code + 7 domain) | 15 + custom |
| **MetaClaw** | skills_only | rl (LoRA live) | rl + opd |
| **Guardrails** | Básico | Completo | Completo + custom |
| **SLA** | Community | — | 99.9% |

---

## Números

| Métrica | Valor |
|---------|-------|
| Módulos Python | 123 |
| Testes | 132 (18 suites) |
| LOC | 28.422 |
| Code Agents | 12 |
| Domain Agents (FIDC) | 9 |
| Guardrail Gates | 6 |
| Chunks indexados | 6.993 |
| Dependências | 87 |
| Runs de treino GRPO | 23 |
| Amostras de treino (total) | 22.097 (8.4K SFT + 13.7K GRPO) |

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **Runtime** | Moltis v0.10.18 (Rust, ~30MB) |
| **Code Agents** | 12 SOULs com identidade + tools + escopo |
| **Domain Agents** | 9 SOULs FIDC com guardrails regulatórios |
| **RAG** | ChromaDB + all-MiniLM-L6-v2 (local, sem API) |
| **LLM** | BYOK via LiteLLM (OpenAI / Anthropic / Google / Ollama) |
| **Guardrails** | Pipeline de 6 gates com hard-stop |
| **Training** | Tinker API (Qwen3.5-27B + LoRA rank 32, GRPO) |
| **Models** | HuggingFace ([sttjr/paganini-qwen35-27b-grpo-lora](https://huggingface.co/sttjr/paganini-qwen35-27b-grpo-lora)) |
| **Dashboard v1** | Next.js — [demo](https://paganini-demo.vercel.app) |
| **Dashboard v2** | Next.js — [enterprise](https://dashboard-v2-pearl-rho.vercel.app) (com aba RL Training) |

---

## Equipe

| | | | |
|:---:|:---:|:---:|:---:|
| **Rod Marques** | **João Raf** | **Louiz Ferrer** | **Mark Binder** |
| CEO | CTO | CIO | CFO |

---

<div align="center">

**[Dashboard v2](https://dashboard-v2-pearl-rho.vercel.app)** · **[Dashboard v1](https://paganini-demo.vercel.app)** · **[🤗 HuggingFace](https://huggingface.co/sttjr)** · **rod.marques@aios.finance**

<sub>Built with obsession. Shipped with discipline.</sub>

</div>
