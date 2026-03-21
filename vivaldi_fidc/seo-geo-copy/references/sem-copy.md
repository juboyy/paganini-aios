# SEM — Search Engine Marketing — Referência Completa

## Índice
1. Quality Score e Seus Componentes
2. Estrutura de Campanha e Ad Groups
3. Ad Copy para Responsive Search Ads (RSA)
4. Landing Page Optimization
5. Message Match
6. Extensões de Anúncio
7. Métricas e Benchmarks
8. Checklist SEM

---

## 1. Quality Score e Seus Componentes

Quality Score é a nota de 1-10 que o Google dá a cada keyword com base na qualidade do seu anúncio + landing page. Impacta diretamente o CPC e a posição do anúncio.

**Componentes (por peso aproximado):**

| Componente | Peso | O que avalia |
|---|---|---|
| Landing Page Experience | ~39% | Relevância, velocidade, mobile, conteúdo |
| Expected CTR | ~39% | Probabilidade do anúncio ser clicado |
| Ad Relevance | ~22% | Alinhamento entre keyword, ad copy e intenção |

**Impacto financeiro:**
- Quality Score 5 → QS 8 = redução de 37% no CPC
- Anúncios com "Above average" em landing page + ad relevance têm CPC 36% abaixo da média
- QS 7+ é considerado bom. Abaixo de 5, revisar urgentemente.

---

## 2. Estrutura de Campanha e Ad Groups

A estrutura do account impacta relevância e Quality Score.

**Princípios:**
- Cada ad group deve conter 2-3 keywords tematicamente próximas
- Cada ad group tem seus próprios anúncios e landing page dedicada
- SKAGs puros estão obsoletos, mas agrupamentos temáticos apertados continuam eficazes
- Separar campaigns por intenção: branded, non-branded, competitor
- Separar por estágio de funil: awareness (broad), consideration (phrase), decision (exact)

**Exemplo para FIDCs:**
```
Campaign: FIDC - Non-Branded
├── Ad Group: FIDC Infraestrutura
│   ├── Keywords: fidc infra, fidc infraestrutura, fundo infraestrutura
│   ├── Ads: 3 RSAs focados em FIDC-Infra
│   └── Landing Page: /fidc-infra
├── Ad Group: FIDC Isento IR
│   ├── Keywords: fidc isento ir, fundo investimento isento
│   ├── Ads: 3 RSAs focados em isenção fiscal
│   └── Landing Page: /fidc-isencao-ir
└── Ad Group: Investir FIDC
    ├── Keywords: como investir fidc, investir em fidc
    ├── Ads: 3 RSAs focados em processo de investimento
    └── Landing Page: /como-investir-fidc
```

---

## 3. Ad Copy para Responsive Search Ads (RSA)

RSAs são o formato padrão do Google Ads. Você fornece múltiplos headlines e descriptions; o Google combina automaticamente.

**Estrutura RSA:**
- Até 15 headlines (máx. 30 caracteres cada)
- Até 4 descriptions (máx. 90 caracteres cada)
- Google mostra combinações de 3 headlines + 2 descriptions

**Estratégia de headlines:**

| Slot | Função | Exemplo (FIDC-Infra) |
|---|---|---|
| H1-H3 | Keyword exata + variações | "FIDC de Infraestrutura" / "FIDC-Infra" |
| H4-H6 | Benefício principal | "Isento de IR para PF" / "Rentabilidade + Isenção" |
| H7-H9 | Prova social / autoridade | "R$ 820 Bi sob Gestão" / "+500 Fundos Ativos" |
| H10-H12 | CTA / urgência | "Invista Agora" / "Solicite Análise Grátis" |
| H13-H15 | Diferencial / confiança | "Regulado pela CVM" / "Desde 2015 no Mercado" |

**Estratégia de descriptions:**

| Slot | Função | Exemplo |
|---|---|---|
| D1 | Keyword + benefício + CTA | "Invista em FIDCs de Infraestrutura com isenção de IR. Solicite sua análise gratuita." |
| D2 | Prova social + dado | "Mais de R$ 820 bilhões sob gestão no mercado de FIDCs. Saiba por que investidores escolhem esse ativo." |
| D3 | Feature → benefício | "Lastro real em rodovias, energia e saneamento. Rentabilidade sólida com governança CVM." |
| D4 | Diferencial + garantia | "Gestão profissional por administradores fiduciários regulados. Transparência total em relatórios." |

**Regras de copy para ads:**
- Cada headline deve fazer sentido sozinho E em combinação com outros
- Não repetir a mesma informação em headlines diferentes
- Usar números quando possível ("R$ 820 Bi", "+500 Fundos", "15% a.a.")
- CTAs com verbos de ação: Invista, Solicite, Descubra, Compare, Simule
- Pinnar headlines críticos (keyword em H1, CTA em H3) quando necessário
- Testar pelo menos 3 RSAs por ad group

