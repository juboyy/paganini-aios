---
name: seo-geo-copy
description: >
  Specialist skill for creating high-performance content optimized for Search Engines (SEO),
  Generative Engines (GEO), Search Engine Marketing (SEM), and conversion-focused Copywriting.
  Use this skill whenever the user asks to write articles, blog posts, landing pages, ad copy,
  social media posts, product descriptions, email marketing, pitch decks text, or any content
  that needs to rank in Google, appear in AI-generated answers (ChatGPT, Perplexity, Gemini,
  Google AI Overviews), or convert readers into leads/customers. Also trigger when the user
  mentions keywords like "SEO", "GEO", "SEM", "copy", "copywriting", "otimizar conteúdo",
  "ranquear", "tráfego orgânico", "tráfego pago", "Google Ads", "palavras-chave",
  "conversão", "landing page", "CTA", "headline", "meta description", "schema markup",
  "E-E-A-T", "featured snippet", "AI search", "citação em IA", or any variation in
  Portuguese or English. Trigger even if the user doesn't explicitly mention optimization —
  if they're creating content that will be published online, this skill should be consulted.
---

# SEO + GEO + SEM + Copy — Skill de Produção de Conteúdo de Alta Performance

## Filosofia Central

Conteúdo de alta performance não é escrito para algoritmos — é escrito para humanos com uma arquitetura que algoritmos (de busca tradicional e generativa) conseguem interpretar, indexar e citar. O objetivo desta skill é produzir conteúdo que opera em três camadas simultâneas:

1. **Descoberta** — o conteúdo é encontrado (SEO + GEO)
2. **Engajamento** — o conteúdo é lido e consumido (Copywriting)
3. **Conversão** — o conteúdo gera ação (Copy + SEM)

Cada texto produzido com esta skill deve satisfazer essas três camadas, com intensidade proporcional ao objetivo do conteúdo.

---

## Workflow de Produção

Siga esta sequência para qualquer peça de conteúdo. As etapas são sempre as mesmas; o que muda é a profundidade de cada uma conforme o formato (artigo, landing page, ad copy, email, etc.).

### Etapa 1 — Briefing Estratégico

Antes de escrever uma única linha, responda estas perguntas (pergunte ao usuário se necessário):

| Dimensão | Pergunta |
|---|---|
| **Objetivo** | Qual a ação desejada? (ler, clicar, comprar, baixar, agendar) |
| **Público** | Quem é o leitor? (investidor, gestor, analista, consumidor final) |
| **Estágio do funil** | Topo (awareness), meio (consideration) ou fundo (decision)? |
| **Canal** | Onde será publicado? (blog, LinkedIn, Google Ads, email, landing page) |
| **Keyword primária** | Qual a palavra-chave principal? |
| **Keywords secundárias** | Quais termos relacionados e variações semânticas? |
| **Tom** | Institucional, técnico, conversacional, provocativo? |
| **Concorrência** | Quem já ranqueia para essa keyword? O que fazem bem/mal? |

### Etapa 2 — Pesquisa e Dados

Use WebSearch para coletar dados atualizados antes de escrever. Conteúdo embasado em dados tem 30-40% mais chance de ser citado por engines de IA (Princeton, 2024). Busque:

- Dados quantitativos recentes (2025-2026)
- Cases de empresas, startups, fintechs com aportes e exits (incluir founders)
- Dados de mercado dos players atuantes
- Estatísticas de fontes primárias (CVM, ANBIMA, Banco Central, IBGE, Bloomberg, etc.)
- Pesquisas acadêmicas ou de consultorias (McKinsey, BCG, Bain, etc.)

### Etapa 3 — Arquitetura do Conteúdo

Monte a estrutura antes de escrever. A arquitetura varia por formato — consulte o arquivo de referência apropriado:

- Para **artigos e blog posts** → leia `references/seo-onpage.md`
- Para **otimização em IA generativa** → leia `references/geo-optimization.md`
- Para **landing pages e ads** → leia `references/sem-copy.md`
- Para **copywriting e persuasão** → leia `references/copywriting-frameworks.md`

### Etapa 4 — Redação

Aplique simultaneamente as regras de SEO, GEO e Copy durante a escrita:

#### Regras de SEO On-Page (aplicar sempre)

