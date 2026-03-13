# Memory Schema — PAGANINI AIOS

## pgvector Tables

### semantic_chunks
```sql
CREATE TABLE semantic_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id TEXT,                          -- NULL = global corpus
    source_file TEXT NOT NULL,             -- original filename
    source_path TEXT NOT NULL,             -- full path in corpus
    parent_section TEXT,                   -- H1/H2 hierarchy
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,            -- dedup
    token_count INT,
    embedding vector(3072),               -- dense embedding
    metadata JSONB DEFAULT '{}',          -- arbitrary metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chunks_embedding ON semantic_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_chunks_fund ON semantic_chunks(fund_id);
CREATE INDEX idx_chunks_source ON semantic_chunks(source_file);
CREATE INDEX idx_chunks_content_trgm ON semantic_chunks
    USING gin (content gin_trgm_ops);
-- tsvector for sparse search
ALTER TABLE semantic_chunks ADD COLUMN tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED;
CREATE INDEX idx_chunks_tsv ON semantic_chunks USING gin(tsv);
```

### kg_nodes
```sql
CREATE TABLE kg_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id TEXT,                          -- NULL = global
    entity_type TEXT NOT NULL,             -- regulacao, fundo, cota, etc.
    name TEXT NOT NULL,
    description TEXT,
    properties JSONB DEFAULT '{}',
    embedding vector(3072),
    source_file TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(fund_id, entity_type, name)
);

CREATE INDEX idx_nodes_type ON kg_nodes(entity_type);
CREATE INDEX idx_nodes_fund ON kg_nodes(fund_id);
CREATE INDEX idx_nodes_name_trgm ON kg_nodes USING gin (name gin_trgm_ops);
```

### kg_edges
```sql
CREATE TABLE kg_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id TEXT,
    source_node_id UUID REFERENCES kg_nodes(id),
    target_node_id UUID REFERENCES kg_nodes(id),
    relation_type TEXT NOT NULL,           -- regula, compoe, subordinada_a, etc.
    properties JSONB DEFAULT '{}',
    weight FLOAT DEFAULT 1.0,
    source_file TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_node_id, target_node_id, relation_type)
);

CREATE INDEX idx_edges_source ON kg_edges(source_node_id);
CREATE INDEX idx_edges_target ON kg_edges(target_node_id);
CREATE INDEX idx_edges_relation ON kg_edges(relation_type);
CREATE INDEX idx_edges_fund ON kg_edges(fund_id);
```

### traces
```sql
CREATE TABLE traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id TEXT,
    agent TEXT NOT NULL,
    action TEXT NOT NULL,
    inputs JSONB,
    reasoning TEXT,
    decision TEXT,                         -- approved, blocked, warned, answered
    outputs JSONB,
    latency_ms INT,
    cost_usd DECIMAL(10,6),
    model TEXT,
    provider TEXT,
    tokens_in INT,
    tokens_out INT,
    guardrail_results JSONB,              -- which gates passed/failed
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_traces_fund ON traces(fund_id);
CREATE INDEX idx_traces_agent ON traces(agent);
CREATE INDEX idx_traces_created ON traces(created_at);
CREATE INDEX idx_traces_decision ON traces(decision);
```

### fund_state
```sql
CREATE TABLE fund_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    cnpj TEXT,
    status TEXT DEFAULT 'active',          -- active, liquidating, closed
    regulamento_hash TEXT,                 -- hash of current regulamento
    covenants JSONB DEFAULT '[]',
    metrics JSONB DEFAULT '{}',            -- current OC ratio, PDD, concentration
    last_updated TIMESTAMPTZ DEFAULT now()
);
```

## Filesystem State Structure

```
runtime/state/
├── {fund_id}/
│   ├── regulamento.md          # Current fund regulation
│   ├── covenants.json          # Active covenants with thresholds
│   ├── carteira.json           # Current portfolio snapshot
│   ├── metrics.json            # Current fund metrics
│   ├── cotistas.json           # Investor list (encrypted)
│   ├── history/
│   │   ├── YYYY-MM-DD.jsonl    # Daily operation log
│   │   └── ...
│   ├── alerts/
│   │   └── pending.json        # Unresolved alerts
│   └── reports/
│       ├── mensal/
│       ├── cadoc/
│       └── custom/
├── agents/
│   └── souls/                  # Symlink to packages/agents/souls/
├── system/
│   ├── heartbeat.md
│   ├── violations.md
│   └── config.yaml             # Symlink to config.yaml
└── corpus/                     # Symlink to data/corpus/
```
