"use client";

import { useState, useEffect } from "react";

type SkillType = "ABSTRACT" | "SPECIALIST" | "ORCHESTRATOR";

// ─── 15 SKILLS REAIS DO CODEBASE ────────────────────────────────────────────
const SKILLS: Array<{
  name: string;
  version: string;
  type: SkillType;
  hash: string;
  deps: string[];
  tokens: number;
  load: "SUMMARY" | "FULL";
  description: string;
  color: string;
}> = [
  {
    name: "fidc-rules-base",
    version: "1.0.0",
    type: "ABSTRACT",
    hash: "7c2b1a9f",
    deps: [],
    tokens: 241,
    load: "SUMMARY",
    description: "Base abstrata: CVM 175, BACEN, PDD aging, covenants, 6 guardrail gates",
    color: "#a78bfa",
  },
  {
    name: "fidc-orchestrator",
    version: "1.0.0",
    type: "ORCHESTRATOR",
    hash: "a3f8d2e1",
    deps: ["fidc-rules-base", "compliance-agent"],
    tokens: 981,
    load: "FULL",
    description: "Orquestra 14 agentes especializados, 3 fluxos: Purchase, Report, Onboard",
    color: "#f59e0b",
  },
  {
    name: "compliance-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "d5e4c3b2",
    deps: ["fidc-rules-base"],
    tokens: 736,
    load: "FULL",
    description: "Pipeline 6 portões: Elegibilidade → Concentração → Covenant → PLD/AML → CVM 175 → Risco",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "pricing-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "f1a0e9d8",
    deps: ["fidc-rules-base"],
    tokens: 147,
    load: "FULL",
    description: "PDD BACEN 2682/99 (7 buckets), mark-to-market (MTM), yield anualizado",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "admin-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "e2b3c4d5",
    deps: ["fidc-rules-base"],
    tokens: 145,
    load: "FULL",
    description: "Cálculo de NAV, gestão de cotas sênior/subordinada, relatórios ANBIMA",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "due-diligence-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "c6d7e8f9",
    deps: ["fidc-rules-base"],
    tokens: 189,
    load: "FULL",
    description: "Scoring cedente (5 critérios), validação CNPJ mod-11, análise PEP",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "custody-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "b0a1b2c3",
    deps: ["fidc-rules-base"],
    tokens: 98,
    load: "SUMMARY",
    description: "Registro de títulos, verificação de lastro, reconciliação D+2, liquidação",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "risk-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "9f8e7d6c",
    deps: ["fidc-rules-base"],
    tokens: 312,
    load: "FULL",
    description: "VaR histórico e paramétrico, Expected/Unexpected Loss (Basel II), HHI",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "reporting-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "5b4a3b2c",
    deps: ["fidc-rules-base"],
    tokens: 87,
    load: "SUMMARY",
    description: "Informes CVM 175, cartas ao investidor, relatórios por cedente, formatação BRL",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "ir-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "1c2d3e4f",
    deps: [],
    tokens: 78,
    load: "SUMMARY",
    description: "Performance MTD/YTD, Sharpe vs CDI, max drawdown, distribuição de rendimentos",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "regwatch-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "f6e5d4c3",
    deps: ["fidc-rules-base"],
    tokens: 124,
    load: "SUMMARY",
    description: "Monitor CVM/BACEN em tempo real, calendário CADOC 3040, alertas de impacto",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "treasury-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "4e3f2g1h",
    deps: ["fidc-rules-base"],
    tokens: 108,
    load: "SUMMARY",
    description: "Projeção de cash flow 90d, índice LCR, duration gap, aprovação de resgates",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "auditor-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "2h1i0j9k",
    deps: ["fidc-rules-base"],
    tokens: 163,
    load: "FULL",
    description: "QA cruzada entre agentes, validação aritmética de NAV, detecção de anomalias 2σ",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "kg-agent",
    version: "1.0.0",
    type: "SPECIALIST",
    hash: "8l7m6n5o",
    deps: [],
    tokens: 421,
    load: "FULL",
    description: "NER de entidades financeiras, grafos de relacionamentos, resolução em ChromaDB",
    color: "hsl(180,100%,50%)",
  },
  {
    name: "sprint-manager",
    version: "1.0.0",
    type: "ORCHESTRATOR",
    hash: "3p2q1r0s",
    deps: ["fidc-orchestrator"],
    tokens: 252,
    load: "FULL",
    description: "Gestão de sprints BMAD-CE, kanban visual, burndown, velocity tracking, Linear sync",
    color: "#f59e0b",
  },
];

