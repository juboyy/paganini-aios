"use client";

const STATS = [
  { label: "TOTAL NAV", value: "R$ 245.8M", delta: "+2.3%", color: "var(--accent)" },
  { label: "AGENTS ACTIVE", value: "9/9", delta: "NOMINAL", color: "var(--cyan)" },
  { label: "GUARDRAILS", value: "6/6", delta: "ALL PASS", color: "var(--accent)" },
  { label: "COST/HOUR", value: "$0.09", delta: "-12%", color: "var(--cyan)" },
];

const AGENTS = [
  { name: "Administrador", status: "active", tasks: 14, latency: "1.2s" },
  { name: "Compliance", status: "active", tasks: 23, latency: "0.8s" },
  { name: "Custódia", status: "active", tasks: 8, latency: "1.5s" },
  { name: "Due Diligence", status: "active", tasks: 5, latency: "2.1s" },
  { name: "Gestor", status: "active", tasks: 18, latency: "1.1s" },
  { name: "IR", status: "idle", tasks: 3, latency: "—" },
  { name: "Pricing", status: "active", tasks: 12, latency: "0.9s" },
  { name: "Reg Watch", status: "watching", tasks: 2, latency: "—" },
  { name: "Reporting", status: "active", tasks: 7, latency: "1.4s" },
];

const ACTIVITY = [
  { time: "12:34", agent: "Compliance", action: "Covenant check passed — subordination ratio 28.5%", type: "pass" },
  { time: "12:31", agent: "Pricing", action: "PDD recalculated — portfolio aging updated", type: "info" },
  { time: "12:28", agent: "Due Diligence", action: "New cedente scored: CNPJ 12.345.678/0001-90 → Score 87", type: "info" },
  { time: "12:25", agent: "Guardrail", action: "Concentration alert: Cedente ABC at 13.8% (limit 15%)", type: "warn" },
  { time: "12:20", agent: "Gestor", action: "Allocation rebalanced — R$ 4.2M reallocated to lower risk", type: "info" },
  { time: "12:15", agent: "Reg Watch", action: "New CVM publication detected — Circular 4.021", type: "alert" },
];

const GATES = [
  { name: "ELIGIBILITY", status: "pass" },
  { name: "CONCENTRATION", status: "pass" },
  { name: "COVENANT", status: "pass" },
  { name: "PLD/AML", status: "pass" },
  { name: "COMPLIANCE", status: "pass" },
  { name: "RISK", status: "pass" },
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "8px" }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: s.color, marginTop: "4px" }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Guardrail Gate Strip */}
      <div className="glass-card p-4">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "12px" }}>
          GUARDRAIL GATES — REAL-TIME STATUS
        </div>
        <div className="flex flex-wrap gap-2">
          {GATES.map((g, i) => (
            <div key={g.name} className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.625rem",
                  letterSpacing: "0.08em",
                  background: "hsl(150 100% 50% / 0.06)",
                  border: "1px solid hsl(150 100% 50% / 0.2)",
                  borderRadius: "var(--radius)",
                  color: "var(--accent)",
                }}
              >
                <span style={{ fontSize: "0.5rem" }}>●</span>
                {g.name}
              </div>
              {i < GATES.length - 1 && (
                <span style={{ color: "var(--text-4)", fontSize: "0.625rem", fontFamily: "var(--font-mono)" }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Agent Fleet */}
        <div className="lg:col-span-2 glass-card p-4">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "12px" }}>
            AGENT FLEET STATUS
          </div>
          <div className="space-y-1">
            {AGENTS.map((a) => (
              <div
                key={a.name}
                className="flex items-center justify-between py-2 px-3"
                style={{
                  borderRadius: "var(--radius)",
                  background: "hsl(220 20% 4% / 0.5)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={a.status === "active" ? "pulse-dot" : ""}
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: a.status === "active" ? "var(--accent)" : a.status === "watching" ? "var(--cyan)" : "var(--text-4)",
                      boxShadow: a.status === "active" ? "0 0 6px var(--accent)" : a.status === "watching" ? "0 0 6px var(--cyan)" : "none",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8125rem", color: "var(--text-1)", fontWeight: 500 }}>
                    {a.name}
                  </span>
                </div>
                <div className="flex items-center gap-4" style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem" }}>
                  <span style={{ color: "var(--text-3)" }}>{a.tasks} tasks</span>
                  <span style={{ color: "var(--text-4)", width: "36px", textAlign: "right" }}>{a.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-4">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "12px" }}>
            ACTIVITY LOG
          </div>
          <div className="space-y-2">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="pb-2" style={{ borderBottom: i < ACTIVITY.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)",
                  }}>
                    {a.time}
                  </span>
                  <span className={a.type === "warn" ? "tag-badge" : a.type === "alert" ? "tag-badge-cyan" : "tag-badge"} style={
                    a.type === "warn" ? { background: "hsl(45 100% 50% / 0.1)", color: "var(--amber)", borderColor: "hsl(45 100% 50% / 0.3)" }
                    : a.type === "alert" ? { background: "hsl(0 84% 60% / 0.1)", color: "var(--red)", borderColor: "hsl(0 84% 60% / 0.3)" }
                    : {}
                  }>
                    {a.agent}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-2)", lineHeight: 1.5 }}>
                  {a.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
