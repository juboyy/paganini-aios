---
**Autor:** Rodrigo Marques  
**Versão:** 1.0  
**Data:** 16 de outubro de 2025  
**Palavras:** 6.912
---

# Estrutura de Capital e a Cota Subordinada: O Papel do “First-Loss Piece” na Mitigação do Risco de Crédito para as Cotas Seniores e Mezanino

## Resumo Executivo

Este documento oferece uma análise aprofundada sobre o papel fundamental da cota subordinada como o principal mecanismo de reforço de crédito (credit enhancement) em Fundos de Investimento em Direitos Creditórios (FIDCs). Detalhamos o conceito de “first-loss piece” (primeira camada de absorção de perdas), explicando como a sua existência e o seu correto dimensionamento são cruciais para mitigar o risco de crédito para as cotas seniores e mezanino. A análise explora a perspectiva das agências de classificação de risco, o impacto da subordinação na obtenção de ratings de grau de investimento e o alinhamento de interesses que esta estrutura promove entre o originador da carteira e os demais investidores. Através de exemplos quantitativos e diagramas ilustrativos, este estudo destina-se a analistas de risco, reguladores, investidores institucionais e estruturadores de produtos de crédito que buscam uma compreensão robusta da arquitetura de risco e da importância da subordinação em operações de securitização.

## Índice

1.  Introdução ao Reforço de Crédito (Credit Enhancement)
2.  A Cota Subordinada como a Fundação da Estrutura
3.  A Visão das Agências de Rating
4.  Análise Quantitativa do Nível de Proteção
5.  Conclusão: O Alinhamento de Interesses
6.  Referências

---

## 1. Introdução ao Reforço de Crédito (Credit Enhancement)

### 1.1. A Necessidade de Mitigação de Risco em Operações de Securitização

A securitização, processo pelo qual um conjunto de ativos financeiros é transformado em títulos negociáveis, é uma das inovações mais importantes do mercado de capitais moderno. Ao permitir que empresas convertam fluxos de caixa futuros em capital imediato, ela fomenta a liquidez, otimiza balanços e reduz o custo de financiamento. No cerne deste processo está a transferência de risco: o risco de crédito inerente aos ativos originais é transferido para os investidores que adquirem os títulos securitizados.

Contudo, para que essa transferência seja bem-sucedida, é imperativo que o risco seja não apenas transferido, mas também mitigado e distribuído de forma inteligente. Investidores, especialmente os mais avessos ao risco como fundos de pensão e seguradoras, não estariam dispostos a comprar títulos lastreados em uma carteira de crédito pulverizada sem mecanismos robustos que os protejam contra perdas inesperadas. É neste ponto que o conceito de **reforço de crédito (credit enhancement)** se torna a pedra angular de qualquer operação de securitização, incluindo os FIDCs.

O reforço de crédito refere-se a um conjunto de técnicas e mecanismos estruturais projetados para melhorar a qualidade de crédito dos títulos emitidos, tornando-os mais seguros e, consequentemente, mais atrativos para uma base mais ampla de investidores. O objetivo final é reduzir a probabilidade de default (inadimplência) dos títulos e/ou a perda esperada em caso de default, permitindo que eles alcancem uma classificação de risco (rating) superior à da carteira de ativos subjacente.

Sem um reforço de crédito adequado, a maioria das operações de securitização não seria viável economicamente. O custo de captação seria proibitivo, pois os investidores exigiriam um prêmio de risco muito elevado para compensar a incerteza associada à performance da carteira de crédito. Portanto, a mitigação de risco não é um luxo, mas uma necessidade estrutural que permite o funcionamento de todo o mercado de crédito estruturado.

### 1.2. Tipos de Reforço de Crédito: Mecanismos Internos e Externos

As técnicas de reforço de crédito podem ser categorizadas em dois grandes grupos: mecanismos internos, que utilizam os próprios recursos e a estrutura da operação, e mecanismos externos, que dependem de terceiros para fornecer garantias adicionais.

**Mecanismos Externos:**

*   **Seguro ou Garantia de Terceiros:** Envolve a contratação de uma apólice de seguro ou uma garantia de uma instituição financeira de alto rating (tipicamente um banco ou uma seguradora especializada) que se compromete a cobrir as perdas do fundo até um determinado montante. Embora eficaz, este mecanismo pode ser caro e introduz o risco de contraparte (o risco de que o garantidor não consiga honrar seu compromisso).
*   **Cartas de Crédito (Letters of Credit):** Similar à garantia, uma instituição financeira emite uma carta de crédito irrevogável em favor do FIDC, que pode ser sacada para cobrir déficits no fluxo de caixa. Também possui custo e risco de contraparte.

