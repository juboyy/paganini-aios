"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyCost {
  date: string;
  total: number;
  openai: number;
  anthropic: number;
  google: number;
}

interface AgentEff {
  agent_id: string;
  tasks: number;
  success_rate: number;
  total_cost: number;
  total_tokens: number;
}

interface MetricsData {
  daily_costs: DailyCost[];
  tasks_by_day: Record<string, number>;
  tokens_by_day: Record<string, number>;
  task_stats: {
    total: number;
    done: number;
    failed: number;
    success_rate: number;
    total_cost: number;
    total_tokens: number;
  };
  trace_stats: {
    total: number;
    done: number;
    errors: number;
    success_rate: number;
  };
  agent_efficiency: AgentEff[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatCost(cost: number) {
  if (cost >= 1) return cost.toFixed(2);
  return cost.toFixed(4);
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-card" style={{ flex: 1, minWidth: 160, padding: "1rem" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, color: color || "var(--text-1)", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", margin: "2rem 0 1rem" }}>
      {children}
    </h2>
  );
}

function SuccessBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? "var(--accent)" : rate >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${rate}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color, minWidth: 44, textAlign: "right" }}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Provider Cost Chart (Stacked Area — SVG) ───────────────────────────────

const PROVIDERS = [
  { key: "google"    as keyof DailyCost, label: "Google",    color: "#00ff88", colorRgb: "0,255,136" },
  { key: "anthropic" as keyof DailyCost, label: "Anthropic", color: "#a78bfa", colorRgb: "167,139,250" },
  { key: "openai"    as keyof DailyCost, label: "OpenAI",    color: "#22d3ee", colorRgb: "34,211,238" },
] as const;

