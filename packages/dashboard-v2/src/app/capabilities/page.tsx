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
  { id: "12", name: "PinchTab", kind: "tool", status: "active", agents: ["general"], desc: "Browser automation" },
  { id: "13", name: "DesignKit", kind: "skill", status: "active", agents: ["general"], desc: "Extract design systems from live apps" },
  { id: "14", name: "Humanizer", kind: "skill", status: "active", agents: ["docs"], desc: "Remove AI writing patterns" },
  { id: "15", name: "pipeline.py", kind: "script", status: "active", agents: ["oracli"], desc: "Full SDLC automation" },
  { id: "16", name: "roi-calculator.py", kind: "script", status: "active", agents: ["oracli"], desc: "Calculate ROI metrics" },
  { id: "17", name: "memory-reflection.py", kind: "script", status: "active", agents: ["oracli"], desc: "Memory maintenance" },
  { id: "18", name: "Visual Explainer", kind: "native", status: "active", agents: ["oracli", "general"], desc: "Generate HTML visual explanations" },
  { id: "19", name: "Conflict Detector", kind: "native", status: "active", agents: ["oracli"], desc: "Detect agent decision conflicts" },
  { id: "20", name: "Context Engine", kind: "native", status: "active", agents: ["oracli"], desc: "Enrich subagent spawns with context" },
];

const KINDS = ["all", "integration", "api", "tool", "skill", "script", "native"];

const KIND_COLORS: Record<string, string> = {
  integration: "var(--blue)",
  api: "var(--teal)",
  tool: "var(--accent)",
  skill: "var(--green)",
  script: "var(--amber)",
  native: "var(--red)",
};

export default function CapabilitiesPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = CAPABILITIES.filter((c) => {
    if (filter !== "all" && c.kind !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Capabilities Graph</h1>
        <p className="text-sm" style={{ color: "var(--text-4)" }}>34 capabilities · 6 kinds · semantic search via 3072d embeddings</p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search capabilities..."
          className="px-3 py-2 rounded-lg text-sm flex-1 min-w-[200px]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        />
        <div className="flex gap-1">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="px-3 py-1.5 rounded-lg text-xs capitalize"
              style={{
                background: filter === k ? "var(--accent-bg)" : "var(--bg-card)",
                color: filter === k ? "var(--accent)" : "var(--text-4)",
                border: `1px solid ${filter === k ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((cap) => (
          <div key={cap.id} className="rounded-lg p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm" style={{ color: "var(--text-1)" }}>{cap.name}</span>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase"
                style={{ background: `${KIND_COLORS[cap.kind]}18`, color: KIND_COLORS[cap.kind] }}
              >
                {cap.kind}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--text-4)" }}>{cap.desc}</p>
            <div className="flex gap-1 flex-wrap">
              {cap.agents.map((a) => (
                <span key={a} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
