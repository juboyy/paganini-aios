"use client";

import { useState } from "react";

const STAT_CARDS = [
  { label: "Episodic", value: "2,847", icon: "🎞️", desc: "Event memories" },
  { label: "Semantic", value: "1,203", icon: "📚", desc: "Factual knowledge" },
  { label: "Procedural", value: "89", icon: "⚙️", desc: "How-to memories" },
  { label: "Relational", value: "342", icon: "🔗", desc: "Entity relations" },
];

const FILTER_PILLS = ["All layers", "Episodic", "Semantic", "Procedural"];

const MOCK_RESULTS = [
  {
    score: 0.97,
    content: "Revenue-OS deploy pipeline uses Vercel with Linear as the production gate. No prod deploy without Linear approval.",
    agent: "OraCLI",
    layer: "Procedural",
    timestamp: "2026-03-17 23:41",
  },
  {
    score: 0.94,
    content: "João prefers action over permission. Never ask for confirmation on reversible tasks — execute and report.",
    agent: "OraCLI",
    layer: "Semantic",
    timestamp: "2026-03-17 22:15",
  },
  {
    score: 0.91,
    content: "VIV-94: Implemented token usage bar chart in Telemetry page. Used CSS div stacking, no Recharts.",
    agent: "Code",
    layer: "Episodic",
    timestamp: "2026-03-17 21:03",
  },
  {
    score: 0.88,
    content: "Supabase capabilities table has 34 entries with 3072d embeddings via gemini-embedding-001.",
    agent: "Data",
    layer: "Semantic",
    timestamp: "2026-03-16 18:30",
  },
  {
    score: 0.85,
    content: "Gate token pattern: GATE-{datetime}:{8char-hash}. Must appear in every spec and commit message.",
    agent: "OraCLI",
    layer: "Procedural",
    timestamp: "2026-03-16 11:20",
  },
];

const LAYER_COLOR: Record<string, string> = {
  Episodic: "var(--blue)",
  Semantic: "var(--accent)",
  Procedural: "var(--teal)",
  Relational: "var(--amber)",
};

export default function MemoryPage() {
  const [activeFilter, setActiveFilter] = useState("All layers");
  const [query, setQuery] = useState("");

  const filtered = MOCK_RESULTS.filter((r) => {
    const layerMatch = activeFilter === "All layers" || r.layer === activeFilter;
    const queryMatch = query.trim() === "" || r.content.toLowerCase().includes(query.toLowerCase());
    return layerMatch && queryMatch;
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 22, fontWeight: 700 }}>Memory Explorer</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 4 }}>
          Semantic memory layers · pgvector + Mem0
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 20px 16px",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginTop: 4 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Knowledge Graph */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Knowledge Graph</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Entity relationships across memory layers
          </p>
        </div>
        <div
          style={{
            height: 300,
            borderRadius: 10,
            border: "1px dashed var(--border)",
            background: "var(--accent-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 42 }}>🕸️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>
            Graph explorer requires react-force-graph-2d
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-4)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 12px",
              fontFamily: "monospace",
            }}
          >
            npm install react-force-graph-2d
          </div>
          <div style={{ fontSize: 12, color: "var(--text-4)" }}>
            {MOCK_RESULTS.length} nodes indexed · 34 capabilities linked
          </div>
        </div>
      </div>

      {/* Semantic Search */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Semantic Search</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Query across all memory layers by meaning
          </p>
        </div>

        {/* Search input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories by meaning…"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text-1)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => setActiveFilter(pill)}
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                border: activeFilter === pill ? "none" : "1px solid var(--border)",
                background: activeFilter === pill ? "var(--accent)" : "transparent",
                color: activeFilter === pill ? "#fff" : "var(--text-3)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex flex-col gap-3 mt-4">
          {filtered.length === 0 && (
            <div style={{ color: "var(--text-4)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No memories matched
            </div>
          )}
          {filtered.map((result, i) => (
            <div
              key={i}
              style={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                padding: "14px 16px",
                background: "var(--bg)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, flex: 1, margin: 0 }}>
                  {result.content}
                </p>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: result.score >= 0.95 ? "var(--green)" : result.score >= 0.90 ? "var(--accent)" : "var(--amber)",
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {(result.score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: LAYER_COLOR[result.layer] + "22",
                    color: LAYER_COLOR[result.layer],
                  }}
                >
                  {result.layer}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>Agent: {result.agent}</span>
                <span style={{ fontSize: 11, color: "var(--text-4)", marginLeft: "auto" }}>
                  {result.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
