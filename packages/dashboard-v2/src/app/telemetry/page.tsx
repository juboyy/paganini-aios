"use client";

import { useState, useEffect } from "react";

const CSS_VARS = {
  "--bg": "#06060c",
  "--bg-card": "#0a0a14",
  "--border": "rgba(0,255,128,0.08)",
  "--border-subtle": "rgba(0,255,128,0.04)",
  "--text-1": "#e8f0e8",
  "--text-2": "#8fa88f",
  "--text-3": "#4a5e4a",
  "--text-4": "#344038",
  "--accent": "hsl(150 100% 50%)",
  "--cyan": "hsl(180 100% 50%)",
  "--accent-bg": "rgba(0,255,128,0.06)",
  "--font-mono": "'IBM Plex Mono', monospace",
  "--font-display": "'Space Grotesk', sans-serif",
  "--radius": "2px",
} as React.CSSProperties;

// Raw data
const RAW_TOKENS = [45,38,52,61,48,55,72,89,95,102,98,110,105,112,95,88,92,78,65,58,45,38,32,28];
const COMP_TOKENS = [7,6,8,10,8,9,11,14,15,16,15,17,16,18,15,14,15,12,10,9,7,6,5,4];

const AGENTS = [
  { name: "fidc-orchestrator", tasks: 38, latency: 3.2, tokens: 412000, cost: 0.82, success: 99.2 },
  { name: "compliance-agent",  tasks: 31, latency: 5.8, tokens: 389000, cost: 0.78, success: 97.4 },
  { name: "pricing-agent",     tasks: 24, latency: 4.1, tokens: 298000, cost: 0.60, success: 98.8 },
  { name: "risk-agent",        tasks: 18, latency: 6.9, tokens: 245000, cost: 0.49, success: 95.6 },
  { name: "due-diligence",     tasks: 14, latency: 8.2, tokens: 198000, cost: 0.40, success: 98.1 },
  { name: "custody-agent",     tasks: 10, latency: 3.5, tokens: 142000, cost: 0.28, success: 99.5 },
  { name: "reporting-agent",   tasks: 7,  latency: 4.7, tokens: 98000,  cost: 0.20, success: 100 },
  { name: "admin-agent",       tasks: 3,  latency: 2.9, tokens: 52000,  cost: 0.10, success: 100 },
  { name: "ir-agent",          tasks: 2,  latency: 3.8, tokens: 28000,  cost: 0.06, success: 100 },
];

const DAILY_COSTS = [
  5.8,5.5,5.2,5.0,4.9,4.7,4.5,4.4,4.3,4.2,
  4.1,4.0,3.9,3.85,3.8,3.75,3.7,3.65,3.6,3.58,
  3.55,3.52,3.5,3.48,3.46,3.44,3.43,3.42,3.42,3.42
];

// SVG helper: convert array of values to polyline points string
function toPoints(values: number[], w: number, h: number, max: number): string {
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * h * 0.9 - h * 0.05;
    return `${x},${y}`;
  }).join(" ");
}

function toPath(values: number[], w: number, h: number, max: number): string {
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - (v / max) * h * 0.9 - h * 0.05,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return `${line} L${pts[pts.length-1].x},${h} L${pts[0].x},${h} Z`;
}

