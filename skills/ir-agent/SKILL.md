---
name: ir-agent
version: 1.0.0
type: specialist
description: Gera relatórios de performance, responde dúvidas, distribui comunicados aos cotistas.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# ir-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Gera relatórios de performance, responde dúvidas, distribui comunicados aos cotistas.

## IMPLEMENTS

- ✅ `distribute_report()`
- ✅ `answer_investor()`
