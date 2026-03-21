
## **Art. 36º - Verificação do Lastro dos Direitos Creditórios**

> Art. 36. O regulamento deve estabelecer a forma e a periodicidade com que o custodiante ou, quando não houver a contratação de custodiante, o administrador, verificará se os direitos creditórios foram constituídos de acordo com o que foi atestado pelo cedente.

### **Análise Operacional Aprofundada**

Este artigo estabelece a obrigação de uma auditoria independente sobre a existência e a validade dos créditos que formam a carteira do FIDC. Ele determina que o custodiante (ou o administrador, se não houver custodiante) deve verificar se o que o cedente vendeu para o fundo realmente existe e está correto. Essa verificação é o coração da segurança de um FIDC, funcionando como um controle de qualidade para o principal ativo do fundo. O regulamento deve detalhar **como** (a metodologia) e **quando** (a periodicidade) essa verificação será feita. A norma não prescreve um método único, dando flexibilidade para que a estrutura seja adequada ao tipo de crédito, mas exige que o processo seja claro e transparente para o investidor.

### **Exemplo Prático Detalhado**

**Cenário: FIDC de Financiamento de Veículos (PL de R$ 400 milhões)**

O cedente é uma financeira que origina contratos de financiamento de carros. O FIDC compra esses contratos.

- **Política de Verificação do Lastro (descrita no Regulamento):**
    1. **Amostragem Mensal:** "O custodiante selecionará, mensalmente, uma amostra aleatória correspondente a 5% do valor dos créditos cedidos no mês anterior."
    2. **Metodologia de Verificação:** "Para cada contrato da amostra, o custodiante realizará os seguintes procedimentos:"
        - **(a) Verificação Documental:** "Conferir se a Cédula de Crédito Bancário (CCB) está assinada e se os dados do devedor e do veículo batem com o arquivo eletrônico enviado pelo cedente."
        - **(b) Verificação de Registro:** "Consultar o sistema do DETRAN para confirmar se a alienação fiduciária do veículo foi devidamente registrada em nome do FIDC."
        - **(c) Circularização (Confirmação com o Devedor):** "Para 10% da amostra (ou seja, 0,5% do total), o custodiante enviará uma carta ou e-mail ao devedor perguntando se ele reconhece a dívida e se as condições do financiamento estão corretas."
    3. **Relatório de Divergências:** "O custodiante emitirá um relatório mensal ao administrador e ao gestor, apontando todas as divergências encontradas. Divergências materiais (acima de 1% da amostra) devem ser comunicadas imediatamente à assembleia de cotistas."

### **Desafio Operacional (Custodiante/DTVM)**

O desafio é a **execução eficiente e documentada** desses procedimentos, que podem ser trabalhosos e caros.

- **Custo vs. Risco:** A profundidade da verificação é uma balança entre custo e risco. Uma verificação de 100% da carteira seria ideal, mas inviável financeiramente. A definição de uma amostragem estatisticamente relevante é um desafio técnico. O custo dessa verificação é um encargo do fundo e impacta a rentabilidade.
- **Tecnologia:** A automação é chave. O custodiante precisa de sistemas que se conectem a fontes externas (como o DETRAN, no exemplo) via API para realizar as checagens de forma automática. A circularização com devedores também pode ser automatizada com plataformas de e-mail ou SMS.
- **Gestão de Evidências:** Todos os passos da verificação devem ser documentados e arquivados (os "papéis de trabalho" da auditoria). O custodiante deve ser capaz de provar à CVM e aos auditores do fundo exatamente o que foi verificado em cada amostra. Um sistema de GED (Gerenciamento Eletrônico de Documentos) é essencial.

### **Oportunidade de Negócio (Empresas de Auditoria e BPO)**

Empresas de auditoria ou de BPO (Business Process Outsourcing) podem se especializar em oferecer o serviço de "Verificação de Lastro (Art. 36)" para custodiantes e administradores. Elas podem desenvolver a expertise e a tecnologia para realizar esses procedimentos de forma mais eficiente e barata do que se o custodiante montasse uma equipe interna para isso. Ao terceirizar essa função, o custodiante ganha em eficiência e foca em sua atividade principal, enquanto a empresa de BPO ganha escala ao atender vários clientes.

