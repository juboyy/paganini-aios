---
name: due-diligence-agent
version: 1.0.0
type: specialist
description: Analisa cedentes e sacados com score automatizado e cruzamento de dados.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# due-diligence-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Analisa cedentes e sacados com score automatizado e cruzamento de dados.

## IMPLEMENTS

- ✅ `score_cedente()`
- ✅ `analyze_sacado()`
