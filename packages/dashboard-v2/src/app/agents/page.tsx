"use client";

import { useState } from "react";

const AGENTS_DATA = [
  {
    slug: "orchestrator",
    status: "active",
    role: "Central coordinator — routes tasks to specialized agents via DELEGATION_MAP",
    domains: ["orchestration", "routing", "meta"],
    capabilities: ["route_task()", "spawn_agent()", "aggregate_results()", "monitor_fleet()", "handle_timeout()"],
    delegates: [
      { fn: "onboard_cedente", to: "due-diligence" },
      { fn: "run_compliance", to: "compliance" },
      { fn: "ingest_docs", to: "knowledge-graph" },
    ],
    tasks: 1284,
    avgLatency: "1.2s",
    tokens: "2.1M",
  },
  {
    slug: "due-diligence",
    status: "active",
    role: "Automated DD pipeline for cedentes — Receita Federal + PEP + scoring",
    domains: ["dd", "cnpj", "risk"],
    capabilities: ["score_cedente()", "check_pep()", "query_receita()", "analyze_socios()", "calc_dd_score()"],
    delegates: [
      { fn: "pep_check", to: "compliance" },
      { fn: "risk_score", to: "risk-agent" },
    ],
    tasks: 847,
    avgLatency: "7.2s",
    tokens: "890K",
  },
  {
    slug: "compliance",
    status: "active",
    role: "6-gate hard-stop pipeline — BACEN, CVM, AML, PEP, COAF validation",
    domains: ["compliance", "aml", "regulation"],
    capabilities: ["run_pipeline()", "check_aml()", "validate_coaf()", "check_pep()", "gate_approve()", "gate_reject()"],
    delegates: [{ fn: "audit_log", to: "report-agent" }],
    tasks: 1847,
    avgLatency: "3.1s",
    tokens: "1.4M",
  },
  {
    slug: "risk-agent",
    status: "active",
    role: "Credit risk scoring for positions, cedentes, and fund portfolios",
    domains: ["risk", "credit", "scoring"],
    capabilities: ["score_cedente()", "check_covenant()", "calc_var()", "check_eligibility()", "flag_concentration()"],
    delegates: [{ fn: "fund_metrics", to: "fund-manager" }],
    tasks: 622,
    avgLatency: "4.8s",
    tokens: "670K",
  },
  {
    slug: "fund-manager",
    status: "active",
    role: "NAV calculation, covenant monitoring, and fund reporting",
    domains: ["fund", "nav", "reporting"],
    capabilities: ["calculate_nav()", "check_covenant()", "gen_report()", "calc_pl()", "monitor_gates()"],
    delegates: [{ fn: "compliance_check", to: "compliance" }],
    tasks: 413,
    avgLatency: "9.4s",
    tokens: "520K",
  },
  {
    slug: "knowledge-graph",
    status: "active",
    role: "Entity extraction, graph building, and ChromaDB vector management",
    domains: ["kg", "rag", "embeddings"],
    capabilities: ["extract_entities()", "build_graph()", "embed_docs()", "query_chroma()", "merge_entities()"],
    delegates: [],
    tasks: 284,
    avgLatency: "12.3s",
    tokens: "3.2M",
  },
  {
    slug: "report-agent",
    status: "active",
    role: "Generates CVM reports, QMD docs, and compliance audit trails",
    domains: ["reporting", "docs", "audit"],
    capabilities: ["gen_cvm_report()", "gen_qmd()", "export_pdf()", "audit_trail()", "send_slack()"],
    delegates: [],
    tasks: 196,
    avgLatency: "15.2s",
    tokens: "440K",
  },
  {
    slug: "ingest-agent",
    status: "watching",
    role: "Document ingestion pipeline — PDF, CVM circulars, fund regs",
    domains: ["ingest", "pdf", "etl"],
    capabilities: ["ingest_pdf()", "parse_cvm()", "chunk_doc()", "queue_embed()", "dedup_check()"],
    delegates: [{ fn: "embed_chunks", to: "knowledge-graph" }],
    tasks: 142,
    avgLatency: "22.1s",
    tokens: "280K",
  },
  {
    slug: "metaclaw",
    status: "watching",
    role: "Self-learning engine — discovers patterns, scores skills, promotes winners",
    domains: ["ml", "meta", "learning"],
    capabilities: ["discover_pattern()", "score_skill()", "promote_skill()", "run_eval()", "update_weights()"],
    delegates: [],
    tasks: 89,
    avgLatency: "45.0s",
    tokens: "920K",
  },
];

