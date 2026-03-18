"use client";

const WORKSPACE_ITEMS = [
  { id: "VIV-93", title: "Supabase capabilities table seed", status: "done", duration: "8m 14s", tokens: "12,440" },
  { id: "VIV-94", title: "Dashboard v2 Telemetry page", status: "done", duration: "22m 07s", tokens: "38,820" },
  { id: "VIV-95", title: "Revenue-OS auth session refresh", status: "done", duration: "11m 53s", tokens: "19,310" },
  { id: "VIV-96", title: "Pipeline page BMAD-CE stages", status: "running", duration: "5m 41s", tokens: "9,640" },
  { id: "VIV-97", title: "Capabilities graph semantic indexing", status: "running", duration: "2m 19s", tokens: "4,210" },
];

const LOG_LINES = [
  { time: "01:09:14", level: "INFO", msg: "Symphony daemon started · poll interval 30s" },
  { time: "01:09:44", level: "INFO", msg: "Linear poll · 2 open issues found (VIV-96, VIV-97)" },
  { time: "01:09:45", level: "INFO", msg: "Spawning pipeline for VIV-96 · tier=Feature" },
  { time: "01:09:46", level: "INFO", msg: "Spawning pipeline for VIV-97 · tier=Quick" },
  { time: "01:10:52", level: "WARN", msg: "VIV-97 context scout returned partial results" },
  { time: "01:11:14", level: "ERROR", msg: "Rate limit hit on Anthropic · retrying in 5s" },
];

const LOG_COLORS: Record<string, string> = {
  INFO: "var(--blue)",
  WARN: "var(--amber)",
  ERROR: "var(--red)",
};

export default function SymphonyPage() {
  const runningCount = WORKSPACE_ITEMS.filter((i) => i.status === "running").length;
  const doneCount = WORKSPACE_ITEMS.filter((i) => i.status === "done").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "16px",
        maxWidth: 960,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Symphony</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4 }}>
          Autonomous daemon · Linear issue poller · BMAD-CE orchestrator
        </p>
      </div>

      {/* Hero stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {/* Daemon status */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--text-4)",
            }}
          >
            Daemon Status
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--green)",
                flexShrink: 0,
                boxShadow: "0 0 10px var(--green)",
                animation: "pulse-dot 2s infinite",
              }}
            />
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Running</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>PID 89563 · 4h 32m uptime</span>
        </div>

        {/* Poll cycle */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--text-4)",
            }}
          >
            Poll Cycle
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>⏱</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text-1)" }}>30s</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>Linear → Jira sync interval</span>
        </div>

        {/* Completed */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--text-4)",
            }}
          >
            Completed
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text-1)" }}>4</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>Issues this session</span>
        </div>
      </div>

      {/* Summary pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text-1)" }}>{runningCount}</strong> running
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text-1)" }}>{doneCount}</strong> done
          </span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-4)" }}>Last poll: 12s ago</span>
      </div>

      {/* Active workspace cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-1)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          Active Workspaces
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {WORKSPACE_ITEMS.map((item) => (
            <div
              key={item.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                borderLeftWidth: 3,
                borderLeftColor: item.status === "done" ? "var(--green)" : "var(--blue)",
                borderLeftStyle: "solid",
                minHeight: 44,
                transition: "transform 0.15s ease",
              }}
            >
              {/* Identifier badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  background: item.status === "done" ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)",
                  color: item.status === "done" ? "var(--green)" : "var(--blue)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              >
                {item.id}
              </span>

              {/* Title */}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  flex: "1 1 160px",
                  minWidth: 0,
                }}
              >
                {item.title}
              </span>

              {/* Status */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: item.status === "done" ? "var(--green)" : "var(--blue)",
                    display: "inline-block",
                    animation: item.status === "running" ? "pulse-dot 2s infinite" : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: item.status === "done" ? "var(--green)" : "var(--blue)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.status}
                </span>
              </div>

              {/* Duration */}
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--text-3)",
                  flexShrink: 0,
                }}
              >
                ⏱ {item.duration}
              </span>

              {/* Token count */}
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--text-4)",
                  flexShrink: 0,
                }}
              >
                {item.tokens} tok
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Log tail */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-1)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Daemon Log
          </h2>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--green)",
              display: "inline-block",
              animation: "pulse-dot 2s infinite",
            }}
          />
        </div>

        <div
          style={{
            background: "#070b12",
            borderRadius: 10,
            padding: "14px 16px",
            fontFamily: "monospace",
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            overflowX: "auto",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {LOG_LINES.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline", minWidth: "max-content" }}>
              <span style={{ color: "#334155", flexShrink: 0 }}>{line.time}</span>
              <span
                style={{
                  color: LOG_COLORS[line.level] ?? "#94a3b8",
                  flexShrink: 0,
                  minWidth: 40,
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                {line.level}
              </span>
              <span style={{ color: "#cbd5e1" }}>{line.msg}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
