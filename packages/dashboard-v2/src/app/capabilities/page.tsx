"use client";

import { useState } from "react";

const CAPABILITIES = [
  { id: "1", name: "Jira", kind: "integration", status: "active", agents: ["oracli", "pm"], desc: "Requirements, sprints, stories" },
  { id: "2", name: "Confluence", kind: "integration", status: "active", agents: ["docs", "general"], desc: "Documentation wiki" },
  { id: "3", name: "Supabase", kind: "integration", status: "active", agents: ["data", "oracli"], desc: "DB schema, SQL, migrations, RLS" },
  { id: "4", name: "Vercel", kind: "integration", status: "active", agents: ["infra"], desc: "Deploy, env vars, domains" },
  { id: "5", name: "GitHub", kind: "integration", status: "active", agents: ["code", "infra"], desc: "Repos, PRs, branches, CI" },
  { id: "6", name: "Stripe", kind: "integration", status: "active", agents: ["oracli"], desc: "Payments, webhooks, products" },
  { id: "7", name: "Slack", kind: "integration", status: "active", agents: ["general"], desc: "Messaging, channels" },
  { id: "8", name: "LinkedIn", kind: "integration", status: "active", agents: ["general"], desc: "Social posting" },
  { id: "9", name: "Linear", kind: "api", status: "active", agents: ["oracli", "pm"], desc: "Review hub, production gate, GraphQL API" },
  { id: "10", name: "GitNexus", kind: "tool", status: "active", agents: ["code", "oracli"], desc: "Code intelligence — 17K nodes, 46K edges" },
  { id: "11", name: "Codex CLI", kind: "tool", status: "active", agents: ["code"], desc: "AI code execution engine (gpt-5.3-codex)" },
  { id: "12", name: "PinchTab", kind: "tool", status: "active", agents: ["general"], desc: "Browser automation headless Chrome" },
  { id: "13", name: "DesignKit", kind: "skill", status: "active", agents: ["general"], desc: "Extract design systems from live apps" },
  { id: "14", name: "Humanizer", kind: "skill", status: "active", agents: ["docs"], desc: "Remove AI writing patterns from text" },
  { id: "15", name: "WeatherSkill", kind: "skill", status: "active", agents: ["general"], desc: "Current weather and forecasts via wttr.in" },
  { id: "16", name: "pipeline.py", kind: "script", status: "active", agents: ["oracli"], desc: "Full SDLC automation script" },
  { id: "17", name: "roi-calculator.py", kind: "script", status: "active", agents: ["oracli"], desc: "Calculate ROI metrics from telemetry" },
  { id: "18", name: "memory-reflection.py", kind: "script", status: "active", agents: ["oracli"], desc: "Periodic memory maintenance and distillation" },
  { id: "19", name: "Visual Explainer", kind: "native", status: "active", agents: ["oracli", "general"], desc: "Generate HTML visual explanations" },
  { id: "20", name: "Context Engine", kind: "native", status: "active", agents: ["oracli"], desc: "Enrich subagent spawns with relevant context" },
];

const KINDS = ["all", "integration", "api", "tool", "skill", "script", "native"] as const;

const KIND_COLOR: Record<string, string> = {
  integration: "var(--blue)",
  api: "var(--teal)",
  tool: "var(--accent)",
  skill: "var(--green)",
  script: "var(--amber)",
  native: "var(--red)",
};

const AGENT_COLOR: Record<string, string> = {
  oracli: "var(--accent)",
  code: "var(--blue)",
  pm: "var(--teal)",
  docs: "var(--green)",
  general: "var(--amber)",
  infra: "var(--red)",
  data: "var(--teal)",
  qa: "var(--green)",
};

export default function CapabilitiesPage() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const counts: Record<string, number> = { all: CAPABILITIES.length };
  KINDS.slice(1).forEach((k) => {
    counts[k] = CAPABILITIES.filter((c) => c.kind === k).length;
  });

  const filtered = CAPABILITIES.filter((c) => {
    if (filter !== "all" && c.kind !== filter) return false;
    if (
      search &&
      !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.desc.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "16px",
        maxWidth: 1100,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Capabilities Graph</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4 }}>
          {CAPABILITIES.length} capabilities · 6 kinds · semantic search via 3072d embeddings
        </p>
      </div>

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "10px 16px",
          minHeight: 44,
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search capabilities..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-1)",
            fontSize: 13,
            width: "100%",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-4)",
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {KINDS.map((k) => {
          const isActive = filter === k;
          const color = k === "all" ? "var(--accent)" : KIND_COLOR[k] ?? "var(--text-4)";
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${isActive ? color : "var(--border)"}`,
                background: isActive ? color + "18" : "var(--bg-card)",
                color: isActive ? color : "var(--text-3)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s ease",
                minHeight: 36,
              }}
            >
              {k}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: isActive ? color + "28" : "var(--accent-bg)",
                  color: isActive ? color : "var(--text-4)",
                  padding: "1px 6px",
                  borderRadius: 999,
                  lineHeight: 1.5,
                }}
              >
                {counts[k] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Result count */}
      {(filter !== "all" || search) && (
        <div style={{ fontSize: 12, color: "var(--text-4)" }}>
          Showing <strong style={{ color: "var(--text-2)" }}>{filtered.length}</strong> of {CAPABILITIES.length}
        </div>
      )}

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((cap) => {
          const kindColor = KIND_COLOR[cap.kind] ?? "var(--text-4)";
          return (
            <div
              key={cap.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                position: "relative",
                borderLeftWidth: 3,
                borderLeftColor: kindColor,
                borderLeftStyle: "solid",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {/* Kind badge top-right */}
              <span
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: kindColor + "1a",
                  color: kindColor,
                }}
              >
                {cap.kind}
              </span>

              {/* Name */}
              <div style={{ paddingRight: 64 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.2 }}>
                  {cap.name}
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.5, margin: 0 }}>{cap.desc}</p>

              {/* Agent tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: "auto" }}>
                {cap.agents.map((a) => {
                  const agentColor = AGENT_COLOR[a] ?? "var(--accent)";
                  return (
                    <span
                      key={a}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "3px 7px",
                        borderRadius: 6,
                        background: agentColor + "18",
                        color: agentColor,
                      }}
                    >
                      {a}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--text-4)",
            fontSize: 13,
          }}
        >
          No capabilities match your search.
        </div>
      )}
    </div>
  );
}