const SPAWN_HISTORY = [
  { ts: "13:04:19", parent: "orchestrator", child: "due-diligence", depth: 1, duration: "7.2s", status: "OK" },
  { ts: "13:04:13", parent: "due-diligence", child: "ReceitaFederal", depth: 2, duration: "1.8s", status: "OK" },
  { ts: "13:04:14", parent: "due-diligence", child: "PEPCheck", depth: 2, duration: "0.9s", status: "OK" },
  { ts: "13:04:17", parent: "orchestrator", child: "compliance", depth: 1, duration: "3.1s", status: "OK" },
  { ts: "13:03:51", parent: "orchestrator", child: "fund-manager", depth: 1, duration: "9.4s", status: "OK" },
  { ts: "13:03:44", parent: "orchestrator", child: "risk-agent", depth: 1, duration: "4.8s", status: "OK" },
  { ts: "13:03:22", parent: "risk-agent", child: "compliance", depth: 2, duration: "2.9s", status: "OK" },
  { ts: "13:02:58", parent: "orchestrator", child: "knowledge-graph", depth: 1, duration: "12.3s", status: "OK" },
  { ts: "13:02:31", parent: "ingest-agent", child: "knowledge-graph", depth: 2, duration: "8.7s", status: "WARN" },
  { ts: "13:01:44", parent: "metaclaw", child: "compliance", depth: 2, duration: "3.4s", status: "OK" },
];

// SVG Delegation Topology
const TOPOLOGY_AGENTS = [
  { id: "orchestrator", label: "ORCH", x: 300, y: 160 },
  { id: "due-diligence", label: "DD", x: 160, y: 90 },
  { id: "compliance", label: "COMP", x: 440, y: 90 },
  { id: "risk-agent", label: "RISK", x: 80, y: 200 },
  { id: "fund-manager", label: "FUND", x: 520, y: 200 },
  { id: "knowledge-graph", label: "KG", x: 160, y: 300 },
  { id: "report-agent", label: "RPT", x: 440, y: 300 },
  { id: "ingest-agent", label: "INGEST", x: 300, y: 360 },
  { id: "metaclaw", label: "META", x: 300, y: 60 },
];

const ACTIVE_EDGES = [
  ["orchestrator", "due-diligence"],
  ["orchestrator", "compliance"],
  ["orchestrator", "risk-agent"],
  ["orchestrator", "fund-manager"],
  ["orchestrator", "knowledge-graph"],
  ["due-diligence", "compliance"],
  ["risk-agent", "compliance"],
  ["ingest-agent", "knowledge-graph"],
  ["knowledge-graph", "report-agent"],
  ["metaclaw", "compliance"],
];

