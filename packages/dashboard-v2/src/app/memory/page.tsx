"use client";

const TOP_STATS = [
  { label: "TOTAL DOCUMENTS", value: "5,640" },
  { label: "EMBEDDINGS", value: "5,640" },
  { label: "KNOWLEDGE ENTITIES", value: "847" },
  { label: "AVG RETRIEVAL", value: "45ms" },
];

const CORPUS_SOURCES = [
  { name: "CVM Regulations", docs: 234, lastIngest: "2026-03-18 08:12", color: "var(--accent)" },
  { name: "Fund Regulamento", docs: 89, lastIngest: "2026-03-17 22:45", color: "var(--cyan)" },
  { name: "BACEN Circulars", docs: 156, lastIngest: "2026-03-18 06:30", color: "var(--accent)" },
  { name: "Internal Policies", docs: 67, lastIngest: "2026-03-15 14:00", color: "var(--text-3)" },
  { name: "Market Data", docs: 412, lastIngest: "2026-03-18 12:55", color: "var(--cyan)" },
  { name: "Historical NAV", docs: 4682, lastIngest: "2026-03-18 12:58", color: "var(--accent)" },
];

const RECENT_QUERIES = [
  {
    query: "inadimplência cedente CNPJ 12.345.678/0001-99 últimos 90 dias",
    confidence: 94.2,
    sources: ["Historical NAV", "Internal Policies"],
    latency: "38ms",
  },
  {
    query: "limite concentração sacado regulamento FIDC Paganini",
    confidence: 98.7,
    sources: ["Fund Regulamento", "CVM Regulations"],
    latency: "29ms",
  },
  {
    query: "BACEN circular PLD AML atualização 2025",
    confidence: 87.4,
    sources: ["BACEN Circulars", "Internal Policies"],
    latency: "51ms",
  },
  {
    query: "cálculo PDD projetada safra Q4 2025",
    confidence: 91.3,
    sources: ["Historical NAV", "Market Data"],
    latency: "44ms",
  },
  {
    query: "subordinação mínima CVM resolução 175 FIDC",
    confidence: 96.1,
    sources: ["CVM Regulations", "Fund Regulamento"],
    latency: "33ms",
  },
];

const RAG_CONFIG = [
  { key: "chunk_size", value: "1024" },
  { key: "overlap", value: "128" },
  { key: "top_k", value: "8" },
  { key: "embedding_model", value: "gemini-embedding-001" },
];

// KG node positions (% based, within a 900x400 viewport)
const KG_NODES = [
  { id: "fidc",       label: "FIDC",       x: 50,  y: 50,  color: "var(--accent)",  size: 10 },
  { id: "cvm175",     label: "CVM 175",    x: 20,  y: 20,  color: "var(--cyan)",    size: 7  },
  { id: "cedente",    label: "Cedente",    x: 78,  y: 22,  color: "var(--accent)",  size: 7  },
  { id: "sacado",     label: "Sacado",     x: 85,  y: 55,  color: "var(--cyan)",    size: 6  },
  { id: "pdd",        label: "PDD",        x: 65,  y: 80,  color: "var(--amber)",   size: 6  },
  { id: "covenant",   label: "Covenant",   x: 30,  y: 78,  color: "var(--accent)",  size: 7  },
  { id: "nav",        label: "NAV",        x: 12,  y: 58,  color: "var(--cyan)",    size: 6  },
  { id: "compliance", label: "Compliance", x: 42,  y: 25,  color: "var(--amber)",   size: 7  },
];

// edges: pairs of node ids
const KG_EDGES = [
  ["fidc", "cvm175"],
  ["fidc", "cedente"],
  ["fidc", "covenant"],
  ["fidc", "nav"],
  ["fidc", "pdd"],
  ["cvm175", "compliance"],
  ["cedente", "sacado"],
  ["cedente", "pdd"],
  ["sacado", "pdd"],
  ["covenant", "nav"],
  ["covenant", "compliance"],
  ["compliance", "fidc"],
];

function nodeById(id: string) {
  return KG_NODES.find((n) => n.id === id)!;
}

import KnowledgeGraph3D from "../../components/charts/knowledge-graph-3d";

