"use client";

const ALL_STAGES = [
  { num: 1, name: "Context", owner: "OraCLI" },
  { num: 2, name: "PRD", owner: "PM" },
  { num: 3, name: "Research", owner: "General" },
  { num: 4, name: "Architect", owner: "Architect" },
  { num: 5, name: "UX Design", owner: "General" },
  { num: 6, name: "Biz Analyst", owner: "PM" },
  { num: 7, name: "Scrum", owner: "PM" },
  { num: 8, name: "Story", owner: "PM" },
  { num: 9, name: "Review", owner: "Architect" },
  { num: 10, name: "Specifier", owner: "Code" },
  { num: 11, name: "Dev", owner: "Codex" },
  { num: 12, name: "Code Review", owner: "Code" },
  { num: 13, name: "QA", owner: "QA" },
  { num: 14, name: "Deploy", owner: "Infra" },
  { num: 15, name: "Stakeholder", owner: "Docs" },
  { num: 16, name: "Retro", owner: "Docs" },
  { num: 17, name: "Knowledge", owner: "Docs" },
  { num: 18, name: "Metrics", owner: "Infra" },
];

const ACTIVE_PIPELINES = [
  {
    id: "pipe-001",
    title: "Dashboard v2 — Telemetry page",
    issueId: "VIV-94",
    tier: "Feature",
    gateToken: "GATE-20260317T214432:54f7348e",
    currentStage: 11,
    stages: ALL_STAGES,
  },
  {
    id: "pipe-002",
    title: "Capabilities graph semantic indexing",
    issueId: "VIV-97",
    tier: "Quick",
    gateToken: "GATE-20260318T003812:a1c9f203",
    currentStage: 4,
    stages: ALL_STAGES.slice(0, 14),
  },
];

const HISTORY = [
  {
    title: "Revenue-OS auth refresh",
    issueId: "VIV-88",
    tier: "Quick",
    duration: "18m",
    stages: 5,
    cost: "$0.34",
    outcome: "success",
  },
  {
    title: "Supabase RLS policy update",
    issueId: "VIV-85",
    tier: "Micro",
    duration: "6m",
    stages: 3,
    cost: "$0.07",
    outcome: "success",
  },
  {
    title: "Stripe webhook handler refactor",
    issueId: "VIV-79",
    tier: "Feature",
    duration: "1h 42m",
    stages: 10,
    cost: "$1.82",
    outcome: "success",
  },
  {
    title: "Linear approval poller crash fix",
    issueId: "VIV-72",
    tier: "Quick",
    duration: "24m",
    stages: 5,
    cost: "$0.41",
    outcome: "rollback",
  },
];

const GATE_LOG = [
  {
    token: "GATE-20260318T003812:a1c9f203",
    task: "Capabilities graph semantic indexing",
    tier: "Quick",
    time: "2026-03-18 00:38",
    status: "active",
  },
  {
    token: "GATE-20260317T214432:54f7348e",
    task: "Dashboard v2 — Telemetry page",
    tier: "Feature",
    time: "2026-03-17 21:44",
    status: "active",
  },
  {
    token: "GATE-20260317T183021:b3d22f91",
    task: "Revenue-OS auth refresh",
    tier: "Quick",
    time: "2026-03-17 18:30",
    status: "closed",
  },
  {
    token: "GATE-20260317T120948:77e8102c",
    task: "Supabase RLS policy update",
    tier: "Micro",
    time: "2026-03-17 12:09",
    status: "closed",
  },
  {
    token: "GATE-20260316T221503:c0af6d3e",
    task: "Linear approval poller crash fix",
    tier: "Quick",
    time: "2026-03-16 22:15",
    status: "closed",
  },
];

const TIER_COLOR: Record<string, string> = {
  Micro: "var(--teal)",
  Quick: "var(--blue)",
  Feature: "var(--accent)",
  Epic: "var(--amber)",
};

