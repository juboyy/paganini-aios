
### **Art. 8º - Emissão de Cotas**

> Art. 8º As cotas seniores devem ser emitidas em uma única subclasse. § 1º As cotas seniores e subordinadas mezanino de classe fechada podem ser emitidas em séries com índices referenciais diferentes e prazos diferenciados para amortização, permanecendo inalterados os demais direitos e obrigações. § 2º É vedada a existência de subordinação entre diferentes subclasses de cotas subordinadas, sem prejuízo da possibilidade de o Regulamento estabelecer outras diferenciações entre direitos econômicos e políticos para as referidas subclasses, nos termos do art. 3º deste Anexo Normativo II. § 3º O Regulamento deve estabelecer a forma como as obrigações das cotas subordinadas serão cumpridas pelas diferentes subclasses de cotas subordinadas, se houver.  Art. 8º com redação dada pela Resolução CVM nº 187, de 27 de setembro de 2023.

> Art. 8º As cotas seniores devem ser emitidas em uma única subclasse. § 2º É vedada a existência de subordinação entre diferentes subclasses de cotas subordinadas...

**Nota Explicativa:**

A Resolução 175 simplifica a estrutura de capital ao determinar:

1. **Uma única subclasse de cotas sênior** - Evita confusão e garante que todas as cotas sênior tenham o mesmo nível de proteção.
2. **Múltiplas subclasses mezanino e subordinadas são permitidas**, mas não pode haver subordinação entre as próprias cotas subordinadas.

**Exemplo Prático:**

**Estrutura permitida:**

- Cotas Sênior (única subclasse)
- Cotas Mezanino A
- Cotas Mezanino B
- Cotas Subordinadas (podem ter diferentes direitos econômicos, mas todas no mesmo nível de subordinação)

**Estrutura NÃO permitida:**

- Cotas Sênior A
- Cotas Sênior B (não pode ter duas subclasses sênior)
- Cotas Subordinadas A (primeira a absorver perdas)
- Cotas Subordinadas B (segunda a absorver perdas - isso é vedado)

**Oportunidades e Desafios:**

**Oportunidade:** A simplificação facilita a compreensão do investidor.

**Desafio:** Limita a criatividade na estruturação de produtos mais complexos.

### **Art. 9º - Valor da Cota na Emissão**

> Art. 9º. Na emissão de cotas de classe aberta deve ser utilizado o valor da cota em vigor no próprio dia ou no primeiro dia útil subsequente ao da efetiva disponibilidade dos recursos aplicados pelo investidor.

### **Análise Operacional Aprofundada**

Este artigo estabelece a regra de precificação para a subscrição de cotas em FIDCs de classe aberta, um mecanismo crucial para garantir a equidade entre os cotistas. A regra, conhecida no mercado como "D+0" ou "D+1", define que o preço de entrada do investidor (o valor da cota) deve ser o do mesmo dia em que o dinheiro entra no fundo ou, no máximo, o do dia seguinte. Isso impede que um novo investidor se beneficie de informações sobre a performance do fundo que ainda não foram refletidas no valor da cota. A norma visa mitigar o risco de "day-trade" com cotas de fundos abertos, onde um investidor poderia aplicar no final do dia sabendo que a carteira teve uma grande valorização, capturando um ganho injusto.

### **Exemplo Prático Detalhado**

**Cenário: FIDC Aberto de Crédito Consignado (PL de R$ 500 milhões)**

- **Investidor A** solicita a aplicação de R$ 1 milhão na segunda-feira, às 11:00. O TED é creditado na conta do fundo às 11:05.
- **Regra do Fundo (D+0):** O administrador utiliza a cota de fechamento da própria segunda-feira para converter os R$ 1 milhão em cotas. Se a cota do dia fechar em R$ 1,2500, o investidor receberá 800.000 cotas.
- **Regra do Fundo (D+1):** O administrador utiliza a cota de fechamento da terça-feira. Se na terça a carteira se valorizar e a cota fechar em R$ 1,2510, o investidor receberá 799.360,51 cotas.

**Impacto da Regra:**

- Suponha que na segunda-feira à tarde, o FIDC anuncia a venda de uma parte da carteira com grande lucro, o que fará a cota do dia subir 0,5%.
- Se a regra fosse "D-1", um investidor com essa informação poderia aplicar no final do dia e comprar cotas pelo preço de sexta-feira, capturando um ganho sem risco. A regra do Art. 9º impede essa arbitragem.

### **Desafio Operacional (DTVM)**

O principal desafio para a DTVM é a **sincronização do fluxo de caixa com o sistema de passivo (controle de cotistas)**. O sistema precisa identificar com precisão o momento da "efetiva disponibilidade dos recursos".

1. **Controle de Arrecadação:** A DTVM precisa de um sistema que monitore a conta corrente do fundo em tempo real, identificando cada TED ou Pix recebido e associando-o a uma ordem de aplicação.
2. **Corte de Horário (_Cut-off_):** O regulamento do fundo deve definir um horário limite para aplicações (ex: 14:00). Aplicações recebidas após esse horário são processadas com a cota do dia seguinte (D+1), mesmo que a regra geral seja D+0. O sistema da DTVM deve aplicar essa regra de corte rigorosamente.
3. **Conciliação:** O sistema deve conciliar o extrato bancário com as ordens de aplicação enviadas pelos distribuidores, tratando eventuais divergências de valores ou informações de identificação do investidor.

### **Oportunidade de Negócio (DTVM)**

DTVMs que oferecem sistemas com alta automação nesse processo ganham uma vantagem competitiva. Uma plataforma que permita ao distribuidor enviar a ordem de aplicação via API e que automaticamente concilie o recebimento do TED, aplicando a regra de cotização correta (D+0 ou D+1) e confirmando a operação para o distribuidor em minutos, é um grande diferencial para atrair gestores e distribuidores que valorizam a eficiência e a redução de erros operacionais.