function StatusBadge({ status }: { status: string }) {
  const color = status === "active" ? "var(--accent)" : status === "watching" ? "var(--cyan)" : "var(--text-4)";
  const bg = status === "active" ? "hsl(150 100% 50% / 0.1)" : status === "watching" ? "hsl(180 100% 50% / 0.1)" : "transparent";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: "var(--radius)",
        background: bg,
        border: `1px solid ${color}`,
        fontFamily: "var(--font-mono)",
        fontSize: "0.5625rem",
        color,
        letterSpacing: "0.1em",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          boxShadow: status === "active" ? `0 0 6px ${color}` : "none",
          animation: status === "active" ? "pulse-neon 2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {status.toUpperCase()}
    </span>
  );
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const getNodePos = (id: string) => TOPOLOGY_AGENTS.find((a) => a.id === id) || { x: 0, y: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
          PAGANINI AIOS · AGENT FLEET
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          Agent Fleet{" "}
          <span style={{ color: "var(--accent)" }}>+ Delegation Topology</span>
        </h1>
      </div>

      {/* Hero Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {[
          { label: "TOTAL AGENTS", value: "9", color: "var(--text-1)" },
          { label: "ACTIVE", value: "7", color: "var(--accent)" },
          { label: "WATCHING", value: "2", color: "var(--cyan)" },
          { label: "TEST FUNCTIONS", value: "136", color: "var(--text-1)" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Agent Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
        {AGENTS_DATA.map((agent) => (
          <div
            key={agent.slug}
            className="glass-card"
            style={{
              padding: "1.25rem",
              cursor: "pointer",
              border: selectedAgent === agent.slug ? "1px solid var(--accent)" : undefined,
              boxShadow: selectedAgent === agent.slug ? "0 0 20px hsl(150 100% 50% / 0.2)" : undefined,
            }}
            onClick={() => setSelectedAgent(selectedAgent === agent.slug ? null : agent.slug)}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--accent)", fontWeight: 600 }}>
                  {agent.slug}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: "2px", lineHeight: 1.4 }}>{agent.role}</div>
              </div>
              <StatusBadge status={agent.status} />
            </div>

            {/* Domains */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "0.75rem" }}>
              {agent.domains.map((d) => (
                <span key={d} className="tag-badge-cyan">{d}</span>
              ))}
            </div>

            {/* Capabilities */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "4px" }}>
                CAPABILITIES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.5625rem",
                      color: "var(--text-3)",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border)",
                      padding: "1px 6px",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Delegates */}
            {agent.delegates.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "4px" }}>
                  DELEGATES
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {agent.delegates.map((d) => (
                    <div key={d.fn} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-3)" }}>{d.fn}</span>
                      <svg width={20} height={8}>
                        <line x1={0} y1={4} x2={16} y2={4} stroke="var(--accent)" strokeWidth={1} strokeOpacity={0.6} />
                        <polygon points="16,1 20,4 16,7" fill="var(--accent)" fillOpacity={0.6} />
                      </svg>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)" }}>{d.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Footer */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.5rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              {[
                { label: "TASKS", value: agent.tasks.toLocaleString() },
                { label: "AVG LATENCY", value: agent.avgLatency },
                { label: "TOKENS", value: agent.tokens },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>{s.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-1)", fontWeight: 600, marginTop: "2px" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Delegation Topology SVG */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          DELEGATION TOPOLOGY · LIVE PATHS
        </div>
        <div style={{ overflowX: "auto" }}>
          <svg
            width="600"
            height="420"
            viewBox="0 0 600 420"
            style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
          >
            <defs>
              <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(150 100% 50% / 0.8)" />
              </marker>
              <marker id="arrowhead-dim" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(150 100% 50% / 0.15)" />
              </marker>
              <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(150 100% 50% / 0.3)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Edges */}
            {ACTIVE_EDGES.map(([from, to]) => {
              const f = getNodePos(from);
              const t = getNodePos(to);
              return (
                <line
                  key={`${from}-${to}`}
                  x1={f.x} y1={f.y}
                  x2={t.x} y2={t.y}
                  stroke="hsl(150 100% 50% / 0.5)"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead-active)"
                />
              );
            })}

            {/* Nodes */}
            {TOPOLOGY_AGENTS.map((node) => {
              const agent = AGENTS_DATA.find((a) => a.id === node.id);
              const isActive = agent?.status === "active";
              const isSelected = selectedAgent === node.id;
              return (
                <g key={node.id} onClick={() => setSelectedAgent(isSelected ? null : node.id)} style={{ cursor: "pointer" }}>
                  {isActive && (
                    <circle cx={node.x} cy={node.y} r={28} fill="url(#node-glow)" />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 24 : 20}
                    fill={isSelected ? "hsl(150 100% 50% / 0.2)" : "hsl(220 18% 9%)"}
                    stroke={isActive ? "hsl(150 100% 50% / 0.8)" : "hsl(180 100% 50% / 0.5)"}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.5rem",
                      fill: isActive ? "hsl(150 100% 50%)" : "hsl(180 100% 50%)",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 20, height: 1.5, background: "hsl(150 100% 50% / 0.8)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)" }}>ACTIVE PATH</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid var(--accent)", background: "hsl(150 100% 50% / 0.15)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)" }}>ACTIVE NODE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid var(--cyan)", background: "transparent" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)" }}>WATCHING</span>
          </div>
        </div>
      </div>

      {/* Spawn History */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          SPAWN HISTORY · RECENT RECURSIVE CALLS
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["TIME", "PARENT", "CHILD", "DEPTH", "DURATION", "RESULT"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      color: "var(--text-4)",
                      fontSize: "0.5625rem",
                      letterSpacing: "0.1em",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPAWN_HISTORY.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid hsl(150 100% 50% / 0.04)",
                    background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                  }}
                >
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-4)" }}>{row.ts}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--accent)" }}>{row.parent}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--cyan)" }}>{row.child}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-2)" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "1px 8px",
                        background: `hsl(150 100% 50% / ${row.depth * 0.06})`,
                        border: "1px solid hsl(150 100% 50% / 0.2)",
                        borderRadius: "var(--radius)",
                        color: "var(--accent)",
                      }}
                    >
                      depth={row.depth}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-3)" }}>{row.duration}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <span
                      style={{
                        padding: "1px 8px",
                        borderRadius: "var(--radius)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.5625rem",
                        background: row.status === "OK" ? "hsl(150 100% 50% / 0.1)" : "hsl(45 100% 50% / 0.1)",
                        color: row.status === "OK" ? "var(--accent)" : "var(--amber)",
                        border: `1px solid ${row.status === "OK" ? "hsl(150 100% 50% / 0.3)" : "hsl(45 100% 50% / 0.3)"}`,
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