1. **Title tag (H1)**: Keyword primária nos primeiros 60 caracteres. Usar números, power words ou brackets quando possível. Formato: `[Keyword] + [Benefício/Promessa] + [Qualificador temporal]`
2. **Meta description**: 150-160 caracteres. Incluir keyword primária + CTA implícito. Colocar no frontmatter YAML como campo `description`.
3. **URL slug**: Curto, com keyword primária, sem stop words. Exemplo: `/fidc-infra-guia-completo`
4. **Primeiras 200 palavras**: Responder diretamente à busca do usuário. AI engines avaliam relevância com base no conteúdo inicial.
5. **Heading hierarchy**: H1 único → H2 para seções principais → H3 para subseções. Cada H2/H3 deve conter variações da keyword ou keywords secundárias.
6. **Keyword density**: 1-2% para a keyword primária. Distribuir naturalmente no título, primeiro parágrafo, pelo menos 2 H2s, último parágrafo e alt text de imagens.
7. **Internal linking**: Referenciar 2-5 notas/artigos relacionados do próprio vault ou site.
8. **Parágrafos curtos**: Máximo 3-4 linhas por parágrafo. Escaneabilidade é fundamental para SEO e retenção.

#### Regras de GEO — Generative Engine Optimization (aplicar sempre)

O GEO é a camada que faz seu conteúdo ser citado por ChatGPT, Perplexity, Gemini e Google AI Overviews. Não é um substituto do SEO — é uma camada adicional.

1. **Seções autossuficientes**: Cada seção (H2+parágrafos) deve fazer sentido isoladamente. AI engines fragmentam páginas em passagens e avaliam cada uma individualmente.
2. **TL;DR por seção**: Adicionar uma frase-síntese em negrito logo após cada H2 para funcionar como resposta direta citável.
3. **Dados e estatísticas**: Incluir números específicos, percentuais e fontes. Conteúdo com estatísticas tem até 40% mais visibilidade em AI search.
4. **Citações de autoridades**: Incluir quotes de especialistas com atribuição clara (nome + cargo + empresa).
5. **FAQ estruturado**: Adicionar seção de perguntas frequentes no final. AI engines dependem fortemente de pares pergunta-resposta.
6. **Entidades nomeadas**: Mencionar explicitamente nomes de empresas, pessoas, regulações, órgãos — AI engines trabalham com entidades, não keywords genéricas.
7. **Dados frescos**: Usar dados de 2025-2026. Incluir "Atualizado em [data]" visível no conteúdo.
8. **Schema markup mental**: Estruturar o conteúdo como se fosse um JSON-LD — com definições claras, relações entre conceitos e hierarquia lógica.

#### Regras de Copywriting e Persuasão (aplicar sempre)

1. **Hook nos primeiros 10 segundos**: A primeira frase deve criar curiosidade, urgência ou identificação. Padrões eficazes: estatística surpreendente, pergunta provocativa, afirmação contraintuitiva.
2. **Estrutura PAS quando aplicável**: Problem → Agitation → Solution. Funciona especialmente bem para meio e fundo de funil.
3. **Benefícios antes de features**: Pessoas compram transformações, não características. Traduzir cada feature em benefício tangível.
4. **Power words**: Usar palavras que ativam emoção — "exclusivo", "comprovado", "estratégico", "inédito", "gratuito", "garantido", "limitado".
5. **CTAs claros e específicos**: Cada peça de conteúdo precisa de um CTA primário e, opcionalmente, um secundário. Usar verbos de ação: "Baixe", "Solicite", "Agende", "Descubra".
6. **Prova social**: Incluir dados de mercado, cases, nomes de empresas e founders que validam o argumento.
7. **Escassez e urgência**: Quando verdadeiro e aplicável, usar gatilhos de tempo e disponibilidade limitada.
8. **Tom adequado ao público**: Investidores e gestores exigem tom técnico com autoridade. Consumidores finais respondem melhor a tom conversacional com empatia.

### Etapa 5 — Frontmatter e Metadados

Todo conteúdo produzido em Markdown deve incluir frontmatter YAML otimizado:

```yaml
---
tags: [keyword-primaria, keyword-secundaria-1, keyword-secundaria-2, categoria]
date: YYYY-MM-DD
author: [Nome do Autor]
description: Meta description com 150-160 caracteres incluindo keyword primária e CTA implícito.
keywords: [keyword primária, keyword secundária 1, keyword secundária 2, long-tail 1]
canonical: URL canônica se aplicável
---
```

### Etapa 6 — Checklist de Qualidade

Antes de entregar o conteúdo, verificar cada item:

