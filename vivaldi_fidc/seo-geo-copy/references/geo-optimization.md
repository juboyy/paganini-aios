# GEO — Generative Engine Optimization — Referência Completa

## Índice
1. O que é GEO e Por que Importa
2. Como AI Engines Processam Conteúdo
3. Estratégias de Otimização para Citação em IA
4. Entity Optimization
5. Citation Authority
6. Plataformas e Seus Comportamentos
7. Métricas de GEO
8. Checklist GEO

---

## 1. O que é GEO e Por que Importa

GEO é a prática de posicionar conteúdo e marca para que plataformas de IA (Google AI Overviews, ChatGPT, Perplexity, Gemini, Copilot) citem, recomendem ou mencionem seu conteúdo quando usuários fazem buscas conversacionais.

**Contexto de mercado (2025-2026):**
- 50% dos consumidores já usam AI search como canal primário de pesquisa (McKinsey, Out/2025)
- LLM traffic deve ultrapassar Google search tradicional até fim de 2027 (Semrush)
- 71% dos americanos usam AI search para pesquisar compras e avaliar marcas
- Apenas 16% das marcas medem performance em AI search — oportunidade massiva para early movers

GEO não substitui SEO. É uma camada adicional. Marcas fortes em GEO são tipicamente as mesmas com fundação sólida de SEO.

---

## 2. Como AI Engines Processam Conteúdo

Entender o mecanismo ajuda a otimizar com precisão:

1. **Fragmentação**: AI engines quebram páginas em passagens individuais (chunks). Cada passagem é avaliada isoladamente por relevância, clareza e densidade factual.

2. **Retrieval**: Para queries, o sistema busca as passagens mais relevantes entre milhões de fontes. As primeiras 200 palavras de qualquer página têm peso desproporcional nesta avaliação.

3. **Síntese**: O modelo combina informações de múltiplas fontes para compor uma resposta. Conteúdo que é facilmente "recortável" — frases completas, dados precisos, definições claras — tem vantagem.

4. **Citação**: O modelo atribui trechos a fontes. Fatores que aumentam citação: autoridade da fonte, dados específicos, unicidade da informação, clareza da afirmação.

---

## 3. Estratégias de Otimização para Citação em IA

### 3.1 — Seções Autossuficientes
Cada seção H2 + seus parágrafos devem funcionar como uma unidade independente. Se alguém ler apenas aquela seção, deve entender o ponto completo.

**Como fazer:**
- Começar cada seção com uma afirmação direta e completa
- Incluir contexto mínimo necessário dentro da própria seção
- Evitar referências como "conforme mencionado acima" — AI engines não leem sequencialmente

### 3.2 — TL;DR por Seção
Adicionar uma frase-síntese em negrito logo após cada H2. Esta frase é o "snippet citável" — a unidade mínima que um AI engine pode extrair e usar como resposta.

**Formato:**
```markdown
## Incentivos Fiscais do FIDC-Infra
**Investidores pessoa física são isentos de IR sobre rendimentos de FIDCs de infraestrutura, com alíquotas reduzidas também para PJ.**

[Parágrafos de desenvolvimento...]
```

### 3.3 — Dados e Estatísticas
Conteúdo com estatísticas específicas tem até 40% mais visibilidade em AI search (Princeton, 2024).

**Boas práticas:**
- Números específicos > ranges vagos. "R$ 820 bilhões" > "centenas de bilhões"
- Incluir fonte e ano junto ao dado: "... cresceu 47% em 2025 (ANBIMA)"
- Dados comparativos são especialmente citáveis: "enquanto FIPs cresceram 42%, FIDCs dobraram"
- Preferir dados primários (CVM, ANBIMA, BACEN) sobre dados secundários

### 3.4 — Citações de Autoridades
Quotes atribuídas a especialistas reconhecidos aumentam credibilidade e são citadas por AI engines.

**Formato:**
```markdown
"O futuro dos FIDCs é de sofisticação e diversificação", afirma [Nome], [Cargo] da [Empresa].
```

### 3.5 — FAQ Estruturado
AI engines usam pares pergunta-resposta como fonte direta de respostas. A seção FAQ é uma das mais impactantes para GEO.

