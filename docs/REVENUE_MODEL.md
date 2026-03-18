# Paganini AIOS — Modelos de Venda e Fontes de Receita

> Documento estratégico para alinhamento interno e apresentação a investidores.
> Versão 1.0 — Março 2026

---

## Sumário Executivo

Paganini opera no modelo **Open Core**: o framework de agentes de código é gratuito e open source; a monetização vem de domain packs verticais, serviços profissionais, e licenciamento de API. O primeiro vertical de produção é o mercado brasileiro de FIDCs (R$ 8,9 trilhões em ativos sob gestão).

Este documento detalha 4 modelos de venda, 7 fontes de receita, projeções financeiras para 3 cenários, e a estratégia de go-to-market para os primeiros 24 meses.

---

## 1. Posicionamento de Mercado

### O Produto

Paganini é uma **plataforma de agentes autônomos de código** que executa tarefas de software de ponta a ponta. Sobre esse motor, verticais de domínio são instaladas como **packs**. O primeiro pack é FIDC — 9 agentes financeiros especializados, 6 guardrails regulatórios, RAG híbrido com 6.993 chunks indexados.

### O Mercado-Alvo

| Segmento | TAM Brasil | Perfil | Dor Principal |
|----------|-----------|--------|---------------|
| **Administradoras fiduciárias** | ~120 empresas | Gerenciam 50-500 fundos cada | Compliance manual, risco regulatório |
| **Gestoras de FIDC** | ~300 empresas | Análise de crédito, pricing | Decisões lentas, falta de dados em tempo real |
| **Custodiantes** | ~30 empresas | Reconciliação, registro | Processos repetitivos, erro humano |
| **Bancos com operações estruturadas** | ~50 instituições | Originação + gestão de FIDCs | Custo operacional alto por fundo |
| **Fintechs de crédito** | ~200 empresas | Usam FIDC para funding | Não têm equipe regulatória interna |

**SAM (Serviceable Addressable Market):** ~700 empresas no Brasil
**SOM (Serviceable Obtainable Market, ano 1):** 10-20 clientes

---

## 2. Modelos de Venda

### 2.1 PLG (Product-Led Growth) — Volume e Adoção Orgânica

**Filosofia:** O produto vende sozinho. O desenvolvedor/analista encontra no GitHub, instala em 60 segundos, resolve um problema real, e convence o chefe a pagar.

**Funil:**

```
GitHub / LinkedIn / Evento
         │
         ▼ (15-20% conversão)
    demo.sh — instalação em 60s
         │
         ▼ (40-50% ativação)
    Primeiro query com RAG
         │
         ▼ (30% retenção 7d)
    Uso recorrente (CLI diário)
         │
         ▼ (15-20% conversão paga)
    Upgrade para Professional
```

**Métricas-chave:**

| KPI | Target Mês 1-3 | Target Mês 6 | Target Mês 12 |
|-----|----------------|--------------|----------------|
| Instalações (demo.sh) | 50/mês | 200/mês | 500/mês |
| Ativações (1º query) | 25/mês | 100/mês | 250/mês |
| WAU (Weekly Active Users) | 10 | 40 | 100 |
| Conversão para pago | 2-3 | 8-10 | 20-25 |

**CAC:** R$ 0 (orgânico) a R$ 500 (conteúdo + ads técnicos)
**LTV médio:** R$ 96K (12 meses × R$ 8K)
**LTV/CAC:** >190x (orgânico), >192x (com conteúdo)

**Táticas PLG:**

1. **README como landing page** — roteiro de instalação + teste em 5 minutos
2. **Demo interativa no dashboard** — investidor/gestor vê o produto funcionando sem instalar
3. **Conteúdo técnico** — "Como automatizar compliance de FIDC com IA" (LinkedIn, Medium)
4. **Community** — Discord/Slack para usuários do tier grátis, suporte peer-to-peer
5. **Freemium com limite inteligente** — 3 agentes grátis, corpus limitado a 100 chunks

---

### 2.2 Enterprise Sales — Contratos de Alto Valor

