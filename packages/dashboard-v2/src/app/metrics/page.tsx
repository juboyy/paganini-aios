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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card p-4" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: "2rem 0 1rem" }}>
      {children}
    </h2>
  );
}

function SuccessBar({ rate }: { rate: number }) {
  const color = rate >= 97 ? "var(--accent)" : rate >= 90 ? "var(--cyan)" : "#f59e0b";
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

// ─── Cost Line Chart ──────────────────────────────────────────────────────────

function CostChart({ costs }: { costs: DailyCost[] }) {
  if (!costs || costs.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
        Sem dados de custo diário nos últimos 30 dias.
      </div>
    );
  }

  const W = 600, H = 200, pad = 48;
  const maxCost = Math.max(...costs.map((c) => c.total), 0.001);
  const iW = W - pad * 2;
  const iH = H - pad * 2;

  const pts = costs.map((c, i) => ({
    x: pad + (i / Math.max(costs.length - 1, 1)) * iW,
    y: pad + iH - (c.total / maxCost) * iH,
    c,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = line + ` L${pts[pts.length - 1].x},${pad + iH} L${pts[0].x},${pad + iH} Z`;

  // Provider stacked at each x
  const prov = ["openai", "anthropic", "google"] as const;
  const provColors = { openai: "var(--accent)", anthropic: "hsl(180,100%,50%)", google: "#a78bfa" };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={pad} y1={pad + iH * t} x2={W - pad} y2={pad + iH * t} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={pad - 6} y={pad + iH * t + 4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="var(--font-mono)">
            ${(maxCost * (1 - t)).toFixed(2)}
          </text>
        </g>
      ))}

      {/* X labels */}
      {pts.filter((_, i) => i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1).map((p) => (
        <text key={p.c.date} x={p.x} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="var(--font-mono)">
          {p.c.date.slice(5)}
        </text>
      ))}

      {/* Area + line */}
      <path d={area} fill="url(#costFill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots for last point */}
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3} fill="var(--accent)" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
      )}
    </svg>
  );
}

// ─── Tasks per day chart ──────────────────────────────────────────────────────

