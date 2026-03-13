# FAQ

## Geral

### Preciso de GPU?
**Não.** No modo padrão (skills_only), PAGANINI roda com qualquer API de LLM.
Nenhum processamento local pesado. Um laptop com 4GB RAM roda tranquilo.
GPU só é necessária se você optar pelo modo RL (fine-tuning via Tinker Cloud)
ou rodar um modelo local via Ollama.

### Funciona offline?
**Parcialmente.** O framework, guardrails, e memória funcionam offline.
Mas os agentes precisam de um LLM — se for via API (OpenAI, Anthropic),
precisa de internet. Se for Ollama rodando local, funciona 100% offline.

### Quanto custa rodar?
**Depende do provider e volume.** Estimativas para um FIDC médio (500 queries/mês):

| Provider | Custo estimado/mês |
|----------|-------------------|
| GPT-4o | ~R$150-300 |
| Claude Sonnet | ~R$100-250 |
| Gemini Flash | ~R$30-80 |
| Ollama (local) | R$0 (só energia) |

O custo do PAGANINI é a licença do domain pack. O LLM é BYOK — você paga direto ao provider.

### Funciona com qualquer LLM?
**Sim.** Qualquer API OpenAI-compatible. OpenAI, Anthropic, Google, Mistral,
Groq, Together, Ollama, vLLM, SGLang, LM Studio, Jan — tudo funciona.

### Posso usar com modelo local (on-premise)?
**Sim.** Configure Ollama ou vLLM como provider. Dados nunca saem da sua infra.
Ideal para fundos com requisitos rígidos de data residency.

---

## Técnico

### Como o MetaClaw aprende sem fine-tuning?
MetaClaw intercepta conversas e gera "skills" — arquivos markdown com instruções
contextuais. Na próxima interação similar, essas skills são injetadas no prompt
do LLM. É prompt engineering automatizado e acumulativo. O modelo não muda —
o contexto melhora.

### O que acontece se uma skill gerada estiver errada?
Toda skill auto-gerada passa por validação antes de ativar:
1. Contradiz o corpus? → Rejeitada
2. Contradiz regulamento CVM? → Rejeitada
3. Conflita com skill existente? → Quarentena
4. Genérica demais? → Rejeitada

Skills rejeitadas vão para quarentena para revisão humana.

### Como funciona o AutoResearch?
O AutoResearch modifica o código do pipeline de RAG automaticamente.
Ele testa diferentes configurações (tamanho de chunk, modelo de embedding,
pesos de fusão) contra um eval set fixo de 50-100 perguntas com respostas
esperadas. Se a mudança melhorou o score: mantém. Se piorou: reverte.
É evolução, não RL.

### Os dados de um fundo podem vazar para outro?
**Não.** Isolamento em 5 camadas:
1. **Database**: Row Level Security por fund_id
2. **Memória**: Particionada por fundo
3. **MetaClaw**: Skills isoladas por instância
4. **Traces**: fund_id em cada span
5. **Containers**: Network isolation total

### Posso auditar todas as decisões do sistema?
**Sim.** OpenTelemetry traces em cada ação. Cada decisão registra:
- Gate token (prova de due diligence)
- Skills ativas no momento
- Chunks de contexto usados
- Confidence score
- Timestamp + fund_id + agent_id

Retenção: 7 anos (requisito CVM). Append-only. Imutável.

### Como faço backup?
```bash
paganini backup                    # Full backup (config + memory + skills)
paganini backup --fund alpha       # Backup de um fundo específico
paganini backup --schedule daily   # Backup automático diário
```

---

## Negócios

### Qual a diferença entre open source e pago?
**Open source (gratuito):** Framework completo — engine, CLI, agent framework,
RAG pipeline, guardrail engine, memory API. Você pode construir qualquer coisa.

**Pago (domain packs):** Inteligência de domínio — corpus FIDC (164 docs curados),
skills financeiras pré-treinadas, templates de relatórios regulatórios,
guardrails CVM 175 configurados. Economiza meses de trabalho.

### Preciso pagar para testar?
**Não.** O framework vem com sample data sintético. Você pode testar toda a
arquitetura — agentes, RAG, guardrails, MetaClaw — sem comprar o domain pack.
O pack adiciona profundidade de domínio, não funcionalidade.

### Vocês armazenam meus dados?
**Não.** PAGANINI roda na sua infra. Seus dados nunca saem do seu ambiente.
As API keys do LLM são BYOK — passam direto pro provider, nunca passam por nós.
Nenhum dado é usado para treinamento por ninguém.

### Posso customizar os agentes?
**Sim.** Cada agente é um arquivo SOUL (markdown). Edite a personalidade,
constraints, tools autorizados, tom de comunicação. Crie novos agentes
com `paganini skill create`. Sem limites.
