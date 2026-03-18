---
name: custody-agent
version: 1.0.0
type: specialist
description: Registra títulos, verifica lastro dos recebíveis, controla garantias.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# custody-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Registra títulos, verifica lastro dos recebíveis, controla garantias.

## IMPLEMENTS

- ✅ `register_titles()`
- ✅ `verify_collateral()`
