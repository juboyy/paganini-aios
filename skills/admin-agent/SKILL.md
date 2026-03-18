---
name: admin-agent
version: 1.0.0
type: specialist
description: Calcula NAV diário, controla cotas sênior/subordinada, gera informes CVM.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# admin-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Calcula NAV diário, controla cotas sênior/subordinada, gera informes CVM.

## IMPLEMENTS

- ✅ `calculate_nav()`
- ✅ `manage_quotas()`