**Filosofia:** Para administradoras e bancos com 20+ fundos, o valor é tão alto que justifica venda consultiva com ciclo de 3-4 meses.

**Processo de venda:**

| Etapa | Responsável | Duração | Entregável |
|-------|-------------|---------|------------|
| **Prospecção** | CEO / BD | Contínuo | Lista de 50 targets qualificados |
| **Primeiro contato** | CEO | Semana 1 | Intro via LinkedIn / evento / indicação |
| **Discovery call** | CEO + CTO | Semana 2 | Mapeamento de dor: quantos fundos, equipe, regulações |
| **Demo personalizada** | CTO | Semana 3 | Demo com dados similares ao cliente (anonimizados) |
| **Proposta de POC** | CEO | Semana 4 | Escopo: 1-2 fundos, 30 dias, métricas de sucesso |
| **POC (prova de conceito)** | CTO + Engineering | Semana 5-8 | Deploy on-prem, ingestão de corpus real, relatórios gerados |
| **Apresentação de resultados** | CEO + CTO | Semana 9 | ROI demonstrado: horas economizadas, alertas detectados, custo evitado |
| **Proposta comercial** | CEO | Semana 10 | Contrato anual, pricing por fundo |
| **Negociação jurídica** | CEO + Jurídico | Semana 11-14 | DPA, SLA, NDA, termos de compliance |
| **Assinatura** | CEO | Semana 15-16 | Contrato assinado, kickoff de implementação |

**Playbook de Discovery (perguntas-chave):**

```
1. Quantos FIDCs vocês administram/gerem hoje?
2. Quantas pessoas na equipe de compliance/operações?
3. Quanto tempo leva para gerar um relatório CADOC 3040?
4. Já tiveram alguma notificação da CVM por atraso ou inconsistência?
5. Usam alguma automação hoje? (Excel? Scripts? Nada?)
6. Como funciona o processo de aprovação de operações?
7. Qual o custo operacional por fundo por mês?
8. Dados ficam em cloud ou on-prem? Qual cloud?
9. Têm requisitos de data residency (Brasil-only)?
10. Quem é o decisor? (CTO? COO? Diretor de compliance?)
```

**Objeções comuns e respostas:**

| Objeção | Resposta |
|---------|---------|
| "IA não é confiável para decisões regulatórias" | O agente não toma decisões — ele prepara, alerta e recomenda. Humano aprova. Trilha de auditoria completa. |
| "Nossos dados são sensíveis" | Deploy on-prem. Dados nunca saem da sua infra. LLM via proxy com geo-fence Brasil. |
| "Já temos sistemas internos" | Paganini integra via API REST. Não substitui, complementa. ROI em 30 dias. |
| "É caro" | R$ 25K/mês vs. R$ 150K/mês em analistas + risco de multa CVM (R$ 500K-5M). |
| "E se a empresa fechar?" | Core é open source (Apache 2.0). Código fica com vocês. Sem lock-in. |

**Unit economics Enterprise:**

| Métrica | Valor |
|---------|-------|
| CAC | R$ 15-30K (tempo do fundador + viagem) |
| Ticket médio | R$ 25K/mês |
| ACV (Annual Contract Value) | R$ 300K |
| Ciclo de venda | 3-4 meses |
| Churn esperado | <5% anual (regulação cria lock-in natural) |
| LTV (3 anos) | R$ 900K |
| LTV/CAC | 30-60x |
| Payback do CAC | 1-2 meses |

---

### 2.3 Channel Partners — Escala via Parceiros

**Filosofia:** Parceiros que já estão dentro dos clientes-alvo vendem por nós. Nós entregamos tecnologia, eles entregam relacionamento.

**Tipos de parceiro:**

#### A. Consultorias de Compliance (Big 4 + boutiques)

| Parceiro tipo | Exemplos | Incentivo | Modelo |
|---------------|----------|-----------|--------|
| Big 4 | KPMG, Deloitte, PwC, EY | Adicionar IA ao portfólio de compliance | Revenue share 20-30% |
| Boutiques regulatórias | Vórtx, Oliveira Trust compliance | Diferencial competitivo | Revenue share 25% |