### **Aprofundamento: O Custodiante como Auditor Independente**

Enquanto o Artigo 31 estabelece o dever do gestor de verificar o lastro _antes_ da aquisição, o Artigo 36 estabelece o dever do **custodiante** de realizar uma verificação periódica _após_ a aquisição. Esta é a **segunda linha de defesa** do FIDC, funcionando como uma **auditoria independente** dos atos do gestor e da existência real da carteira. O custodiante não tem relação com a decisão de investimento; seu papel é puramente de controle e verificação, o que lhe confere a isenção necessária para essa tarefa.

A verificação do custodiante é, por natureza, amostral. É impraticável que ele verifique 100% dos documentos de lastro de uma carteira com milhares de créditos. A CVM exige que a metodologia de amostragem seja definida no regulamento do fundo e que seja "adequada às características dos direitos creditórios". Isso significa que a amostra deve ser estatisticamente relevante e, preferencialmente, estratificada para focar nos créditos de maior risco ou maior valor.

O objetivo da verificação do custodiante é duplo:

1. **Confirmar a Existência:** Verificar se os créditos que constam no sistema do gestor e nos relatórios do fundo realmente existem no mundo real. Isso é feito através da checagem dos documentos que os representam (ex: contratos, notas fiscais, duplicatas eletrônicas).
2. **Confirmar a Titularidade:** Verificar se a titularidade dos créditos foi efetivamente transferida para o FIDC. O custodiante precisa checar se os registros e os contratos de cessão estão em nome do fundo, garantindo que os ativos não estão mais no balanço do cedente e estão protegidos de seus credores.

Qualquer divergência encontrada deve ser imediatamente comunicada à administradora, que, por sua vez, deve cobrar explicações e ações corretivas do gestor.

### **Visão Aprofundada dos Prestadores de Serviço**

|Prestador|Papel e Interação com o Art. 36|
|---|---|
|**Custodiante**|**Executor Central:** O custodiante é o responsável direto pela execução desta auditoria periódica. Grandes custodiantes (geralmente grandes bancos) possuem departamentos especializados em "Custódia de Ativos Estruturados", com equipes e sistemas dedicados a essa tarefa. O processo é formal e documentado. A equipe de custódia sorteia a amostra, solicita os documentos ao gestor (ou acessa um repositório digital, o _data room_), realiza a checagem e emite um "Relatório de Verificação de Lastro" para a administradora.|
|**Administradora (DTVM)**|**Recebedora e Fiscalizadora do Relatório:** A administradora recebe o relatório do custodiante e é a responsável por tomar as providências caso alguma divergência seja apontada. Se o relatório aponta que 5% da amostra de créditos não teve seu lastro localizado, a administradora deve imediatamente notificar o gestor e exigir uma explicação. Se a explicação não for satisfatória, a administradora pode exigir que o gestor reverta a operação ou provisione a perda, e deve comunicar o fato aos cotistas em seu próximo relatório.|
|**Gestora**|**Fornecedora da Informação e Objeto da Auditoria:** A gestora é a parte auditada neste processo. Ela tem o dever de fornecer ao custodiante, de forma tempestiva e organizada, todos os documentos e informações solicitados para a verificação da amostra. Uma gestora bem estruturada já mantém um _data room_ virtual com todos os documentos de lastro digitalizados e organizados, o que facilita e agiliza enormemente o trabalho do custodiante. A recusa ou a demora do gestor em fornecer os documentos é um grande sinal de alerta para o custodiante e para a administradora.|

### **Análise de Riscos e Violações**

