"use client";

const TOP_STATS = [
  { label: "UPTIME", value: "99.97%", sub: "30d rolling", color: "var(--accent)" },
  { label: "AVG RESPONSE", value: "1.2s", sub: "p50 latency", color: "var(--cyan)" },
  { label: "TOKENS TODAY", value: "847K", sub: "across all agents", color: "var(--text-1)" },
  { label: "COST TODAY", value: "$12.40", sub: "USD est.", color: "var(--amber)" },
];

const TOKEN_AGENTS = [
  { name: "compliance-agent", tokens: 180000, color: "var(--accent)" },
  { name: "gestor-agent", tokens: 150000, color: "var(--cyan)" },
  { name: "risk-agent", tokens: 120000, color: "var(--amber)" },
  { name: "reporting-agent", tokens: 98000, color: "var(--text-2)" },
  { name: "due-diligence-agent", tokens: 87000, color: "var(--text-3)" },
  { name: "custody-agent", tokens: 72000, color: "var(--text-3)" },
  { name: "pricing-agent", tokens: 60000, color: "var(--text-4)" },
  { name: "ir-agent", tokens: 48000, color: "var(--text-4)" },
  { name: "admin-agent", tokens: 32000, color: "var(--text-4)" },
];

const MAX_TOKENS = 180000;

const MODEL_USAGE = [
  { name: "Gemini 2.5 Flash", role: "primary", tokens: 720000, pct: 85, color: "var(--accent)" },
  { name: "Gemini Pro", role: "fallback", tokens: 127000, pct: 15, color: "var(--cyan)" },
];

const LATENCY = [
  { op: "Query", avg: 1.2, unit: "s", bar: 14, color: "var(--cyan)" },
  { op: "Guardrail Check", avg: 0.3, unit: "s", bar: 4, color: "var(--accent)" },
  { op: "Report Generation", avg: 8.5, unit: "s", bar: 100, color: "var(--amber)" },
  { op: "Ingest", avg: 2.1, unit: "s", bar: 25, color: "var(--text-2)" },
];

const MAX_LATENCY = 8.5;

const COST_TREND = [
  { day: "MON", val: 8.2 },
  { day: "TUE", val: 11.5 },
  { day: "WED", val: 9.8 },
  { day: "THU", val: 14.2 },
  { day: "FRI", val: 10.3 },
  { day: "SAT", val: 11.8 },
  { day: "SUN", val: 12.4 },
];

const MAX_COST = 14.2;

const HEALTH = [
  { name: "ChromaDB", status: "healthy", meta: "5,640 docs", color: "var(--accent)" },
  { name: "Moltis Gateway", status: "healthy", meta: "connected", color: "var(--accent)" },
  { name: "API", status: "healthy", meta: "47 req/hr", color: "var(--accent)" },
];

const LABEL_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.5625rem",
  letterSpacing: "0.12em",
  color: "var(--text-4)",
  textTransform: "uppercase" as const,
};

const VALUE_STYLE = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--text-1)",
  letterSpacing: "-0.02em",
};

const SECTION_TITLE = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.625rem",
  letterSpacing: "0.15em",
  color: "var(--text-4)",
  textTransform: "uppercase" as const,
  marginBottom: "0.75rem",
};

