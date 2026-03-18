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

type SkillType = "ABSTRACT" | "SPECIALIST" | "ORCHESTRATOR";

const SKILLS: Array<{
  name: string; version: string; type: SkillType;
  hash: string; deps: string[]; tokens: number; load: "SUMMARY" | "FULL";
  color: string;
}> = [
  { name: "fidc-orchestrator",      version: "1.0.0", type: "ORCHESTRATOR", hash: "a3f8d2e1",  deps: ["fidc-rules-base","compliance-agent"], tokens: 981, load: "FULL",    color: "#f59e0b" },
  { name: "fidc-rules-base",        version: "1.0.0", type: "ABSTRACT",     hash: "7c2b1a9f",  deps: [],                                   tokens: 241, load: "SUMMARY", color: "#a78bfa" },
  { name: "compliance-agent",       version: "1.0.0", type: "SPECIALIST",   hash: "d5e4c3b2",  deps: ["fidc-rules-base"],                  tokens: 736, load: "FULL",    color: "hsl(180,100%,50%)" },
  { name: "pricing-agent",          version: "1.0.0", type: "SPECIALIST",   hash: "f1a0e9d8",  deps: [],                                   tokens: 147, load: "FULL",    color: "hsl(180,100%,50%)" },
  { name: "admin-agent",            version: "1.0.0", type: "SPECIALIST",   hash: "e2b3c4d5",  deps: [],                                   tokens: 145, load: "FULL",    color: "hsl(180,100%,50%)" },
  { name: "due-diligence-agent",    version: "1.0.0", type: "SPECIALIST",   hash: "c6d7e8f9",  deps: ["fidc-rules-base"],                  tokens: 189, load: "FULL",    color: "hsl(180,100%,50%)" },
  { name: "custody-agent",          version: "1.0.0", type: "SPECIALIST",   hash: "b0a1b2c3",  deps: [],                                   tokens: 98,  load: "SUMMARY", color: "hsl(180,100%,50%)" },
  { name: "risk-agent",             version: "1.0.0", type: "SPECIALIST",   hash: "9f8e7d6c",  deps: ["fidc-rules-base"],                  tokens: 312, load: "FULL",    color: "hsl(180,100%,50%)" },
  { name: "reporting-agent",        version: "1.0.0", type: "SPECIALIST",   hash: "5b4a3b2c",  deps: [],                                   tokens: 87,  load: "SUMMARY", color: "hsl(180,100%,50%)" },
  { name: "ir-agent",               version: "1.0.0", type: "SPECIALIST",   hash: "1c2d3e4f",  deps: [],                                   tokens: 78,  load: "SUMMARY", color: "hsl(180,100%,50%)" },
  { name: "regwatch-agent",         version: "1.0.0", type: "SPECIALIST",   hash: "f6e5d4c3",  deps: ["fidc-rules-base"],                  tokens: 124, load: "SUMMARY", color: "hsl(180,100%,50%)" },
];

const TOTAL_BUDGET = 3138;

const SKILL_EVOLUTIONS: Array<{
  date: string; name: string;
  scores: number[]; status: "PROMOTED" | "LEARNING" | "OBSERVING" | "PRUNED";
}> = [
  { date: "Mar 01", name: "compliance-pdd-check",       scores: [0.31, 0.67, 0.87], status: "PROMOTED" },
  { date: "Mar 05", name: "covenant-subordination-calc", scores: [0.45, 0.72, 0.91], status: "PROMOTED" },
  { date: "Mar 09", name: "cedente-cnpj-validator",      scores: [0.28, 0.55, 0.63], status: "LEARNING" },
  { date: "Mar 12", name: "nav-reconciliation-check",    scores: [0.19, 0.41],       status: "LEARNING" },
  { date: "Mar 15", name: "cvm-circular-parser",         scores: [0.12],             status: "OBSERVING" },
  { date: "Mar 17", name: "bacen-3040-formatter",        scores: [0.08],             status: "PRUNED" },
];

const AUTORESEARCH_PRECISION = [0.72, 0.74, 0.77, 0.79, 0.81, 0.83, 0.85, 0.87, 0.89, 0.91];

const TYPE_BADGE: Record<SkillType, { bg: string; border: string; color: string }> = {
  ABSTRACT:     { bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", color: "#a78bfa" },
  SPECIALIST:   { bg: "rgba(0,255,255,0.06)",  border: "rgba(0,255,255,0.2)",    color: "hsl(180,100%,50%)" },
  ORCHESTRATOR: { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)", color: "#f59e0b" },
};

const STATUS_BADGE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  PROMOTED:  { bg: "rgba(0,255,128,0.1)",  border: "rgba(0,255,128,0.3)", color: "hsl(150,100%,50%)", label: "PROMOTED ✓" },
  LEARNING:  { bg: "rgba(0,255,255,0.08)", border: "rgba(0,255,255,0.2)", color: "hsl(180,100%,50%)", label: "LEARNING" },
  OBSERVING: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)", color: "#4a5e4a", label: "OBSERVING" },
  PRUNED:    { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#ef4444", label: "PRUNED ✗" },
};