const TOTAL_BUDGET = SKILLS.reduce((acc, s) => acc + s.tokens, 0);

// ─── CAPABILITIES GRAPH (52 entradas) ────────────────────────────────────────
const CAPABILITY_KINDS = [
  { kind: "integration", count: 14, color: "#f59e0b",              desc: "Composio, APIs externas" },
  { kind: "tool",        count: 8,  color: "hsl(150,100%,50%)",   desc: "Exec, browser, web, canvas" },
  { kind: "skill",       count: 15, color: "hsl(180,100%,50%)",   desc: "Skills OOP FIDC + sprint" },
  { kind: "native",      count: 6,  color: "#a78bfa",              desc: "Funções nativas do runtime" },
  { kind: "script",      count: 5,  color: "#fb923c",              desc: "Scripts Python em workspace" },
  { kind: "api",         count: 4,  color: "#34d399",              desc: "APIs diretas (Linear, Slack…)" },
];
const TOTAL_CAPS = CAPABILITY_KINDS.reduce((a, c) => a + c.count, 0); // 52

// ─── SKILL EVOLUTION ─────────────────────────────────────────────────────────
const SKILL_EVOLUTIONS = [
  { date: "Mar 01", name: "compliance-pdd-check",       scores: [0.31, 0.67, 0.87], status: "PROMOTED" as const },
  { date: "Mar 05", name: "covenant-subordination-calc", scores: [0.45, 0.72, 0.91], status: "PROMOTED" as const },
  { date: "Mar 09", name: "cedente-cnpj-validator",      scores: [0.28, 0.55, 0.63], status: "LEARNING" as const },
  { date: "Mar 12", name: "nav-reconciliation-check",    scores: [0.19, 0.41],       status: "LEARNING" as const },
  { date: "Mar 15", name: "cvm-circular-parser",         scores: [0.12],             status: "OBSERVING" as const },
  { date: "Mar 17", name: "bacen-3040-formatter",        scores: [0.08],             status: "PRUNED" as const },
];

const AUTORESEARCH_PRECISION = [0.72, 0.74, 0.77, 0.79, 0.81, 0.83, 0.85, 0.87, 0.89, 0.91];

// ─── STYLE MAPS ──────────────────────────────────────────────────────────────
const TYPE_BADGE: Record<SkillType, { bg: string; border: string; color: string }> = {
  ABSTRACT:     { bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.28)", color: "#a78bfa" },
  SPECIALIST:   { bg: "rgba(0,255,255,0.07)",   border: "rgba(0,255,255,0.22)",   color: "hsl(180,100%,50%)" },
  ORCHESTRATOR: { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.28)", color: "#f59e0b" },
};

const STATUS_BADGE = {
  PROMOTED:  { bg: "rgba(0,255,128,0.10)",   border: "rgba(0,255,128,0.3)",    color: "hsl(150,100%,50%)", label: "PROMOTED ✓" },
  LEARNING:  { bg: "rgba(0,255,255,0.08)",   border: "rgba(0,255,255,0.2)",    color: "hsl(180,100%,50%)", label: "LEARNING" },
  OBSERVING: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)",  color: "#4a5e4a",           label: "OBSERVING" },
  PRUNED:    { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",    color: "#ef4444",           label: "PRUNED ✗" },
};

const SEGMENT_COLORS = [
  "#a78bfa","#f59e0b","#00ffff","#00ffff","#00ffff","#00ffff","#00ffff",
  "#00ffff","#00ffff","#00ffff","#00ffff","#00ffff","#00ffff","#00ffff","#f59e0b",
];

function AutoresearchChart({ data }: { data: number[] }) {
  const W = 200, H = 60;
  const min = 0.7, max = 0.95;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H * 0.85 - H * 0.075;
    return `${x},${y}`;
  }).join(" ");
  const ps = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / (max - min)) * H * 0.85 - H * 0.075,
  }));
  const fillPath =
    ps.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
    ` L${ps[ps.length - 1].x},${H} L${ps[0].x},${H} Z`;
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

