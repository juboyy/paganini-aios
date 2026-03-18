"use client";

import { useEffect, useState, useRef } from "react";

const EXECUTION_LINES = [
  { ts: "13:04:12", text: 'Orchestrator received: "onboard CNPJ 34.567.890/0001-22"', color: "var(--text-2)" },
  { ts: "13:04:12", text: "→ spawn Agent:DD (depth=1)", color: "var(--accent)" },
  { ts: "13:04:13", text: "  → spawn SubAgent:ReceitaFederal (depth=2)", color: "var(--accent)" },
  { ts: "13:04:14", text: "  → spawn SubAgent:PEPCheck (depth=2)", color: "var(--accent)" },
  { ts: "13:04:15", text: "  ← ReceitaFederal: CNAE 6613-4, 3 sócios, ativa desde 2019", color: "var(--cyan)" },
  { ts: "13:04:15", text: "  ← PEPCheck: 0 matches", color: "var(--cyan)" },
  { ts: "13:04:16", text: "← Agent:DD: Score 91/100 (baixo risco)", color: "var(--cyan)" },
  { ts: "13:04:16", text: "→ spawn Agent:Compliance (depth=1)", color: "var(--accent)" },
  { ts: "13:04:17", text: "  6 gates: ✓ ✓ ✓ ✓ ✓ ✓  ALL PASS", color: "var(--accent)" },
  { ts: "13:04:17", text: "← Agent:Compliance: CLEAR", color: "var(--cyan)" },
  { ts: "13:04:18", text: "→ spawn Agent:KG (depth=1)", color: "var(--accent)" },
  { ts: "13:04:19", text: "  28 entities, 54 edges → ChromaDB", color: "var(--text-2)" },
  { ts: "13:04:19", text: "✓ COMPLETE | 3 agents, 5 sub-agents, 7.2s | depth=2", color: "var(--accent)" },
];

const HOURLY_TASKS = [4, 7, 9, 12, 18, 22, 19, 14, 11, 16, 20, 15, 17, 21, 19, 13, 10, 8, 6, 4, 5, 9, 14, 12];
const DELIVERY_RATE = [96, 98, 97, 99, 98, 97, 99, 98, 99, 98, 97, 99, 98, 98, 99, 98, 97, 99, 98, 98, 99, 98, 99, 98];

const AGENTS = [
  { name: "orchestrator", task: "Coordinating CNPJ onboard batch #247", tokens: "142K", cost: "$0.021" },
  { name: "due-diligence", task: "Analyzing CNPJ 45.234.120/0001-88", tokens: "89K", cost: "$0.013" },
  { name: "compliance", task: "Running 6-gate pipeline on Fundo ABC", tokens: "67K", cost: "$0.010" },
  { name: "knowledge-graph", task: "Ingesting CVM circular 3.822/2025", tokens: "203K", cost: "$0.031" },
  { name: "risk-agent", task: "Scoring cedente batch — 12 positions", tokens: "55K", cost: "$0.008" },
  { name: "fund-manager", task: "Calculating NAV for 4 funds", tokens: "38K", cost: "$0.006" },
  { name: "report-agent", task: "Watching — no active tasks", tokens: "12K", cost: "$0.002" },
  { name: "ingest-agent", task: "Watching — standby", tokens: "8K", cost: "$0.001" },
  { name: "metaclaw", task: "Evaluating 3 pattern candidates", tokens: "44K", cost: "$0.007" },
];

const GATES = ["AUTHZ", "SCHEMA", "SEMANTIC", "RISK-GATE", "COMPLIANCE", "AUDIT"];

function Sparkline({ data, w = 80, h = 28, color = "var(--accent)" }: { data: number[]; w?: number; h?: number; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `${pts} ${w},${h} 0,${h}`;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace(/[^a-z]/gi, "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: active ? "var(--accent)" : "var(--text-4)",
        boxShadow: active ? "0 0 6px var(--accent)" : "none",
        animation: active ? "pulse-neon 2s ease-in-out infinite" : "none",
        flexShrink: 0,
      }}
    />
  );
}

