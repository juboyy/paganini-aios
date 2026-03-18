# Informe Mensal — {{ fund_name }}
## Período: {{ month }}/{{ year }}

### 1. Dados do Fundo
| Item | Valor |
|------|-------|
| NAV (PL) | R$ {{ nav }} |
| Cota Sênior | R$ {{ cota_senior }} |
| Cota Subordinada | R$ {{ cota_sub }} |
| Subordinação | {{ subordination }}% |

### 2. Composição da Carteira
| Classe | Valor | % PL |
|--------|-------|------|
| Recebíveis | R$ {{ receivables }} | {{ recv_pct }}% |
| PDD | (R$ {{ pdd }}) | {{ pdd_pct }}% |
| Caixa | R$ {{ cash }} | {{ cash_pct }}% |

### 3. Aging de Inadimplência
| Faixa | Valor | Provisão | % |
|-------|-------|----------|---|
| 0-30d | R$ {{ a0_30 }} | R$ {{ p0_30 }} | {{ r0_30 }}% |
| 31-60d | R$ {{ a31_60 }} | R$ {{ p31_60 }} | {{ r31_60 }}% |
| 61-90d | R$ {{ a61_90 }} | R$ {{ p61_90 }} | {{ r61_90 }}% |
| 91-120d | R$ {{ a91_120 }} | R$ {{ p91_120 }} | {{ r91_120 }}% |
| 121-150d | R$ {{ a121_150 }} | R$ {{ p121_150 }} | {{ r121_150 }}% |
| 151-180d | R$ {{ a151_180 }} | R$ {{ p151_180 }} | {{ r151_180 }}% |
| >180d | R$ {{ a180 }} | R$ {{ p180 }} | {{ r180 }}% |

### 4. Covenants
| Covenant | Limite | Atual | Status |
|----------|--------|-------|--------|
| Liquidez | ≥ 1.5x | {{ liq }}x | {{ liq_status }} |
| Subordinação | ≥ 25% | {{ sub }}% | {{ sub_status }} |
| Inadimplência | ≤ 5% | {{ del }}% | {{ del_status }} |

### 5. Compliance
Resultado das 6 verificações de guardrail: {{ guardrail_summary }}

---
*Gerado automaticamente por Paganini AIOS — Agent:Reporting*
*Data: {{ generated_at }}*
