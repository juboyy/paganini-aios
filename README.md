<div align="center">

# 🎻 PAGANINI AIOS

### AI Operating System for Financial Markets

[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-3776ab.svg)](https://python.org)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Dashboard](https://img.shields.io/badge/dashboard-live-blue.svg)](https://dashboard-v2-pearl-rho.vercel.app)

[Dashboard](https://dashboard-v2-pearl-rho.vercel.app) · [Docs](docs/) · [Instalar](#instalação) · [🇧🇷 Português](README.pt-BR.md)

</div>

---

## O Problema

A indústria brasileira de FIDCs movimenta **R$ 8,9 trilhões** em fundos com processos manuais. Administradores, custodiantes e gestores gastam milhares de horas por ano em verificações de compliance, monitoramento regulatório e relatórios operacionais.

**Paganini elimina 80% desse trabalho manual.**

| | Manual | Paganini |
|---|---|---|
| **Onboarding de fundo** | 2–5 dias | 30 segundos |
| **Consulta regulatória** | Horas (advogado) | < 3 segundos |
| **Check de compliance** | Auditoria mensal | Contínuo, 24/7 |
| **Custo por fundo** | R$ 15K–50K/mês | R$ 2K–8K/mês |

**ROI estimado por fundo:** 120-200 horas/mês economizadas. ~R$60-100K/mês em redução de custo operacional.

---

## Instalação

**Um único comando — funciona em qualquer máquina Ubuntu/Debian:**

```bash
export GOOGLE_API_KEY=sua-chave-gemini
curl -sSL https://raw.githubusercontent.com/juboyy/paganini-aios/main/demo.sh | bash
```

**O que acontece automaticamente (9 etapas, ~60 segundos):**

```
[1/9] ✓ Verifica Python 3.12+, instala dependências do sistema
[2/9] ✓ Instala Moltis Runtime Engine (binário nativo)
[3/9] ✓ Clona o repositório
[4/9] ✓ Cria ambiente virtual Python + instala 87 dependências
[5/9] ✓ Instala CLI global (paganini funciona de qualquer diretório)
[6/9] ✓ Configura provider LLM (auto-detecta API key)
[7/9] ✓ Indexa base de conhecimento (67 chunks)
[8/9] ✓ Persiste configuração
[9/9] ✓ Diagnóstico final (11/11 checks verdes)
```

**Ou passo a passo:**

```bash
git clone https://github.com/juboyy/paganini-aios.git && cd paganini-aios
bash quickstart.sh
```

---

## Teste Rápido

Após a instalação, todos os comandos funcionam de **qualquer diretório**:

```bash
# Diagnóstico do sistema (11 checks — todos devem estar verdes)
paganini doctor

# Status do sistema
paganini status

# Lista os 9 agentes especializados
paganini agents

# Consulta com IA (responde com RAG + confiança)
paganini query "Qual o papel do administrador fiduciário em um FIDC?"

# Packs disponíveis (modelo de negócio)
paganini pack list

# Iniciar todos os serviços (dashboard + telegram + daemons)
paganini up
```

**Exemplo de resposta real (89% confiança):**

```
╭──────────────────── 📋 Resposta (89% confiança) ─────────────────────╮
│                                                                       │
│  O administrador fiduciário em um FIDC possui as seguintes            │
│  responsabilidades:                                                   │
│  • É responsável pela constituição, administração e funcionamento     │
│    do fundo, com diligência, lealdade e no melhor interesse dos       │
│    cotistas [Fonte 1].                                                │
│  • Deve monitorar DIARIAMENTE todos os covenants e reportar           │
│    qualquer desenquadramento em até 1 dia útil [Fonte 2].            │
│  • É responsável pela convocação da Assembleia de Cotistas [Fonte 4].│
│                                                                       │
╰───────────────────────────────────────────────────────────────────────╯
```

---

## O Que É

Paganini é uma **plataforma de agentes autônomos de código** — um AI Operating System que orquestra agentes especializados para executar tarefas complexas de software e operações financeiras. O core é código: code review, geração de specs, deploy pipelines, segurança, testes. A vertical FIDC é o primeiro **domain pack** construído sobre esse motor.

### Arquitetura

```
Entrada (CLI / Slack / API / Dashboard)
         │
         ▼
  🧠 Cognitive Router — classifica, roteia, estima confiança
         │
         ▼
  🤖 Swarm de Agentes — cada um com identidade, skills e escopo próprio
         │              (12 agentes de código + 9 agentes FIDC)
         ▼
  🔍 Hybrid RAG — Dense + Sparse + Graph → RRF Fusion
         │
         ▼
  🧬 MetaClaw Proxy — injeta skills aprendidos, gera novos automaticamente
         │
         ▼
  ☁️  LLM Provider (BYOK: OpenAI / Anthropic / Google / Ollama)
         │
         ▼
  🛡️  Guardrail Pipeline — 6 gates: Eligibility → Concentration →
                           Covenant → PLD/AML → Compliance → Risk
         │
         ▼
  📤 Resposta com score de confiança + trilha de auditoria completa
```

### 9 Agentes Especializados

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

---

## Modelo de Negócio — Open Core

O framework e o pack starter são **open source**. Domain packs avançados são o produto.

```bash
paganini pack list
```

| | Starter | Professional | Enterprise |
|---|:---:|:---:|:---:|
| **Preço** | **Grátis (OSS)** | R$ 8K/mês | R$ 25K/mês |
| **Agentes de código** | 12 | 12 | 12 + custom |
| **Agentes de domínio** | 3 | 9 | 9 + custom |
| **Skills** | Core | 15 (8 código + 7 domínio) | 15 + custom |
| **Guardrails** | Básico | Completo | Completo + custom |
| **Relatórios QMD** | — | 5 templates | 8 + custom |
| **LoRA / Auto-evolução** | skills_only | rl (LoRA live) | rl + opd (destilação) |
| **SLA** | Community | — | 99.9% |

---

## Diferenciais Técnicos

### 🧬 MetaClaw — Evolução Comportamental

Proxy entre o runtime e o LLM. Intercepta cada interação, injeta skills aprendidos, e gera novos automaticamente. O sistema fica mais inteligente a cada sessão — sem fine-tuning, sem GPU.

**Três modos de operação:**

| Modo | O Que Faz | Requisitos |
|------|-----------|------------|
| **skills_only** (default) | Injeção de skills + auto-geração a partir de sessões | Apenas rede. Sem GPU. |
| **rl** (opcional) | + Fine-tuning LoRA ao vivo via Tinker Cloud. Modelo PRM avalia respostas. Pesos trocados sem downtime. | Tinker API key |
| **opd** (avançado) | + Destilação teacher-student. Modelo frontier ensina modelo menor. Mesma qualidade, 1/10 do custo ao longo do tempo. | Endpoint do modelo teacher |

### 🔍 AutoResearch — Otimização de Retrieval

Pipeline RAG auto-modificável. Um LLM roda experimentos autônomos para otimizar 16 parâmetros de recuperação. Busca evolucionária, não RL.

### 🧠 Memory Reflection — Aprofundamento de Conhecimento

Daemon diário que revisa operações, extrai padrões, constrói grafo de conhecimento e promove memória episódica → semântica.

### 🛡️ Segurança por Design

- **Isolamento**: Cada agente em container próprio. Zero network por default.
- **Chinese Walls**: Dados do Fundo A nunca alcançam o Fundo B. Enforced em DB (RLS), memória, skills.
- **Guardrails**: 6 gates hard-stop. Primeiro BLOCK mata a operação.
- **Auditoria**: OpenTelemetry em cada decisão. Retenção 7 anos (CVM).

---

## Números

| Métrica | Valor |
|---------|-------|
| Módulos Python | 123 |
| Suites de teste | 18 (132 testes) |
| Linhas de código | 28.422 |
| Agentes FIDC | 9 |
| Gates de guardrail | 6 |
| Chunks indexados | 6.993 |
| Entidades no KG | 190 |
| Dependências | 87 |

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **Runtime** | Moltis v0.10.18 (Rust, binário único ~30MB) |
| **Agentes** | 9 SOULs com identidade + tools + escopo |
| **RAG** | ChromaDB + all-MiniLM-L6-v2 (local, sem API) |
| **LLM** | BYOK via LiteLLM (OpenAI / Anthropic / Google / Ollama) |
| **Guardrails** | Pipeline de 6 gates com hard-stop |
| **Observabilidade** | OpenTelemetry (traces + metrics) |
| **Dashboard** | Next.js (Vercel) — [live](https://dashboard-v2-pearl-rho.vercel.app) |

---

## Equipe

| | | | |
|:---:|:---:|:---:|:---:|
| **Rod Marques** | **João Raf** | **Louiz Ferrer** | **Mark Binder** |
| CEO | CTO | CIO | CFO |

---

<div align="center">

**[Dashboard Live](https://dashboard-v2-pearl-rho.vercel.app)** · **rod.marques@aios.finance**

<sub>Built with obsession. Shipped with discipline.</sub>

</div>