const SEGMENT_COLORS = [
  "#00ff80","#00ffff","#a78bfa","#f59e0b","#34d399","#60a5fa","#fb923c","#f472b6","#4ade80","#38bdf8","#c084fc"
];

function AutoresearchChart({ data }: { data: number[] }) {
  const W = 200, H = 60;
  const min = 0.7, max = 0.95;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H * 0.85 - H * 0.075;
    return `${x},${y}`;
  }).join(" ");
  const fillPath = (() => {
    const ps = data.map((v, i) => ({
      x: (i / (data.length - 1)) * W,
      y: H - ((v - min) / (max - min)) * H * 0.85 - H * 0.075,
    }));
    return ps.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + ` L${ps[ps.length-1].x},${H} L${ps[0].x},${H} Z`;
  })();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}>
      <defs>
        <linearGradient id="arGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(150,100%,50%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(150,100%,50%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#arGrad)" />
      <polyline points={pts} fill="none" stroke="hsl(150,100%,50%)" strokeWidth="1.5" />
    </svg>
  );
}

export default function CapabilitiesPage() {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ ...CSS_VARS, background: "var(--bg)", minHeight: "100vh", fontFamily: "var(--font-mono)", color: "var(--text-1)", padding: "24px 20px" }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>CAPABILITIES / SELF-LEARNING</span>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 11, letterSpacing: 1 }}>SKILLS MARKETPLACE · METACLAW ENGINE · PROGRESSIVE LOADING</p>
      </div>

      {/* INSTALLED SKILLS HEADER */}
      <div className="glass-card" style={{ padding: "16px 24px", border: "1px solid rgba(0,255,128,0.15)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.04)", marginBottom: 20, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent)", opacity: pulse ? 1 : 0.4, transition: "opacity 0.3s" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>11 Skills Loaded</span>
        </div>
        <div style={{ width: 1, height: 24, background: "var(--border)" }} />
        <div>
          <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: 1 }}>CONTEXT BUDGET</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--cyan)", marginLeft: 10 }}>3,138 tokens</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {(["ABSTRACT","SPECIALIST","ORCHESTRATOR"] as SkillType[]).map(t => (
            <div key={t} style={{ padding: "3px 10px", borderRadius: "var(--radius)", border: `1px solid ${TYPE_BADGE[t].border}`, background: TYPE_BADGE[t].bg, fontSize: 9, color: TYPE_BADGE[t].color, letterSpacing: 1 }}>{t}</div>
          ))}
        </div>
      </div>

      {/* SKILLS LIST */}
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 14 }}>INSTALLED SKILLS — 11 ACTIVE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SKILLS.map((sk, i) => {
            const tb = TYPE_BADGE[sk.type];
            const pct = ((sk.tokens / TOTAL_BUDGET) * 100).toFixed(1);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 60px", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "rgba(0,255,128,0.015)" : "transparent" }}>
                {/* Name + badge */}
                <div style={{ display: "flex", align: "center", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>{sk.name}</span>
                  <span style={{ fontSize: 9, color: "var(--text-3)" }}>@{sk.version}</span>
                  <div style={{ padding: "1px 6px", borderRadius: "var(--radius)", border: `1px solid ${tb.border}`, background: tb.bg, fontSize: 8, color: tb.color, letterSpacing: 0.5 }}>{sk.type}</div>
                </div>
                {/* Hash */}
                <div style={{ fontSize: 9, color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>#{sk.hash}</div>
                {/* Deps */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {sk.deps.length === 0
                    ? <span style={{ fontSize: 9, color: "var(--text-4)" }}>—</span>
                    : sk.deps.map((d, j) => <span key={j} className="tag-badge" style={{ fontSize: 8, padding: "1px 5px" }}>{d.split("-")[0]}</span>)
                  }
                </div>
                {/* Token bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: SEGMENT_COLORS[i] }}>{sk.tokens}t</span>
                    <span style={{ fontSize: 8, color: "var(--text-4)" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: SEGMENT_COLORS[i] }} />
                  </div>
                </div>
                {/* Load level */}
                <div style={{ fontSize: 9, color: sk.load === "FULL" ? "var(--accent)" : "var(--text-3)", letterSpacing: 0.5 }}>[{sk.load}]</div>
                {/* Integrity */}
                <div style={{ fontSize: 8, color: "var(--accent)", opacity: 0.6 }}>✓ OK</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DEP TREE + CONTEXT BUDGET VIZ — two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>

        {/* Dependency Tree */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 14 }}>DEPENDENCY TREE</div>
          <pre style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-2)", lineHeight: 1.9, margin: 0, overflowX: "auto" }}>{`🎯 fidc-orchestrator@1.0.0 (981 tokens)
  📚 fidc-rules-base@1.0.0 (241 tokens) [SUMMARY]
  🔧 compliance-agent@1.0.0 (736 tokens) [FULL]
    📚 fidc-rules-base@1.0.0 (deduped)
  🔧 pricing-agent@1.0.0 (147 tokens) [FULL]
  🔧 admin-agent@1.0.0 (145 tokens) [FULL]
  🔧 due-diligence-agent@1.0.0 [FULL]
  🔧 custody-agent@1.0.0 [SUMMARY]
  🔧 risk-agent@1.0.0 [FULL]
  🔧 reporting-agent@1.0.0 [SUMMARY]
  🔧 ir-agent@1.0.0 [SUMMARY]
  🔧 regwatch-agent@1.0.0 [SUMMARY]`}
          </pre>
        </div>

        {/* Context Budget Visualization */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 14 }}>CONTEXT BUDGET ALLOCATION — {TOTAL_BUDGET} TOKENS</div>
          {/* Stacked bar */}
          <div style={{ display: "flex", height: 20, borderRadius: 1, overflow: "hidden", marginBottom: 12 }}>
            {SKILLS.map((sk, i) => (
              <div key={i} title={`${sk.name}: ${sk.tokens}t`} style={{ width: `${(sk.tokens/TOTAL_BUDGET)*100}%`, background: SEGMENT_COLORS[i] }} />
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            {SKILLS.map((sk, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 1, background: SEGMENT_COLORS[i], flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sk.name.replace("-agent","").replace("fidc-","")}</span>
                <span style={{ fontSize: 8, color: "var(--text-4)", marginLeft: "auto" }}>{sk.tokens}t</span>
              </div>
            ))}
          </div>
          {/* Progressive loading comparison */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "10px 12px", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius)", background: "rgba(239,68,68,0.04)" }}>
              <div style={{ fontSize: 8, color: "#ef4444", letterSpacing: 1, marginBottom: 6 }}>WITHOUT PROGRESSIVE LOADING</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#ef4444" }}>~10,000</div>
              <div style={{ fontSize: 9, color: "var(--text-3)" }}>tokens</div>
            </div>
            <div style={{ padding: "10px 12px", border: "1px solid rgba(0,255,128,0.15)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.04)" }}>
              <div style={{ fontSize: 8, color: "var(--accent)", letterSpacing: 1, marginBottom: 6 }}>WITH PROGRESSIVE LOADING</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>3,138</div>
              <div style={{ fontSize: 9, color: "var(--text-3)" }}>tokens</div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 10, padding: "8px", border: "1px solid rgba(0,255,128,0.15)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.06)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>69% TOKEN SAVINGS</span>
          </div>
        </div>
      </div>

      {/* ===== SELF-LEARNING SECTION ===== */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 10px var(--cyan)", opacity: pulse ? 1 : 0.4, transition: "opacity 0.3s" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>🧠 SELF-LEARNING ENGINE — METACLAW</span>
          <div className="tag-badge-cyan" style={{ fontSize: 9 }}>ACTIVE</div>
        </div>
      </div>

      {/* SKILL EVOLUTION TIMELINE + AUTORESEARCH — two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 20 }}>

        {/* Skill Evolution Timeline */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid rgba(0,255,255,0.1)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>SKILL EVOLUTION TIMELINE — MetaClaw discover → score → promote</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {SKILL_EVOLUTIONS.map((ev, i) => {
              const sb = STATUS_BADGE[ev.status];
              const isLearning = ev.status === "LEARNING";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 12, alignItems: "center" }}>
                  {/* Date */}
                  <span style={{ fontSize: 9, color: "var(--text-4)" }}>{ev.date}</span>
                  {/* Name + score bar */}
                  <div>
                    <div style={{ fontSize: 10, color: ev.status === "PRUNED" ? "var(--text-4)" : ev.status === "OBSERVING" ? "var(--text-3)" : "var(--text-1)", marginBottom: 5, textDecoration: ev.status === "PRUNED" ? "line-through" : "none", display: "flex", alignItems: "center", gap: 8 }}>
                      {ev.name}
                    </div>
                    {/* Score progression */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 8, color: "var(--text-3)" }}>discovered</span>
                      {ev.scores.map((sc, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 8, color: "var(--text-4)" }}>→</span>
                          <div style={{
                            width: 28, height: 16, borderRadius: 1,
                            background: sc >= 0.8 ? "rgba(0,255,128,0.15)" : sc >= 0.5 ? "rgba(0,255,255,0.1)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${sc >= 0.8 ? "rgba(0,255,128,0.3)" : sc >= 0.5 ? "rgba(0,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontSize: 7.5, color: sc >= 0.8 ? "var(--accent)" : sc >= 0.5 ? "var(--cyan)" : "var(--text-3)", fontWeight: 600 }}>{sc.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {/* Score progress mini bar */}
                      <div style={{ flex: 1, marginLeft: 4, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                        <div style={{
                          width: `${(ev.scores[ev.scores.length - 1]) * 100}%`,
                          height: "100%",
                          background: ev.status === "PROMOTED" ? "var(--accent)" : ev.status === "LEARNING" ? "var(--cyan)" : ev.status === "PRUNED" ? "#ef4444" : "var(--text-4)",
                          transition: "width 1s ease",
                        }} />
                      </div>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div style={{
                    padding: "3px 8px", borderRadius: "var(--radius)",
                    border: `1px solid ${sb.border}`, background: sb.bg,
                    fontSize: 8, color: sb.color, letterSpacing: 0.5, whiteSpace: "nowrap",
                    animation: isLearning ? "none" : "none",
                    opacity: isLearning ? pulse ? 1 : 0.7 : 1,
                    transition: "opacity 0.3s",
                  }}>{sb.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AutoResearch Results */}
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid rgba(0,255,255,0.1)", borderRadius: "var(--radius)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)" }}>AUTORESEARCH — LAST RUN</div>
          <div style={{ padding: "12px 14px", border: "1px solid rgba(0,255,128,0.12)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.03)" }}>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 8 }}>Mar 18 · 10 iterations</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>PRECISION</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>0.91</div>
                <div style={{ fontSize: 9, color: "#4ade80" }}>+26.4% from 0.72</div>
              </div>
              <AutoresearchChart data={AUTORESEARCH_PRECISION} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { k: "chunk_size",  v: "1024" },
                { k: "top_k",       v: "8" },
                { k: "similarity",  v: "0.75" },
                { k: "iterations",  v: "10" },
              ].map((r, i) => (
                <div key={i} style={{ padding: "6px 8px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.02)" }}>
                  <div style={{ fontSize: 8, color: "var(--text-3)", letterSpacing: 1 }}>{r.k}</div>
                  <div style={{ fontSize: 11, color: "var(--cyan)", fontWeight: 600 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1, marginBottom: 4 }}>NEXT AUTORESEARCH</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden", marginTop: 4 }}>
              <div style={{ width: "67%", height: "100%", background: "var(--accent)" }} />
            </div>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>67% complete</span>
          </div>
          <div style={{ padding: "10px 12px", border: "1px solid rgba(0,255,255,0.1)", borderRadius: "var(--radius)", background: "rgba(0,255,255,0.03)", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)", lineHeight: 1.7 }}>
            <div>🔬 Testing chunk_size=[512,1024,2048]</div>
            <div>📊 top_k=[4,6,8,10]</div>
            <div>⚡ similarity=[0.65,0.75,0.85]</div>
            <div style={{ color: "var(--accent)", marginTop: 4 }}>→ eta: ~12 iterations</div>
          </div>
        </div>
      </div>

      {/* MARKETPLACE ROADMAP */}
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>SKILLS MARKETPLACE — ROADMAP</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            {
              name: "Banking Pack", eta: "Q3 2026", skills: 14,
              desc: "Core banking operations: credit analysis, covenant monitoring, LCI/LCA compliance, BACEN reporting.",
              status: "IN DEVELOPMENT", color: "#f59e0b",
            },
            {
              name: "Asset Management", eta: "Q4 2026", skills: 19,
              desc: "Portfolio optimization, NAV reconciliation, CVM reporting, fund manager compliance.",
              status: "PLANNED", color: "var(--cyan)",
            },
            {
              name: "Insurance Pack", eta: "Q1 2027", skills: 11,
              desc: "SUSEP compliance, actuarial modeling, claims processing, reinsurance analytics.",
              status: "ROADMAP", color: "var(--text-3)",
            },
          ].map((p, i) => (
            <div key={i} style={{ padding: "16px 18px", border: `1px solid ${p.color === "var(--text-3)" ? "var(--border-subtle)" : `rgba(${p.color === "#f59e0b" ? "245,158,11" : "0,255,255"},0.15)`}`, borderRadius: "var(--radius)", background: "rgba(255,255,255,0.02)", opacity: i === 0 ? 1 : i === 1 ? 0.85 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{p.name}</div>
                <div style={{ padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 8, color: p.color, letterSpacing: 1 }}>{p.status}</div>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 10 }}>{p.desc}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 9, color: p.color, fontWeight: 600 }}>{p.skills} skills</div>
                <div style={{ fontSize: 9, color: "var(--text-4)" }}>{p.eta}</div>
              </div>
            </div>
          ))}
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
          div[style*="gridTemplateColumns: 3fr 2fr"],
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