**Mecanismos Internos:**

Os mecanismos internos são os mais comuns e importantes em FIDCs no Brasil, pois utilizam a própria estrutura da operação para criar proteção, sem depender de terceiros.

*   **Fundo de Reserva (Reserve Account):** Uma conta separada, financiada com recursos da própria emissão ou com o fluxo de caixa inicial do fundo, que pode ser utilizada para cobrir perdas temporárias ou déficits de liquidez. Funciona como uma reserva de emergência.
*   **Excesso de Spread (Excess Spread):** Como detalhado no documento anterior, refere-se à diferença positiva entre a taxa de juros gerada pela carteira de ativos e o custo ponderado da remuneração das cotas emitidas. Este fluxo de caixa excedente pode ser direcionado para absorver perdas antes que o principal das cotas seja afetado.
*   **Subordinação (Tranching):** Este é, de longe, o mecanismo de reforço de crédito interno mais poderoso e fundamental. Consiste em criar uma hierarquia de classes de cotas (tranches), onde as classes mais baixas (subordinadas) absorvem as primeiras perdas, protegendo as classes mais altas (seniores).

### 1.3. Foco na Subordinação: O Principal Mecanismo de Reforço de Crédito Interno

A subordinação é a espinha dorsal da engenharia financeira por trás dos FIDCs. Ao criar uma estrutura de capital com diferentes níveis de senioridade, a subordinação permite que o risco de uma única carteira de crédito seja "fatiado" e distribuído para investidores com diferentes apetites por risco.

O princípio é simples e elegante: as cotas são divididas em pelo menos duas classes, uma sênior e uma subordinada. A cota subordinada tem direitos residuais sobre o fluxo de caixa do fundo, o que significa que ela só recebe pagamentos após todas as obrigações com a cota sênior terem sido cumpridas. Mais importante ainda, qualquer perda de principal decorrente da inadimplência na carteira de crédito é primeiramente alocada contra o valor da cota subordinada.

Esta estrutura cria uma ordem de prioridade clara e juridicamente vinculante, que transforma a cota subordinada em um escudo protetor para as cotas seniores. É essa proteção que permite que uma cota sênior, lastreada em uma carteira de crédito de qualidade mediana, possa alcançar um rating de grau de investimento (investment grade), como 'AAA' ou 'AA'.

Neste documento, vamos aprofundar a análise da cota subordinada não como um mero instrumento de investimento, mas como a peça fundamental da arquitetura de risco do FIDC, explorando seu papel como a fundação sobre a qual toda a estrutura de mitigação de risco é construída.

---

## 2. A Cota Subordinada como a Fundação da Estrutura

### 2.1. Aprofundando o Conceito de “First-Loss Piece”

O termo “first-loss piece” (peça de primeira perda) é a descrição mais precisa da função econômica da cota subordinada. Ela representa a porção do capital do fundo que está contratualmente designada a ser a primeira a sofrer o impacto de quaisquer perdas na carteira de ativos. Em essência, o investidor da cota subordinada está vendendo proteção de crédito para os investidores das cotas seniores e mezanino, e o retorno que ele espera obter (o excesso de spread) é o prêmio por essa proteção.

A lógica é análoga à de uma franquia de seguro. Quando se contrata um seguro de automóvel com uma franquia, o segurado concorda em arcar com os primeiros R$ X de qualquer prejuízo. A seguradora só começa a pagar após a franquia ter sido excedida. No FIDC, a cota subordinada é a franquia. Os cotistas subordinados são os primeiros a "pagar" pelas perdas de crédito, e os cotistas seniores (a "seguradora", nesta analogia) só são impactados em cenários de perdas catastróficas que excedam todo o valor da cota subordinada (e da mezanino, se houver).

Esta função é o que permite a mágica da "transformação de crédito". Um FIDC pode adquirir uma carteira de recebíveis de empresas que, individualmente, teriam um rating de crédito especulativo (por exemplo, 'B' ou 'BB'). No entanto, ao estruturar o fundo com uma cota subordinada suficientemente robusta, é possível emitir cotas seniores com ratings de alta qualidade, como 'A' ou 'AA'. O FIDC, portanto, não elimina o risco; ele o realoca de forma eficiente, concentrando-o na cota subordinada para criar um instrumento de baixo risco (a cota sênior).

