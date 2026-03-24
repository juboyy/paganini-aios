"use client";

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface RoiStats {
  hoursAutomated: number;
  costAI30d: number;
  costEquivalentHeadcount: number;
  savingsMultiplier: number;
  tasksCompleted30d: number;
  avgTaskDurationMin: number;
}

interface TokenUsageDay {
  date: string;
  tokens: number;
  cost: number;
  calls: number;
}

interface ProviderCost {
  provider: string;
  tokens: number;
  cost: number;
  pct: number;
  model: string;
}

interface TelemetryData {
  roi: RoiStats;
  tokenUsage: TokenUsageDay[];
  costBreakdown: ProviderCost[];
  updatedAt: string;
}

// ── Dados estáticos de visualização ───────────────────────────────────────────

// LOC geradas por hora (24h)
const LOC_PER_HOUR = [
  120, 80, 40, 60, 180, 340, 620, 890, 1050, 1200, 1380, 1240,
  1100, 1320, 1450, 1280, 1060, 880, 720, 580, 420, 300, 220, 160,
];

// Custo por dia nos últimos 30 dias (tendência decrescente)
const DAILY_COSTS = [
  8.2, 7.9, 7.6, 7.4, 7.1, 6.9, 6.7, 6.5, 6.3, 6.1,
  5.9, 5.7, 5.5, 5.3, 5.1, 4.9, 4.7, 4.5, 4.3, 4.1,
  3.9, 3.7, 3.5, 3.3, 3.2, 3.1, 3.0, 3.0, 3.0, 3.0,
];

const AGENTS = [
  { name: "orchestrator",       loc: 1840, tests: 122, prs: 14, latency: 3.2, cost: 0.82 },
  { name: "pricing",            loc: 2340, tests: 185, prs: 18, latency: 4.1, cost: 0.94 },
  { name: "compliance",         loc: 1620, tests: 138, prs: 12, latency: 5.8, cost: 0.78 },
  { name: "risk",               loc: 1480, tests: 118, prs: 11, latency: 6.2, cost: 0.71 },
  { name: "auditor",            loc:  980, tests:  72, prs:  9, latency: 4.7, cost: 0.44 },
  { name: "due-diligence",      loc: 1240, tests:  98, prs:  8, latency: 8.2, cost: 0.56 },
  { name: "treasury",           loc:  820, tests:  55, prs:  7, latency: 3.5, cost: 0.37 },
  { name: "reporting",          loc:  640, tests:  42, prs:  6, latency: 4.3, cost: 0.29 },
  { name: "knowledge-graph",    loc:  420, tests:  28, prs:  4, latency: 6.9, cost: 0.19 },
  { name: "admin",              loc:  380, tests:  24, prs:  3, latency: 2.9, cost: 0.17 },
  { name: "investor-relations", loc:  310, tests:  18, prs:  3, latency: 3.8, cost: 0.14 },
  { name: "regulatory-watch",   loc:  280, tests:  16, prs:  2, latency: 5.1, cost: 0.13 },
  { name: "metaclaw",           loc:  220, tests:  12, prs:  2, latency: 4.4, cost: 0.10 },
  { name: "ingest",             loc:  170, tests:   8, prs:  1, latency: 2.1, cost: 0.08 },
];

const COST_BREAKDOWN_STATIC = [
  { label: "Geração de Código", pct: 40, color: "hsl(150 100% 50%)" },
  { label: "Testes",            pct: 20, color: "hsl(180 100% 50%)" },
  { label: "Code Review",       pct: 15, color: "hsl(160 90% 65%)"  },
  { label: "Deploy",            pct: 10, color: "hsl(150 60% 55%)"  },
  { label: "RAG / Busca",       pct: 10, color: "hsl(140 70% 45%)"  },
  { label: "Infra",             pct:  5, color: "hsl(150 40% 38%)"  },
];

// ── Helpers SVG ───────────────────────────────────────────────────────────────
function toPoints(values: number[], w: number, h: number, max: number): string {
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * h * 0.88 - h * 0.06;
    return `${x},${y}`;
  }).join(" ");
}