export default function OverviewPage() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const traceRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  // Animate execution trace
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((v) => {
        if (v >= EXECUTION_LINES.length) {
          setTimeout(() => {
            setVisibleLines(0);
            setLoopCount((c) => c + 1);
          }, 2500);
          clearInterval(interval);
          return v;
        }
        return v + 1;
      });
    }, 320);
    return () => clearInterval(interval);
  }, [loopCount]);

  // Scroll trace to bottom
  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight;
    }
  }, [visibleLines]);

  // Tick for live feel
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
            PAGANINI AIOS · COMMAND CENTER
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            AI Operating System{" "}
            <span style={{ color: "var(--accent)", textShadow: "0 0 20px hsl(150 100% 50% / 0.4)" }}>v2.4.1</span>
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <StatusDot />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)" }}>{timeStr}</span>
          <span className="tag-badge">LIVE</span>
        </div>
      </div>

      {/* Top Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {/* Tasks Delivered */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
            TASKS DELIVERED TODAY
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1, fontFamily: "var(--font-mono)" }}>
                {147 + (tick % 3 === 0 ? 1 : 0)}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: "0.25rem" }}>+23 vs yesterday</div>
            </div>
            <Sparkline data={HOURLY_TASKS} />
          </div>
        </div>

        {/* Active Agents */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
            ACTIVE AGENTS
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "var(--text-1)", lineHeight: 1, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "var(--accent)" }}>7</span>
                <span style={{ color: "var(--text-4)", fontSize: "1.25rem" }}>/9</span>
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: "0.25rem" }}>2 watching</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: 60 }}>
              {AGENTS.map((a, i) => (
                <StatusDot key={i} active={i < 7} />
              ))}
            </div>
          </div>
        </div>

        {/* Recursive Depth */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
            RECURSIVE DEPTH
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "var(--cyan)", lineHeight: 1, fontFamily: "var(--font-mono)" }}>2.3</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>avg</div>
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
              max this session: <span style={{ color: "var(--cyan)" }}>6</span>
            </div>
            {/* mini depth bar */}
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "3px", alignItems: "flex-end", height: 20 }}>
              {[6, 12, 8, 20, 15, 10].map((v, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${(v / 20) * 100}%`,
                    background: i === 3 ? "var(--cyan)" : "hsl(180 100% 50% / 0.3)",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
            DELIVERY RATE
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1, fontFamily: "var(--font-mono)" }}>98.3%</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: "0.25rem" }}>SLA: 95.0%</div>
            </div>
            <Sparkline data={DELIVERY_RATE} h={28} color="var(--accent)" />
          </div>
        </div>
      </div>

      {/* Main grid: trace + right column */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1rem", alignItems: "start" }}>
        {/* Live Execution Trace */}
        <div className="glass-card scanline" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
                LIVE EXECUTION TRACE
              </div>
              <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: "0.875rem", marginTop: "2px" }}>Recursive Agent Orchestration</div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <StatusDot />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--accent)" }}>STREAMING</span>
            </div>
          </div>

          <div
            ref={traceRef}
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1rem",
              height: 280,
              overflowY: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              lineHeight: 1.7,
            }}
          >
            {EXECUTION_LINES.slice(0, visibleLines).map((line, i) => (
              <div key={`${loopCount}-${i}`} style={{ display: "flex", gap: "0.75rem", opacity: i < visibleLines - 1 ? 0.85 : 1 }}>
                <span style={{ color: "var(--text-4)", flexShrink: 0 }}>[{line.ts}]</span>
                <span style={{ color: line.color }}>{line.text}</span>
              </div>
            ))}
            {visibleLines > 0 && visibleLines < EXECUTION_LINES.length && (
              <span style={{ color: "var(--accent)", animation: "pulse-neon 1s ease-in-out infinite" }}>█</span>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Cost Efficiency Banner */}
          <div
            className="glass-card"
            style={{
              padding: "1.25rem",
              background: "linear-gradient(135deg, hsl(150 100% 50% / 0.06) 0%, hsl(220 18% 7%) 100%)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              COST EFFICIENCY
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
              555× cheaper
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--accent)", width: 60 }}>AIOS</div>
                <div style={{ flex: 1, height: 8, background: "rgba(0,255,128,0.08)", borderRadius: "1px", overflow: "hidden" }}>
                  <div style={{ width: "0.18%", height: "100%", background: "var(--accent)", borderRadius: "1px" }} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--accent)", width: 48, textAlign: "right" }}>$0.09/h</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-3)", width: 60 }}>HUMAN</div>
                <div style={{ flex: 1, height: 8, background: "rgba(0,255,128,0.08)", borderRadius: "1px", overflow: "hidden" }}>
                  <div style={{ width: "100%", height: "100%", background: "hsl(0 84% 60% / 0.6)", borderRadius: "1px" }} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-3)", width: 48, textAlign: "right" }}>$50/h</div>
              </div>
            </div>
          </div>

          {/* MetaClaw Self-Learning */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              METACLAW · SELF-LEARNING
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🧠</span>
              <div>
                <div style={{ color: "var(--text-1)", fontSize: "0.875rem", fontWeight: 600 }}>3 patterns discovered</div>
                <div style={{ color: "var(--text-3)", fontSize: "0.6875rem" }}>2 skills promoted today</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[
                { skill: "pdd-risk-check", score: "0.31→0.89", status: "PROMOTED" },
                { skill: "covenant-eval", score: "0.54→0.82", status: "PROMOTED" },
                { skill: "cnpj-pep-fast", score: "0.61→0.74", status: "STAGING" },
              ].map((s) => (
                <div
                  key={s.skill}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-2)" }}>{s.skill}</span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)" }}>{s.score}</span>
                    <span className={s.status === "PROMOTED" ? "tag-badge" : "tag-badge-cyan"} style={{ fontSize: "0.5rem", padding: "1px 5px" }}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guardrail Pipeline Strip */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          GUARDRAIL PIPELINE · 6-GATE HARD-STOP
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0px", overflowX: "auto", paddingBottom: "4px" }}>
          {/* INPUT */}
          <div
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.625rem",
              color: "var(--text-3)",
              background: "rgba(0,0,0,0.4)",
            }}
          >
            OPERATION
          </div>

          {GATES.map((gate, i) => (
            <div key={gate} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              {/* Arrow */}
              <svg width={28} height={12} style={{ flexShrink: 0 }}>
                <line x1={2} y1={6} x2={22} y2={6} stroke="var(--accent)" strokeWidth={1} strokeOpacity={0.5} />
                <polygon points="22,3 28,6 22,9" fill="var(--accent)" fillOpacity={0.5} />
              </svg>
              {/* Gate */}
              <div
                style={{
                  flexShrink: 0,
                  padding: "6px 12px",
                  background: "hsl(150 100% 50% / 0.08)",
                  border: "1px solid hsl(150 100% 50% / 0.3)",
                  borderRadius: "var(--radius)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.5625rem",
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  position: "relative",
                }}
              >
                {gate}
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -4,
                    fontSize: "0.5rem",
                    color: "var(--accent)",
                    background: "var(--bg-card)",
                    borderRadius: "50%",
                    width: 14,
                    height: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✓
                </span>
              </div>
            </div>
          ))}

          {/* Arrow to APPROVED */}
          <svg width={28} height={12} style={{ flexShrink: 0 }}>
            <line x1={2} y1={6} x2={22} y2={6} stroke="var(--accent)" strokeWidth={1} strokeOpacity={0.5} />
            <polygon points="22,3 28,6 22,9" fill="var(--accent)" fillOpacity={0.5} />
          </svg>

          {/* APPROVED */}
          <div
            style={{
              flexShrink: 0,
              padding: "6px 16px",
              background: "hsl(150 100% 50% / 0.15)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              color: "var(--accent)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              boxShadow: "0 0 12px hsl(150 100% 50% / 0.3)",
              animation: "pulse-neon 2s ease-in-out infinite",
            }}
          >
            ✓ APPROVED
          </div>
        </div>
      </div>

      {/* Agent Fleet Table */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          AGENT FLEET · LIVE STATUS
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["AGENT", "STATUS", "CURRENT TASK", "TOKENS", "COST"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      color: "var(--text-4)",
                      fontSize: "0.5625rem",
                      letterSpacing: "0.12em",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((agent, i) => {
                const isWatching = agent.task.startsWith("Watching");
                return (
                  <tr
                    key={agent.name}
                    style={{
                      borderBottom: "1px solid hsl(150 100% 50% / 0.04)",
                      background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)" }}>{agent.name}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <StatusDot active={!isWatching} />
                        <span style={{ color: isWatching ? "var(--text-4)" : "var(--text-2)", fontSize: "0.5625rem" }}>
                          {isWatching ? "WATCHING" : "ACTIVE"}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "0.6rem 0.75rem",
                        color: isWatching ? "var(--text-4)" : "var(--text-2)",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.625rem",
                      }}
                    >
                      {agent.task}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--cyan)" }}>{agent.tokens}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>{agent.cost}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-4)" }}>
            TOTAL TODAY:{" "}
            <span style={{ color: "var(--accent)" }}>1.24M tokens</span> ·{" "}
            <span style={{ color: "var(--accent)" }}>$0.19</span>
          </div>
        </div>
      </div>
    </div>
  );
}
