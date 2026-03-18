"use client";

type FlowStep = { name: string; active: boolean };

interface OrchestraFlow {
  id: string;
  type: string;
  steps: FlowStep[];
  completionPct: number;
  agents: number;
  elapsed: string;
  status: "running" | "stalled";
}

const ACTIVE_FLOWS: OrchestraFlow[] = [
  {
    id: "FLOW-091",
    type: "Purchase Flow",
    steps: [
      { name: "Due Diligence", active: false },
      { name: "Compliance", active: false },
      { name: "Risk", active: true },
      { name: "Pricing", active: false },
      { name: "Admin", active: false },
      { name: "Custody", active: false },
    ],
    completionPct: 42,
    agents: 6,
    elapsed: "2.1 min",
    status: "running",
  },
  {
    id: "FLOW-092",
    type: "Report Flow",
    steps: [
      { name: "Admin", active: false },
      { name: "Pricing", active: false },
      { name: "Compliance", active: false },
      { name: "Reporting", active: true },
      { name: "IR", active: false },
    ],
    completionPct: 68,
    agents: 5,
    elapsed: "3.4 min",
    status: "running",
  },
  {
    id: "FLOW-093",
    type: "Onboarding Flow",
    steps: [
      { name: "Due Diligence", active: false },
      { name: "Compliance", active: true },
      { name: "Risk", active: false },
      { name: "Admin", active: false },
    ],
    completionPct: 25,
    agents: 4,
    elapsed: "0.8 min",
    status: "running",
  },
];

const COORD_STATS = [
  { label: "FLOWS TODAY", value: "23", delta: "+4 vs YSTD" },
  { label: "AVG FLOW TIME", value: "3.8 min", delta: "-0.3 min" },
  { label: "AGENT HANDOFFS", value: "89", delta: "+12 vs YSTD" },
  { label: "CONFLICTS RESOLVED", value: "2", delta: "0 OPEN" },
];

const RECENT_COMPLETIONS = [
  { id: "FLOW-086", type: "Purchase Flow", duration: "3.9 min", agents: 6, result: "SETTLED" },
  { id: "FLOW-087", type: "Report Flow", duration: "4.1 min", agents: 5, result: "DELIVERED" },
  { id: "FLOW-088", type: "Purchase Flow", duration: "3.5 min", agents: 6, result: "SETTLED" },
  { id: "FLOW-089", type: "Onboarding Flow", duration: "6.2 min", agents: 4, result: "ONBOARDED" },
  { id: "FLOW-090", type: "Purchase Flow", duration: "3.7 min", agents: 6, result: "SETTLED" },
];

const FLOW_TYPE_COLOR: Record<string, string> = {
  "Purchase Flow": "var(--accent)",
  "Report Flow": "var(--cyan)",
  "Onboarding Flow": "var(--amber)",
};

