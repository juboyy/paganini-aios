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

// ─── Cost Bar Chart ───────────────────────────────────────────────────────────

function CostBarChart({ costs }: { costs: DailyCost[] }) {
  const last7 = costs.slice(-7);
  if (last7.length === 0) return null;
  const max = Math.max(...last7.map(c => c.total), 0.01);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: 160, padding: "1rem 0" }}>
      {last7.map((c) => {
        const h = Math.max((c.total / max) * 100, c.total > 0 ? 8 : 0); // minimum 8% height for non-zero values
        return (
          <div key={c.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--accent)", marginBottom: 2 }}>
              ${c.total.toFixed(2)}
            </div>
            <div style={{ width: "100%", height: 120, background: "rgba(255,255,255,0.02)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div 
                style={{ 
                  position: "absolute", bottom: 0, left: 0, width: "100%", height: `${h}%`, 
                  background: "linear-gradient(0deg, hsl(150 100% 50% / 0.2), hsl(150 100% 50%))",
                  boxShadow: "0 0 15px hsl(150 100% 50% / 0.3)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.6s ease",
                }} 
              />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>
              {c.date.split("-").slice(1).join("/") || c.date}
            </div>
          </div>
        );
      })}
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

          <SectionTitle>Custo Diário — Últimos 7 Dias</SectionTitle>
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <CostBarChart costs={data.daily_costs} />
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