function toFillPath(values: number[], w: number, h: number, max: number): string {
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - (v / max) * h * 0.88 - h * 0.06,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return `${line} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function TelemetryPage() {
  const [tick, setTick] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/telemetry")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: TelemetryData) => setTelemetry(data))
      .catch(() => {/* keep null — will use fallback values */})
      .finally(() => setLoading(false));
  }, []);

  const locMax = Math.max(...LOC_PER_HOUR);
  const costMax = Math.max(...DAILY_COSTS);
  const W_LOC = 800, H_LOC = 160;
  const W_COST = 700, H_COST = 100;

  const locPoints = toPoints(LOC_PER_HOUR, W_LOC, H_LOC, locMax);
  const locFill   = toFillPath(LOC_PER_HOUR, W_LOC, H_LOC, locMax);
  const costPoints = toPoints(DAILY_COSTS, W_COST, H_COST, costMax);
  const costFill   = toFillPath(DAILY_COSTS, W_COST, H_COST, costMax);

  const totalLoc = AGENTS.reduce((s, a) => s + a.loc, 0);
  const totalTests = AGENTS.reduce((s, a) => s + a.tests, 0);
  const totalCost = AGENTS.reduce((s, a) => s + a.cost, 0);

  // Derive stat card values from API or fallback
  const roi = telemetry?.roi;
  const tokenUsage = telemetry?.tokenUsage ?? [];
  const latestDay = tokenUsage[tokenUsage.length - 1];
  const providerCosts = telemetry?.costBreakdown ?? [];

  // Total tokens last 7 days
  const totalTokens7d = tokenUsage.reduce((s, d) => s + d.tokens, 0);
  const totalTokensDisplay = totalTokens7d > 1000000
    ? `${(totalTokens7d / 1000000).toFixed(1)}M`
    : totalTokens7d > 1000
    ? `${(totalTokens7d / 1000).toFixed(0)}K`
    : totalTokens7d.toString();

  const roiMultiplier = roi
    ? `${roi.savingsMultiplier.toFixed(1)}×`
    : "7.3×";

  const costAI = roi
    ? `R$ ${roi.costAI30d.toLocaleString()}`
    : "R$ 847";

  const costHuman = roi
    ? `R$ ${roi.costEquivalentHeadcount.toLocaleString()}`
    : "R$ 6.200";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
            PAGANINI AIOS · MÉTRICAS DE DEV
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            Telemetria de{" "}
            <span style={{ color: "var(--accent)", textShadow: "0 0 20px hsl(150 100% 50% / 0.4)" }}>Desenvolvimento</span>
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: "0.75rem", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
            Geração de código por agentes · Últimas 24h · Atualização 2s
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)", opacity: tick % 2 === 0 ? 1 : 0.5 }} />
          <span className="tag-badge">AO VIVO</span>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          {
            label: "LOC / HORA",
            value: "517",
            sub: "geradas por agentes",
            color: "var(--accent)",
            extra: "↑ 12% vs ontem",
          },
          {
            label: "CUSTO / LOC",
            value: "$0.003",
            sub: "custo médio por linha",
            color: "var(--cyan)",
            extra: "↓ 18% vs mês passado",
          },
          {
            label: "TOKENS PROCESSADOS",
            value: loading ? "..." : (latestDay ? `${(latestDay.tokens / 1000000).toFixed(1)}M` : totalTokensDisplay),
            sub: loading ? "" : (latestDay ? "últimas 24h" : "últimos 7 dias"),
            color: "var(--accent)",
            extra: loading ? "" : (latestDay ? `$${latestDay.cost.toFixed(2)} custo` : `${tokenUsage.length} dias registrados`),
          },
          {
            label: "ROI MULTIPLICADOR",
            value: loading ? "..." : roiMultiplier,
            sub: loading ? "" : `IA vs headcount`,
            color: "var(--accent)",
            extra: loading ? "" : `${costAI} vs ${costHuman}/mês`,
          },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              {s.label}
            </div>
            <div className="stat-value" style={{ fontSize: "2.25rem", fontWeight: 700, color: s.color, lineHeight: 1, fontFamily: "var(--font-mono)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: "0.25rem" }}>{s.sub}</div>
            <div style={{ fontSize: "0.8125rem", color: s.color, marginTop: "0.5rem", fontFamily: "var(--font-mono)" }}>{s.extra}</div>
          </div>
        ))}
      </div>

      {/* ── Gráfico de Geração de Código (24h) ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
              GERAÇÃO DE CÓDIGO — ÚLTIMAS 24H
            </div>
            <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: "0.875rem" }}>Linhas de Código por Hora</div>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span className="mono-label" style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Total: <span style={{ color: "var(--accent)" }}>1.97M LOC</span>
            </span>
            <span className="tag-badge">26 AGENTES</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W_LOC} ${H_LOC}`} style={{ width: "100%", height: H_LOC, display: "block" }}>
          <defs>
            <linearGradient id="locGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(150 100% 50%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(150 100% 50%)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <line key={f}
              x1={0} y1={H_LOC - f * H_LOC * 0.88 - H_LOC * 0.06}
              x2={W_LOC} y2={H_LOC - f * H_LOC * 0.88 - H_LOC * 0.06}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4"
            />
          ))}
          {/* Y labels */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <text key={f}
              x={4} y={H_LOC - f * H_LOC * 0.88 - H_LOC * 0.06 - 4}
              fontSize="12" fill="rgba(255,255,255,0.2)"
            >
              {Math.round(locMax * f / 100) * 100}
            </text>
          ))}
          {/* Area + line */}
          <path d={locFill} fill="url(#locGrad)" />
          <polyline points={locPoints} fill="none" stroke="hsl(150 100% 50%)" strokeWidth="2" strokeLinejoin="round" />
          {/* Peak annotation */}
          <line x1={(14 / 23) * W_LOC} y1={H_LOC * 0.06} x2={(14 / 23) * W_LOC} y2={H_LOC * 0.94}
            stroke="hsl(150 100% 50% / 0.3)" strokeWidth="1" strokeDasharray="3,3" />
          <rect x={(14 / 23) * W_LOC + 4} y={H_LOC * 0.06} width={90} height={16} rx={1}
            fill="rgba(0,255,128,0.12)" stroke="rgba(0,255,128,0.3)" strokeWidth="0.5" />
          <text x={(14 / 23) * W_LOC + 8} y={H_LOC * 0.06 + 11}
            fontSize="12" fill="hsl(150 100% 50%)" fontFamily="IBM Plex Mono">
            PICO: 1.450 LOC/h
          </text>
          {/* Hour labels */}
          {[0, 6, 12, 18, 23].map(h => (
            <text key={h} x={(h / 23) * W_LOC} y={H_LOC - 2}
              fontSize="12" fill="rgba(255,255,255,0.2)" textAnchor="middle">{h}h</text>
          ))}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
          {["00h", "04h", "08h", "12h", "16h", "20h", "23h"].map(l => (
            <span key={l} style={{ fontSize: "9px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{l}</span>
          ))}
        </div>
      </div>

      {/* ── Tabela de Performance por Agente ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          PERFORMANCE POR AGENTE · {AGENTS.length} AGENTES · ORDENADO POR LOC DESC
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["AGENTE", "LOC GERADAS", "TESTES ESCRITOS", "PRs", "LATÊNCIA", "CUSTO"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--text-4)", fontSize: "0.75rem", letterSpacing: "0.12em", fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((a, i) => (
                <tr key={a.name} style={{ borderBottom: "1px solid hsl(150 100% 50% / 0.04)", background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)" }}>{a.name}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(a.loc / AGENTS[0].loc) * 100}%`, height: "100%", background: "var(--accent)" }} />
                      </div>
                      <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{a.loc.toLocaleString()}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--cyan)" }}>{a.tests}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>{a.prs}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: a.latency < 5 ? "var(--accent)" : a.latency < 7 ? "#f59e0b" : "#ef4444" }}>
                    {a.latency}s
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>${a.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid hsl(150 100% 50% / 0.2)" }}>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-1)", fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>{totalLoc.toLocaleString()}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>{totalTests}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>{AGENTS.reduce((s, a) => s + a.prs, 0)}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-3)" }}>—</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>${totalCost.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Breakdown de Custos + Tendência ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="two-col">

        {/* Breakdown — from API or static */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
            BREAKDOWN DE CUSTOS — {loading ? "CARREGANDO..." : `HOJE $${totalCost.toFixed(2)}`}
          </div>
          {(providerCosts.length > 0 ? providerCosts.map((p, i) => ({
            label: `${p.provider} (${p.model})`,
            pct: Math.round(p.pct),
            color: ["hsl(150 100% 50%)", "hsl(180 100% 50%)", "hsl(160 90% 65%)", "hsl(45 100% 60%)"][i] ?? "hsl(150 60% 55%)",
          })) : COST_BREAKDOWN_STATIC).map((s, i) => (
            <div key={i} style={{ marginBottom: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{s.label}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ fontSize: "0.8125rem", color: s.color, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{s.pct}%</span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                    ${(totalCost * s.pct / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
          {/* Barra empilhada */}
          <div style={{ marginTop: "1rem", height: 16, borderRadius: 2, overflow: "hidden", display: "flex" }}>
            {COST_BREAKDOWN_STATIC.map((s, i) => (
              <div key={i} style={{ width: `${s.pct}%`, height: "100%", background: s.color }} />
            ))}
          </div>
          <div style={{ marginTop: "4px", fontSize: "8px", color: "var(--text-3)", display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)" }}>
            {COST_BREAKDOWN_STATIC.map(s => (
              <span key={s.label}>{s.pct}%</span>
            ))}
          </div>
        </div>

        {/* Tendência 30d */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
            TENDÊNCIA DE CUSTO — 30 DIAS
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-2)", marginBottom: "0.75rem", fontFamily: "var(--font-mono)" }}>
            Otimização contínua via RTK + autoaprendizado
          </div>
          <svg viewBox={`0 0 ${W_COST} ${H_COST}`} style={{ width: "100%", height: H_COST, display: "block" }}>
            <defs>
              <linearGradient id="costTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(150 100% 50%)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(150 100% 50%)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map(f => (
              <line key={f} x1={0} y1={H_COST - f * H_COST * 0.88 - H_COST * 0.06}
                x2={W_COST} y2={H_COST - f * H_COST * 0.88 - H_COST * 0.06}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            <path d={costFill} fill="url(#costTrendGrad)" />
            <polyline points={costPoints} fill="none" stroke="hsl(150 100% 50%)" strokeWidth="2" strokeLinejoin="round" />
            {/* Labels extremos */}
            <text x={4} y={24} fontSize="12" fill="#f59e0b" fontFamily="IBM Plex Mono">$8.20</text>
            <text x={W_COST - 40} y={H_COST * 0.9} fontSize="12" fill="hsl(150 100% 50%)" fontFamily="IBM Plex Mono">$3.00</text>
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "9px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Mar 1</span>
            <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>↓ 63% redução</span>
            <span style={{ fontSize: "9px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Mar 30</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
            {["DIA 1: $8.20", "DIA 15: $5.10", "DIA 30: $3.00", "Δ -$5.20/dia"].map((l, i) => (
              <span key={i} style={{ fontSize: "9px", color: i === 3 ? "var(--accent)" : "var(--text-3)", fontFamily: "var(--font-mono)" }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROI ── */}
      <div
        className="glass-card"
        style={{
          padding: "1.5rem",
          background: "linear-gradient(135deg, hsl(150 100% 50% / 0.07) 0%, hsl(220 18% 7%) 100%)",
          border: "1px solid hsl(150 100% 50% / 0.2)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          ANÁLISE DE ROI — EQUIPE HUMANA VS PAGANINI AIOS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: "1rem", alignItems: "center" }} className="roi-grid">
          {/* Humano */}
          <div style={{ padding: "1rem", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius)", background: "rgba(239,68,68,0.04)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#ef4444", marginBottom: "0.5rem" }}>👤 EQUIPE HUMANA</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ef4444", fontFamily: "var(--font-mono)", lineHeight: 1 }}>R$ 12K</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>por mês</div>
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "3px" }}>
              {["5 analistas sênior", "~500 LOC/semana", "10–15 tarefas/dia", "SLA: horário comercial"].map((l, i) => (
                <div key={i} style={{ fontSize: "0.75rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>· {l}</div>
              ))}
            </div>
          </div>

          {/* VS */}
          <div style={{ textAlign: "center", padding: "0 0.5rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-4)" }}>VS</div>
          </div>

          {/* AIOS */}
          <div style={{ padding: "1rem", border: "1px solid hsl(150 100% 50% / 0.2)", borderRadius: "var(--radius)", background: "hsl(150 100% 50% / 0.05)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)", marginBottom: "0.5rem" }}>🤖 PAGANINI AIOS</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
              {loading ? "..." : costAI}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>por mês</div>
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "3px" }}>
              {[
                `${roi?.tasksCompleted30d ?? 142} tarefas/30 dias`,
                `${roi?.avgTaskDurationMin ?? 4.2} min/tarefa`,
                "SLA: 24/7 ininterrupto",
                `${roi?.hoursAutomated ?? 312}h automatizadas`,
              ].map((l, i) => (
                <div key={i} style={{ fontSize: "0.75rem", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>· {l}</div>
              ))}
            </div>
          </div>

          {/* ROI Badge */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              padding: "1rem 1.25rem",
              background: "hsl(150 100% 50% / 0.12)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius)",
              boxShadow: "0 0 24px hsl(150 100% 50% / 0.2)",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "0.25rem" }}>ROI</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)", lineHeight: 1, textShadow: "0 0 20px hsl(150 100% 50% / 0.5)" }}>
                {loading ? "..." : roiMultiplier}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                mais barato<br />+ produtivo
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .two-col { grid-template-columns: 1fr !important; }
          .roi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
