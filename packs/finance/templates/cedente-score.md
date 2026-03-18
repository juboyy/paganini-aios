# Relatório de Due Diligence — {{ cedente_name }}
## CNPJ: {{ cnpj }}

### Score Final: {{ score }}/100 ({{ risk_level }})

### 1. Dados Cadastrais
| Item | Valor |
|------|-------|
| Razão Social | {{ razao_social }} |
| CNAE | {{ cnae }} |
| Situação Cadastral | {{ situacao }} |
| Data Abertura | {{ data_abertura }} |
| Capital Social | R$ {{ capital_social }} |

### 2. Quadro Societário
{{ qsa_table }}

### 3. Análise de Risco
| Critério | Score | Peso | Contribuição |
|----------|-------|------|-------------|
| Tempo de mercado | {{ tempo_score }} | 20% | {{ tempo_contrib }} |
| Saúde financeira | {{ fin_score }} | 30% | {{ fin_contrib }} |
| Histórico judicial | {{ jud_score }} | 15% | {{ jud_contrib }} |
| PEP/Sanções | {{ pep_score }} | 20% | {{ pep_contrib }} |
| Setor de atuação | {{ setor_score }} | 15% | {{ setor_contrib }} |

### 4. Verificações PLD/AML
- [ ] OFAC: {{ ofac_result }}
- [ ] PEP Check: {{ pep_result }}
- [ ] Mídia adversa: {{ media_result }}
- [ ] Protestos: {{ protestos_result }}

### 5. Recomendação
{{ recommendation }}

---
*Gerado por Paganini AIOS — Agent:DueDiligence*
*Data: {{ generated_at }}*
