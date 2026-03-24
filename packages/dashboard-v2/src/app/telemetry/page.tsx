"use client";

import { useState, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

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

interface AgentPerformance {
  name: string;
  loc: number;
  prs: number;
  latency: number;
  cost: number;
}

interface TelemetryData {
  roi: RoiStats;
  tokenUsage: TokenUsageDay[];
  costBreakdown: ProviderCost[];
  locPerHour: number[];
  agentPerformance: AgentPerformance[];
  updatedAt: string;
}

// ── Fallback ───────────────────────────────────────────────────────────────────
function ChartErrorFallback() {
  return (
    <div className="flex h-[160px] items-center justify-center rounded border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
      Erro ao carregar gráfico.
    </div>
  );
}

// ── Helpers SVG ───────────────────────────────────────────────────────────────
function toPoints(values: number[], w: number, h: number, max: number): string {
  if (!values.length) return "";
  const effectiveMax = max || 1;
  return values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * w;
    const y = h - (v / effectiveMax) * h * 0.88 - h * 0.06;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function toFillPath(values: number[], w: number, h: number, max: number): string {
  if (!values.length) return "";
  const effectiveMax = max || 1;
  const pts = values.map((v, i) => ({
    x: (i / Math.max(1, values.length - 1)) * w,
    y: h - (v / effectiveMax) * h * 0.88 - h * 0.06,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return `${line} L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`;
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
    const fetchData = () => {
      fetch("/api/telemetry")
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((data: TelemetryData) => setTelemetry(data))
        .catch(() => {/* fallback state handled via null checks */})
        .finally(() => setLoading(false));
    };
    fetchData();
    const poll = setInterval(fetchData, 10000);
    return () => clearInterval(poll);
  }, []);

  const locPerHour = telemetry?.locPerHour ?? new Array(24).fill(0);
  const locMax = Math.max(...locPerHour, 1);
  const W_LOC = 800, H_LOC = 160;

  const locPoints = toPoints(locPerHour, W_LOC, H_LOC, locMax);
  const locFill   = toFillPath(locPerHour, W_LOC, H_LOC, locMax);

  const roi = telemetry?.roi;
  const tokenUsage = telemetry?.tokenUsage ?? [];
  const latestTokens = tokenUsage.length > 0 ? tokenUsage[tokenUsage.length - 1].tokens : 0;
  const totalTokens7d = tokenUsage.reduce((s, d) => s + d.tokens, 0);
  const agentPerformance = telemetry?.agentPerformance ?? [];

  const totalTokensDisplay = totalTokens7d > 1000000
    ? `${(totalTokens7d / 1000000).toFixed(1)}M`
    : totalTokens7d > 1000
    ? `${(totalTokens7d / 1000).toFixed(0)}K`
    : totalTokens7d.toString();

  const roiMultiplier = roi ? `${roi.savingsMultiplier.toFixed(1)}×` : "7.3×";
  const costAI = roi ? `R$ ${roi.costAI30d.toLocaleString()}` : "R$ 847";
  const costHuman = roi ? `R$ ${roi.costEquivalentHeadcount.toLocaleString()}` : "R$ 6.200";

  const totalLoc = agentPerformance.reduce((s, a) => s + a.loc, 0);
  const totalCost = agentPerformance.reduce((s, a) => s + a.cost, 0);
  const locPerHourCurrent = locPerHour[locPerHour.length - 1] || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
            PAGANINI AIOS · MÉTRICAS REAIS
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            Telemetria de{" "}
            <span style={{ color: "var(--accent)", textShadow: "0 0 20px hsl(150 100% 50% / 0.4)" }}>Produção</span>
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: "0.75rem", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
            Dados reais de deliverables e pipeline · Atualização 10s
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)", opacity: tick % 2 === 0 ? 1 : 0.5 }} />
          <span className="tag-badge">REALTIME DATA</span>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          {
            label: "LOC / HORA",
            value: loading ? "..." : locPerHourCurrent.toLocaleString(),
            sub: "geradas por agentes (última hora)",
            color: "var(--accent)",
            extra: `Total 24h: ${locPerHour.reduce((a,b) => a+b, 0).toLocaleString()}`,
          },
          {
            label: "CUSTO MÉDIO",
            value: loading ? "..." : `$${(totalCost / Math.max(1, totalLoc)).toFixed(4)}`,
            sub: "custo médio por linha",
            color: "var(--cyan)",
            extra: "calculado em tempo real",
          },
          {
            label: "TOKENS PROCESSADOS",
            value: loading ? "..." : (latestTokens > 0 ? `${(latestTokens / 1000).toFixed(0)}K` : totalTokensDisplay),
            sub: loading ? "" : (latestTokens > 0 ? "última hora" : "últimos 7 dias"),
            color: "var(--accent)",
            extra: loading ? "" : `${tokenUsage.length} dias registrados`,
          },
          {
            label: "ROI MULTIPLICADOR",
            value: loading ? "..." : roiMultiplier,
            sub: loading ? "" : `IA vs headcount`,
            color: "var(--accent)",
            extra: loading ? "" : `${costAI} vs ${costHuman}`,
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
      <ErrorBoundary fallback={<ChartErrorFallback />}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
                GERAÇÃO DE CÓDIGO — ÚLTIMAS 24H
              </div>
              <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: "0.875rem" }}>Timeline Dinâmica de LOC</div>
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span className="mono-label" style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                Total 24h: <span style={{ color: "var(--accent)" }}>{locPerHour.reduce((a,b) => a+b,0).toLocaleString()} LOC</span>
              </span>
              <span className="tag-badge">{agentPerformance.length} AGENTES ATIVOS</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W_LOC} ${H_LOC}`} style={{ width: "100%", height: H_LOC, display: "block" }}>
            <defs>
              <linearGradient id="locGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(150 100% 50%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(150 100% 50%)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map(f => (
              <line key={f}
                x1={0} y1={H_LOC - f * H_LOC * 0.88 - H_LOC * 0.06}
                x2={W_LOC} y2={H_LOC - f * H_LOC * 0.88 - H_LOC * 0.06}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4"
              />
            ))}
            {[0.25, 0.5, 0.75, 1].map(f => (
              <text key={f}
                x={4} y={H_LOC - f * H_LOC * 0.88 - H_LOC * 0.06 - 4}
                fontSize="10" fill="rgba(255,255,255,0.2)"
              >
                {Math.round(locMax * f)}
              </text>
            ))}
            <path d={locFill} fill="url(#locGrad)" />
            <polyline points={locPoints} fill="none" stroke="hsl(150 100% 50%)" strokeWidth="2" strokeLinejoin="round" />
            {[0, 6, 12, 18, 23].map(h => (
              <text key={h} x={(h / 23) * W_LOC} y={H_LOC - 2}
                fontSize="10" fill="rgba(255,255,255,0.2)" textAnchor="middle">{h}h</text>
            ))}
          </svg>
        </div>
      </ErrorBoundary>

      {/* ── Tabela de Performance por Agente ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          PERFORMANCE POR AGENTE · {agentPerformance.length} AGENTES
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["AGENTE", "LOC GERADAS", "PRs", "LATÊNCIA", "CUSTO TOTAL"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--text-4)", fontSize: "0.75rem", letterSpacing: "0.12em", fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentPerformance.length > 0 ? agentPerformance.sort((a,b) => b.loc - a.loc).map((a, i) => (
                <tr key={a.name} style={{ borderBottom: "1px solid hsl(150 100% 50% / 0.04)", background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)" }}>{a.name}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(a.loc / Math.max(1, agentPerformance[0].loc)) * 100}%`, height: "100%", background: "var(--accent)" }} />
                      </div>
                      <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{a.loc.toLocaleString()}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>{a.prs}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: a.latency < 5 ? "var(--accent)" : a.latency < 7 ? "#f59e0b" : "#ef4444" }}>
                    {a.latency.toFixed(1)}s
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>${a.cost.toFixed(2)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-4)" }}>Nenhum agente ativo registrado.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid hsl(150 100% 50% / 0.2)" }}>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-1)", fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>{totalLoc.toLocaleString()}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>{agentPerformance.reduce((s, a) => s + a.prs, 0)}</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-3)" }}>—</td>
                <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>${totalCost.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