function ProviderCostChart({ costs }: { costs: DailyCost[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const last7 = costs.slice(-7);
  if (last7.length === 0) return null;

  // Chart dimensions
  const W = 700, H = 220;
  const PAD = { top: 24, right: 24, bottom: 36, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  // Stack data: [google, google+anthropic, google+anthropic+openai]
  const stacked = last7.map(c => {
    const g = c.google ?? 0, a = c.anthropic ?? 0, o = c.openai ?? 0;
    return { g, a, o, s1: g, s2: g + a, s3: g + a + o, date: c.date };
  });
  const maxY = Math.max(...stacked.map(s => s.s3), 1);

  // Scale helpers
  const xScale = (i: number) => PAD.left + (i / Math.max(last7.length - 1, 1)) * cW;
  const yScale = (v: number) => PAD.top + cH - (v / maxY) * cH;

  // Generate smooth bezier path for an area between top and bottom curves
  function areaPath(topVals: number[], botVals: number[]) {
    const n = topVals.length;
    if (n === 0) return "";
    // Move to first top point
    let d = `M ${xScale(0)} ${yScale(topVals[0])}`;
    // Cubic bezier through top points (left to right)
    for (let i = 1; i < n; i++) {
      const x0 = xScale(i - 1), y0 = yScale(topVals[i - 1]);
      const x1 = xScale(i), y1 = yScale(topVals[i]);
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    // Line to last bottom point, then bezier back (right to left)
    d += ` L ${xScale(n - 1)} ${yScale(botVals[n - 1])}`;
    for (let i = n - 2; i >= 0; i--) {
      const x0 = xScale(i + 1), y0 = yScale(botVals[i + 1]);
      const x1 = xScale(i), y1 = yScale(botVals[i]);
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    d += " Z";
    return d;
  }

  // Line path for top stroke
  function linePath(vals: number[]) {
    if (vals.length === 0) return "";
    let d = `M ${xScale(0)} ${yScale(vals[0])}`;
    for (let i = 1; i < vals.length; i++) {
      const x0 = xScale(i - 1), y0 = yScale(vals[i - 1]);
      const x1 = xScale(i), y1 = yScale(vals[i]);
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);

  // Layer data (bottom to top)
  const layers = [
    { id: "google",    topVals: stacked.map(s => s.s1), botVals: stacked.map(() => 0), ...PROVIDERS[0] },
    { id: "anthropic", topVals: stacked.map(s => s.s2), botVals: stacked.map(s => s.s1), ...PROVIDERS[1] },
    { id: "openai",    topVals: stacked.map(s => s.s3), botVals: stacked.map(s => s.s2), ...PROVIDERS[2] },
  ];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        style={{ overflow: "visible", cursor: "crosshair" }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {/* Gradient fills for each provider */}
          {PROVIDERS.map(p => (
            <linearGradient key={p.key} id={`grad-${p.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`rgba(${p.colorRgb}, 0.5)`} />
              <stop offset="100%" stopColor={`rgba(${p.colorRgb}, 0.05)`} />
            </linearGradient>
          ))}
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={yScale(v)}
              x2={W - PAD.right} y2={yScale(v)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray={i === 0 ? "none" : "4 4"}
            />
            <text
              x={PAD.left - 8}
              y={yScale(v) + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              ${v.toFixed(v >= 10 ? 0 : v >= 1 ? 1 : 2)}
            </text>
          </g>
        ))}

        {/* Stacked areas (bottom to top) */}
        {layers.map(layer => (
          <g key={layer.id}>
            <path
              d={areaPath(layer.topVals, layer.botVals)}
              fill={`url(#grad-${layer.key})`}
              style={{ transition: "d 0.6s ease" }}
            />
            <path
              d={linePath(layer.topVals)}
              fill="none"
              stroke={layer.color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              filter="url(#glow)"
              style={{ transition: "d 0.6s ease" }}
            />
          </g>
        ))}

        {/* Data points — small glowing dots on top line */}
        {stacked.map((s, i) => (
          <circle
            key={i}
            cx={xScale(i)} cy={yScale(s.s3)}
            r={hover === i ? 5 : 3}
            fill="#22d3ee"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={1}
            filter="url(#glow)"
            style={{ transition: "r 0.2s ease" }}
          />
        ))}

        {/* Date labels (X axis) */}
        {last7.map((c, i) => {
          const [mm, dd] = c.date.split("-").slice(1);
          return (
            <text
              key={c.date}
              x={xScale(i)}
              y={H - 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {mm}/{dd}
            </text>
          );
        })}

        {/* Hover zones (invisible rects for each day) */}
        {last7.map((_, i) => {
          const slotW = cW / Math.max(last7.length - 1, 1);
          return (
            <rect
              key={i}
              x={xScale(i) - slotW / 2}
              y={PAD.top}
              width={slotW}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}

        {/* Hover line + tooltip */}
        {hover !== null && stacked[hover] && (
          <g>
            <line
              x1={xScale(hover)} y1={PAD.top}
              x2={xScale(hover)} y2={PAD.top + cH}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="3 3"
            />
            {/* Tooltip background */}
            <rect
              x={xScale(hover) + (hover > stacked.length / 2 ? -130 : 10)}
              y={PAD.top + 4}
              width={120}
              height={72}
              rx={6}
              fill="rgba(10,14,20,0.92)"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
            {/* Tooltip text */}
            {(() => {
              const s = stacked[hover];
              const tx = xScale(hover) + (hover > stacked.length / 2 ? -122 : 18);
              const [,mm,dd] = s.date.split("-");
              return (
                <>
                  <text x={tx} y={PAD.top + 20} fill="rgba(255,255,255,0.7)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700">
                    {mm}/{dd} — ${s.s3.toFixed(2)}
                  </text>
                  <text x={tx} y={PAD.top + 36} fill="#00ff88" fontSize="10" fontFamily="var(--font-mono)">
                    ● Google: ${s.g.toFixed(2)}
                  </text>
                  <text x={tx} y={PAD.top + 50} fill="#a78bfa" fontSize="10" fontFamily="var(--font-mono)">
                    ● Anthropic: ${s.a.toFixed(2)}
                  </text>
                  <text x={tx} y={PAD.top + 64} fill="#22d3ee" fontSize="10" fontFamily="var(--font-mono)">
                    ● OpenAI: ${s.o.toFixed(2)}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
        {PROVIDERS.map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",    label: "📊 OVERVIEW" },
  { id: "throughput",  label: "📈 THROUGHPUT" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function MetricsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchData() {
    fetch("/api/metrics")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        console.error("fetch metrics error:", e);
        setError("Erro ao carregar métricas");
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="glass-card" style={{ padding: "4rem", textAlign: "center", margin: "2rem auto", maxWidth: 600 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--accent)" }}>
          CARREGANDO MÉTRICAS...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card" style={{ padding: "3rem", textAlign: "center", margin: "2rem auto", maxWidth: 600, border: "1px solid #ef444430" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
      </div>
    );
  }

  const ts = data?.task_stats || { total: 0, done: 0, success_rate: 0, total_cost: 0, total_tokens: 0 };
  const last7Days = data?.daily_costs.slice(-7) || [];
  const totalCostLast7 = last7Days.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: "1.5rem", borderTop: "2px solid var(--accent)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          Métricas & Contabilidade
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-4)", marginTop: 6, marginBottom: 0 }}>
          Custo diário, throughput e eficiência por agente — dados em tempo real do Supabase
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {TABS.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "10px 20px",
              background: "transparent", border: "none", cursor: "pointer",
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-4)",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && data && (
        <>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <StatCard label="Custo Total" value={`$${formatCost(ts.total_cost)}`} sub="USD compute" color="var(--accent)" />
            <StatCard label="Tokens Total" value={formatNumber(ts.total_tokens)} sub="Tokens processados" color="hsl(180,100%,50%)" />
            <StatCard label="Success Rate" value={`${ts.success_rate.toFixed(1)}%`} sub="Tasks concluídas" color="#a78bfa" />
            <StatCard label="Total Tasks" value={formatNumber(ts.total)} sub="Tasks executadas" />
          </div>

          <SectionTitle>Custo Diário por Provedor — Últimos 7 Dias</SectionTitle>
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <ProviderCostChart costs={data.daily_costs} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-4)" }}>TOTAL SEMANA</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--accent)" }}>${formatCost(totalCostLast7)}</span>
            </div>
          </div>

          <SectionTitle>Detalhamento por Provedor</SectionTitle>
          <div className="glass-card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-4)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding: "12px 16px" }}>DATA</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>TOTAL</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>OPENAI</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>ANTHROPIC</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>GOOGLE</th>
                </tr>
              </thead>
              <tbody>
                {[...data.daily_costs].reverse().slice(0, 14).map((c) => (
                  <tr key={c.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "10px 16px", color: "var(--text-3)" }}>{c.date}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--accent)", fontWeight: 700 }}>${formatCost(c.total)}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>${formatCost(c.openai)}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "hsl(180,100%,50%)" }}>${formatCost(c.anthropic)}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "#a78bfa" }}>${formatCost(c.google)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "throughput" && data && (
        <>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <StatCard label="Traces (30D)" value={formatNumber(data.trace_stats.total)} sub="Execuções totais" />
            <StatCard label="Erros Traces" value={formatNumber(data.trace_stats.errors)} sub="Falhas detectadas" color="#ef4444" />
            <StatCard label="Success Rate" value={`${data.trace_stats.success_rate.toFixed(1)}%`} sub="Traces bem-sucedidas" color="var(--accent)" />
          </div>

          <SectionTitle>Eficiência por Agente</SectionTitle>
          <div className="glass-card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-4)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding: "12px 16px" }}>AGENTE</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>TASKS</th>
                  <th style={{ padding: "12px 16px" }}>SUCESSO</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>CUSTO</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>TOKENS</th>
                </tr>
              </thead>
              <tbody>
                {data.agent_efficiency.map((a) => (
                  <tr key={a.agent_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "10px 16px", color: "var(--text-1)", fontWeight: 700 }}>{a.agent_id}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{a.tasks}</td>
                    <td style={{ padding: "10px 16px" }}><SuccessBar rate={a.success_rate} /></td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--accent)" }}>${formatCost(a.total_cost)}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-4)" }}>{formatNumber(a.total_tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
