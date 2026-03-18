# Paganini AIOS — Visão Geral do Sistema

## O que é o Paganini AIOS?
O Paganini AIOS (AI Operating System) é um sistema operacional de inteligência artificial para mercados financeiros, com foco inicial em FIDCs (Fundos de Investimento em Direitos Creditórios).

## Agentes Especializados
O sistema conta com 9 agentes autônomos de IA, cada um especializado em uma função crítica do FIDC:

1. **Administrador** — Calcula NAV diário, controla cotas sênior/mezanino/subordinada, gera informes CVM
2. **Compliance** — Verifica conformidade regulatória em cada operação (CVM 175, BACEN, covenants)
3. **Custódia** — Registra títulos, verifica lastro dos recebíveis, controla garantias
4. **Due Diligence** — Analisa cedentes e sacados com score automatizado e cruzamento de dados
5. **Gestor** — Toma decisões de alocação e otimiza composição da carteira em tempo real
6. **Relação com Investidor (IR)** — Gera relatórios de performance e distribui comunicados aos cotistas
7. **Pricing** — Calcula taxa de desconto, PDD por aging, precifica ativos diariamente
8. **Reg Watch** — Monitora publicações CVM, BACEN e CFC, alertando sobre mudanças regulatórias
9. **Reporting** — Gera dashboards operacionais, relatórios de PDD e demonstrações financeiras

## 6 Guardrail Gates (Portões de Compliance)
Toda operação de compra de recebíveis passa obrigatoriamente por 6 verificações automáticas antes de ser aprovada:

1. **Elegibilidade** — Verifica se o recebível atende aos critérios definidos no regulamento do fundo (tipo de ativo, prazo, rating mínimo do sacado)
2. **Concentração** — Verifica se a compra não viola o limite de concentração por cedente (máximo 15% do PL por cedente individual). Alerta automático em 12%.
3. **Covenant** — Verifica se os covenants do fundo estão sendo respeitados (razão de liquidez, subordinação mínima, índice de inadimplência máximo)
4. **PLD/AML** — Verificações de Prevenção à Lavagem de Dinheiro conforme Circular BACEN 3.978/2020. Inclui due diligence inicial e monitoramento contínuo de transações atípicas.
5. **Compliance** — Verificação final de conformidade com todas as normas CVM aplicáveis, incluindo CVM Resolução 175 e regulamento específico do fundo
6. **Risco** — Avaliação de risco da operação incluindo PDD projetada, impacto no rating do fundo e stress testing

Se qualquer portão rejeitar a operação, ela é bloqueada automaticamente e um alerta é enviado ao gestor com o motivo da rejeição.

## Arquitetura Técnica
- **Moltis Runtime** — Engine proprietária que executa agentes com isolamento de contexto e memória episódica
- **Hybrid RAG** — Pipeline de retrieval com 3 estratégias (dense + sparse + graph) fundidas por Reciprocal Rank Fusion
- **MetaClaw Proxy** — Roteamento inteligente entre provedores de LLM com failover automático
- **Knowledge Graph** — Grafo de entidades financeiras com relações semânticas
- **OpenTelemetry** — Observabilidade nativa com traces auditáveis para cada decisão de agente

## Métricas de Desempenho
- 19 agentes especializados (9 FIDC + 10 AIOS)
- 701 horas de trabalho humano economizadas
- Custo operacional de $0.09 por hora de trabalho equivalente
- 6 portões de compliance com 100% de cobertura
- Tempo de resposta médio: 2-7 segundos por query regulatória