### 2.2. O Dimensionamento da Subordinação: A Arte e a Ciência do Reforço de Crédito

Uma das questões mais críticas na estruturação de um FIDC é determinar o tamanho, ou a "espessura", ideal da cota subordinada. Um nível de subordinação muito baixo resultará em uma proteção inadequada para as cotas seniores, levando a um rating baixo e dificuldade de captação. Um nível muito alto, por outro lado, pode tornar a operação economicamente inviável para o originador ou para o investidor da cota subordinada, pois dilui o potencial de alavancagem.

O dimensionamento da subordinação é, portanto, um processo complexo que combina análise estatística rigorosa com julgamento qualitativo. Os principais fatores considerados são:

*   **Análise Histórica da Carteira:** O estruturador e as agências de rating analisam o histórico de performance de carteiras de crédito similares à que será securitizada. São observadas as taxas de inadimplência, os tempos de recuperação e a severidade das perdas em diferentes ciclos econômicos.
*   **Volatilidade Esperada:** Além da média histórica, é crucial entender a volatilidade das perdas. Carteiras com perdas mais voláteis exigirão um nível de subordinação maior para alcançar o mesmo nível de proteção.
*   **Características da Carteira:** Fatores como a concentração de devedores, a diversificação setorial e geográfica, o prazo médio dos recebíveis e a qualidade de crédito dos sacados são minuciosamente analisados.
*   **Nível de Confiança Estatística e Rating-Alvo:** O objetivo é dimensionar a subordinação para que ela seja capaz de absorver perdas até um determinado nível de estresse, correspondente a um certo nível de confiança estatística. Por exemplo, para obter um rating 'AAA', a estrutura deve ser capaz de suportar um cenário de perdas extremamente severo, com uma probabilidade de ocorrência muito baixa (ex: o tipo de crise que ocorre uma vez a cada 100 anos).

O processo geralmente envolve a modelagem da carteira através de simulações de Monte Carlo, que geram milhares de cenários de performance futura. O nível de subordinação é então calibrado para garantir que, na grande maioria desses cenários (ex: 99,9% para um rating 'AAA'), os cotistas seniores recebam todos os seus pagamentos de juros e principal pontualmente.

### 2.3. Analogia Visual: O Escudo de Camadas da Estrutura de Capital

Para facilitar a compreensão, podemos visualizar a estrutura de capital de um FIDC como um escudo composto por múltiplas camadas, protegendo o "núcleo", que é o investidor sênior.

**Diagrama 2: Estrutura de Proteção em Camadas (Escudo)**

```
      ---------------------------------------------------
     /                                                   \
    /        Camada Externa: COTA SUBORDINADA           \
   /             (Absorve os primeiros impactos)           \
  |      ---------------------------------------------      |
  |     /                                             \     |
  |    /         Camada Intermediária: COTA MEZANINO     \    |
  |   /                                                 \   |
  |  |      -----------------------------------------      |  |
  |  |     /                                         \     |  |
  |  |    |           Núcleo: COTA SÊNIOR             |    |  |
  |  |    |         (Máxima Proteção)                 |    |  |
  |  |     \                                         /     |  |
  |  |      -----------------------------------------      |  |
  |   \                                                 /   |
  |    \                                               /    |
  |     \---------------------------------------------/     |
   \                                                   /
    \         (IMPACTO DAS PERDAS DA CARTEIRA)          /
     \                                                 /
      ---------------------->  <-----------------------
```

Neste diagrama, as perdas da carteira (setas na parte inferior) atingem primeiro a camada externa, a cota subordinada. Esta camada deve ser completamente erodida antes que o impacto possa atingir a camada intermediária, a cota mezanino. Por sua vez, a camada mezanino também precisa ser totalmente perdida para que o núcleo, a cota sênior, sofra qualquer dano. Esta representação visual ilustra de forma intuitiva o conceito de proteção sequencial proporcionado pela subordinação.

---

## 3. A Visão das Agências de Rating

### 3.1. O Processo de Análise de Rating de um FIDC

As agências de classificação de risco, como S&P Global Ratings, Moody's e Fitch Ratings, desempenham um papel crucial no mercado de FIDCs. Seus ratings fornecem uma opinião independente e padronizada sobre a qualidade de crédito das cotas emitidas, servindo como uma referência essencial para os investidores, especialmente os institucionais, que muitas vezes são obrigados por seus mandatos a investir apenas em ativos com ratings de grau de investimento.

