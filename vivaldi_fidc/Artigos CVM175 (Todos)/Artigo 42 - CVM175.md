
## **Art. 42º - Vedação à Aquisição de Créditos de Partes Relacionadas**

> Art. 42. É vedada a aquisição de direitos creditórios originados ou cedidos pelo administrador, gestor, consultoria especializada ou partes a eles relacionadas. § 1º O regulamento pode afastar a vedação prevista no caput, desde que: I – o gestor, a entidade registradora e o custodiante dos direitos creditórios não sejam partes relacionadas entre si; e II – a entidade registradora e o custodiante não sejam partes relacionadas ao originador ou cedente. 157
> 
> § 2º O disposto no inciso I do §1º deste artigo não se aplica à classe exclusivamente destinada a investidores profissionais.

### **Nota Explicativa Detalhada**

A cota mezanino é a classe intermediária de risco e retorno em um FIDC. Ela funciona como uma "segunda camada" de proteção para as cotas seniores, absorvendo perdas somente após o esgotamento completo do valor das cotas subordinadas. Em troca desse risco moderado, sua rentabilidade esperada é superior à das cotas seniores, mas inferior à das cotas subordinadas.

**Posição na Cascata de Pagamentos:**

1. **Recebimento de Juros:** Recebe juros somente após o pagamento integral dos juros das cotas seniores.
2. **Amortização do Principal:** Recebe o principal somente após o pagamento integral do principal das cotas seniores.
3. **Absorção de Perdas:** Absorve perdas somente após o esgotamento completo do patrimônio das cotas subordinadas.

> Art. 42. É vedada a aquisição de direitos creditórios originados ou cedidos pelo administrador, gestor, consultoria especializada ou partes a eles relacionadas. § 1º O regulamento pode afastar a vedação prevista no caput, desde que: I – o gestor, a entidade registradora e o custodiante dos direitos creditórios não sejam partes relacionadas entre si; e II – a entidade registradora e o custodiante não sejam partes relacionadas ao originador ou cedente...

**Nota Explicativa:**

Esta é uma proteção contra conflitos de interesse. Em regra, o FIDC não pode comprar créditos de empresas ligadas ao gestor ou administrador. A exceção só é permitida se houver segregação total de funções (gestor, custodiante e registradora independentes entre si e do cedente).

**Exemplo Prático:**

Um banco é gestor de um FIDC. Em regra, esse FIDC não pode comprar duplicatas originadas pelo próprio banco. A exceção só seria permitida se:

- O custodiante não fosse ligado ao banco
- A registradora não fosse ligada ao banco
- Houvesse aprovação dos cotistas

**Oportunidades e Desafios:**

**Oportunidade:** Reduz riscos de "self-dealing" (operações em benefício próprio).

**Desafio:** Limita estratégias onde o originador também é o gestor (comum em FIDCs de bancos).

### **Aprofundamento: "Skin in the Game" como Mecanismo de Alinhamento**

O Artigo 42 introduz um dos mecanismos de alinhamento de interesses mais poderosos e modernos na indústria de securitização: a **retenção de risco**. Ele permite que o regulamento do FIDC exija que o originador da carteira (que muitas vezes é o próprio cedente) mantenha uma participação no fundo, ou seja, que ele também seja um cotista. A ideia é forçar o originador a ter **"skin in the game"** (pele em jogo). Ao se tornar um cotista, o originador não está mais apenas vendendo um problema para o FIDC e "lavando as mãos"; ele agora é um sócio no risco. Se a carteira que ele originou performar mal, ele também sofrerá as perdas, assim como os demais investidores.

Esta exigência de retenção de risco ataca diretamente o problema do **risco moral** (_moral hazard_), que foi uma das principais causas da crise financeira de 2008. Naquela época, os bancos originavam hipotecas de baixa qualidade (_subprime_) e as vendiam imediatamente para veículos de securitização, sem reter nenhum risco. Como eles não ficavam com o "abacaxi" na mão, não tinham nenhum incentivo para fazer uma análise de crédito rigorosa. A retenção de risco muda completamente esse incentivo. Sabendo que uma parte de seu próprio capital está investida no FIDC, o originador será muito mais criterioso na qualidade dos créditos que ele origina e cede para o fundo.

As formas mais comuns de retenção de risco são:

1. **Cota Subordinada:** A forma mais comum e eficaz. O originador subscreve a cota subordinada do FIDC. Como esta cota é a primeira a absorver as perdas, o alinhamento de interesses é máximo.
2. **Retenção Vertical:** O originador retém uma porcentagem (ex: 5%) de cada classe de cota emitida pelo FIDC (sênior, mezanino, subordinada). Assim, ele compartilha o risco de forma proporcional com os demais investidores.
3. **Retenção Horizontal:** O originador se compromete a arcar com as primeiras perdas da carteira até um determinado montante, mesmo que não subscreva formalmente uma cota subordinada.

O percentual de retenção exigido varia, mas regras internacionais como a da Basileia e a do Dodd-Frank Act nos EUA costumam girar em torno de 5% do valor total da emissão.

### **Visão Aprofundada dos Prestadores de Serviço**