function FlowCard({ flow }: { flow: OrchestraFlow }) {
  const accentColor = FLOW_TYPE_COLOR[flow.type] || "var(--accent)";
  const activeIdx = flow.steps.findIndex((s) => s.active);

  return (
    <div className="glass-card p-4" style={{ flex: 1 }}>
      {/* Flow header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)", letterSpacing: "0.12em", marginBottom: 4 }}>
            {flow.id}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            {flow.type}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginBottom: 4 }}>
            <span className="pulse-dot" style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: accentColor, letterSpacing: "0.08em" }}>
              ACTIVE
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)" }}>
            T+{flow.elapsed}
          </div>
        </div>
      </div>

      {/* Steps timeline */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
          {/* Connector line */}
          <div style={{
            position: "absolute",
            top: "50%", left: 0, right: 0,
            height: 1,
            background: "var(--border-subtle)",
            zIndex: 0,
          }} />
          {/* Progress line */}
          <div style={{
            position: "absolute",
            top: "50%", left: 0,
            width: `${(activeIdx / (flow.steps.length - 1)) * 100}%`,
            height: 1,
            background: accentColor,
            boxShadow: `0 0 4px ${accentColor}`,
            zIndex: 1,
          }} />
          {flow.steps.map((step, i) => {
            const done = i < activeIdx;
            const isActive = step.active;
            const upcoming = i > activeIdx;
            return (
              <div key={step.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, gap: 6 }}>
                {/* Node */}
                <div style={{
                  width: isActive ? 14 : 8,
                  height: isActive ? 14 : 8,
                  borderRadius: "50%",
                  background: done ? accentColor : isActive ? accentColor : "hsl(220 20% 10%)",
                  border: `1.5px solid ${done || isActive ? accentColor : "var(--border-subtle)"}`,
                  boxShadow: isActive ? `0 0 10px ${accentColor}, 0 0 20px ${accentColor}33` : "none",
                  transition: "all 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {done && (
                    <svg width="5" height="5" viewBox="0 0 5 5" fill="none">
                      <path d="M1 2.5L2 3.5L4 1.5" stroke="hsl(220 20% 4%)" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                {/* Label */}
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.4rem",
                  letterSpacing: "0.06em",
                  color: isActive ? accentColor : done ? "var(--text-3)" : "var(--text-4)",
                  textAlign: "center",
                  maxWidth: 52,
                  lineHeight: 1.3,
                  fontWeight: isActive ? 700 : 400,
                }}>
                  {step.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress + meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        {/* Progress bar */}
        <div style={{ flex: 1, height: 4, background: "hsl(220 20% 10%)", borderRadius: 1, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${flow.completionPct}%`,
            background: accentColor,
            borderRadius: 1,
            boxShadow: `0 0 6px ${accentColor}`,
          }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: accentColor, minWidth: 28 }}>
          {flow.completionPct}%
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)" }}>
          {flow.agents} AGENTS
        </span>
      </div>
    </div>
  );
}

export default function SymphonyPage() {
  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <span className="pulse-dot" style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} />
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
            SYMPHONY
          </h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginTop: 2 }}>
            MULTI-AGENT ORCHESTRATION · LIVE CONDUCTOR VIEW
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span className="tag-badge">{ACTIVE_FLOWS.length} ACTIVE FLOWS</span>
        </div>
      </div>

      {/* Coordination Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {COORD_STATS.map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)", marginTop: 6 }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Active Flows — Orchestra */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
            ACTIVE ORCHESTRATIONS
          </div>
          <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {ACTIVE_FLOWS.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </div>
      </div>

      {/* Agent legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {Object.entries(FLOW_TYPE_COLOR).map(([type, color]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 4px ${color}` }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)" }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Recent Completions */}
      <div className="glass-card p-4">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 16 }}>
          RECENT COMPLETIONS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "70px 1fr auto auto auto", gap: "0 20px", alignItems: "center" }}>
          {["ID", "FLOW TYPE", "DURATION", "AGENTS", "RESULT"].map((h) => (
            <div key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", letterSpacing: "0.12em", color: "var(--text-4)", paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
              {h}
            </div>
          ))}
          {RECENT_COMPLETIONS.map((c) => {
            const typeColor = FLOW_TYPE_COLOR[c.type] || "var(--accent)";
            return (
              <>
                <div key={c.id + "-id"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)", paddingTop: 10 }}>
                  {c.id}
                </div>
                <div key={c.id + "-t"} style={{ paddingTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: typeColor, boxShadow: `0 0 4px ${typeColor}`, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-1)" }}>
                    {c.type}
                  </span>
                </div>
                <div key={c.id + "-d"} style={{ fontFamily: "var(--font-display)", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", paddingTop: 10, textAlign: "right" }}>
                  {c.duration}
                </div>
                <div key={c.id + "-a"} style={{ paddingTop: 10, textAlign: "center" }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.45rem",
                    background: "hsl(220 20% 4% / 0.5)", border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)", padding: "2px 6px", color: "var(--text-3)",
                  }}>
                    {c.agents} AGT
                  </span>
                </div>
                <div key={c.id + "-r"} style={{ paddingTop: 10, textAlign: "right" }}>
                  <span className="tag-badge">{c.result}</span>
                </div>
              </>
            );
          })}
        </div>
      </div>

      {/* Footer conductor pulse */}
      <div style={{
        marginTop: 20,
        padding: "10px 16px",
        background: "hsl(220 20% 4% / 0.5)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span className="pulse-dot" style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
          CONDUCTOR ONLINE · SYMPHONY ENGINE v2.4.1 · 3 FLOWS ORCHESTRATING · 15 AGENTS ACTIVE · ZERO DEADLOCKS
        </span>
        <div style={{ marginLeft: "auto" }}>
          <span className="tag-badge-cyan">NOMINAL</span>
        </div>
      </div>
    </div>
  );
}
