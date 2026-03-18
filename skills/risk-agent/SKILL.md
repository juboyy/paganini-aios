---
name: risk-agent
version: 1.0.0
type: specialist
description: Avalia risco de operações: PDD projetada, impacto no rating, stress testing.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# risk-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Avalia risco de operações: PDD projetada, impacto no rating, stress testing.

## IMPLEMENTS

- ✅ `check_risk()`
- ✅ `stress_test()`