export default function TelemetryPage() {
  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
          TELEMETRY
        </h1>
        <span style={{ ...LABEL_STYLE, fontSize: "0.5rem" }}>SYSTEM METRICS &amp; PERFORMANCE</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="pulse-dot" style={{ background: "var(--accent)" }} />
          <span style={LABEL_STYLE}>LIVE</span>
        </div>
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {TOP_STATS.map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div style={LABEL_STYLE}>{s.label}</div>
            <div style={{ ...VALUE_STYLE, color: s.color, marginTop: "0.25rem" }}>{s.value}</div>
            <div style={{ ...LABEL_STYLE, marginTop: "0.25rem", fontSize: "0.5rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Token usage + Model usage row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "0.75rem" }}>

        {/* Token usage by agent */}
        <div className="glass-card p-4">
          <div style={SECTION_TITLE}>TOKEN USAGE — BY AGENT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {TOKEN_AGENTS.map((a) => {
              const pct = (a.tokens / MAX_TOKENS) * 100;
              return (
                <div key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ ...LABEL_STYLE, width: "10rem", flexShrink: 0, fontSize: "0.5rem" }}>{a.name}</div>
                  <div style={{ flex: 1, height: "6px", background: "hsl(220 20% 8%)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: a.color, borderRadius: "var(--radius)", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ ...LABEL_STYLE, width: "3.5rem", textAlign: "right", fontSize: "0.5rem" }}>
                    {a.tokens >= 1000 ? `${Math.round(a.tokens / 1000)}K` : a.tokens}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model usage */}
        <div className="glass-card p-4">
          <div style={SECTION_TITLE}>MODEL USAGE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {MODEL_USAGE.map((m) => (
              <div key={m.name}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-2)", letterSpacing: "0.05em" }}>{m.name}</div>
                    <span className={m.role === "primary" ? "tag-badge" : "tag-badge-cyan"} style={{ marginTop: "0.2rem", display: "inline-block" }}>{m.role}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...VALUE_STYLE, fontSize: "1.125rem", color: m.color }}>{m.pct}%</div>
                    <div style={{ ...LABEL_STYLE, fontSize: "0.5rem" }}>{Math.round(m.tokens / 1000)}K tokens</div>
                  </div>
                </div>
                <div style={{ height: "8px", background: "hsl(220 20% 8%)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <div style={{ width: `${m.pct}%`, height: "100%", background: m.color, borderRadius: "var(--radius)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latency + Cost trend row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>

        {/* Latency by operation */}
        <div className="glass-card p-4">
          <div style={SECTION_TITLE}>LATENCY — BY OPERATION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {LATENCY.map((l) => {
              const pct = (l.avg / MAX_LATENCY) * 100;
              return (
                <div key={l.op}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <div style={LABEL_STYLE}>{l.op}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: l.color, letterSpacing: "0.05em" }}>
                      avg {l.avg}{l.unit}
                    </div>
                  </div>
                  <div style={{ height: "6px", background: "hsl(220 20% 8%)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: l.color, borderRadius: "var(--radius)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost trend */}
        <div className="glass-card p-4">
          <div style={SECTION_TITLE}>COST PROJECTION — LAST 7 DAYS</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "120px", paddingTop: "0.5rem" }}>
            {COST_TREND.map((c, i) => {
              const pct = (c.val / MAX_COST) * 100;
              const isToday = i === COST_TREND.length - 1;
              return (
                <div key={c.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", height: "100%" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div
                      style={{
                        width: "100%",
                        height: `${pct}%`,
                        background: isToday ? "var(--accent)" : "hsl(220 20% 12%)",
                        border: isToday ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius)",
                        position: "relative",
                        transition: "height 0.3s",
                      }}
                    >
                      <div style={{
                        position: "absolute",
                        top: "-1.2rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.4375rem",
                        color: isToday ? "var(--accent)" : "var(--text-4)",
                        whiteSpace: "nowrap",
                      }}>
                        ${c.val}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...LABEL_STYLE, fontSize: "0.4375rem" }}>{c.day}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* System health */}
      <div className="glass-card p-4">
        <div style={SECTION_TITLE}>SYSTEM HEALTH</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {HEALTH.map((h) => (
            <div key={h.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "hsl(220 20% 4% / 0.5)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)" }}>
              <span className="pulse-dot" style={{ background: h.color }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-2)", letterSpacing: "0.05em" }}>{h.name}</div>
                <div style={{ ...LABEL_STYLE, fontSize: "0.5rem", marginTop: "0.15rem" }}>{h.meta}</div>
              </div>
              <span className="tag-badge" style={{ marginLeft: "auto" }}>{h.status}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