**Como funciona:**
1. Consultor identifica cliente com dor de compliance
2. Inclui Paganini como "solução tecnológica" na proposta
3. Paganini faz deploy + onboarding
4. Consultor recebe 20-30% da mensalidade enquanto o cliente estiver ativo

**Exemplo real:**
> KPMG atende 30 administradoras fiduciárias. Em projeto de adequação CVM 175, recomenda Paganini para 10 delas. 4 convertem em 6 meses. Receita: 4 × R$ 25K/mês = R$ 100K/mês. Share KPMG: R$ 25K/mês. Receita líquida Paganini: R$ 75K/mês.

#### B. Integradores de TI

| Parceiro tipo | Exemplos | Incentivo | Modelo |
|---------------|----------|-----------|--------|
| Integradores | Accenture, Capgemini, Stefanini | Projeto de implementação | Revenue share 15-20% + fee de implementação |
| Consultorias de TI | Pasquali, Visionnaire | Novo serviço para clientes financeiros | Revenue share 20% |

**Como funciona:**
1. Integrador vende projeto de "modernização de operações com IA"
2. Paganini é o engine por trás
3. Integrador cobra implementação (R$ 50-150K)
4. Paganini cobra subscription mensal (share de 15-20% para o integrador)

#### C. OEM (White Label)

| Parceiro tipo | Exemplos | Incentivo | Modelo |
|---------------|----------|-----------|--------|
| Plataformas de gestão | Britech, Quantum, Nelogica | Funcionalidade de IA nativa | OEM licensing R$ 3-5/fundo/mês |
| ERPs financeiros | Matera, Sinqia | Automação de compliance | OEM licensing |

**Como funciona:**
1. Plataforma embarca Paganini como "motor de IA" dentro do próprio produto
2. Usuário final nem sabe que é Paganini
3. Cobrança por fundo ativo: R$ 3-5/fundo/mês
4. Escala massiva: plataforma com 500 fundos = R$ 1.500-2.500/mês automático

**Meta de Channel:**

| Período | Partners ativos | Receita via channel |
|---------|----------------|-------------------|
| Mês 1-6 | 1-2 | R$ 0-25K/mês |
| Mês 7-12 | 3-5 | R$ 50-100K/mês |
| Ano 2 | 8-12 | R$ 200-400K/mês |

---

### 2.4 Land & Expand — Crescimento Interno

**Filosofia:** Entrar pequeno (1 fundo, 1 equipe) e crescer organicamente dentro do cliente. Regulação ajuda: se funciona para 1 fundo, o compliance vai querer para todos.

**Jornada típica:**

```
Mês 1-3:  LAND
├── 1 fundo piloto (Professional: R$ 8K/mês)
├── 3 agentes ativos (Compliance, Reporting, Admin)
├── 67 chunks de corpus
└── 1 usuário (analista de compliance)

Mês 4-6:  EXPAND 1 — mais fundos
├── 5 fundos (+4) (Professional: R$ 8K → Enterprise: R$ 25K/mês)
├── 9 agentes ativos (todos)
├── 500+ chunks de corpus (docs de todos os fundos)
└── 5 usuários (compliance + gestão + diretoria)

Mês 7-9:  EXPAND 2 — customização
├── Agent customizado: "Análise de Cessão" (setup: R$ 50K)
├── Integração com sistema legado via API (setup: R$ 15K)
├── Subscription: R$ 25K/mês + R$ 5K/mês API
└── 12 usuários

Mês 10-12: EXPAND 3 — enterprise
├── Rollout para outros produtos (CRI, CRA, Debêntures)
├── Dashboard executivo para diretoria
├── Subscription: R$ 35K/mês
├── Contrato anual renovado (ACV: R$ 420K)
└── 25 usuários
```

**NRR (Net Revenue Retention) target:** 150-200%

Isso significa que mesmo sem novos clientes, a receita cresce 50-100% ao ano pela expansão dos clientes existentes.

---

