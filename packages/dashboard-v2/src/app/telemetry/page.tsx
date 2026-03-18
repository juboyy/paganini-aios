"use client";

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
  { name: "Anthropic", icon: "🟣", cost: 12.40, total: 59.96, pct: 21 },
  { name: "OpenAI", icon: "⚫", cost: 38.20, total: 59.96, pct: 64 },
  { name: "Google", icon: "🔵", cost: 9.36, total: 59.96, pct: 15 },
  { name: "Supabase", icon: "🟢", cost: 0.0, total: 59.96, pct: 0 },
];

const PROVIDER_COLOR: Record<string, string> = {
  Anthropic: "var(--accent)",
  OpenAI: "var(--blue)",
  Google: "var(--teal)",
  Supabase: "var(--green)",
};

const PROVIDER_HEALTH = [
  { name: "Anthropic", uptime: "99.98%", lastCheck: "2m ago" },
  { name: "OpenAI", uptime: "99.91%", lastCheck: "2m ago" },
  { name: "Google AI", uptime: "99.95%", lastCheck: "2m ago" },
  { name: "Supabase", uptime: "100.0%", lastCheck: "2m ago" },
];

const MAX_TOKENS = Math.max(...TOKEN_DAYS.map((d) => d.input + d.output));
const BAR_MAX_PX = 180;

export default function TelemetryPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "16px",
        maxWidth: 1024,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Telemetry & ROI</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4 }}>
          Usage metrics · cost tracking · provider health
        </p>
      </div>

      {/* ROI Hero — Hours saved spans full on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {/* Main hero — 701.2h */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 100%)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: 20,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            position: "relative",
            overflow: "hidden",
          }}
          className="col-span-full sm:col-span-1"
        >
          <div
            style={{
              position: "absolute",
              top: -32,
              right: -32,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "var(--accent)",
              opacity: 0.12,
              filter: "blur(20px)",
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--accent)",
            }}
          >
            Hours Saved
          </span>
          <div style={{ fontSize: 48, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>
            701.2h
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>vs manual execution estimate</div>
        </div>

        {/* Total cost */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(234,179,8,0.04) 100%)",
            border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: 20,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--amber)",
              opacity: 0.12,
              filter: "blur(16px)",
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--amber)",
            }}
          >
            Total Cost
          </span>
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--amber)", lineHeight: 1 }}>
            $59.96
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>across all providers this sprint</div>
        </div>

        {/* Efficiency */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.04) 100%)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 20,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--green)",
              opacity: 0.12,
              filter: "blur(16px)",
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--green)",
            }}
          >
            Efficiency
          </span>
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>
            $0.09/h
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>cost per hour of work automated</div>
        </div>
      </div>

      {/* Token usage bar chart */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Token Usage
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Last 7 days · input vs output</p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--accent)", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Input</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--accent-light)", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Output</span>
          </div>
        </div>

        {/* Bars */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: BAR_MAX_PX + 32,
            paddingBottom: 0,
          }}
        >
          {TOKEN_DAYS.map((day) => {
            const total = day.input + day.output;
            const barH = Math.round((total / MAX_TOKENS) * BAR_MAX_PX);
            const inputH = Math.round((day.input / total) * barH);
            const outputH = barH - inputH;

            return (
              <div
                key={day.day}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {/* Label above */}
                <span style={{ fontSize: 9, color: "var(--text-4)", fontFamily: "monospace", textAlign: "center" }}>
                  {(total / 1000).toFixed(0)}k
                </span>

                {/* Stacked bar */}
                <div
                  style={{
                    width: "100%",
                    height: barH,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "6px 6px 0 0",
                    overflow: "hidden",
                    minHeight: 6,
                  }}
                >
                  {/* Output (top, lighter) */}
                  <div
                    style={{
                      height: outputH,
                      background: "var(--accent-light)",
                      opacity: 0.85,
                    }}
                  />
                  {/* Input (bottom) */}
                  <div
                    style={{
                      height: inputH,
                      background: "var(--accent)",
                    }}
                  />
                </div>

                {/* Day label */}
                <span style={{ fontSize: 10, color: "var(--text-4)", textAlign: "center", fontWeight: 600 }}>
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-4)" }}>
            Total:{" "}
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

      {/* Cost breakdown + Provider health */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {/* Cost breakdown */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Cost Breakdown
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>By provider · sprint total $59.96</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {PROVIDERS.map((provider) => {
              const color = PROVIDER_COLOR[provider.name] ?? "var(--text-4)";
              return (
                <div key={provider.name} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{provider.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{provider.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: "var(--text-4)" }}>{provider.pct}%</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-1)", fontFamily: "monospace" }}>
                        ${provider.cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 7,
                      borderRadius: 999,
                      background: "var(--accent-bg)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${provider.pct}%`,
                        background: color,
                        borderRadius: 999,
                        minWidth: provider.pct > 0 ? 4 : 0,
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
            borderRadius: 16,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Provider Health
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Real-time status · uptime this month</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PROVIDER_HEALTH.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  minHeight: 44,
                }}
              >
                {/* Large pulsing dot */}
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "var(--green)",
                    flexShrink: 0,
                    boxShadow: "0 0 8px var(--green)",
                    animation: "pulse-dot 2s infinite",
                  }}
                />

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 2 }}>Last check {p.lastCheck}</div>
                </div>

                {/* Uptime */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--green)" }}>{p.uptime}</div>
                  <div style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>uptime</div>
                </div>
              </div>
            ))}
          </div>
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
