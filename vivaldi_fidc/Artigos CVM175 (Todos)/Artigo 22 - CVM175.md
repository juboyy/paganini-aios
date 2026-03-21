
### **Art. 22º - Política de Investimento em Cotas**

> Art. 22. A política de investimento da classe de investimento em cotas deve dispor sobre a forma como será realizada a verificação da observância dos limites de concentração e dos critérios de elegibilidade por parte das classes de cotas investidas.

### **Análise Operacional Aprofundada**

Este artigo impõe uma responsabilidade ativa ao gestor de um FIC-FIDC (Fundo de Investimento em Cotas de FIDC). Não basta apenas comprar cotas de outros FIDCs; o gestor do FIC-FIDC deve detalhar em sua política de investimento **como** ele irá monitorar se os fundos nos quais ele investe (os "FIDCs investidos") estão cumprindo suas próprias regras. Isso é conhecido no mercado como _due diligence_ contínua ou "olhar através" (_look through_). A norma visa evitar que o FIC-FIDC seja um mero "empilhador" de taxas, sem agregar valor na seleção e fiscalização dos gestores investidos. Ele força o gestor do FIC a atuar como um verdadeiro curador e auditor dos fundos de sua carteira, protegendo o investidor final de problemas nos fundos subjacentes.

### **Exemplo Prático Detalhado**

**Cenário: FIC-FIDC "Top Gestores" (PL de R$ 300 milhões)**

O regulamento deste FIC-FIDC, para cumprir o Art. 22, estabelece a seguinte política de monitoramento:

1. **Coleta de Dados (Mensal):** "A gestora exigirá contratualmente que cada FIDC investido envie, até o 5º dia útil de cada mês, a composição detalhada de sua carteira de direitos creditórios, incluindo informações sobre cada devedor, cedente, concentração e status de inadimplência."
2. **Análise Quantitativa (Robôs de Risco):** "Um sistema automatizado (robô) processará as carteiras recebidas para verificar o cumprimento dos limites de concentração por devedor e por cedente de cada FIDC investido, conforme seus respectivos regulamentos. Alertas de desenquadramento serão gerados automaticamente."
3. **Análise Qualitativa (Comitê de Risco):** "Trimestralmente, o Comitê de Risco da gestora se reunirá com cada gestor dos FIDCs investidos para discutir a performance da carteira, a política de crédito e os cenários de estresse. As atas dessas reuniões serão arquivadas como evidência do monitoramento."
4. **Ação em Caso de Desvio:** "Caso um FIDC investido apresente desenquadramento de seus limites por mais de 30 dias consecutivos, a gestora iniciará um processo de desinvestimento gradual da posição, a ser concluído em no máximo 90 dias."

### **Desafio Operacional (DTVM e Gestor)**

O maior desafio é a **padronização e automação da coleta e análise de dados**. Cada FIDC investido pode ter um formato diferente para enviar sua carteira, o que exige um trabalho manual intenso de consolidação (o "inferno do Excel").

- **Para o Gestor:** Desenvolver ou contratar um sistema de _look through_ que consiga "ler" diferentes layouts de carteira, padronizá-los e aplicar as regras de cada regulamento para identificar violações. Isso exige um investimento significativo em tecnologia e pessoal especializado em dados.
- **Para a DTVM:** A DTVM do FIC-FIDC tem a responsabilidade de garantir que o gestor está, de fato, executando essa política de verificação. O time de compliance da DTVM precisa solicitar e arquivar as evidências desse monitoramento (relatórios do robô, atas de reunião, etc.) para apresentá-las à CVM em caso de fiscalização. A DTVM pode ser corresponsabilizada se for negligente nessa fiscalização.

### **Oportunidade de Negócio (Plataformas de Dados)**

Empresas de tecnologia financeira (Fintechs) têm uma grande oportunidade de oferecer plataformas de "Look Through as a Service". Uma plataforma que se conecta aos administradores dos FIDCs investidos, coleta as carteiras via API, padroniza os dados e entrega ao gestor do FIC-FIDC um dashboard com todos os alertas de desenquadramento e análises de risco já prontos, resolve uma dor imensa do mercado e pode ser um negócio altamente escalável.