## 3. Fontes de Receita — Detalhamento

### 3.1 🟢 Subscription (Packs) — Receita Principal

**Modelo:** MRR (Monthly Recurring Revenue) com contrato mínimo anual para Enterprise.

| Pack | Preço | Ideal para | Inclui |
|------|-------|-----------|--------|
| **Starter** | Grátis (OSS) | Desenvolvedor, startup, avaliação | 12 code agents, 3 domain agents, corpus limitado |
| **Professional** | R$ 8.000/mês | Gestora com 1-5 fundos | 12 code + 9 domain agents, 15 skills, guardrails completo |
| **Enterprise** | R$ 25.000/mês | Administradora com 5+ fundos | Tudo do Pro + agents customizados, LoRA, SLA 99.9% |

**Precificação por fundo (modelo alternativo para Enterprise grande):**

| Faixa | Preço/fundo/mês | Exemplo |
|-------|-----------------|---------|
| 1-10 fundos | R$ 3.000 | 10 fundos = R$ 30K/mês |
| 11-30 fundos | R$ 2.500 | 30 fundos = R$ 75K/mês |
| 31-100 fundos | R$ 2.000 | 100 fundos = R$ 200K/mês |
| 100+ fundos | R$ 1.500 | 200 fundos = R$ 300K/mês |

**Desconto anual:** 15% (incentiva lock-in)

---

### 3.2 🟢 Usage-Based (Tokens) — Receita Variável

**Modelo:** Markup sobre custo de LLM. O cliente paga pelo que consome.

| Componente | Custo nosso | Preço ao cliente | Margem |
|-----------|-------------|-----------------|--------|
| Token de entrada (Gemini Pro) | R$ 0.008/1K | R$ 0.020/1K | 60% |
| Token de saída (Gemini Pro) | R$ 0.024/1K | R$ 0.060/1K | 60% |
| Embedding (local) | R$ 0 | R$ 0.005/1K | 100% |
| RAG query | R$ 0.05/query | R$ 0.15/query | 67% |

**Exemplo de consumo mensal (1 fundo ativo):**

```
Queries de compliance:     200/mês × R$ 0.15 = R$  30
Relatórios gerados:         20/mês × R$ 2.00 = R$  40
Tokens totais:           500K/mês × R$ 0.02  = R$  10
Monitoring (24/7):       contínuo              = R$  50
                                        Total = R$ 130/mês
```

**Nota:** Usage-based é complementar ao subscription, não substituto. Subscription cobre o acesso; usage cobre o consumo acima do incluído.

**Limite incluído por pack:**

| Pack | Tokens/mês incluídos | Queries/mês incluídas |
|------|---------------------|----------------------|
| Starter | 50K | 100 |
| Professional | 2M | 5.000 |
| Enterprise | 10M | Ilimitado |

---

### 3.3 🟢 Setup/Onboarding — Receita One-Time

| Serviço | Preço | Duração | Inclui |
|---------|-------|---------|--------|
| **Quick Start** | R$ 5.000 | 1 dia | Instalação, config, 1 fundo, treinamento 2h |
| **Standard Onboarding** | R$ 15.000 | 1 semana | Instalação on-prem, 3-5 fundos, corpus ingest, treinamento 8h |
| **Enterprise Onboarding** | R$ 50.000 | 2-4 semanas | On-prem + HA, todos os fundos, integrações, treinamento 20h, guardrails customizados |

**Margem:** 70-80% (custo é principalmente tempo de engenharia)

---

### 3.4 🟡 Custom Agents — Receita de Projeto

**Modelo:** Desenvolvimento sob demanda de agentes especializados para necessidades específicas do cliente.

| Agent tipo | Preço | Prazo | Exemplo |
|-----------|-------|-------|---------|
| **Simples** (1 skill, 1 fonte de dados) | R$ 15-30K | 2-3 semanas | Agent de consulta a PEPs (Pessoas Expostas Politicamente) |
| **Médio** (3-5 skills, múltiplas fontes) | R$ 30-60K | 4-6 semanas | Agent de Análise de Cessão com scoring + Serasa + SPC |
| **Complexo** (integração com sistemas legados) | R$ 60-120K | 6-10 semanas | Agent de Originação que conecta com core banking + CRM |

