"use client";

import { useState } from "react";

const STAT_CARDS = [
  {
    label: "Episodic",
    value: "2,847",
    icon: "🟢",
    emoji: "🎞️",
    desc: "Event memories",
    color: "var(--green)",
    bg: "rgba(34,197,94,0.10)",
  },
  {
    label: "Semantic",
    value: "1,203",
    icon: "🔵",
    emoji: "📚",
    desc: "Factual knowledge",
    color: "var(--blue)",
    bg: "rgba(59,130,246,0.10)",
  },
  {
    label: "Procedural",
    value: "89",
    icon: "🟣",
    emoji: "⚙️",
    desc: "How-to memories",
    color: "var(--accent)",
    bg: "var(--accent-bg)",
  },
  {
    label: "Relational",
    value: "342",
    icon: "🟠",
    emoji: "🔗",
    desc: "Entity relations",
    color: "var(--amber)",
    bg: "rgba(234,179,8,0.10)",
  },
];

const FILTER_PILLS = ["All layers", "Episodic", "Semantic", "Procedural", "Relational"];

const MOCK_RESULTS = [
  {
    score: 0.97,
    content:
      "Revenue-OS deploy pipeline uses Vercel with Linear as the production gate. No prod deploy without Linear approval.",
    agent: "OraCLI",
    layer: "Procedural",
    timestamp: "2026-03-17 23:41",
  },
  {
    score: 0.94,
    content:
      "João prefers action over permission. Never ask for confirmation on reversible tasks — execute and report.",
    agent: "OraCLI",
    layer: "Semantic",
    timestamp: "2026-03-17 22:15",
  },
  {
    score: 0.91,
    content:
      "VIV-94: Implemented token usage bar chart in Telemetry page. Used CSS div stacking, no Recharts.",
    agent: "Code",
    layer: "Episodic",
    timestamp: "2026-03-17 21:03",
  },
  {
    score: 0.88,
    content:
      "Supabase capabilities table has 34 entries with 3072d embeddings via gemini-embedding-001.",
    agent: "Data",
    layer: "Semantic",
    timestamp: "2026-03-16 18:30",
  },
  {
    score: 0.85,
    content:
      "Gate token pattern: GATE-{datetime}:{8char-hash}. Must appear in every spec and commit message.",
    agent: "OraCLI",
    layer: "Procedural",
    timestamp: "2026-03-16 11:20",
  },
];

const LAYER_COLOR: Record<string, string> = {
  Episodic: "var(--green)",
  Semantic: "var(--blue)",
  Procedural: "var(--accent)",
  Relational: "var(--amber)",
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.95
      ? "var(--green)"
      : score >= 0.90
      ? "var(--blue)"
      : "var(--amber)";
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: 64, height: 5, background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="font-bold font-mono text-[13px]"
        style={{ color, minWidth: 30 }}
      >
        {pct}%
      </span>
    </div>
  );
}

