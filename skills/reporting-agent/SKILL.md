---
name: reporting-agent
version: 1.0.0
type: specialist
description: Gera dashboards operacionais, relatórios de PDD e demonstrações financeiras.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# reporting-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Gera dashboards operacionais, relatórios de PDD e demonstrações financeiras.

## IMPLEMENTS

- ✅ `generate_report()`
- ✅ `generate_dashboard()`