**IP:** Agent customizado pertence ao cliente, mas o framework/engine pertence à Paganini. Cliente pode usar, não pode revender.

**Exemplos de agents customizados com alta demanda:**

1. **Agent de Cessão de Crédito** — analisa documentação de cessão, valida lastro, calcula deságio, verifica duplicatas. Integra com registro de recebíveis (CERC, CIP).

2. **Agent de Monitoramento de Cedentes** — acompanha saúde financeira dos cedentes (CNPJ), busca protestos, ações judiciais, alterações societárias. Alerta automático se risco muda.

3. **Agent de Stress Test** — roda cenários de estresse (taxa de inadimplência +50%, taxa Selic +3pp, concentração top-5 cedentes) e reporta impacto na cota sênior.

4. **Agent de Onboarding de Fundo** — recebe regulamento em PDF, extrai cláusulas automaticamente, configura guardrails, cria corpus, ativa monitoramento. De 2 dias para 30 minutos.

5. **Agent de Reconciliação** — compara posição do custodiante com posição da gestora, identifica divergências, gera relatório com resolução sugerida.

---

### 3.5 🟡 API Licensing — Receita Recorrente via Integração

**Modelo:** Clientes e parceiros consomem funcionalidades do Paganini via API REST.

| Endpoint | Preço/call | Uso típico |
|----------|-----------|-----------|
| `/api/v1/compliance-check` | R$ 0.50 | Verificar se operação atende guardrails |
| `/api/v1/query` | R$ 0.15 | Consulta RAG sobre regulação |
| `/api/v1/report/generate` | R$ 5.00 | Gerar relatório completo (CADOC, informe) |
| `/api/v1/risk/assess` | R$ 1.00 | Score de risco de operação/cedente |
| `/api/v1/pld/screen` | R$ 2.00 | Screening PLD/AML de pessoa/empresa |

**Pacotes de API:**

| Pacote | Calls/mês | Preço | Desconto |
|--------|----------|-------|----------|
| Básico | 1.000 | R$ 500/mês | — |
| Profissional | 10.000 | R$ 3.000/mês | 40% |
| Enterprise | 100.000 | R$ 15.000/mês | 70% |
| Ilimitado | ∞ | R$ 30.000/mês | — |

**Caso de uso:**
> Fintech de crédito processa 2.000 cessões/mês. Cada cessão passa por compliance-check (R$ 0.50) + risk-assess (R$ 1.00) + pld-screen (R$ 2.00). Total: 2.000 × R$ 3.50 = R$ 7.000/mês. Com pacote Profissional: R$ 3.000/mês.

---

### 3.6 🔵 Marketplace de Skills — Receita de Plataforma

**Modelo:** Desenvolvedores terceiros criam skills especializados e vendem no marketplace. Paganini fica com 30% como plataforma.

**Exemplos de skills de terceiros:**

| Skill | Desenvolvedor | Preço | Share Paganini |
|-------|--------------|-------|----------------|
| `due-diligence-imobiliaria` | Consultoria de CRI | R$ 2.000/mês | R$ 600/mês |
| `analise-credito-agro` | Fintech agrícola | R$ 1.500/mês | R$ 450/mês |
| `compliance-bacen-pix` | Consultoria regulatória | R$ 3.000/mês | R$ 900/mês |
| `auditoria-fundo-previdencia` | Big 4 | R$ 5.000/mês | R$ 1.500/mês |
| `monitoramento-esg` | Consultoria ESG | R$ 2.500/mês | R$ 750/mês |

**Para o marketplace funcionar, precisamos:**
1. SDK de desenvolvimento de skills (documentação + templates)
2. Processo de review e certificação
3. Sandbox de teste
4. Sistema de billing e revenue share

**Timeline:** 6-12 meses para lançar. Requer base de 20+ clientes ativos primeiro.

---