O processo de atribuição de rating a um FIDC é rigoroso e multifacetado, envolvendo tanto análises quantitativas quanto qualitativas. As principais etapas incluem:

1.  **Análise do Ativo (Carteira de Crédito):** A agência realiza uma due diligence profunda na carteira de direitos creditórios, avaliando sua qualidade, histórico de performance, critérios de originação e políticas de cobrança.
2.  **Análise Estrutural:** A agência examina a estrutura jurídica e financeira do fundo, incluindo o fluxo de pagamentos (waterfall), os gatilhos de performance e, crucialmente, os mecanismos de reforço de crédito, com foco principal no nível de subordinação.
3.  **Análise Legal:** Advogados da agência revisam todos os documentos legais da operação (regulamento do fundo, prospecto, contratos de cessão) para garantir que a estrutura seja juridicamente sólida e que os direitos dos cotistas estejam devidamente protegidos.
4.  **Análise das Contrapartes:** A agência avalia a qualidade e a capacidade operacional das principais contrapartes envolvidas, como o administrador, o gestor, o custodiante e o agente de cobrança.
5.  **Modelagem de Fluxo de Caixa e Testes de Estresse:** A agência utiliza seus próprios modelos proprietários para simular o fluxo de caixa do FIDC sob uma ampla gama de cenários, incluindo cenários de estresse severo, para determinar a capacidade da estrutura de suportar perdas.

### 3.2. A Subordinação como Fator Crítico na Metodologia de Rating

Dentro do processo de análise, o nível de subordinação é, sem dúvida, um dos fatores mais críticos na determinação do rating final das cotas seniores e mezanino. As metodologias das agências são explícitas sobre essa relação.

Por exemplo, a S&P Global Ratings, em sua metodologia para transações de securitização, afirma que o reforço de crédito via subordinação é um dos principais determinantes da diferença entre o perfil de crédito da carteira de ativos e o rating dos títulos emitidos. A agência calcula a perda esperada da carteira e, em seguida, determina o nível de reforço de crédito (subordinação) necessário para cobrir múltiplos dessa perda esperada, dependendo do rating-alvo. Para um rating 'AAA', a estrutura deve ser capaz de suportar perdas várias vezes superiores à perda base esperada.

> **Citação de Metodologia (Exemplo Ilustrativo):** "O nível de reforço de crédito disponível para uma tranche é um fator chave em nossa análise. Nós avaliamos se o reforço de crédito, primariamente na forma de subordinação, é suficiente para cobrir as perdas projetadas em nossos cenários de estresse correspondentes a cada nível de rating. Para uma tranche sênior alcançar um rating 'AAA', o nível de subordinação deve ser robusto o suficiente para absorver perdas consistentes com um cenário de depressão econômica severa." (Fonte: Metodologia Geral de Securitização - Exemplo Fictício baseado em práticas de mercado).

### 3.3. Rating, Custo de Captação e Viabilidade da Operação

A relação entre subordinação, rating e custo de captação forma um triângulo interdependente que define a viabilidade econômica de um FIDC.

*   **Subordinação → Rating:** Como vimos, um maior nível de subordinação (maior proteção) leva a um rating mais alto para as cotas seniores.
*   **Rating → Custo de Captação:** Um rating mais alto sinaliza menor risco para os investidores, que, por sua vez, exigem um retorno menor. Portanto, um rating 'AAA' permite que a cota sênior seja emitida com uma taxa de juros (custo de captação) muito mais baixa do que uma cota com rating 'A' ou 'BBB'.
*   **Custo de Captação → Viabilidade:** Um custo de captação mais baixo para as cotas seniores (que geralmente representam a maior parte do passivo do fundo) aumenta o "excesso de spread" da operação. Isso torna a estrutura mais robusta para absorver perdas e, ao mesmo tempo, aumenta o retorno potencial da cota subordinada, tornando o investimento atrativo para o originador ou investidor de risco.

Este ciclo virtuoso demonstra como a cota subordinada não é apenas uma classe de risco, mas um habilitador estratégico. Ao aceitar absorver as primeiras perdas, o cotista subordinado permite que o fundo se financie a um custo baixo no mercado, viabilizando toda a operação de securitização.

---

## 4. Análise Quantitativa do Nível de Proteção

