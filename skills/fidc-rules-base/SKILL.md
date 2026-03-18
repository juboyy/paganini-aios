---
name: fidc-rules-base
version: 1.0.0
type: abstract
description: Fonte de verdade para regras regulatórias de FIDCs brasileiros.
dependencies: []
tags: [fidc, regulatory, base, cvm, bacen]
author: Paganini AIOS
---

# FIDC Rules Base

## GUARD
Se invocado diretamente, responder:
"This is an abstract skill. Use a specialist agent (compliance-agent, admin-agent, pricing-agent) instead."

---

## [SUMMARY]

### Estrutura FIDC
- **FIDC** = Fundo de Investimento em Direitos Creditórios (CVM Resolução 175)
- **Cotas**: Sênior (prioridade pagamento, rating obrigatório) > Mezanino > Subordinada (colchão de segurança)
- **Participantes**: Gestor, Administrador, Custodiante, Cedente, Sacado

### 6 Guardrail Gates
Toda operação de compra de recebíveis passa por 6 verificações:
1. **Elegibilidade** — critérios do regulamento (tipo, prazo, rating mínimo)
2. **Concentração** — máx 15% PL por cedente, alerta em 12%
3. **Covenant** — liquidez, subordinação mínima, inadimplência máxima
4. **PLD/AML** — Circular BACEN 3.978/2020, due diligence, transações atípicas
5. **Compliance** — CVM 175, regulamento específico do fundo
6. **Risco** — PDD projetada, impacto no rating, stress testing

### PDD por Aging
| Faixa | Provisão |
|-------|----------|
| 0-30d | 1% |
| 31-60d | 3% |
| 61-90d | 10% |
| 91-120d | 30% |
| 121-150d | 50% |
| 151-180d | 70% |
| >180d | 100% |

---

## [FULL]

### Regulamentação Detalhada

#### CVM Resolução 175
- Regulamento geral de fundos de investimento (substitui ICVM 555)
- Anexo Normativo II específico para FIDCs
- Exige administrador e custodiante independentes
- Cotas sênior podem ser ofertadas ao varejo com rating

#### BACEN — PLD/AML
- Circular 3.978/2020: programa de compliance obrigatório
- Due diligence inicial e periódica de cedentes/sacados
- Comunicação de operações suspeitas ao COAF
- Monitoramento contínuo de transações atípicas (valor, frequência, perfil)

#### Covenants Padrão
- **Razão de Liquidez**: >= 1.05x (caixa + recebíveis a vencer / obrigações sênior)
- **Subordinação Mínima**: >= 20% (PL subordinado / PL total)
- **Índice de Inadimplência**: <= 5% (recebíveis > 90 dias / carteira total)
- **Concentração por Cedente**: <= 15% PL
- **Concentração por Sacado**: <= 10% PL

---

## [FULL:nav]

### Cálculo do NAV (Valor Líquido)
```
NAV = Ativos_MtM - Passivos - PDD - Taxas_Provisionadas
```
- **Ativos_MtM**: Recebíveis marcados a mercado pela taxa de desconto
- **PDD**: Provisão para Devedores Duvidosos (tabela aging acima)
- **Taxas**: Admin (0.5-2% a.a.), Custódia (0.1-0.3% a.a.), Performance

### Cota Sênior vs Subordinada
- Sênior: NAV_Senior = min(PL_Senior, NAV * (PL_Senior / PL_Total))
- Subordinada: absorve perdas primeiro
- Subordinação = PL_Sub / PL_Total (mínimo regulamentar: 20%)

---

## [FULL:compliance]

### Fluxo de Compliance
1. Cedente submete borderô → Due Diligence Agent analisa
2. Guardrails verificam 6 gates automaticamente
3. Se TODOS passam → operação aprovada → Custódia registra
4. Se QUALQUER falha → operação bloqueada → alerta ao gestor
5. Relatórios periódicos: diário (NAV), mensal (informe CVM), trimestral (demonstrações)

### Prazos Regulatórios
- Informe diário: NAV até D+1
- Informe mensal: até dia 10 do mês seguinte
- Demonstrações financeiras: até 90 dias após encerramento
- Assembleia de cotistas: anual obrigatória

---

## ABSTRACT METHODS

Cada agente especialista DEVE implementar pelo menos um:

| Method | Implementado por |
|--------|-----------------|
| `check_eligibility(receivable)` | compliance-agent |
| `check_concentration(portfolio, new_op)` | compliance-agent |
| `check_covenant(fund_state)` | compliance-agent |
| `check_pld_aml(entity)` | compliance-agent |
| `check_compliance(operation)` | compliance-agent |
| `check_risk(operation, portfolio)` | risk-agent |
| `calculate_nav(fund)` | admin-agent |
| `calculate_pdd(portfolio)` | pricing-agent |
| `score_cedente(cnpj)` | due-diligence-agent |
| `generate_report(template, fund)` | reporting-agent |