---

## 4. Landing Page Optimization

A landing page é onde a conversão acontece. É também o maior componente do Quality Score.

**Princípios fundamentais:**

### Above the fold (primeiros 600px visíveis):
1. **Headline**: Keyword + benefício principal. Deve ecoar o ad copy.
2. **Subheadline**: Expandir a promessa em 1 frase
3. **Hero image ou visual**: Relevante, profissional, não genérico
4. **CTA primário**: Botão visível com ação clara
5. **Trust signal**: Logo, selo, dado de credibilidade

### Below the fold:
6. **Problema**: Identificar a dor do visitante (1-2 parágrafos)
7. **Solução**: Como seu produto/serviço resolve (features → benefícios)
8. **Prova social**: Cases, dados de mercado, logos de clientes, testimonials
9. **FAQ**: 3-5 objeções comuns respondidas
10. **CTA secundário**: Repetir CTA com variação de copy

### Performance técnica:
- Load time < 3 segundos (Google recomenda)
- 1s de delay em mobile = -20% conversões
- Mobile-first (60%+ do tráfego de search é mobile)
- HTTPS obrigatório
- Sem pop-ups intrusivos nos primeiros 5 segundos

---

## 5. Message Match

Message match é o alinhamento entre a keyword buscada → ad copy → landing page. É o fator mais subestimado do Quality Score e da taxa de conversão.

**Princípio**: O visitante que buscou "FIDC isento de IR" e clicou num anúncio sobre "FIDC Isento de IR" deve chegar numa landing page onde o headline diz algo sobre FIDCs e isenção de IR. Qualquer desconexão nessa cadeia aumenta bounce rate e reduz QS.

**Regras:**
- A keyword deve aparecer no headline da landing page (ou variação muito próxima)
- A promessa do ad (ex: "Análise Gratuita") deve estar visível above the fold
- Se o ad menciona um dado ("R$ 820 bi sob gestão"), a landing page deve contê-lo
- Cada ad group deve ter sua landing page dedicada (ou pelo menos variação dinâmica)

---

## 6. Extensões de Anúncio (Assets)

Extensões aumentam o espaço do anúncio e CTR sem custo adicional por clique.

| Extensão | Uso | Exemplo |
|---|---|---|
| Sitelinks | Direcionar para páginas específicas | "O que é FIDC" / "Simulador" / "Cases" |
| Callouts | Highlights curtos sem link | "Isento de IR" / "Regulado CVM" / "Desde 2015" |
| Structured Snippets | Lista de categorias | Tipos: "FIDC-Infra, FIDC Multicedente, FIDC NP" |
| Call | Número de telefone | Para campanhas de conversão direta |
| Image | Imagem ao lado do anúncio | Gráfico, logo, visual do produto |
| Price | Preços/valores | "A partir de R$ 1.000" / "Taxa: 1.5% a.a." |

---

## 7. Métricas e Benchmarks

**Métricas primárias:**

| Métrica | Benchmark Bom (B2B Fintech) | O que indica |
|---|---|---|
| CTR | > 3.5% (search) | Relevância do ad copy |
| Quality Score | ≥ 7 | Qualidade geral keyword/ad/LP |
| CPC | Varia por keyword | Eficiência de custo |
| Conversion Rate | > 3% (landing page) | Eficácia da LP |
| CPA | < LTV/3 | Sustentabilidade |
| ROAS | > 300% | Retorno sobre investimento |

**Métricas de diagnóstico:**
- Bounce rate da LP: < 40% (ideal)
- Time on page: > 60 segundos
- Scroll depth: > 50%
- Form completion rate: > 15%

---

## 8. Checklist SEM

**Ad Copy:**
- [ ] Keyword primária em pelo menos 3 headlines
- [ ] Benefício principal em pelo menos 2 headlines
- [ ] CTA em pelo menos 2 headlines
- [ ] Prova social em pelo menos 1 headline
- [ ] Descriptions com keyword + benefício + CTA
- [ ] Nenhuma repetição de informação entre headlines
- [ ] Headlines fazem sentido em qualquer combinação
- [ ] 3+ RSAs por ad group

**Landing Page:**
- [ ] Headline com keyword + benefício (message match)
- [ ] CTA primário above the fold
- [ ] Trust signals visíveis
- [ ] Load time < 3 segundos
- [ ] Mobile-optimized
- [ ] FAQ com objeções comuns
- [ ] Sem pop-ups intrusivos
- [ ] HTTPS ativo

**Estrutura:**
- [ ] Ad groups com 2-3 keywords temáticas
- [ ] Landing page dedicada por ad group
- [ ] Extensões configuradas (sitelinks, callouts, structured snippets)
- [ ] Negative keywords configuradas
- [ ] Conversão tracking ativo
