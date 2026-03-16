# Stress Test em Fundos de Investimento

## O que é Stress Testing

O stress testing (teste de estresse) é a simulação de cenários extremos e adversos para avaliar a resiliência do fundo e sua capacidade de honrar obrigações com cotistas.

## Tipos de Cenários

### 1. Cenário Base
- Inadimplência: 5%
- PL Subordinada: mantido
- IS: dentro do limite
- Resultado esperado: operação normal

### 2. Cenário Adverso
- Inadimplência: 10%
- PL Subordinada: parcialmente consumido
- IS: próximo do limite
- Resultado esperado: alerta, mas sem breach

### 3. Cenário de Estresse
- Inadimplência: 12%
- PL Subordinada: significativamente reduzido
- IS: abaixo do limite
- Resultado esperado: trigger de covenant, amortização

### 4. Cenário Extremo
- Inadimplência: 15%+
- PL Subordinada: zerado
- IS: violação grave
- Resultado esperado: liquidação antecipada

## Metodologia

1. **Análise de Sensibilidade**: Variação de um fator por vez
2. **Simulação de Monte Carlo**: Milhares de cenários probabilísticos
3. **Cenários Históricos**: Replay de crises passadas (2008, 2020)
4. **Reverse Stress Testing**: Identificar cenários que levam à falha

## Frequência

- Stress test completo: mensal
- Análise de sensibilidade: semanal
- Monitoramento de indicadores: diário

## Regulação

A CVM 175 exige que fundos realizem stress testing periódico e mantenham documentação dos resultados disponível para fiscalização.