|Prestador|Papel e Interação com o Art. 42|
|---|---|
|**Gestora**|**Negociadora e Estruturadora da Retenção:** O gestor é quem negocia com o originador a estrutura e o percentual de retenção de risco. Para o gestor, a retenção de risco pelo originador é um forte selo de qualidade da carteira. Se um originador se recusa a reter risco, é um grande sinal de alerta para o gestor, pois pode indicar que o próprio originador não confia na qualidade dos ativos que está vendendo. O gestor, então, incorpora a estrutura de retenção no regulamento do fundo.|
|**Administradora (DTVM)**|**Fiscalizadora da Manutenção do Risco:** A administradora fiscaliza se o originador está efetivamente mantendo a retenção de risco ao longo do tempo. Por exemplo, se o originador subscreveu a cota subordinada, a administradora deve garantir que ele não a venda no mercado secundário no dia seguinte, o que anularia o propósito da retenção. O regulamento do fundo geralmente estabelece um período de _lock-up_ (proibição de venda) para a cota retida pelo originador.|
|**Custodiante**|**Verificador da Subscrição:** O custodiante verifica se a subscrição da cota pelo originador foi de fato realizada e se os recursos foram integralizados. Ele registra o originador como um dos cotistas do fundo em seus sistemas.|

### **Análise de Riscos e Violações**

|Risco|Descrição Detalhada|Exemplo de Violação e Consequência|
|---|---|---|
|**Risco de Retenção Sintética**|O originador cumpre a regra no papel, mas utiliza derivativos ou outros instrumentos para, na prática, transferir o risco que ele deveria reter para um terceiro.|**Violação:** O originador subscreve 5% da cota subordinada, mas, ao mesmo tempo, compra um CDS (_Credit Default Swap_) de um banco de investimento que o protege de qualquer perda naquela cota. **Consequência:** O alinhamento de interesses é anulado. Esta é uma violação de difícil detecção, mas se descoberta, a CVM pode considerar uma fraude e aplicar sanções severas ao originador e, possivelmente, ao gestor por não ter identificado a estrutura sintética.|
|**Risco de Não-Chamada de Capital**|Em uma estrutura de retenção horizontal, o originador se compromete a cobrir as primeiras perdas, mas quando as perdas ocorrem, ele não tem caixa para honrar o compromisso.|**Violação:** Um FIDC tem uma cláusula de que o originador cobrirá os primeiros R$ 10 milhões de perdas. A carteira sofre uma perda de R$ 12 milhões. O FIDC "chama" o originador para depositar os R$ 10 milhões, mas ele está insolvente. **Consequência:** A retenção de risco se prova inútil. O fundo tem que arcar com a totalidade da perda. Isso mostra que a qualidade da retenção de risco depende da saúde financeira de quem a provê.|
|**Risco de Venda Antecipada**|O originador vende sua participação retida antes do prazo de _lock-up_ estabelecido no regulamento, eliminando o "skin in the game".|**Violação:** O regulamento estabelece um _lock-up_ de 2 anos para a cota subordinada do originador. Após 6 meses, o originador vende a cota para um fundo de _distressed assets_ no mercado de balcão. **Consequência:** A administradora, ao identificar a transferência de titularidade, deve bloqueá-la e reportar a violação ao gestor e à CVM. O originador pode ser multado por quebra de contrato.|

### **Case Real: A Crise do Subprime e a Origem da Retenção de Risco**

O melhor "case" para entender a importância do Art. 42 é a própria crise financeira global de 2008. O epicentro da crise foi o mercado de hipotecas _subprime_ nos Estados Unidos.

- **O Modelo "Originar para Distribuir":** Os bancos e as financeiras imobiliárias adotaram um modelo de negócio chamado "originar para distribuir". Eles concediam empréstimos imobiliários para pessoas com baixa qualidade de crédito (os _subprime borrowers_), muitas vezes sem a devida análise de risco, pois sabiam que não ficariam com aquele risco em seu balanço. Imediatamente após a originação, eles empacotavam milhares desses empréstimos em veículos de securitização (os famosos CDOs - _Collateralized Debt Obligations_) e os vendiam para investidores no mundo todo (fundos de pensão, seguradoras, etc.).
- **A Ausência de "Skin in the Game":** O problema fundamental era a total ausência de retenção de risco. O originador do crédito não tinha nenhum "skin in the game". Sua receita vinha da taxa de originação de novos empréstimos, e não da performance de longo prazo desses empréstimos. O incentivo era puramente para gerar volume, e não qualidade.
- **As Consequências:** Quando a bolha imobiliária estourou e os devedores _subprime_ começaram a dar calote em massa, os CDOs, que eram vendidos como investimentos seguros (com rating AAA), se revelaram verdadeiros "lixos tóxicos". As perdas se espalharam pelo sistema financeiro global, levando à quebra de grandes bancos como o Lehman Brothers e causando a pior recessão desde a Grande Depressão de 1929.
- **A Resposta Regulatória:** Em resposta à crise, os reguladores do mundo todo implementaram novas regras para o mercado de securitização. A mais importante delas foi a exigência de retenção de risco. Nos EUA, a lei Dodd-Frank (Seção 941) passou a exigir que os originadores de créditos securitizados retenham, no mínimo, 5% do risco de crédito dos ativos que eles vendem. O Artigo 42 da norma da CVM, embora mais flexível (ele permite que o regulamento exija a retenção, mas não a torna obrigatória em todos os casos), é um reflexo direto dessa lição aprendida a duras penas na crise de 2008. Ele dá ao gestor e aos investidores uma ferramenta poderosa para garantir que o originador esteja no mesmo barco que eles.