function TasksPerDayChart({ tasksByDay, tokensByDay }: { tasksByDay: Record<string, number>; tokensByDay: Record<string, number> }) {
  const days = Object.keys(tasksByDay).sort();
  if (days.length === 0) return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
      Sem dados de tasks por dia.
    </div>
  );

  const W = 600, H = 180, pad = 44;
  const iW = W - pad * 2;
  const iH = H - pad * 2;
  const taskVals = days.map((d) => tasksByDay[d] ?? 0);
  const maxT = Math.max(...taskVals, 1);

  const pts = days.map((d, i) => ({
    x: pad + (i / Math.max(days.length - 1, 1)) * iW,
    y: pad + iH - (tasksByDay[d] / maxT) * iH,
    d,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = line + ` L${pts[pts.length - 1].x},${pad + iH} L${pts[0].x},${pad + iH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(180,100%,50%)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(180,100%,50%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad} y1={pad + iH * f} x2={W - pad} y2={pad + iH * f} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={pad - 6} y={pad + iH * f + 4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="var(--font-mono)">
            {Math.round(maxT * (1 - f))}
          </text>
        </g>
      ))}
      {pts.filter((_, i) => i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1).map((p) => (
        <text key={p.d} x={p.x} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="var(--font-mono)">
          {p.d.slice(5)}
        </text>
      ))}
      <path d={area} fill="url(#tasksGrad)" />
      <path d={line} fill="none" stroke="hsl(180,100%,50%)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function TabOverview({ data }: { data: MetricsData }) {
  const ts = data.task_stats;
  const tr = data.trace_stats;
  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: "2rem" }}>
        <StatCard label="TASKS EXECUTADAS"  value={ts.total.toLocaleString()}            sub={`${ts.done} concluídas`} />
        <StatCard label="TAXA DE SUCESSO"   value={`${ts.success_rate.toFixed(1)}%`}     sub="tasks concluídas" />
        <StatCard label="CUSTO TOTAL"       value={`$${ts.total_cost.toFixed(2)}`}       sub="USD compute" />
        <StatCard label="TOKENS TOTAL"      value={`${(ts.total_tokens / 1_000_000).toFixed(2)}M`} sub="processados" />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: "2rem" }}>
        <StatCard label="TRACES (30D)"      value={tr.total.toLocaleString()}             sub={`${tr.done} ok`} />
        <StatCard label="TAXA TRACES"       value={`${tr.success_rate.toFixed(1)}%`}      sub="traces ok" />
        <StatCard label="ERROS TRACES"      value={tr.errors.toLocaleString()}            sub="falhas registradas" />
        <StatCard label="DIAS COM DADOS"    value={data.daily_costs.length.toString()}    sub="dias com custos" />
      </div>

      <SectionTitle>Custo Diário — Últimos 30 Dias</SectionTitle>
      <p className="section-help">Custo total de compute por dia (USD)</p>
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <CostChart costs={data.daily_costs} />
        {data.daily_costs.length > 0 && (
          <div style={{ display: "flex", gap: "1.5rem", marginTop: 12, flexWrap: "wrap" }}>
            {[
              { color: "var(--accent)", label: "Total" },
              { color: "hsl(180,100%,50%)", label: "Anthropic" },
              { color: "#a78bfa", label: "Google" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, opacity: 0.8 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost table */}
      {data.daily_costs.length > 0 && (
        <>
          <SectionTitle>Detalhamento por Provedor</SectionTitle>
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr 1fr", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>
              <div>DATA</div><div style={{ textAlign: "right" }}>TOTAL</div><div style={{ textAlign: "right" }}>OPENAI</div><div style={{ textAlign: "right" }}>ANTHROPIC</div><div style={{ textAlign: "right" }}>GOOGLE</div>
            </div>
            {[...data.daily_costs].reverse().slice(0, 14).map((c) => (
              <div key={c.date} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr 1fr", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", alignItems: "center" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ color: "var(--text-3)" }}>{c.date}</div>
                <div style={{ color: "var(--accent)", textAlign: "right" }}>${c.total?.toFixed(2) ?? "—"}</div>
                <div style={{ color: "var(--text-2)", textAlign: "right" }}>${c.openai?.toFixed(2) ?? "—"}</div>
                <div style={{ color: "hsl(180,100%,50%)", textAlign: "right" }}>${c.anthropic?.toFixed(2) ?? "—"}</div>
                <div style={{ color: "#a78bfa", textAlign: "right" }}>${c.google?.toFixed(2) ?? "—"}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Throughput ──────────────────────────────────────────────────────────

function TabThroughput({ data }: { data: MetricsData }) {
  return (
    <div>
      <SectionTitle>Tasks por Dia</SectionTitle>
      <p className="section-help">Número de tasks criadas por dia — dados reais do Supabase</p>
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <TasksPerDayChart tasksByDay={data.tasks_by_day} tokensByDay={data.tokens_by_day} />
      </div>

      <SectionTitle>Eficiência por Agente</SectionTitle>
      <p className="section-help">Taxa de sucesso e custo por agente — top 15 por volume</p>
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 1fr 100px 100px", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)" }}>
          <div>AGENTE</div><div style={{ textAlign: "right" }}>TASKS</div><div>SUCESSO</div><div style={{ textAlign: "right" }}>CUSTO</div><div style={{ textAlign: "right" }}>TOKENS</div>
        </div>
        {data.agent_efficiency.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Sem dados de agentes.
          </div>
        ) : data.agent_efficiency.map((a) => (
          <div key={a.agent_id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 1fr 100px 100px", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.agent_id}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-2)", textAlign: "right" }}>
              {a.tasks.toLocaleString()}
            </div>
            <div>
              <SuccessBar rate={a.success_rate} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--cyan)", textAlign: "right" }}>
              ${a.total_cost.toFixed(2)}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-3)", textAlign: "right" }}>
              {(a.total_tokens / 1000).toFixed(1)}K
            </div>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Erro ao carregar métricas"); setLoading(false); });
  }, [mounted]);

  if (!mounted) return null;

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-mono)", fontSize: "0.8125rem", letterSpacing: "0.08em",
    padding: "10px 20px", borderRadius: "var(--radius)",
    border: active ? "1px solid var(--accent)" : "1px solid transparent",
    background: active ? "rgba(0,255,128,0.1)" : "transparent",
    color: active ? "var(--accent)" : "var(--text-3)",
    cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          Métricas & Contabilidade
        </h1>
        <p className="section-help" style={{ marginTop: 6 }}>
          Custo diário, throughput e eficiência por agente — dados em tempo real do Supabase
        </p>
        {!loading && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "4px 12px", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.08)", border: "1px solid rgba(0,255,128,0.15)", color: "var(--accent)", display: "inline-block", marginTop: 8 }}>
            🟢 SUPABASE LIVE
          </span>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button key={tab.id} style={tabBtnStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Carregando métricas do Supabase...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
        </div>
      )}

      {/* Tab Content */}
      {!loading && data && activeTab === "overview" && <TabOverview data={data} />}
      {!loading && data && activeTab === "throughput" && <TabThroughput data={data} />}
    </div>
  );
}
