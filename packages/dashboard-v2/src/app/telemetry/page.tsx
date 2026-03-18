"use client";

const ROI_CARDS = [
  {
    label: "Hours Saved",
    value: "701.2h",
    desc: "vs manual execution estimate",
    icon: "⚡",
    color: "var(--accent)",
  },
  {
    label: "Total Cost",
    value: "$59.96",
    desc: "across all providers this sprint",
    icon: "💸",
    color: "var(--amber)",
  },
  {
    label: "Efficiency",
    value: "$0.09/h",
    desc: "cost per hour of work automated",
    icon: "📈",
    color: "var(--green)",
  },
];

const TOKEN_DAYS = [
  { day: "Mon", input: 84000, output: 22000 },
  { day: "Tue", input: 67000, output: 18000 },
  { day: "Wed", input: 112000, output: 31000 },
  { day: "Thu", input: 95000, output: 26000 },
  { day: "Fri", input: 143000, output: 41000 },
  { day: "Sat", input: 38000, output: 11000 },
  { day: "Sun", input: 51000, output: 14000 },
];

const PROVIDERS = [
  { name: "Anthropic", cost: 12.40, total: 59.96, color: "var(--accent)" },
  { name: "OpenAI", cost: 38.20, total: 59.96, color: "var(--blue)" },
  { name: "Google", cost: 9.36, total: 59.96, color: "var(--teal)" },
  { name: "Supabase", cost: 0.0, total: 59.96, color: "var(--text-4)" },
];

const PROVIDER_HEALTH = [
  {
    name: "Anthropic",
    status: "operational",
    uptime: 99.98,
    lastCheck: "12s ago",
    color: "var(--accent)",
  },
  {
    name: "OpenAI",
    status: "operational",
    uptime: 99.91,
    lastCheck: "12s ago",
    color: "var(--blue)",
  },
  {
    name: "Google AI",
    status: "operational",
    uptime: 99.95,
    lastCheck: "12s ago",
    color: "var(--teal)",
  },
  {
    name: "Supabase",
    status: "operational",
    uptime: 100.0,
    lastCheck: "12s ago",
    color: "var(--green)",
  },
];

const MAX_TOKENS = Math.max(...TOKEN_DAYS.map((d) => d.input + d.output));

export default function TelemetryPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 22, fontWeight: 700 }}>Telemetry & ROI</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 4 }}>
          Usage metrics · cost tracking · provider health
        </p>
      </div>

      {/* ROI Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROI_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px 24px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Accent glow */}
            <div
              style={{
                position: "absolute",
                top: -24,
                right: -24,
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: card.color,
                opacity: 0.07,
                filter: "blur(12px)",
              }}
            />
            <div style={{ fontSize: 22, marginBottom: 10 }}>{card.icon}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: card.color, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginTop: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 3 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Token usage bar chart */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Token Usage</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Last 7 days · input vs output tokens
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span style={{ width: 12, height: 12, borderRadius: 2, background: "var(--accent)", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Input tokens</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 12, height: 12, borderRadius: 2, background: "var(--accent-light)", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Output tokens</span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-3" style={{ height: 160 }}>
          {TOKEN_DAYS.map((day) => {
            const total = day.input + day.output;
            const totalPct = (total / MAX_TOKENS) * 100;
            const inputPct = (day.input / total) * 100;
            const outputPct = (day.output / total) * 100;

            return (
              <div
                key={day.day}
                className="flex flex-col items-center gap-2"
                style={{ flex: 1 }}
              >
                {/* Token count */}
                <div style={{ fontSize: 10, color: "var(--text-4)", textAlign: "center" }}>
                  {(total / 1000).toFixed(0)}k
                </div>

                {/* Stacked bar */}
                <div
                  style={{
                    width: "100%",
                    height: `${totalPct}%`,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "4px 4px 0 0",
                    overflow: "hidden",
                    minHeight: 8,
                  }}
                >
                  {/* Output (top) */}
                  <div
                    style={{
                      height: `${outputPct}%`,
                      background: "var(--accent-light)",
                      opacity: 0.85,
                    }}
                  />
                  {/* Input (bottom) */}
                  <div
                    style={{
                      height: `${inputPct}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>

                {/* Day label */}
                <div style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center" }}>
                  {day.day}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total tokens summary */}
        <div
          className="flex items-center justify-between flex-wrap gap-2"
          style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}
        >
          <span style={{ fontSize: 12, color: "var(--text-4)" }}>
            Total this week:{" "}
            <strong style={{ color: "var(--text-2)" }}>
              {(TOKEN_DAYS.reduce((s, d) => s + d.input + d.output, 0) / 1000).toFixed(0)}k tokens
            </strong>
          </span>
          <span style={{ fontSize: 12, color: "var(--text-4)" }}>
            Input:{" "}
            <strong style={{ color: "var(--text-2)" }}>
              {(TOKEN_DAYS.reduce((s, d) => s + d.input, 0) / 1000).toFixed(0)}k
            </strong>
            {" · "}Output:{" "}
            <strong style={{ color: "var(--text-2)" }}>
              {(TOKEN_DAYS.reduce((s, d) => s + d.output, 0) / 1000).toFixed(0)}k
            </strong>
          </span>
        </div>
      </div>

      {/* Cost breakdown + Provider health side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost breakdown */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "20px 24px",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Cost Breakdown</h2>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              By provider · sprint total ${PROVIDERS.reduce((s, p) => s + p.cost, 0).toFixed(2)}
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {PROVIDERS.map((provider) => {
              const pct = (provider.cost / provider.total) * 100;
              return (
                <div key={provider.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: provider.color,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                        {provider.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-4)",
                        }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text-1)",
                          fontFamily: "monospace",
                        }}
                      >
                        ${provider.cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: "var(--accent-bg)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: provider.color,
                        borderRadius: 999,
                        minWidth: pct > 0 ? 4 : 0,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provider health */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "20px 24px",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>Provider Health</h2>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              Real-time status · uptime this month
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {PROVIDER_HEALTH.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background:
                      p.status === "operational" ? "var(--green)" : "var(--red)",
                    flexShrink: 0,
                    boxShadow:
                      p.status === "operational"
                        ? "0 0 6px var(--green)"
                        : "0 0 6px var(--red)",
                  }}
                  className={p.status === "operational" ? "pulse-dot" : ""}
                />

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>
                    Last checked {p.lastCheck}
                  </div>
                </div>

                {/* Uptime */}
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: p.uptime >= 99.9 ? "var(--green)" : "var(--amber)",
                    }}
                  >
                    {p.uptime.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 1 }}>
                    {p.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
