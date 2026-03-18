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
    tier: "feature",
    gateToken: "GATE-20260317T214432:54f7348e",
    currentStage: 11,
    stages: ALL_STAGES,
  },
  {
    id: "pipe-002",
    title: "Capabilities graph semantic indexing",
    issueId: "VIV-97",
    tier: "quick",
    gateToken: "GATE-20260318T003812:a1c9f203",
    currentStage: 4,
    stages: ALL_STAGES.slice(0, 14),
  },
];

const HISTORY = [
  { title: "Revenue-OS auth refresh", issueId: "VIV-88", tier: "quick", duration: "18m", cost: "$0.34", outcome: "success" },
  { title: "Supabase RLS policy update", issueId: "VIV-85", tier: "micro", duration: "6m", cost: "$0.07", outcome: "success" },
  { title: "Stripe webhook handler refactor", issueId: "VIV-79", tier: "feature", duration: "1h 42m", cost: "$1.82", outcome: "success" },
  { title: "Linear approval poller crash fix", issueId: "VIV-72", tier: "quick", duration: "24m", cost: "$0.41", outcome: "failed" },
];

const GATE_LOG = [
  { token: "GATE-20260318T003812:a1c9f203", task: "Capabilities graph semantic indexing", tier: "quick", time: "00:38", status: "active" },
  { token: "GATE-20260317T214432:54f7348e", task: "Dashboard v2 — Telemetry page", tier: "feature", time: "21:44", status: "active" },
  { token: "GATE-20260317T183021:b3d22f91", task: "Revenue-OS auth refresh", tier: "quick", time: "18:30", status: "closed" },
  { token: "GATE-20260317T120948:77e8102c", task: "Supabase RLS policy update", tier: "micro", time: "12:09", status: "closed" },
  { token: "GATE-20260316T221503:c0af6d3e", task: "Linear approval poller crash fix", tier: "quick", time: "22:15", status: "closed" },
];

const TIER_COLOR: Record<string, string> = {
  micro: "var(--teal)",
  quick: "var(--blue)",
  feature: "var(--accent)",
  epic: "var(--red)",
};

const TIER_LABEL: Record<string, string> = {
  micro: "Micro",
  quick: "Quick",
  feature: "Feature",
  epic: "Epic",
};

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLOR[tier] ?? "var(--text-4)";
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 999,
        background: color + "22",
        color,
        flexShrink: 0,
      }}
    >
      {TIER_LABEL[tier] ?? tier}
    </span>
  );
}

function StageCircle({ stage, currentStage }: { stage: (typeof ALL_STAGES)[0]; currentStage: number }) {
  const isDone = stage.num < currentStage;
  const isCurrent = stage.num === currentStage;
  const isPending = stage.num > currentStage;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 44 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          position: "relative",
          background: isDone
            ? "var(--green)"
            : isCurrent
            ? "var(--blue)"
            : "transparent",
          border: isPending
            ? "2px solid var(--border)"
            : isDone
            ? "2px solid var(--green)"
            : "2px solid var(--blue)",
          color: isDone || isCurrent ? "#fff" : "var(--text-4)",
          boxShadow: isCurrent ? "0 0 0 4px rgba(59,130,246,0.2)" : "none",
          animation: isCurrent ? "pulse-ring 2s infinite" : "none",
          zIndex: 1,
        }}
      >
        {isDone ? "✓" : stage.num}
      </div>
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: isDone ? "var(--green)" : isCurrent ? "var(--blue)" : "var(--text-4)",
          textAlign: "center",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          maxWidth: 48,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {stage.name}
      </span>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "16px", maxWidth: 960, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>BMAD-CE Pipeline</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4 }}>
          18-stage methodology · Context Scout → Metrics Logger
        </p>
      </div>

      {/* Active Pipelines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Active Pipelines
          </h2>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(59,130,246,0.15)",
              color: "var(--blue)",
            }}
          >
            {ACTIVE_PIPELINES.length}
          </span>
        </div>

        {ACTIVE_PIPELINES.map((pipeline) => {
          const currentStageObj = pipeline.stages.find((s) => s.num === pipeline.currentStage);
          return (
            <div
              key={pipeline.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Pipeline header */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{pipeline.title}</span>
                    <TierBadge tier={pipeline.tier} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-4)",
                        fontFamily: "monospace",
                        background: "var(--accent-bg)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {pipeline.issueId}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-4)" }}>
                      Stage {pipeline.currentStage}/{pipeline.stages.length}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: "var(--text-3)",
                    background: "var(--accent-bg)",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    letterSpacing: "0.04em",
                    maxWidth: "100%",
                    overflowX: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pipeline.gateToken}
                </div>
              </div>

              {/* Stage circles scrollable row */}
              <div style={{ overflowX: "auto", paddingBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", gap: 0 }}>
                  {pipeline.stages.map((stage, i) => (
                    <div key={stage.num} style={{ display: "flex", alignItems: "center" }}>
                      <StageCircle stage={stage} currentStage={pipeline.currentStage} />
                      {i < pipeline.stages.length - 1 && (
                        <div
                          style={{
                            width: 20,
                            height: 2,
                            background: stage.num < pipeline.currentStage ? "var(--green)" : "var(--border)",
                            marginBottom: 18,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current stage callout */}
              {currentStageObj && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    alignSelf: "flex-start",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--blue)",
                      display: "inline-block",
                      animation: "pulse-dot 2s infinite",
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                    Stage {currentStageObj.num}: {currentStageObj.name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-4)" }}>→ {currentStageObj.owner}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pipeline History */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Pipeline History
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {HISTORY.map((row, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderLeftWidth: 3,
                borderLeftColor: row.outcome === "success" ? "var(--green)" : "var(--red)",
                borderLeftStyle: "solid",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", lineHeight: 1.3 }}>{row.title}</div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-4)", marginTop: 3 }}>{row.issueId}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: row.outcome === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    color: row.outcome === "success" ? "var(--green)" : "var(--red)",
                    flexShrink: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {row.outcome}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <TierBadge tier={row.tier} />
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>⏱ {row.duration}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "var(--text-2)" }}>{row.cost}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gate Log */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Gate Log
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Pre-execution gate tokens · mandatory per BMAD-CE
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {GATE_LOG.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                flexWrap: "wrap",
                minHeight: 44,
              }}
            >
              {/* Status dot */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: entry.status === "active" ? "var(--green)" : "var(--text-4)",
                  flexShrink: 0,
                  boxShadow: entry.status === "active" ? "0 0 6px var(--green)" : "none",
                }}
              />
              {/* Token */}
              <code
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: entry.status === "active" ? "var(--accent)" : "var(--text-4)",
                  flex: "1 1 180px",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.token}
              </code>
              {/* Tier badge */}
              <TierBadge tier={entry.tier} />
              {/* Time */}
              <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "monospace", flexShrink: 0 }}>
                {entry.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.05); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