### 3.7 🔵 Dados Anonimizados — Receita de Inteligência

**Modelo:** Agregar dados anonimizados de operações de todos os clientes para gerar insights de mercado.

**Produto:** "Paganini Market Intelligence" — relatório mensal/trimestral com:

| Insight | Valor para o comprador |
|---------|----------------------|
| Tempo médio de compliance por tipo de FIDC | Benchmark contra o mercado |
| Tipos de violação de covenant mais comuns | Prevenção proativa |
| Tendências de concentração de carteira | Gestão de risco setorial |
| Performance de RAG por vertical | Melhoria de processos |
| Custo operacional médio por fundo (anonimizado) | Eficiência operacional |

**Preço:** R$ 50-100K/ano por assinante (bancos, consultorias, reguladores)

**Requisitos:**
- Mínimo 50 clientes ativos para ter dados significativos
- Anonimização completa (sem CNPJ, sem nome de fundo)
- Consentimento explícito no contrato (opt-in)
- Compliance LGPD total

**Timeline:** 12-18 meses (requer base de clientes)

---

## 4. Projeções Financeiras

### Cenário Conservador

| Mês | Clientes Starter | Clientes Pro | Clientes Enterprise | MRR | Receita one-time |
|-----|-----------------|-------------|-------------------|-----|-----------------|
| 1 | 5 | 0 | 0 | R$ 0 | R$ 0 |
| 2 | 12 | 1 | 0 | R$ 8K | R$ 5K (setup) |
| 3 | 20 | 2 | 0 | R$ 16K | R$ 0 |
| 4 | 30 | 3 | 0 | R$ 24K | R$ 0 |
| 5 | 40 | 3 | 1 | R$ 49K | R$ 50K (setup Enterprise) |
| 6 | 50 | 4 | 1 | R$ 57K | R$ 0 |
| 7 | 60 | 5 | 1 | R$ 65K | R$ 30K (custom agent) |
| 8 | 70 | 5 | 2 | R$ 90K | R$ 0 |
| 9 | 80 | 6 | 2 | R$ 98K | R$ 50K (setup + custom) |
| 10 | 90 | 7 | 2 | R$ 106K | R$ 0 |
| 11 | 100 | 8 | 3 | R$ 139K | R$ 15K (API setup) |
| 12 | 110 | 9 | 3 | R$ 147K | R$ 0 |

**Resumo Ano 1 (Conservador):**
- **ARR:** R$ 1.764K (~R$ 1.8M)
- **Receita one-time:** R$ 150K
- **Receita total:** R$ 1.014K (MRR acumulado) + R$ 150K = **~R$ 1.16M**

### Cenário Moderado (com Channel Partners)

| Período | MRR | ARR | Clientes total |
|---------|-----|-----|----------------|
| Mês 6 | R$ 80K | R$ 960K | 8 pagantes |
| Mês 12 | R$ 200K | R$ 2.4M | 20 pagantes |
| Mês 18 | R$ 400K | R$ 4.8M | 40 pagantes |
| Mês 24 | R$ 700K | R$ 8.4M | 65 pagantes |

### Cenário Otimista (com OEM + Enterprise acelerado)

| Período | MRR | ARR | Clientes total |
|---------|-----|-----|----------------|
| Mês 6 | R$ 120K | R$ 1.4M | 12 pagantes |
| Mês 12 | R$ 350K | R$ 4.2M | 35 pagantes |
| Mês 18 | R$ 700K | R$ 8.4M | 70 pagantes |
| Mês 24 | R$ 1.2M | R$ 14.4M | 120 pagantes |

---

## 5. Estrutura de Custos

| Item | Custo mensal (ano 1) | % da receita |
|------|---------------------|-------------|
| **Infra (AWS/GCP)** | R$ 3-8K | 5-10% |
| **LLM APIs (custo repassado)** | R$ 5-15K | 10-15% |
| **Time de engenharia (4 pessoas)** | R$ 60K | 40-60% |
| **Vendas + BD (1 pessoa)** | R$ 15K | 10-15% |
| **Jurídico + Contabilidade** | R$ 5K | 3-5% |
| **Marketing + conteúdo** | R$ 3K | 2-3% |
| **Total** | **R$ 91-106K** | — |

