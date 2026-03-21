# SEO On-Page — Referência Técnica Completa

## Índice
1. Heading Hierarchy e Estrutura
2. Keyword Placement Strategy
3. E-E-A-T Signals
4. Schema Markup e Structured Data
5. Core Web Vitals e Performance
6. Internal Linking Strategy
7. Content Freshness e Updates
8. Checklist Técnico Final

---

## 1. Heading Hierarchy e Estrutura

A hierarquia de headings é o esqueleto semântico do conteúdo. Search engines e AI engines interpretam a estrutura H1-H6 como um mapa de relevância.

**Regras fundamentais:**

- **H1**: Um único por página. Conter keyword primária nos primeiros 60 caracteres. Este é o título mais importante e define o tema central da página.
- **H2**: Seções principais (3-8 por artigo). Cada H2 deve abordar um subtópico distinto e conter a keyword primária ou uma variação semântica. Pensar em cada H2 como uma potencial resposta independente para uma busca.
- **H3**: Subseções dentro de H2 (2-4 por H2 quando necessário). Usar para detalhar aspectos específicos. Keywords secundárias ou long-tails entram aqui.
- **H4-H6**: Usar com moderação. Úteis para listas técnicas ou documentação densa.

**Padrão de nomenclatura para headings:**

| Tipo | Formato | Exemplo |
|---|---|---|
| Informacional | O que é [Keyword] | O que é FIDC-Infra |
| How-to | Como [ação] + [Keyword] | Como Investir em FIDCs de Infraestrutura |
| Listicle | [Número] + [Keyword] + [qualificador] | 7 Vantagens dos FIDCs para Investidores PF |
| Comparação | [A] vs [B]: [perspectiva] | FIDC vs CRI: Qual Rende Mais em 2026? |
| Dados | [Keyword]: Dados e Tendências [ano] | Mercado de FIDCs: Dados e Tendências 2026 |

---

## 2. Keyword Placement Strategy

A distribuição da keyword deve parecer natural. Se ao ler em voz alta o texto soa forçado, redistribuir.

**Posições obrigatórias para keyword primária:**
1. Title tag (H1) — preferencialmente no início
2. Primeiro parágrafo — idealmente na primeira frase
3. Pelo menos 2 headings H2
4. Último parágrafo (conclusão)
5. Meta description
6. URL slug
7. Alt text da primeira imagem (se houver)
8. Frontmatter YAML (campo `tags` e `keywords`)

**Keyword density ideal:** 1-2% para keyword primária. Verificar contando ocorrências e dividindo pelo total de palavras. Abaixo de 0.5% = subotimizado. Acima de 3% = keyword stuffing (prejudicial).

**Variações semânticas (LSI keywords):**
Usar sinônimos, variações e termos relacionados naturalmente. Exemplo para "FIDC-Infra":
- Fundo de Investimento em Direitos Creditórios de Infraestrutura
- FIDC de infraestrutura
- fundo de crédito para infraestrutura
- securitização de recebíveis de infraestrutura
- financiamento de projetos prioritários

**Long-tail keywords:**
Identificar perguntas reais que o público faz. Ferramentas: Google "People Also Ask", Answer the Public, Google Trends, Semrush, Ahrefs. Exemplos:
- "FIDC-Infra é isento de IR?"
- "como investir em FIDC de infraestrutura"
- "diferença entre FIDC-Infra e debênture incentivada"

---

## 3. E-E-A-T Signals

E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) é o framework do Google para avaliar qualidade de conteúdo. É especialmente crítico para conteúdo YMYL (Your Money or Your Life) — e todo conteúdo financeiro é YMYL.

**Experience (Experiência):**
- Demonstrar vivência prática no tema. Incluir observações de primeira mão, análises proprietárias, cases reais.
- Usar linguagem que reflete experiência: "Na prática...", "Nos últimos 5 anos observamos...", "Em nossa experiência com mais de X operações..."

**Expertise (Especialização):**
- Autor com bio completa: nome, cargo, credenciais, links para LinkedIn/perfis profissionais
- Citações de fontes primárias: regulações (CVM, BACEN), dados de mercado (ANBIMA, B3), estudos acadêmicos
- Profundidade técnica adequada ao público — não simplificar demais conteúdo para audiência especialista