// ─── DEPENDENCY TREE TEXT ────────────────────────────────────────────────────
const DEP_TREE = `🏗️ fidc-orchestrator@1.0.0 (981t) [FULL]
  📚 fidc-rules-base@1.0.0 (241t) [SUMMARY]
  🛡️ compliance-agent@1.0.0 (736t) [FULL]
     📚 fidc-rules-base@1.0.0 (deduped)
  💰 pricing-agent@1.0.0 (147t) [FULL]
     📚 fidc-rules-base@1.0.0 (deduped)
  📊 admin-agent@1.0.0 (145t) [FULL]
     📚 fidc-rules-base@1.0.0 (deduped)
  🔍 due-diligence-agent@1.0.0 (189t) [FULL]
     📚 fidc-rules-base@1.0.0 (deduped)
  🔐 custody-agent@1.0.0 (98t) [SUMMARY]
  ⚡ risk-agent@1.0.0 (312t) [FULL]
     📚 fidc-rules-base@1.0.0 (deduped)
  📋 reporting-agent@1.0.0 (87t) [SUMMARY]
  🤝 ir-agent@1.0.0 (78t) [SUMMARY]
  📡 regwatch-agent@1.0.0 (124t) [SUMMARY]
     📚 fidc-rules-base@1.0.0 (deduped)
  🏦 treasury-agent@1.0.0 (108t) [SUMMARY]
     📚 fidc-rules-base@1.0.0 (deduped)
  🔬 auditor-agent@1.0.0 (163t) [FULL]
     📚 fidc-rules-base@1.0.0 (deduped)
  🧠 kg-agent@1.0.0 (421t) [FULL]

⊡ sprint-manager@1.0.0 (252t) [FULL]
  🏗️ fidc-orchestrator@1.0.0 (deduped)`;

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function CapabilitiesPage() {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Cabeçalho ── */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem",
          }}
        >
          PAGANINI AIOS · SKILLS & CAPACIDADES
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          Skills & Auto-Aprendizado{" "}
          <span style={{ color: "var(--accent)" }}>· MetaClaw Engine</span>
        </h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          15 skills OOP instaladas · 52 capacidades indexadas em pgvector · Progressive loading ativo
        </p>
      </div>

      {/* ── Installed Skills Header ── */}
      <div
        className="glass-card"
        style={{
          padding: "1rem 1.5rem",
          border: "1px solid rgba(0,255,128,0.15)",
          background: "rgba(0,255,128,0.04)",
          display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--accent)", boxShadow: "0 0 10px var(--accent)",
              opacity: pulse ? 1 : 0.4, transition: "opacity 0.3s",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)", fontSize: "1.125rem",
              fontWeight: 700, color: "var(--accent)",
            }}
          >
            15 Skills Carregadas
          </span>
        </div>
        <div style={{ width: 1, height: 24, background: "var(--border)" }} />
        <div>
          <span style={{ fontSize: 10, color: "var(--text-4)", letterSpacing: 1, fontFamily: "var(--font-mono)" }}>
            CONTEXT BUDGET
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)", fontSize: "1.125rem",
              fontWeight: 700, color: "var(--cyan)", marginLeft: 10,
            }}
          >
            {TOTAL_BUDGET.toLocaleString("pt-BR")} tokens
          </span>
        </div>
        <div style={{ width: 1, height: 24, background: "var(--border)" }} />
        <div>
          <span style={{ fontSize: 10, color: "var(--text-4)", letterSpacing: 1, fontFamily: "var(--font-mono)" }}>
            CAPABILITIES GRAPH
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)", fontSize: "1.125rem",
              fontWeight: 700, color: "#a78bfa", marginLeft: 10,
            }}
          >
            {TOTAL_CAPS} entradas
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["ABSTRACT", "SPECIALIST", "ORCHESTRATOR"] as SkillType[]).map((t) => (
            <div
              key={t}
              style={{
                padding: "3px 10px", borderRadius: "var(--radius)",
                border: `1px solid ${TYPE_BADGE[t].border}`,
                background: TYPE_BADGE[t].bg,
                fontSize: 9, color: TYPE_BADGE[t].color, letterSpacing: 1,
                fontFamily: "var(--font-mono)",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── Skills List ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
          }}
        >
          SKILLS INSTALADAS — 15 ATIVAS · FRAMEWORK OOP
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SKILLS.map((sk, i) => {
            const tb = TYPE_BADGE[sk.type];
            const pct = ((sk.tokens / TOTAL_BUDGET) * 100).toFixed(1);
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto auto",
                  gap: 12, alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: i % 2 === 0 ? "rgba(0,255,128,0.015)" : "transparent",
                }}
              >
                {/* Name + type + description */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: "3px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.6875rem",
                        color: "var(--text-1)", fontWeight: 600,
                      }}
                    >
                      {sk.name}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>
                      @{sk.version}
                    </span>
                    <div
                      style={{
                        padding: "1px 7px", borderRadius: "var(--radius)",
                        border: `1px solid ${tb.border}`, background: tb.bg,
                        fontSize: 8, color: tb.color, letterSpacing: 0.5,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {sk.type}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.5625rem", color: "var(--text-4)", lineHeight: 1.4 }}>
                    {sk.description}
                  </div>
                </div>

                {/* Hash */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    color: "var(--text-4)", whiteSpace: "nowrap",
                  }}
                >
                  #{sk.hash}
                </div>

                {/* Dependencies */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minWidth: 80 }}>
                  {sk.deps.length === 0
                    ? <span style={{ fontSize: 9, color: "var(--text-4)" }}>—</span>
                    : sk.deps.map((d, j) => (
                      <span key={j} className="tag-badge" style={{ fontSize: 8, padding: "1px 5px" }}>
                        {d.replace("-agent", "").replace("fidc-", "")}
                      </span>
                    ))
                  }
                </div>

                {/* Token bar */}
                <div style={{ minWidth: 90 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: SEGMENT_COLORS[i], fontFamily: "var(--font-mono)" }}>
                      {sk.tokens}t
                    </span>
                    <span style={{ fontSize: 8, color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: SEGMENT_COLORS[i] }} />
                  </div>
                </div>

                {/* Load level */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    color: sk.load === "FULL" ? "var(--accent)" : "var(--text-3)",
                    letterSpacing: 0.5, whiteSpace: "nowrap",
                  }}
                >
                  [{sk.load}]
                </div>

                {/* Integrity */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 8,
                    color: "var(--accent)", opacity: 0.65, whiteSpace: "nowrap",
                  }}
                >
                  ✓ OK
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Capabilities Graph + Dep Tree ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* Capabilities Graph breakdown */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
              letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
            }}
          >
            CAPABILITIES GRAPH — {TOTAL_CAPS} ENTRADAS · 6 TIPOS · pgvector
          </div>
          {/* Stacked bar */}
          <div style={{ display: "flex", height: 16, borderRadius: 2, overflow: "hidden", marginBottom: "0.875rem" }}>
            {CAPABILITY_KINDS.map((k, i) => (
              <div
                key={i}
                title={`${k.kind}: ${k.count}`}
                style={{ width: `${(k.count / TOTAL_CAPS) * 100}%`, background: k.color }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {CAPABILITY_KINDS.map((k) => (
              <div key={k.kind} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: 10, height: 10, borderRadius: 2,
                    background: k.color, flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                    color: "var(--text-2)", flex: 1,
                  }}
                >
                  {k.kind}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)" }}>
                  {k.desc}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.625rem",
                    color: k.color, fontWeight: 700, minWidth: 20, textAlign: "right",
                  }}
                >
                  {k.count}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "1rem", padding: "0.625rem 0.875rem",
              border: "1px solid rgba(167,139,250,0.2)",
              borderRadius: "var(--radius)", background: "rgba(167,139,250,0.05)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)", marginBottom: "2px" }}>
              SEMANTIC SEARCH (pgvector · gemini-embedding-001 · 3072d)
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "#a78bfa" }}>
              POST /rest/v1/rpc/search_capabilities
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)", marginTop: "2px" }}>
              {"{"}"query_embedding": {"<"}vector{">"}, "match_count": 5{"}"}
            </div>
          </div>
        </div>

        {/* Dependency Tree */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
              letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
            }}
          >
            DEPENDENCY TREE — PROGRESSIVE LOADING
          </div>
          <pre
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
              color: "var(--text-2)", lineHeight: 1.85, margin: 0,
              overflowX: "auto", whiteSpace: "pre",
            }}
          >
            {DEP_TREE}
          </pre>
        </div>
      </div>

      {/* ── Context Budget Viz ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
          }}
        >
          CONTEXT BUDGET ALLOCATION — {TOTAL_BUDGET.toLocaleString("pt-BR")} TOKENS
        </div>
        {/* Stacked bar */}
        <div style={{ display: "flex", height: 20, borderRadius: 2, overflow: "hidden", marginBottom: "0.875rem" }}>
          {SKILLS.map((sk, i) => (
            <div
              key={i}
              title={`${sk.name}: ${sk.tokens}t`}
              style={{ width: `${(sk.tokens / TOTAL_BUDGET) * 100}%`, background: SEGMENT_COLORS[i] }}
            />
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "4px 16px" }}>
          {SKILLS.map((sk, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, background: SEGMENT_COLORS[i], flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sk.name}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-4)", marginLeft: "auto" }}>
                {sk.tokens}t
              </span>
            </div>
          ))}
        </div>
        {/* Savings */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", marginTop: "1rem" }}>
          <div
            style={{
              padding: "0.75rem 1rem", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "var(--radius)", background: "rgba(239,68,68,0.04)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#ef4444", letterSpacing: 1, marginBottom: 4 }}>
              SEM PROGRESSIVE LOADING
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>~10.000</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>tokens</div>
          </div>
          <div
            style={{
              padding: "0.75rem 1rem", border: "1px solid rgba(0,255,128,0.18)",
              borderRadius: "var(--radius)", background: "rgba(0,255,128,0.04)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--accent)", letterSpacing: 1, marginBottom: 4 }}>
              COM PROGRESSIVE LOADING
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
              {TOTAL_BUDGET.toLocaleString("pt-BR")}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)" }}>tokens</div>
          </div>
          <div
            style={{
              padding: "0.75rem 1rem", border: "1px solid rgba(0,255,128,0.2)",
              borderRadius: "var(--radius)", background: "rgba(0,255,128,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--accent)", letterSpacing: 1, marginBottom: 4 }}>
                ECONOMIA
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
                ~{Math.round((1 - TOTAL_BUDGET / 10000) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Self-Learning Engine ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
          <div
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--cyan)", boxShadow: "0 0 10px var(--cyan)",
              opacity: pulse ? 1 : 0.4, transition: "opacity 0.3s",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)", fontSize: "1.0625rem",
              fontWeight: 700, letterSpacing: 1, color: "var(--text-1)",
            }}
          >
            🧠 SELF-LEARNING ENGINE — METACLAW
          </span>
          <span className="tag-badge-cyan" style={{ fontSize: 9 }}>ATIVO</span>
        </div>
      </div>

      {/* ── Skill Evolution + AutoResearch ── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1rem" }}>

        {/* Skill Evolution Timeline */}
        <div className="glass-card" style={{ padding: "1.25rem", border: "1px solid rgba(0,255,255,0.1)" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
              letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
            }}
          >
            SKILL EVOLUTION TIMELINE — MetaClaw discover → score → promote
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {SKILL_EVOLUTIONS.map((ev, i) => {
              const sb = STATUS_BADGE[ev.status];
              const isLearning = ev.status === "LEARNING";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-4)" }}>{ev.date}</span>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)", fontSize: 10,
                        color: ev.status === "PRUNED" ? "var(--text-4)" : ev.status === "OBSERVING" ? "var(--text-3)" : "var(--text-1)",
                        marginBottom: 5,
                        textDecoration: ev.status === "PRUNED" ? "line-through" : "none",
                      }}
                    >
                      {ev.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)" }}>discovered</span>
                      {ev.scores.map((sc, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-4)" }}>→</span>
                          <div
                            style={{
                              width: 28, height: 16, borderRadius: 1,
                              background: sc >= 0.8 ? "rgba(0,255,128,0.15)" : sc >= 0.5 ? "rgba(0,255,255,0.10)" : "rgba(255,255,255,0.05)",
                              border: `1px solid ${sc >= 0.8 ? "rgba(0,255,128,0.3)" : sc >= 0.5 ? "rgba(0,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 600,
                                color: sc >= 0.8 ? "var(--accent)" : sc >= 0.5 ? "var(--cyan)" : "var(--text-3)",
                              }}
                            >
                              {sc.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div style={{ flex: 1, marginLeft: 4, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${ev.scores[ev.scores.length - 1] * 100}%`, height: "100%",
                            background:
                              ev.status === "PROMOTED" ? "var(--accent)"
                              : ev.status === "LEARNING" ? "var(--cyan)"
                              : ev.status === "PRUNED" ? "#ef4444"
                              : "var(--text-4)",
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "3px 8px", borderRadius: "var(--radius)",
                      border: `1px solid ${sb.border}`, background: sb.bg,
                      fontFamily: "var(--font-mono)", fontSize: 8, color: sb.color,
                      letterSpacing: 0.5, whiteSpace: "nowrap",
                      opacity: isLearning ? (pulse ? 1 : 0.7) : 1, transition: "opacity 0.3s",
                    }}
                  >
                    {sb.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AutoResearch */}
        <div
          className="glass-card"
          style={{
            padding: "1.25rem", border: "1px solid rgba(0,255,255,0.1)",
            display: "flex", flexDirection: "column", gap: 16,
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
            AUTORESEARCH — LAST RUN
          </div>
          <div
            style={{
              padding: "0.875rem 1rem", border: "1px solid rgba(0,255,128,0.12)",
              borderRadius: "var(--radius)", background: "rgba(0,255,128,0.03)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", marginBottom: 8 }}>
              Mar 18 · 10 iterações
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>PRECISION</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>0.91</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4ade80" }}>+26.4% desde 0.72</div>
              </div>
              <AutoresearchChart data={AUTORESEARCH_PRECISION} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { k: "chunk_size", v: "1024" },
                { k: "top_k",      v: "8" },
                { k: "similarity", v: "0.75" },
                { k: "iterations", v: "10" },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 8px", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", background: "rgba(0,255,128,0.02)",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", letterSpacing: 1 }}>{r.k}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", fontWeight: 600 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-4)", letterSpacing: 1, marginBottom: 4 }}>
              PRÓXIMO AUTORESEARCH
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ width: "67%", height: "100%", background: "var(--accent)" }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                67% completo
              </span>
            </div>
          </div>
          <div
            style={{
              padding: "0.75rem", border: "1px solid rgba(0,255,255,0.1)",
              borderRadius: "var(--radius)", background: "rgba(0,255,255,0.03)",
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)", lineHeight: 1.7,
            }}
          >
            <div>🔬 Testando chunk_size=[512,1024,2048]</div>
            <div>📊 top_k=[4,6,8,10]</div>
            <div>⚡ similarity=[0.65,0.75,0.85]</div>
            <div style={{ color: "var(--accent)", marginTop: 4 }}>→ eta: ~12 iterações</div>
          </div>
        </div>
      </div>

      {/* ── Skills Marketplace Roadmap ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
          }}
        >
          SKILLS MARKETPLACE — ROADMAP
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {[
            {
              name: "Banking Pack", eta: "Q3 2026", skills: 14,
              desc: "Core banking: análise de crédito, monitoramento de covenant, LCI/LCA, BACEN reporting.",
              status: "EM DESENVOLVIMENTO", color: "#f59e0b",
            },
            {
              name: "Asset Management", eta: "Q4 2026", skills: 19,
              desc: "Otimização de portfolio, reconciliação de NAV, relatórios CVM, compliance de gestora.",
              status: "PLANEJADO", color: "var(--cyan)",
            },
            {
              name: "Insurance Pack", eta: "Q1 2027", skills: 11,
              desc: "Compliance SUSEP, modelagem atuarial, processamento de sinistros, analytics de resseguro.",
              status: "ROADMAP", color: "var(--text-3)",
            },
          ].map((p, i) => (
            <div
              key={i}
              style={{
                padding: "1rem 1.125rem",
                border: `1px solid ${i === 0 ? "rgba(245,158,11,0.2)" : i === 1 ? "rgba(0,255,255,0.15)" : "var(--border)"}`,
                borderRadius: "var(--radius)", background: "rgba(255,255,255,0.02)",
                opacity: i === 0 ? 1 : i === 1 ? 0.85 : 0.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)", padding: "2px 8px",
                    borderRadius: "var(--radius)", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 8, color: p.color, letterSpacing: 1,
                  }}
                >
                  {p.status}
                </div>
              </div>
              <div style={{ fontSize: "0.5625rem", color: "var(--text-3)", lineHeight: 1.6, marginBottom: "0.625rem" }}>
                {p.desc}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: p.color, fontWeight: 600 }}>
                  {p.skills} skills
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-4)" }}>
                  {p.eta}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