**Break-even:** ~R$ 100K MRR = **mês 10-12 (conservador)** ou **mês 6-8 (moderado)**

**Margem bruta target:** 70-80% (SaaS benchmark)

---

## 6. Métricas de Sucesso (KPIs)

| Métrica | Target Mês 6 | Target Mês 12 | Benchmark SaaS |
|---------|-------------|----------------|----------------|
| **MRR** | R$ 57K | R$ 147K | — |
| **Churn mensal** | <3% | <2% | <5% |
| **NRR** | 120% | 150% | >110% |
| **CAC Payback** | <3 meses | <2 meses | <12 meses |
| **LTV/CAC** | >10x | >20x | >3x |
| **Logo churn** | <5%/ano | <5%/ano | <10%/ano |
| **NPS** | >50 | >60 | >40 |

---

## 7. Go-to-Market — Primeiros 90 Dias

### Semana 1-2: Fundação
- [ ] API REST funcional (FastAPI + endpoints core)
- [ ] Auth (JWT + RBAC: admin, gestor, auditor, viewer)
- [ ] Docker compose de produção
- [ ] Deck de vendas (10 slides)

### Semana 3-4: Primeiro pipeline
- [ ] Lista de 20 targets qualificados (administradoras + gestoras)
- [ ] 5 primeiros contatos (LinkedIn + e-mail + indicação)
- [ ] Landing page simples (paganini.ai)
- [ ] Case study simulado com dados anonimizados

### Semana 5-8: Primeiras demos
- [ ] 3-5 demos agendadas
- [ ] Demo environment com dados realistas
- [ ] Proposta de POC padronizada (template)
- [ ] Material de objeção handling

### Semana 9-12: Primeiro cliente
- [ ] 1-2 POCs em andamento
- [ ] Feedback loop implementado (NPS + feature requests)
- [ ] Primeiro contrato assinado (target)
- [ ] Case study real para próximas vendas

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Cliente não confia em IA para compliance | Alta | Alto | Humano-no-loop obrigatório. Trilha de auditoria. POC de 30 dias. |
| Regulação da CVM muda e invalida guardrails | Média | Alto | Regulatory Watch agent monitora mudanças diariamente. Update em <48h. |
| LLM provider muda preços drasticamente | Média | Médio | BYOK + suporte a múltiplos providers. Migração em horas, não semanas. |
| Competidor com mais capital entra no mercado | Média | Alto | Vantagem de first-mover + corpus específico brasileiro + código aberto. |
| Churn alto nos primeiros meses | Média | Alto | Onboarding dedicado. NPS quinzenal. Feature prioritizada por feedback. |
| Dados sensíveis vazam | Baixa | Crítico | On-prem deploy. Zero data retention. Auditoria trimestral. Seguro cyber. |

---

## 9. Competitive Moats (Vantagens Defensáveis)

| Moat | Por que é difícil de copiar |
|------|---------------------------|
| **Corpus regulatório brasileiro** | 164 documentos curados + 6.993 chunks. Leva meses para construir do zero. |
| **9 SOULs de agentes FIDC** | Cada agente tem personalidade, escopo e guardrails específicos. Não é um prompt. |
| **MetaClaw auto-evolução** | Sistema aprende com cada interação. Quanto mais usa, melhor fica. Network effect de conhecimento. |
| **Guardrail pipeline** | 6 gates hardcoded com regras CVM/BACEN. Não é configurável pelo usuário — é segurança by design. |
| **Open source community** | Efeito flywheel: mais usuários → mais contribuições → mais skills → mais valor → mais usuários. |
| **Data de mercado (futuro)** | Com 50+ clientes, teremos dados agregados que ninguém mais tem. Benchmark de compliance FIDC. |

---

*Documento gerado em Março 2026. Revisão trimestral recomendada.*
*Paganini AIOS — Built with obsession. Shipped with discipline.*