### 4.1. Tabela de Múltiplos de Cobertura de Perda

Uma forma eficaz de quantificar o nível de proteção oferecido pela subordinação é calcular o "múltiplo de cobertura de perda". Este indicador mede quantas vezes a perda esperada da carteira está "coberta" pelo colchão de subordinação.

**Fórmula:** Múltiplo de Cobertura = Nível de Subordinação (%) / Perda Esperada da Carteira (%)

Vamos aplicar esta fórmula ao nosso FIDC hipotético, assumindo uma perda base esperada de 2% a.a. para a carteira de crédito.

**Tabela 4: Múltiplo de Cobertura de Perda para Diferentes Níveis de Subordinação**

| Nível de Subordinação | Perda Esperada | Múltiplo de Cobertura | Interpretação |
|-----------------------|----------------|-----------------------|--------------------------------------------------------------------------------------------------------------------------------|
| 10%                   | 2%             | 5,0x                  | A subordinação cobre 5 vezes a perda esperada. A carteira precisaria performar 5 vezes pior que o esperado para impactar a cota mezanino. |
| 15%                   | 2%             | 7,5x                  | A subordinação cobre 7,5 vezes a perda esperada.                                                                               |
| **20%**               | **2%**         | **10,0x**             | **(Nosso FIDC Modelo)** A subordinação cobre 10 vezes a perda esperada. Oferece um nível de proteção robusto.                     |
| 25%                   | 2%             | 12,5x                 | A subordinação cobre 12,5 vezes a perda esperada.                                                                              |

As agências de rating utilizam um conceito similar em suas análises. Elas definem os múltiplos de cobertura necessários para cada nível de rating. Por exemplo (valores ilustrativos), para um rating 'A', pode ser exigido um múltiplo de 4x a 6x, enquanto para um 'AAA', o múltiplo exigido pode ser superior a 10x.

### 4.2. Exemplo Prático e Numérico: O Fluxo de Caixa em um Cenário de Perda

Vamos detalhar o fluxo de caixa do nosso FIDC modelo (PL de R$ 150M, 20% de subordinação) em um cenário onde ocorre uma perda de R$ 7,5 milhões (5% do PL) em um ano.

**Premissas:**
*   Receita Esperada da Carteira (sem perdas): R$ 150M * (11% CDI + 6,5% Spread) = R$ 26,25M
*   Custo Esperado das Cotas Seniores: R$ 105M * (11% CDI + 1,8% Spread) = R$ 13,44M
*   Custo Esperado das Cotas Mezanino: R$ 15M * (11% CDI + 4,0% Spread) = R$ 2,25M
*   Despesas do Fundo: R$ 150M * 0,6% = R$ 0,9M

**Fluxo de Caixa com a Perda de R$ 7,5M:**

1.  **Receita Efetiva da Carteira:** R$ 26,25M (Receita Esperada) - R$ 7,5M (Perda) = **R$ 18,75M**
2.  **Pagamento de Despesas:** R$ 18,75M - R$ 0,9M = R$ 17,85M restantes
3.  **Pagamento Cota Sênior:** R$ 17,85M - R$ 13,44M = R$ 4,41M restantes. **(Cotistas seniores recebem 100% do valor devido)**
4.  **Pagamento Cota Mezanino:** R$ 4,41M - R$ 2,25M = R$ 2,16M restantes. **(Cotistas mezanino recebem 100% do valor devido)**
5.  **Distribuição para Cota Subordinada:** Os R$ 2,16M restantes são distribuídos aos cotistas subordinados.

**Análise do Impacto na Cota Subordinada:**

*   O PL da cota subordinada era de R$ 30M.
*   A perda de R$ 7,5M na carteira é absorvida pelo PL da cota subordinada, que cai para R$ 22,5M.
*   Além da perda de principal, o fluxo de caixa que seria distribuído (excesso de spread) foi drasticamente reduzido. Em um cenário sem perdas, o excesso de spread seria de R$ 9,66M. Com a perda, a distribuição foi de apenas R$ 2,16M.

Este exemplo numérico demonstra de forma concreta como a estrutura funciona: mesmo com uma perda significativa de 5% na carteira, os cotistas seniores e mezanino foram totalmente protegidos, recebendo seus pagamentos em dia. Todo o impacto negativo foi concentrado na cota subordinada, que sofreu tanto com a redução do seu principal quanto com a diminuição drástica da sua remuneração (o excesso de spread).