export default function MemoryPage() {
  const [activeFilter, setActiveFilter] = useState("All layers");
  const [query, setQuery] = useState("");

  const filtered = MOCK_RESULTS.filter((r) => {
    const layerMatch = activeFilter === "All layers" || r.layer === activeFilter;
    const queryMatch =
      query.trim() === "" ||
      r.content.toLowerCase().includes(query.toLowerCase());
    return layerMatch && queryMatch;
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          Memory Explorer
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-3)" }}>
          Semantic memory layers · pgvector + Mem0
        </p>
      </div>

      {/* Stat Cards — 2-col mobile, 4-col md */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl flex flex-col gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              padding: "18px 16px 14px",
            }}
          >
            {/* Icon row */}
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 36,
                  height: 36,
                  fontSize: 18,
                  background: card.bg,
                  border: `1px solid ${card.color}30`,
                }}
              >
                {card.emoji}
              </span>
              <span style={{ fontSize: 16 }}>{card.icon}</span>
            </div>

            {/* Value */}
            <p
              className="font-bold leading-none"
              style={{ fontSize: 28, color: "var(--text-1)" }}
            >
              {card.value}
            </p>

            {/* Label */}
            <p
              className="font-semibold text-[13px]"
              style={{ color: card.color }}
            >
              {card.label}
            </p>

            {/* Desc */}
            <p className="text-[13px]" style={{ color: "var(--text-4)" }}>
              {card.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Knowledge Graph Placeholder */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Card header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="font-semibold text-base" style={{ color: "var(--text-1)" }}>
              Knowledge Graph
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
              Entity relationships across memory layers
            </p>
          </div>
          <span
            className="rounded-xl px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-bold"
            style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
          >
            Coming soon
          </span>
        </div>

        {/* Placeholder body */}
        <div
          className="flex flex-col items-center justify-center gap-4"
          style={{
            height: 240,
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(20,184,166,0.04) 50%, rgba(59,130,246,0.06) 100%)",
          }}
        >
          {/* Pulsing glow orb */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "rgba(124,58,237,0.12)",
                animation: "pulse-dot 2s ease-in-out infinite",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 56,
                height: 56,
                background: "rgba(124,58,237,0.18)",
                animation: "pulse-dot 2s ease-in-out infinite 0.3s",
              }}
            />
            <span style={{ fontSize: 32, position: "relative", zIndex: 1 }}>🕸️</span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[13px]" style={{ color: "var(--text-2)" }}>
              Graph explorer
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-4)" }}>
              {MOCK_RESULTS.length} nodes indexed · 34 capabilities linked
            </p>
          </div>
        </div>
      </div>

      {/* Semantic Search */}
      <div
        className="rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="font-semibold text-base" style={{ color: "var(--text-1)" }}>
            Semantic Search
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
            Query across all memory layers by meaning
          </p>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Search input with icon */}
          <div className="relative">
            <span
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: 14, fontSize: 16, color: "var(--text-4)" }}
            >
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories by meaning…"
              className="w-full rounded-2xl text-[13px] transition-all"
              style={{
                paddingLeft: 42,
                paddingRight: 16,
                paddingTop: 12,
                paddingBottom: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text-1)",
                outline: "none",
                minHeight: 44,
              }}
            />
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTER_PILLS.map((pill) => {
              const active = activeFilter === pill;
              return (
                <button
                  key={pill}
                  onClick={() => setActiveFilter(pill)}
                  className="rounded-2xl transition-all duration-150 active:scale-[0.98]"
                  style={{
                    padding: "7px 14px",
                    minHeight: 36,
                    fontSize: 13,
                    fontWeight: 500,
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "#fff" : "var(--text-3)",
                    border: active ? "none" : "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          {/* Results */}
          <div className="flex flex-col gap-3">
            {filtered.length === 0 && (
              <div
                className="py-10 text-center rounded-2xl text-[13px]"
                style={{ color: "var(--text-4)", background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                No memories matched
              </div>
            )}
            {filtered.map((result, i) => {
              const layerColor = LAYER_COLOR[result.layer] ?? "var(--accent)";
              return (
                <div
                  key={i}
                  className="rounded-2xl flex flex-col gap-3 transition-all duration-150"
                  style={{
                    padding: "14px 16px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Score bar + content */}
                  <div className="flex items-start gap-3">
                    <p
                      className="flex-1 text-[13px] leading-relaxed"
                      style={{ color: "var(--text-2)" }}
                    >
                      {result.content}
                    </p>
                    <div className="flex-shrink-0">
                      <ScoreBar score={result.score} />
                    </div>
                  </div>

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Layer badge */}
                    <span
                      className="rounded-xl font-bold text-[9px] uppercase tracking-[0.15em] px-2.5 py-1"
                      style={{
                        background: layerColor + "20",
                        color: layerColor,
                      }}
                    >
                      {result.layer}
                    </span>

                    {/* Agent badge */}
                    <span
                      className="rounded-xl text-[9px] uppercase tracking-[0.15em] font-semibold px-2.5 py-1"
                      style={{
                        background: "var(--accent-bg)",
                        color: "var(--accent)",
                      }}
                    >
                      {result.agent}
                    </span>

                    {/* Timestamp */}
                    <span
                      className="text-[13px] ml-auto"
                      style={{ color: "var(--text-4)" }}
                    >
                      {result.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
