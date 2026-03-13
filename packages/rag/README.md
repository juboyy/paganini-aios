# RAG Pipeline — PAGANINI AIOS

Hybrid Retrieval-Augmented Generation for financial documents.

## Pipeline

```
Corpus (markdown) → Structural Parser → Hierarchical Chunks
    ↓
Entity Extraction (LLM) → Knowledge Graph (nodes + edges)
    ↓
Multi-granularity Embeddings (chunk / section / document)
    ↓
pgvector (dense) + tsvector (sparse) → Hybrid Retrieval (RRF)
    ↓
Context Assembly (meta-prompting) → LLM Response (BYOK)
```

## Layers

1. **Structural Parser** — Obsidian-aware, preserves hierarchy and wikilinks
2. **Entity Extraction** — LLM extracts typed entities (CVM articles, FIDC terms, financial formulas)
3. **Knowledge Graph** — pgvector tables `kg_nodes` + `kg_edges` with typed relations
4. **Hybrid Retrieval** — Dense + Sparse + Graph fusion via RRF
5. **Meta-Prompting** — Query classification before retrieval (conceptual vs exact vs comparative)

## Source Corpus

`../../data/corpus/fidc/` — 164 files, 5.6MB