**Regras:**
- Mínimo 3 perguntas, ideal 5-7
- Perguntas devem refletir buscas reais (People Also Ask, autocomplete)
- Respostas diretas na primeira frase, depois expandir
- Cada resposta: 2-4 frases. Concisa mas completa.

### 3.6 — Conteúdo Original e Pesquisa Proprietária
Pesquisas originais, dados exclusivos e frameworks proprietários são as maiores armas de GEO. Se você publica algo que ninguém mais tem, AI engines precisam citar você.

**Exemplos de conteúdo original de alto valor GEO:**
- Análises proprietárias de mercado com dados exclusivos
- Frameworks e metodologias com nome próprio
- Pesquisas com amostragem real
- Benchmarks de indústria
- Modelagens e simulações com resultados publicados

---

## 4. Entity Optimization

AI engines trabalham com entidades (pessoas, empresas, conceitos, regulações) mais do que com keywords genéricas.

**Estratégias:**
- Mencionar explicitamente: nomes de empresas, founders, regulações (CVM 175, Lei 12.431/11), órgãos (CVM, ANBIMA, BACEN, B3)
- Manter consistência na nomenclatura ao longo do texto
- Conectar entidades entre si: "A Empírica Investimentos, gestora com R$ 9 bilhões sob gestão, estruturou o primeiro FIDC do Nubank em 2016"
- Usar sameAs em schemas quando possível (LinkedIn, Wikipedia, sites oficiais)

---

## 5. Citation Authority

Citation authority é para GEO o que backlinks são para SEO. É a medida de quão confiável uma fonte é para AI engines citarem.

**Fatores que constroem citation authority:**
1. **Earned media**: Menções em veículos especializados (Valor Econômico, NeoFeed, Finsiders, InfoMoney)
2. **Consistência temática**: Publicar regularmente sobre o mesmo tema (topic authority)
3. **Presença multiplataforma**: Conteúdo em blog + LinkedIn + YouTube + Reddit + Quora
4. **Reviews e menções**: G2, Capterra, Reclame Aqui, Trustpilot
5. **Dados exclusivos**: Publicar pesquisas que outros citam
6. **PR e thought leadership**: Artigos assinados, palestras, podcasts

---

## 6. Plataformas e Seus Comportamentos

| Plataforma | Como funciona | O que prioriza |
|---|---|---|
| **Google AI Overviews** | Integrado ao SERP, puxa do index do Google | Sites que já ranqueiam + structured data + freshness |
| **ChatGPT (com browsing)** | Busca em tempo real via Bing | Conteúdo recente + autoridade + dados citáveis |
| **Perplexity** | RAG com múltiplas fontes + citação explícita | Dados específicos + fontes verificáveis + conteúdo recente |
| **Gemini** | Index do Google + Knowledge Graph | Entidades bem definidas + schema markup + E-E-A-T |
| **Copilot** | Bing index + RAG | Similar a ChatGPT com peso adicional em conteúdo técnico |

---

## 7. Métricas de GEO

Medir GEO ainda é um desafio. Métricas a acompanhar:

- **AI citation frequency**: Quantas vezes sua marca aparece em respostas de IA (ferramentas: Otterly.ai, Profound, Brand24 AI)
- **Share of Voice em AI**: Suas menções vs concorrentes
- **Traffic from AI referrals**: Tráfego vindo de chat.openai.com, perplexity.ai, etc. (Google Analytics 4)
- **Brand query volume**: Aumento em buscas de marca (indicador indireto de citações em IA)
- **Featured snippet ownership**: Snippets tradicionais frequentemente alimentam AI Overviews

---

## 8. Checklist GEO

- [ ] Cada seção H2 funciona isoladamente como resposta completa
- [ ] TL;DR em negrito após cada H2
- [ ] Mínimo 3 dados/estatísticas com fonte e ano
- [ ] Mínimo 1 citação de autoridade com atribuição
- [ ] FAQ com 3-7 perguntas reais
- [ ] Entidades nomeadas: empresas, pessoas, regulações, órgãos
- [ ] Dados de 2025-2026 (freshness)
- [ ] "Atualizado em [data]" visível
- [ ] Conteúdo original ou insight proprietário incluído
- [ ] Primeiras 200 palavras respondem diretamente à busca principal
