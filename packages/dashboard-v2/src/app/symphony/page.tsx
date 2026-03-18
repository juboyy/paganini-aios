"use client";

const WORKSPACE_ITEMS = [
  {
    id: "VIV-93",
    title: "Supabase capabilities table seed",
    status: "done",
    duration: "8m 14s",
    tokens: "12,440",
  },
  {
    id: "VIV-94",
    title: "Dashboard v2 Telemetry page",
    status: "done",
    duration: "22m 07s",
    tokens: "38,820",
  },
  {
    id: "VIV-95",
    title: "Revenue-OS auth session refresh",
    status: "done",
    duration: "11m 53s",
    tokens: "19,310",
  },
  {
    id: "VIV-96",
    title: "Pipeline page BMAD-CE stages",
    status: "running",
    duration: "5m 41s",
    tokens: "9,640",
  },
  {
    id: "VIV-97",
    title: "Capabilities graph semantic indexing",
    status: "running",
    duration: "2m 19s",
    tokens: "4,210",
  },
];

const STAT_CARDS = [
  {
    label: "Daemon",
    value: "Running",
    indicator: true,
    indicatorColor: "var(--green)",
    icon: null,
    desc: "Symphony process active",
  },
  {
    label: "Poll Cycle",
    value: "30s",
    indicator: false,
    indicatorColor: null,
    icon: "⏱️",
    desc: "Linear → Jira sync interval",
  },
  {
    label: "Completed",
    value: "4 issues",
    indicator: false,
    indicatorColor: null,
    icon: "✅",
    desc: "This session",
  },
];

export default function SymphonyPage() {
  const runningCount = WORKSPACE_ITEMS.filter((i) => i.status === "running").length;
  const doneCount = WORKSPACE_ITEMS.filter((i) => i.status === "done").length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 22, fontWeight: 700 }}>Symphony</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 4 }}>
          Autonomous daemon · Linear issue poller · BMAD-CE orchestrator
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 20px 18px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {card.label}
            </div>
            <div className="flex items-center gap-2">
              {card.indicator && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: card.indicatorColor!,
                    display: "inline-block",
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${card.indicatorColor}`,
                  }}
                  className="pulse-dot"
                />
              )}
              {card.icon && <span style={{ fontSize: 20 }}>{card.icon}</span>}
              <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)" }}>
                {card.value}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 6 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Status summary bar */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", display: "inline-block" }}
            className="pulse-dot"
          />
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text-1)" }}>{runningCount}</strong> running
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text-1)" }}>{doneCount}</strong> done
          </span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-4)" }}>
          Last poll: 12s ago
        </div>
      </div>

      {/* Workspace table */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 16px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Workspace Issues</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Issues processed this session · VIV sprint
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  borderTop: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--accent-bg)",
                }}
              >
                {["ID", "Title", "Status", "Duration", "Tokens"].map((h) => (
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
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WORKSPACE_ITEMS.map((item, i) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: i < WORKSPACE_ITEMS.length - 1 ? "1px solid var(--border)" : "none",
                    background: item.status === "running" ? "rgba(59,130,246,0.03)" : "transparent",
                  }}
                >
                  <td style={{ padding: "13px 16px" }}>
                    <code style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-3)", fontWeight: 600 }}>
                      {item.id}
                    </code>
                  </td>
                  <td style={{ padding: "13px 16px", color: "var(--text-2)", fontWeight: 500 }}>
                    {item.title}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background:
                          item.status === "done"
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(59,130,246,0.15)",
                        color: item.status === "done" ? "var(--green)" : "var(--blue)",
                      }}
                    >
                      {item.status === "running" && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--blue)",
                            display: "inline-block",
                          }}
                          className="pulse-dot"
                        />
                      )}
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", color: "var(--text-3)", fontFamily: "monospace", fontSize: 12 }}>
                    {item.duration}
                  </td>
                  <td style={{ padding: "13px 16px", color: "var(--text-3)", fontFamily: "monospace", fontSize: 12 }}>
                    {item.tokens}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log tail */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", marginBottom: 12 }}>
          Daemon Log
        </h2>
        <div
          style={{
            background: "#0b0b13",
            borderRadius: 8,
            padding: "14px 16px",
            fontFamily: "monospace",
            fontSize: 12,
            color: "#94a3b8",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[
            { time: "01:09:14", level: "INFO", msg: "Symphony daemon started · poll interval 30s" },
            { time: "01:09:44", level: "INFO", msg: "Linear poll · 2 open issues found (VIV-96, VIV-97)" },
            { time: "01:09:45", level: "INFO", msg: "Spawning pipeline for VIV-96 · tier=Feature" },
            { time: "01:09:46", level: "INFO", msg: "Spawning pipeline for VIV-97 · tier=Quick" },
            { time: "01:10:14", level: "INFO", msg: "Poll cycle complete · next in 30s" },
            { time: "01:10:44", level: "INFO", msg: "VIV-96 → Stage 4 (Architect) · agent=architect" },
            { time: "01:10:52", level: "WARN", msg: "VIV-97 context scout returned partial results" },
            { time: "01:11:14", level: "INFO", msg: "Poll cycle · no new issues" },
          ].map((line, i) => (
            <div key={i} className="flex gap-3">
              <span style={{ color: "#475569", flexShrink: 0 }}>{line.time}</span>
              <span
                style={{
                  color:
                    line.level === "WARN"
                      ? "var(--amber)"
                      : line.level === "ERROR"
                      ? "var(--red)"
                      : "var(--green)",
                  flexShrink: 0,
                  minWidth: 36,
                }}
              >
                {line.level}
              </span>
              <span style={{ color: "#cbd5e1" }}>{line.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
