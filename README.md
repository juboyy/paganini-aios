# PAGANINI AIOS

AI Operating System for Financial Markets.

## Monorepo Structure

```
paganini/
├── packages/
│   ├── kernel/       # AIOS core — routing, orchestration, memory
│   ├── rag/          # Hybrid RAG pipeline — ingest, embed, retrieve
│   ├── agents/       # Specialized financial agents
│   ├── ontology/     # FIDC domain ontology & knowledge graph
│   ├── dashboard/    # Monitoring & analytics UI
│   ├── modules/      # Pre-configured verticals (Cobrança, Core Banking, etc.)
│   └── shared/       # Common types, utils, configs
├── data/
│   └── corpus/
│       └── fidc/     # Source knowledge vault (164 markdown files, 5.6MB)
├── infra/            # Docker, deploy, CI/CD
└── docs/             # Architecture, ADRs, specs
```

## Architecture

- **Model Agnostic + BYOK**: Client brings their own API keys
- **Hybrid RAG**: Dense (embedding) + Sparse (BM25) + Graph (knowledge graph)
- **Meta-Prompting**: Query classification → retrieval strategy → context assembly
- **Domain Ontology**: FIDC-specific entity graph (CVM175, cotas, covenants, etc.)

## Corpus

The `data/corpus/fidc/` vault contains 164 markdown documents covering:
- CVM 175 (57 articles decomposed)
- 300 market pain points (Administration, Custody, Management)
- IFRS9, PDD, COFIs accounting
- 20+ FIDC types
- Platform V1 API specs
- 80 competitive differentials

## Founders

- **Rod Marques** — CEO
- **João Raf** — CTO (Infrastructure & Tech Vision)
- **Louiz Ferrer** — CIO
- **Mark Binder** — CFO