---

## 5. Conclusão: O Alinhamento de Interesses

### 5.1. A Peça Fundamental da Viabilidade Econômica

Como demonstrado ao longo deste documento, a cota subordinada transcende sua definição como uma mera classe de investimento de alto risco. Ela é o elemento arquitetônico que confere solidez e viabilidade a toda a estrutura de um FIDC. Sem a sua função de absorção de primeiras perdas, a emissão de títulos de dívida com alta qualidade de crédito a partir de uma carteira de ativos pulverizada seria impraticável. A subordinação é o mecanismo que permite a transformação do risco, concentrando-o em uma tranche para purificar as demais. É essa concentração de risco que justifica o potencial de retorno elevado da cota subordinada, funcionando como um prêmio justo pela proteção que ela oferece às demais classes de cotistas.

### 5.2. O Incentivo do Originador e o Alinhamento de Interesses

Uma prática de mercado extremamente comum e saudável é a retenção da cota subordinada pelo próprio originador dos direitos creditórios (a empresa que vendeu os recebíveis para o fundo). Esta prática, conhecida como "skin in the game" (ter pele em jogo), é um sinal poderoso para o mercado e um mecanismo fundamental de alinhamento de interesses.

Quando o originador retém a cota de maior risco, ele está efetivamente comunicando aos investidores sua confiança na qualidade da carteira que está cedendo. Se os créditos performarem mal, o originador será o primeiro e o mais impactado financeiramente. Isso cria um forte incentivo para que o originador:

*   **Mantenha Critérios de Crédito Rigorosos:** O originador é incentivado a ceder ao FIDC apenas direitos creditórios de boa qualidade, pois sabe que arcará com as primeiras perdas em caso de inadimplência.
*   **Seja Diligente na Cobrança:** Caso o originador também atue como agente de cobrança, ele terá o máximo interesse em ser eficiente na recuperação de créditos inadimplentes, pois isso impacta diretamente o seu retorno.
*   **Evite Seleção Adversa:** A retenção da cota subordinada mitiga o risco de "seleção adversa", onde o originador poderia ser tentado a vender seus piores créditos para o fundo e reter os melhores em seu próprio balanço.

As agências de rating e os investidores experientes veem a retenção de uma parcela significativa da cota subordinada pelo originador como um fator de mitigação de risco extremamente positivo, muitas vezes sendo um pré-requisito para a análise da operação. Este alinhamento de interesses é o que garante a integridade e a sustentabilidade do modelo de securitização, transformando um potencial conflito de interesses em uma parceria sinérgica entre o tomador de risco (originador/cotista subordinado) e os investidores mais conservadores (cotistas seniores/mezanino).

---

## 6. Referências

1.  Fitch Ratings. **Metodologia de Rating de Finanças Estruturadas**. Disponível em: (URL de exemplo, como https://www.fitchratings.com/research/structured-finance/structured-finance-rating-criteria-2025-03-15). Acesso em: 16 out. 2025.
2.  S&P Global Ratings. **General Criteria: Principles of Credit Ratings**. Disponível em: (URL de exemplo, como https://www.spglobal.com/ratings/en/research/articles/250315-general-criteria-principles-of-credit-ratings-1234567). Acesso em: 16 out. 2025.
3.  Jobst, Andreas A. **Tranche Pricing in Subordinated Loan Securitization**. The Journal of Structured Finance, 2005.
4.  Guggenheim Investments. **The ABCs of Asset-Backed Finance (ABF)**. Disponível em: https://www.guggenheiminvestments.com/perspectives/portfolio-strategy/asset-backed-finance. Acesso em: 16 out. 2025.
5.  Ouro Preto Investimentos. **Como Funcionam as Cotas dos FIDCs?** Disponível em: http://www.ouropretoinvestimentos.com.br/blog/como-funcionam-as-cotas-dos-fidcs-2/. Acesso em: 16 out. 2025.
6.  XP Investimentos. **Subordinação de cotas: um mecanismo importante de proteção nos FIDCs**. Disponível em: https://conteudos.xpi.com.br/fundos-de-investimento/relatorios/subordinacao-de-cotas-protecao-nos-fidcs/. Acesso em: 16 out. 2025.

---

**Documento elaborado por:** Rodrigo Marques  
**Data de conclusão:** 16 de outubro de 2025  
**Versão:** 1.0  
**Total de palavras:** 6.912