**SEO**
- [ ] Keyword primária no H1, primeiro parágrafo, pelo menos 2 H2s, último parágrafo
- [ ] Meta description com 150-160 caracteres
- [ ] Heading hierarchy correta (H1 → H2 → H3)
- [ ] Parágrafos com no máximo 3-4 linhas
- [ ] Links internos incluídos (2-5)
- [ ] Frontmatter YAML completo

**GEO**
- [ ] Seções autossuficientes (cada H2 faz sentido isolado)
- [ ] Dados e estatísticas com fonte
- [ ] FAQ incluído (mínimo 3 perguntas)
- [ ] Entidades nomeadas (empresas, pessoas, regulações)
- [ ] Conteúdo atualizado (dados 2025-2026)

**Copy**
- [ ] Hook forte na abertura
- [ ] Benefícios antes de features
- [ ] CTA claro e específico
- [ ] Prova social incluída
- [ ] Tom adequado ao público-alvo

**SEM** (quando aplicável — landing pages e ads)
- [ ] Headline com keyword + benefício principal
- [ ] Message match entre ad copy e landing page
- [ ] CTA acima da dobra
- [ ] Trust signals (dados, logos, testimonials)
- [ ] Mobile-first no design do texto

---

## Formatos e Templates

### Artigo / Blog Post (500-2000 palavras)

```
# [Keyword Primária]: [Promessa ou Benefício] [Qualificador]

[Parágrafo de abertura — hook + resposta direta à busca + contexto com dado]

## [H2 com keyword secundária ou variação semântica]
**[TL;DR da seção em 1 frase]**
[2-3 parágrafos com dados, examples, análise]

## [H2 com outra variação]
**[TL;DR]**
[2-3 parágrafos]

## [H2 — Players e Cases de Mercado]
**[TL;DR]**
[Bullets com empresas, founders, aportes, dados de mercado]

## [H2 — Conclusão / Visão Estratégica]
[Parágrafo de fechamento com CTA implícito]

## Perguntas Frequentes

### [Pergunta 1 com keyword?]
[Resposta direta em 2-3 frases]

### [Pergunta 2?]
[Resposta]

### [Pergunta 3?]
[Resposta]
```

### Landing Page Copy

```
# [Headline: Benefício Principal + Keyword]
## [Subheadline: Expansão da promessa]

[Parágrafo de dor — identificação com o problema do leitor]

### O que você ganha:
- [Benefício 1 — traduzido de feature]
- [Benefício 2]
- [Benefício 3]

### Prova Social
[Dado de mercado / quote de autoridade / case]

### [CTA Principal]
[Botão com verbo de ação + benefício: "Solicite sua Análise Gratuita"]
```

### Google Ads Copy (RSA)

```
Headlines (máx. 30 caracteres cada, 15 headlines):
H1: [Keyword exata]
H2: [Benefício principal]
H3: [Prova social curta]
H4: [CTA direto]
H5: [Diferencial competitivo]
...

Descriptions (máx. 90 caracteres cada, 4 descriptions):
D1: [Keyword + benefício + CTA]
D2: [Prova social + urgência]
D3: [Feature → benefício + CTA]
D4: [Diferencial + garantia/confiança]
```

---

## Contexto de Mercado

Esta skill opera frequentemente no contexto dos seguintes mercados (preferências do usuário):

- **Mercado Financeiro e de Capitais**: FIDCs, CRIs, CRAs, debêntures, fundos de investimento
- **Meios de Pagamento**: adquirência, subadquirência, banking as a service, Pix
- **Inteligência Artificial**: LLMs, automação, fintechs de IA, infraestrutura de dados

Quando o conteúdo se relacionar a esses mercados, buscar proativamente dados de mercado, players atuantes, startups/fintechs com aportes e exits, sempre citando founders.

---

## Referências

Para instruções detalhadas sobre cada disciplina, consulte os arquivos em `references/`:

- `references/seo-onpage.md` — SEO técnico e on-page: heading hierarchy, keyword placement, internal linking, schema markup, E-E-A-T, Core Web Vitals
- `references/geo-optimization.md` — GEO: como ser citado por ChatGPT, Perplexity, Gemini e AI Overviews, citation authority, entity optimization, content freshness
- `references/sem-copy.md` — SEM: Google Ads copy, Quality Score, landing page optimization, RSA structure, message match, bidding strategy alignment
- `references/copywriting-frameworks.md` — Frameworks de persuasão: PAS, AIDA, BAB, 4Us, storytelling, gatilhos mentais, CTA design, tom por persona