**Authoritativeness (Autoridade):**
- Backlinks de fontes reconhecidas
- Menções em veículos especializados
- Dados exclusivos ou análises originais que outros citam
- Participação em eventos do setor

**Trustworthiness (Confiabilidade):**
- Transparência: dizer quem escreveu, quando, com que fontes
- Disclaimers quando necessário ("Este conteúdo não constitui recomendação de investimento")
- Dados verificáveis com link para fonte original
- HTTPS, política de privacidade, informações de contato da empresa

---

## 4. Schema Markup e Structured Data

Schema markup ajuda search engines a interpretar o conteúdo de forma estruturada. Páginas com structured data recebem 30% mais cliques (BrightEdge, 2025).

**Schemas prioritários para conteúdo financeiro/técnico:**

**Article Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Título do artigo",
  "author": {
    "@type": "Person",
    "name": "Nome do Autor",
    "url": "URL do perfil"
  },
  "datePublished": "2026-03-09",
  "dateModified": "2026-03-09",
  "publisher": {
    "@type": "Organization",
    "name": "Nome da Empresa"
  }
}
```

**FAQ Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Pergunta aqui?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Resposta aqui."
      }
    }
  ]
}
```

**HowTo, Product, FinancialProduct** — usar quando aplicável ao tipo de conteúdo.

Para conteúdo em Markdown (Obsidian, blogs estáticos), o schema é aplicado pelo CMS ou SSG. O importante é que a estrutura do Markdown reflita a lógica do schema: headings claros, pares pergunta-resposta explícitos, metadados no frontmatter.

---

## 5. Core Web Vitals e Performance

Estes são sinais técnicos que impactam ranking. Quando o conteúdo está em Markdown/Obsidian, muitos são responsabilidade do CMS, mas o redator pode influenciar:

- **Tamanho do conteúdo**: Textos muito longos sem formatação adequada aumentam LCP. Usar headings, listas e espaçamento.
- **Imagens**: Sempre especificar alt text descritivo com keyword. Recomendar formatos WebP ou AVIF.
- **Lazy loading**: Para conteúdo com muitas imagens, recomendar carregamento sob demanda.
- **Fontes e assets**: Minimizar dependências externas.

---

## 6. Internal Linking Strategy

Links internos distribuem autoridade (link equity) e ajudam engines a descobrir e indexar conteúdo relacionado.

**Regras de internal linking:**
- Incluir 2-5 links internos por artigo de 500-1000 palavras
- 5-10 links para artigos de 1000-2000 palavras
- Anchor text descritivo e variado (não usar "clique aqui")
- Linkar para conteúdo hierarquicamente próximo (cluster de tópicos)
- Páginas pilar (pillar pages) devem receber mais links internos
- Conteúdo novo deve linkar para conteúdo existente E ser linkado por conteúdo existente

**No contexto de Obsidian:**
Usar `[[wikilinks]]` para criar rede de links entre notas. Isso cria automaticamente o grafo de conhecimento que reflete uma topic cluster strategy.

---

## 7. Content Freshness e Updates

Google e AI engines priorizam conteúdo atualizado, especialmente para queries time-sensitive.

- Incluir data de publicação e "Última atualização" visíveis
- Atualizar dados e estatísticas pelo menos 2x por ano
- Adicionar novos cases e examples conforme surgem
- Revisar links quebrados trimestralmente
- Expandir seções que ganham tração (dados do Google Search Console)

---

## 8. Checklist Técnico Final

Antes de publicar, verificar:

- [ ] H1 único com keyword primária
- [ ] Meta description 150-160 chars com keyword e CTA
- [ ] URL slug limpa e curta
- [ ] Keyword primária nas 7 posições obrigatórias
- [ ] Keyword density entre 1-2%
- [ ] 3+ variações semânticas distribuídas no texto
- [ ] Heading hierarchy correta (H1→H2→H3)
- [ ] 2-5+ links internos com anchor text descritivo
- [ ] Frontmatter YAML completo (tags, date, author, description, keywords)
- [ ] Autor identificado com bio/credenciais
- [ ] Fontes citadas e verificáveis
- [ ] Data de publicação e atualização visíveis
- [ ] Alt text em todas as imagens
- [ ] Parágrafos com no máximo 3-4 linhas
- [ ] FAQ section com mínimo 3 perguntas