function StagePill({
  stage,
  currentStage,
}: {
  stage: (typeof ALL_STAGES)[0];
  currentStage: number;
}) {
  const isDone = stage.num < currentStage;
  const isCurrent = stage.num === currentStage;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        minWidth: 72,
      }}
    >
      <div
        style={{
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
          background: isDone
            ? "rgba(34, 197, 94, 0.18)"
            : isCurrent
            ? "rgba(59, 130, 246, 0.2)"
            : "var(--accent-bg)",
          color: isDone
            ? "var(--green)"
            : isCurrent
            ? "var(--blue)"
            : "var(--text-4)",
          border: isCurrent ? "1px solid var(--blue)" : "1px solid transparent",
          boxShadow: isCurrent ? "0 0 8px rgba(59,130,246,0.3)" : "none",
          animation: isCurrent ? "pulse-stage 2s infinite" : "none",
          position: "relative",
        }}
      >
        {stage.num}. {stage.name}
      </div>
      <span style={{ fontSize: 10, color: "var(--text-4)" }}>{stage.owner}</span>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 22, fontWeight: 700 }}>BMAD-CE Pipeline</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 4 }}>
          18-stage methodology · Context Scout → Metrics Logger
        </p>
      </div>

      {/* Active Pipelines */}
      <div className="flex flex-col gap-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>
          Active Pipelines
          <span
            style={{
              marginLeft: 8,
              fontSize: 12,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(59,130,246,0.15)",
              color: "var(--blue)",
            }}
          >
            {ACTIVE_PIPELINES.length}
          </span>
        </h2>

        {ACTIVE_PIPELINES.map((pipeline) => (
          <div
            key={pipeline.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
            }}
          >
            {/* Pipeline header */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>
                    {pipeline.title}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: TIER_COLOR[pipeline.tier] + "22",
                      color: TIER_COLOR[pipeline.tier],
                    }}
                  >
                    {pipeline.tier}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 4 }}>
                  {pipeline.issueId} · Stage {pipeline.currentStage}/{pipeline.stages.length}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--text-3)",
                  background: "var(--accent-bg)",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                {pipeline.gateToken}
              </div>
            </div>

            {/* Stage pills scrollable row */}
            <div
              style={{
                overflowX: "auto",
                paddingBottom: 8,
              }}
            >
              <div className="flex items-start gap-2" style={{ minWidth: "max-content" }}>
                {pipeline.stages.map((stage, i) => (
                  <div key={stage.num} className="flex items-center">
                    <StagePill stage={stage} currentStage={pipeline.currentStage} />
                    {i < pipeline.stages.length - 1 && (
                      <div
                        style={{
                          width: 16,
                          height: 1,
                          background: stage.num < pipeline.currentStage
                            ? "var(--green)"
                            : "var(--border)",
                          marginTop: -12,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline History */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 16px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Pipeline History</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Completed pipeline runs
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                {["Title", "ID", "Tier", "Duration", "Stages", "Cost", "Outcome"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      background: "var(--accent-bg)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < HISTORY.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <td style={{ padding: "12px 16px", color: "var(--text-2)", fontWeight: 500 }}>
                    {row.title}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-4)", fontFamily: "monospace", fontSize: 12 }}>
                    {row.issueId}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: TIER_COLOR[row.tier] + "22",
                        color: TIER_COLOR[row.tier],
                      }}
                    >
                      {row.tier}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-3)" }}>{row.duration}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-3)" }}>{row.stages}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-2)", fontFamily: "monospace" }}>
                    {row.cost}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: 999,
                        background:
                          row.outcome === "success"
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                        color: row.outcome === "success" ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {row.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gate Log */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Gate Log</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Pre-execution gate tokens · mandatory per BMAD-CE
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {GATE_LOG.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 8,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: entry.status === "active" ? "var(--green)" : "var(--text-4)",
                  flexShrink: 0,
                }}
              />
              <code
                style={{
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: entry.status === "active" ? "var(--accent)" : "var(--text-3)",
                  flex: 1,
                  minWidth: 220,
                }}
              >
                {entry.token}
              </code>
              <span style={{ fontSize: 12, color: "var(--text-2)", flex: 2, minWidth: 160 }}>
                {entry.task}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: TIER_COLOR[entry.tier] + "22",
                  color: TIER_COLOR[entry.tier],
                }}
              >
                {entry.tier}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-4)", minWidth: 120, textAlign: "right" }}>
                {entry.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-stage {
          0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.3); }
          50% { box-shadow: 0 0 16px rgba(59,130,246,0.6); }
        }
      `}</style>
    </div>
  );
}