|Risco|Descrição Detalhada|Exemplo de Violação e Consequência|
|---|---|---|
|**Risco de Amostragem Insuficiente**|A metodologia de amostragem definida no regulamento é frágil ou o percentual da amostra é muito pequeno, o que reduz a probabilidade de encontrar problemas.|**Violação:** O regulamento de um FIDC de R$ 500 milhões, com 50.000 créditos, estabelece que a amostra de verificação do custodiante será de apenas 10 créditos por mês. A amostra é tão pequena que se torna estatisticamente irrelevante. **Consequência:** A CVM, em uma fiscalização, pode questionar a adequação da metodologia e exigir uma alteração no regulamento para aumentar o tamanho da amostra, considerando que a verificação não está cumprindo seu propósito de mitigar o risco.|
|**Risco de Verificação Superficial**|O custodiante realiza a verificação de forma meramente protocolar, sem a profundidade necessária para identificar fraudes mais elaboradas.|**Violação:** O custodiante se limita a checar se o arquivo PDF da nota fiscal existe no _data room_, mas não utiliza um software de OCR para ler os dados da nota e cruzá-los com os dados do sistema do gestor, nem checa a validade da chave da NF-e no portal da Receita. **Consequência:** Uma fraude de duplicatas frias, onde as notas fiscais são imagens adulteradas, passa despercebida pelo custodiante. A responsabilidade pela perda recai primariamente sobre o gestor, mas o custodiante pode ser corresponsabilizado por negligência em seu dever de verificação.|
|**Risco de Inércia da Administradora**|O custodiante reporta uma divergência grave, mas a administradora, por conivência ou negligência, não toma nenhuma atitude contra o gestor.|**Violação:** O custodiante informa à administradora que não localizou o lastro de 15% da amostra de um determinado cedente. A administradora recebe a informação, mas, como tem uma boa relação comercial com o gestor, decide "deixar para lá" e não escala o problema. **Consequência:** Esta é uma das violações mais graves. A CVM pode punir severamente a administradora por quebra do dever fiduciário e por falha grave nos controles internos. A administradora pode ser obrigada a ressarcir o fundo pelo prejuízo que sua inércia causou.|

### **Case Real: O Data Room que Salvou o Fundo**

Um FIDC de recebíveis de aluguel de máquinas e equipamentos enfrentou uma crise quando seu principal cedente, que representava 60% da carteira, sofreu uma busca e apreensão da Polícia Federal por suspeita de envolvimento em um esquema de corrupção. Os computadores e servidores da empresa cedente foram apreendidos, e a empresa ficou completamente inoperante.

- **O Desafio:** O pânico se instalou entre os cotistas. Como o FIDC poderia continuar a operar e a cobrar os aluguéis se todos os contratos e registros estavam nos servidores apreendidos do cedente? Como o custodiante poderia realizar sua verificação de lastro?
- **A Solução da Gestora:** Felizmente, a gestora do FIDC era extremamente diligente e bem estruturada. Desde o início da operação, ela havia exigido que o cedente fizesse o upload de uma cópia digital de 100% dos contratos de aluguel e de suas respectivas notas fiscais em um _data room_ virtual, organizado e seguro, mantido pela própria gestora. A gestora não confiava em deixar os documentos apenas na posse do cedente.
- **A Atuação do Custodiante:** Quando o custodiante foi realizar sua verificação de lastro periódica, ele simplesmente acessou o _data room_ mantido pela gestora. Todos os documentos da amostra estavam lá, intactos e organizados. O custodiante pôde emitir seu relatório para a administradora, atestando que, do ponto de vista documental, a carteira do FIDC estava íntegra e segregada do problema do cedente.
- **As Consequências:** A existência do _data room_ e a capacidade do custodiante de realizar sua verificação independente foram cruciais para acalmar o mercado. A gestora e a administradora puderam emitir um fato relevante comunicando que a operação do FIDC continuava normalmente, pois o fundo detinha a titularidade e a posse documental de todos os seus ativos. O valor da cota, que havia caído com a notícia da busca e apreensão, se recuperou rapidamente. O caso virou um exemplo da importância de uma boa governança e da redundância de informações, e de como a verificação do custodiante (Art. 36) funciona como um pilar de estabilidade em momentos de crise.