function Sparkline({ data, color, w = 80, h = 32 }: { data: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...data);
  const pts = toPoints(data, w, h, max);
  const fillPath = toPath(data, w, h, max);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }}>
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#spark-${color.replace(/[^a-z]/gi,'')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function TelemetryPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const maxRaw = Math.max(...RAW_TOKENS);
  const W = 800, H = 160;

  const rawPoints = toPoints(RAW_TOKENS, W, H, maxRaw);
  const rawFill   = toPath(RAW_TOKENS, W, H, maxRaw);
  const compPoints = toPoints(COMP_TOKENS, W, H, maxRaw);
  const compFill   = toPath(COMP_TOKENS, W, H, maxRaw);

  // Daily cost chart
  const maxCost = Math.max(...DAILY_COSTS);
  const costPts = toPoints(DAILY_COSTS, 600, 100, maxCost);
  const costFill = toPath(DAILY_COSTS, 600, 100, maxCost);

  return (
    <div style={{ ...CSS_VARS, background: "var(--bg)", minHeight: "100vh", fontFamily: "var(--font-mono)", color: "var(--text-1)", padding: "24px 20px" }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)", animation: tick % 2 === 0 ? "none" : "none", opacity: tick % 2 === 0 ? 1 : 0.6 }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>TELEMETRY / TOKEN ECONOMICS</span>
          <span className="tag-badge" style={{ marginLeft: "auto", fontSize: 10 }}>LIVE</span>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 11, letterSpacing: 1 }}>AI-OS RUNTIME METRICS · LAST 24H · AUTO-REFRESH 2s</p>
      </div>

      {/* TOP STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "TASKS TODAY",       value: "147",   sub: "+12 vs yesterday", color: "var(--accent)", data: [8,12,15,10,14,18,22,19,17,21,15,12,11,14,16,18,20,17,14,11,9,8,6,5] },
          { label: "AVG TIME / TASK",   value: "4.7s",  sub: "↓ 0.3s optimized",  color: "var(--cyan)",   data: [6.2,5.8,5.5,5.4,5.1,5.0,4.9,4.8,4.8,4.7,4.7,4.7,4.7,4.6,4.7,4.8,4.7,4.7,4.7,4.6,4.7,4.7,4.7,4.7] },
          { label: "TOKENS CONSUMED",   value: "2.4M",  sub: "85% compressed",    color: "var(--accent)", data: [120,98,145,180,140,160,210,260,280,310,295,340,310,340,285,265,280,235,195,175,135,115,95,84] },
          { label: "DELIVERY RATE",     value: "98.3%", sub: "↑ 0.4% this week",  color: "#00ff88",       data: [97,97.5,97.8,98,97.9,98.1,98.2,98.3,98.2,98.4,98.3,98.3,98.4,98.3,98.3,98.2,98.3,98.3,98.4,98.3,98.3,98.3,98.3,98.3] },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: "16px 18px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "var(--text-3)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", margin: "6px 0 10px" }}>{s.sub}</div>
            <Sparkline data={s.data} color={s.color} w={140} h={32} />
          </div>
        ))}
      </div>

      {/* TOKEN CONSUMPTION DUAL-LAYER CHART */}
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 4 }}>TOKEN CONSUMPTION — 24H HOURLY</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>RAW vs RTK-Compressed · Gap = Savings</div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 2, background: "#f59e0b" }} />
              <span style={{ fontSize: 10, color: "var(--text-2)" }}>RAW tokens</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 2, background: "var(--accent)" }} />
              <span style={{ fontSize: 10, color: "var(--text-2)" }}>COMPRESSED</span>
            </div>
            <div className="tag-badge" style={{ fontSize: 9, background: "rgba(0,255,128,0.15)", color: "var(--accent)" }}>RTK SAVINGS: 85%</div>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
          <defs>
            <linearGradient id="rawGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(150,100%,50%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(150,100%,50%)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={0} y1={H * (1 - f * 0.9) - H * 0.05} x2={W} y2={H * (1 - f * 0.9) - H * 0.05}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4" />
          ))}
          {/* Hour labels */}
          {[0,6,12,18,23].map(h => (
            <text key={h} x={(h/(RAW_TOKENS.length-1))*W} y={H-2} fontSize="9" fill="rgba(255,255,255,0.25)" textAnchor="middle">{h}h</text>
          ))}
          {/* RAW fill + line */}
          <path d={rawFill} fill="url(#rawGrad)" />
          <polyline points={rawPoints} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          {/* COMPRESSED fill + line (on top) */}
          <path d={compFill} fill="url(#compGrad)" />
          <polyline points={compPoints} fill="none" stroke="hsl(150,100%,50%)" strokeWidth="2" />
          {/* Savings annotation at peak */}
          <line x1={(13/23)*W} y1={H - (112/maxRaw)*H*0.9 - H*0.05} x2={(13/23)*W} y2={H - (18/maxRaw)*H*0.9 - H*0.05}
            stroke="rgba(0,255,128,0.4)" strokeWidth="1" strokeDasharray="3,3" />
          <rect x={(13/23)*W + 4} y={H*0.25} width={100} height={18} rx="1" fill="rgba(0,255,128,0.15)" stroke="rgba(0,255,128,0.3)" strokeWidth="0.5" />
          <text x={(13/23)*W + 8} y={H*0.25+12} fontSize="9" fill="hsl(150,100%,50%)" fontFamily="IBM Plex Mono">RTK SAVINGS: 85%</text>
        </svg>
        {/* Hour scale */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {["00h","04h","08h","12h","16h","20h","23h"].map(l => (
            <span key={l} style={{ fontSize: 9, color: "var(--text-3)" }}>{l}</span>
          ))}
        </div>
      </div>

      {/* COST COMPARISON + RTK CARD — two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>

        {/* Cost Comparison */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>COST COMPARISON — DAILY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {/* Human */}
            <div style={{ padding: "14px 16px", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius)", background: "rgba(239,68,68,0.04)" }}>
              <div style={{ fontSize: 9, letterSpacing: 1, color: "#ef4444", marginBottom: 8 }}>👤 HUMAN ANALYSTS</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "#ef4444" }}>$2,000</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>per day</div>
              <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-2)", lineHeight: 1.8 }}>
                <div>5 analysts</div>
                <div>$50/hr × 8hr</div>
                <div>15–25 tasks/day</div>
              </div>
            </div>
            {/* AIOS */}
            <div style={{ padding: "14px 16px", border: "1px solid rgba(0,255,128,0.15)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.04)" }}>
              <div style={{ fontSize: 9, letterSpacing: 1, color: "var(--accent)", marginBottom: 8 }}>🤖 PAGANINI AIOS</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--accent)" }}>$3.42</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>per day</div>
              <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-2)", lineHeight: 1.8 }}>
                <div>9 agents</div>
                <div>RTK compressed</div>
                <div>147 tasks/day</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "12px", border: "1px solid rgba(0,255,128,0.2)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.06)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--accent)", letterSpacing: 1 }}>ROI: 584× COST EFFICIENCY</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>$2,000 → $3.42 · 147 tasks vs 15–25</div>
          </div>
        </div>

        {/* RTK Details */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>RTK COMPRESSION ENGINE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              background: `conic-gradient(hsl(150 100% 50%) 0deg ${85 * 3.6}deg, rgba(255,255,255,0.06) ${85 * 3.6}deg 360deg)`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              position: "relative"
            }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>85%</div>
                <div style={{ fontSize: 8, color: "var(--text-3)" }}>RATIO</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { l: "VERSION",         v: "v0.30.0",  c: "var(--text-1)" },
                { l: "SAVINGS TODAY",   v: "$24.58",   c: "var(--accent)" },
                { l: "MONTHLY PROJ.",   v: "$748",     c: "var(--accent)" },
                { l: "TOKENS SAVED",    v: "~2.04M",   c: "var(--cyan)"   },
                { l: "STATUS",          v: "ACTIVE",   c: "var(--accent)" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1 }}>{r.l}</span>
                  <span style={{ fontSize: 10, color: r.c, fontWeight: 600 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1, marginBottom: 6 }}>PATH</div>
          <div style={{ fontSize: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", background: "rgba(0,255,128,0.04)", padding: "6px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)" }}>~/.local/bin/rtk</div>
        </div>
      </div>

      {/* AGENT PERFORMANCE TABLE */}
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 14 }}>AGENT PERFORMANCE MATRIX — 9 AGENTS · SORTED BY TASKS DESC</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["AGENT", "TASKS", "AVG LATENCY", "TOKENS", "COST $", "SUCCESS"].map(h => (
                  <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontSize: 9, letterSpacing: 1.5, color: "var(--text-3)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-1)" }}>{a.name}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{a.tasks}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11, color: a.latency < 5 ? "var(--accent)" : "#f59e0b", fontWeight: 600 }}>{a.latency}s</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-2)", fontSize: 10 }}>
                    {a.tokens >= 1000000 ? `${(a.tokens/1000000).toFixed(2)}M` : `${(a.tokens/1000).toFixed(0)}k`}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-1)", fontSize: 11 }}>${a.cost.toFixed(2)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${a.success}%`, height: "100%", background: a.success >= 99 ? "var(--accent)" : a.success >= 97 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span style={{ fontSize: 10, color: a.success >= 99 ? "var(--accent)" : a.success >= 97 ? "#f59e0b" : "#ef4444" }}>{a.success}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COST BREAKDOWN + DAILY TREND — two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Cost Breakdown Stacked Bar */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>COST BREAKDOWN — TODAY $3.42</div>
          {[
            { label: "LLM INFERENCE",       pct: 60, amt: "$2.05", color: "hsl(150,100%,50%)" },
            { label: "EMBEDDING GENERATION", pct: 25, amt: "$0.86", color: "hsl(180,100%,50%)" },
            { label: "VECTOR SEARCH",        pct: 10, amt: "$0.34", color: "hsl(120,80%,65%)"  },
            { label: "INFRASTRUCTURE",       pct: 5,  amt: "$0.17", color: "hsl(150,40%,40%)"  },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, letterSpacing: 1, color: "var(--text-2)" }}>{s.label}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.pct}%</span>
                  <span style={{ fontSize: 10, color: "var(--text-2)" }}>{s.amt}</span>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
          {/* Stacked horizontal bar */}
          <div style={{ marginTop: 16, height: 16, borderRadius: 1, overflow: "hidden", display: "flex" }}>
            {[
              { pct: 60, color: "hsl(150,100%,50%)" },
              { pct: 25, color: "hsl(180,100%,50%)" },
              { pct: 10, color: "hsl(120,80%,65%)" },
              { pct: 5,  color: "hsl(150,40%,40%)" },
            ].map((s, i) => (
              <div key={i} style={{ width: `${s.pct}%`, height: "100%", background: s.color }} />
            ))}
          </div>
          <div style={{ marginTop: 4, fontSize: 8, color: "var(--text-3)", display: "flex", justifyContent: "space-between" }}>
            <span>LLM 60%</span><span>EMB 25%</span><span>VEC 10%</span><span>INF 5%</span>
          </div>
        </div>

        {/* Daily Cost Trend */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 4 }}>DAILY COST TREND — 30 DAYS</div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 12 }}>Downward trend as RTK + self-learning optimize</div>
          <svg viewBox="0 0 600 100" style={{ width: "100%", height: 100, display: "block" }}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(150,100%,50%)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(150,100%,50%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[1,2,3,4,5].map(f => (
              <line key={f} x1={0} y1={f*16} x2={600} y2={f*16}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            <path d={costFill} fill="url(#costGrad)" />
            <polyline points={costPts} fill="none" stroke="hsl(150,100%,50%)" strokeWidth="2" />
            {/* Start/End labels */}
            <text x="4" y="20" fontSize="9" fill="#f59e0b">$5.8</text>
            <text x="560" y={100-(3.42/maxCost)*100*0.9-5+8} fontSize="9" fill="hsl(150,100%,50%)">$3.42</text>
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>Mar 1</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>↓ 41% reduction</span>
            </div>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>Mar 30</span>
          </div>
          {/* Y axis labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
            {["DAY 1: $5.80", "DAY 15: $3.80", "DAY 30: $3.42", "Δ -$2.38/day"].map((l, i) => (
              <span key={i} style={{ fontSize: 9, color: i === 3 ? "var(--accent)" : "var(--text-3)" }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .glass-card { backdrop-filter: blur(8px); }
        .tag-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 9px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1px;
          font-weight: 600;
          border: 1px solid rgba(0,255,128,0.2);
          background: rgba(0,255,128,0.08);
          color: hsl(150 100% 50%);
          text-transform: uppercase;
        }
        .tag-badge-cyan {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 9px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1px;
          font-weight: 600;
          border: 1px solid rgba(0,255,255,0.2);
          background: rgba(0,255,255,0.08);
          color: hsl(180 100% 50%);
          text-transform: uppercase;
        }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
