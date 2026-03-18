---
name: pricing-agent
version: 1.0.0
type: specialist
description: Calcula taxa de desconto, PDD por aging, precifica ativos diariamente.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# pricing-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Calcula taxa de desconto, PDD por aging, precifica ativos diariamente.

## IMPLEMENTS

- ✅ `calculate_pdd()`
- ✅ `calculate_discount_rate()`
