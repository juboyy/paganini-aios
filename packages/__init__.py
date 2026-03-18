"""PAGANINI AIOS — AI Operating System for Financial Markets.

Modular package structure:
  paganini.cli      → CLI entry point (click)
  paganini.kernel   → Core engine (router, gate, config)
  paganini.rag      → RAG pipeline (ingest, embed, retrieve, query)
  paganini.agents   → Agent framework (SOUL loading, dispatch)
  paganini.memory   → Memory API (4 layers)
  paganini.shared   → Guardrails, types, utils
"""

__version__ = "0.1.0"
