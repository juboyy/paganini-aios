---
name: regwatch-agent
version: 1.0.0
type: specialist
description: Monitora publicações CVM, BACEN e CFC, alertando sobre mudanças regulatórias.
dependencies:
  - name: fidc-rules-base
    version: "^1.0.0"
    load: summary
tags: [fidc, specialist]
author: Paganini AIOS
---

# regwatch-agent

## COMPOSIÇÃO

> **LOAD CONTEXT**: Carregar `fidc-rules-base` (seção [SUMMARY]).
> Confirmar: `[BASE LOADED: fidc-rules-base@1.0.0 (summary)]`

## PROPÓSITO

Monitora publicações CVM, BACEN e CFC, alertando sobre mudanças regulatórias.

## IMPLEMENTS

- ✅ `monitor_publications()`
- ✅ `alert_changes()`