export default function MemoryPage() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "0.25rem",
          }}
        >
          SISTEMA FIDC / MEMÓRIA
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--text-1)",
            letterSpacing: "-0.03em",
          }}
        >
          Knowledge Memory
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.625rem",
            color: "var(--text-4)",
            marginTop: "0.25rem",
            letterSpacing: "0.08em",
          }}
        >
          RAG corpus · embeddings · grafo de entidades
        </p>
      </div>

      {/* Top Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {TOP_STATS.map((stat, i) => (
          <div key={i} className="glass-card p-4">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.5625rem",
                letterSpacing: "0.12em",
                color: "var(--text-4)",
                marginBottom: "0.5rem",
              }}
            >
              {stat.label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: i === 3 ? "var(--cyan)" : "var(--text-1)",
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3D Knowledge Graph ── */}
      <div
        id="kg-3d"
        className="glass-card p-4 overflow-hidden"
        style={{ marginBottom: "1.5rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.5625rem",
              letterSpacing: "0.12em",
              color: "var(--text-4)",
            }}
          >
            KNOWLEDGE GRAPH — 3D TOPOLOGY
          </p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="tag-badge-cyan">847 entities</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.4375rem",
                letterSpacing: "0.1em",
                color: "var(--text-4)",
              }}
            >
              THREE.JS / FORCE-GRAPH-3D
            </span>
          </div>
        </div>

        {/* Graph canvas container */}
        <div
          style={{
            height: "500px",
            background: "hsl(220 25% 3% / 0.8)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          <KnowledgeGraph3D />
        </div>
      </div>

      {/* Two-col layout: Corpus + RAG Config */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Corpus Sources */}
        <div className="glass-card p-4">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.5625rem",
              letterSpacing: "0.12em",
              color: "var(--text-4)",
              marginBottom: "1rem",
            }}
          >
            CORPUS — FONTES INGERIDAS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {CORPUS_SOURCES.map((src) => {
              const maxDocs = 4682;
              const pct = Math.round((src.docs / maxDocs) * 100);
              return (
                <div
                  key={src.name}
                  style={{
                    background: "hsl(220 20% 4% / 0.5)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)",
                    padding: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.5rem",
                        letterSpacing: "0.08em",
                        color: "var(--text-2)",
                        fontWeight: 600,
                      }}
                    >
                      {src.name}
                    </p>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: src.color,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {src.docs.toLocaleString()}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.375rem",
                          letterSpacing: "0.08em",
                          color: "var(--text-4)",
                        }}
                      >
                        {src.lastIngest}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: "2px",
                      background: "var(--border-subtle)",
                      borderRadius: "1px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: src.color,
                        boxShadow: `0 0 6px ${src.color}`,
                        borderRadius: "1px",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RAG Config */}
        <div className="glass-card p-4">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.5625rem",
              letterSpacing: "0.12em",
              color: "var(--text-4)",
              marginBottom: "1rem",
            }}
          >
            RAG CONFIG
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {RAG_CONFIG.map((cfg) => (
              <div
                key={cfg.key}
                style={{
                  background: "hsl(220 20% 4% / 0.5)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius)",
                  padding: "0.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.5rem",
                    letterSpacing: "0.1em",
                    color: "var(--text-4)",
                  }}
                >
                  {cfg.key}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.5rem",
                    letterSpacing: "0.06em",
                    color: "var(--cyan)",
                    fontWeight: 700,
                  }}
                >
                  {cfg.value}
                </p>
              </div>
            ))}
          </div>

          {/* Embedding status */}
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "hsl(220 20% 4% / 0.5)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.4375rem",
                letterSpacing: "0.1em",
                color: "var(--text-4)",
                marginBottom: "0.5rem",
              }}
            >
              VECTOR INDEX STATUS
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span className="pulse-dot" style={{ color: "var(--accent)" }} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.4375rem",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                }}
              >
                ONLINE — pgvector HNSW
              </span>
            </div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.375rem",
                letterSpacing: "0.06em",
                color: "var(--text-4)",
              }}
            >
              3072d · cosine similarity · ef_search=100
            </p>
          </div>
        </div>
      </div>

      {/* Recent Queries */}
      <div className="glass-card p-4">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "1rem",
          }}
        >
          RECENT QUERIES — ÚLTIMAS 5
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {RECENT_QUERIES.map((q, i) => (
            <div
              key={i}
              style={{
                background: "hsl(220 20% 4% / 0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius)",
                padding: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.5rem",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.5rem",
                    letterSpacing: "0.04em",
                    color: "var(--text-2)",
                    lineHeight: 1.5,
                    flex: 1,
                    marginRight: "1rem",
                  }}
                >
                  "{q.query}"
                </p>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color:
                        q.confidence >= 95
                          ? "var(--accent)"
                          : q.confidence >= 88
                          ? "var(--cyan)"
                          : "var(--amber)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {q.confidence}%
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.375rem",
                      letterSpacing: "0.1em",
                      color: "var(--text-4)",
                    }}
                  >
                    CONFIDENCE
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {q.sources.map((src) => (
                  <span key={src} className="tag-badge-cyan">
                    {src}
                  </span>
                ))}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.4375rem",
                    letterSpacing: "0.08em",
                    color: "var(--text-4)",
                    marginLeft: "auto",
                  }}
                >
                  {q.latency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
