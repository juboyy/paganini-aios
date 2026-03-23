"use client";

import { useState, useEffect } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const STAGE_METRICS = [
  { stage: 1,  name: "Context Scout",      runs: 1847, avgTime: "8s",      successRate: 99.2 },
  { stage: 2,  name: "Product Owner",      runs: 312,  avgTime: "45s",     successRate: 96.1 },
  { stage: 4,  name: "Architect",          runs: 289,  avgTime: "1m 12s",  successRate: 94.8 },
  { stage: 8,  name: "Create Story",       runs: 312,  avgTime: "32s",     successRate: 97.4 },
  { stage: 10, name: "Specifier",          runs: 1534, avgTime: "28s",     successRate: 98.1 },
  { stage: 11, name: "Dev Senior",         runs: 1534, avgTime: "3m 45s",  successRate: 91.3 },
  { stage: 12, name: "Code Review",        runs: 1489, avgTime: "1m 8s",   successRate: 95.6 },
  { stage: 13, name: "QA Tester",          runs: 1423, avgTime: "2m 15s",  successRate: 93.2 },
  { stage: 14, name: "Deploy",             runs: 867,  avgTime: "52s",     successRate: 96.8 },
  { stage: 15, name: "Stakeholder Review", runs: 234,  avgTime: "15s",     successRate: 99.1 },
  { stage: 17, name: "Knowledge Writer",   runs: 1678, avgTime: "12s",     successRate: 98.9 },
  { stage: 18, name: "Metrics Logger",     runs: 1847, avgTime: "3s",      successRate: 99.8 },
];

const TIER_BREAKDOWN = [
  { tier: "Micro",   count: 892, pct: 48.3, avgTime: "45s",      color: "var(--text-3)" },
  { tier: "Quick",   count: 643, pct: 34.8, avgTime: "4m 12s",   color: "var(--cyan)" },
  { tier: "Feature", count: 278, pct: 15.0, avgTime: "18m 34s",  color: "var(--accent)" },
  { tier: "Epic",    count: 34,  pct: 1.8,  avgTime: "2h 15m",   color: "#a855f7" },
];

const AGENT_PERFORMANCE = [
  // Code Domain (12)
  { name: "OraCLI",          emoji: "🎯", domain: "code", tasks: 456,  success: 432,  tokens: "12.4M", cost: "$234", avgLatency: "3.2s" },
  { name: "Code Agent",      emoji: "💻", domain: "code", tasks: 312,  success: 289,  tokens: "8.7M",  cost: "$167", avgLatency: "4.8s" },
  { name: "Codex",           emoji: "⚡", domain: "code", tasks: 289,  success: 276,  tokens: "15.2M", cost: "$312", avgLatency: "12.4s" },
  { name: "Architect",       emoji: "🏗️", domain: "code", tasks: 134,  success: 128,  tokens: "6.3M",  cost: "$98",  avgLatency: "8.7s" },
  { name: "QA Agent",        emoji: "🧪", domain: "code", tasks: 198,  success: 189,  tokens: "4.1M",  cost: "$78",  avgLatency: "5.2s" },
  { name: "Security Agent",  emoji: "🔒", domain: "code", tasks: 87,   success: 82,   tokens: "2.8M",  cost: "$45",  avgLatency: "6.1s" },
  { name: "PM Agent",        emoji: "📋", domain: "code", tasks: 76,   success: 74,   tokens: "1.9M",  cost: "$34",  avgLatency: "2.8s" },
  { name: "Docs Agent",      emoji: "📝", domain: "code", tasks: 112,  success: 108,  tokens: "3.4M",  cost: "$56",  avgLatency: "3.9s" },
  { name: "Infra Agent",     emoji: "🏗",  domain: "code", tasks: 65,   success: 61,   tokens: "2.1M",  cost: "$38",  avgLatency: "7.3s" },
  { name: "Data Agent",      emoji: "📊", domain: "code", tasks: 54,   success: 51,   tokens: "1.7M",  cost: "$28",  avgLatency: "4.5s" },
  { name: "General Agent",   emoji: "🔧", domain: "code", tasks: 43,   success: 42,   tokens: "1.2M",  cost: "$21",  avgLatency: "2.4s" },
  { name: "Context Scout",   emoji: "🔍", domain: "code", tasks: 1847, success: 1832, tokens: "5.6M",  cost: "$89",  avgLatency: "1.2s" },
  // FIDC Domain (9)
  { name: "Administrador",       emoji: "📋", domain: "fidc", tasks: 234, success: 221, tokens: "4.8M", cost: "$78",  avgLatency: "5.6s" },
  { name: "Compliance",          emoji: "⚖️", domain: "fidc", tasks: 312, success: 298, tokens: "6.2M", cost: "$98",  avgLatency: "6.8s" },
  { name: "Custodiante",         emoji: "🔐", domain: "fidc", tasks: 178, success: 169, tokens: "3.4M", cost: "$56",  avgLatency: "4.2s" },
  { name: "Due Diligence",       emoji: "🔍", domain: "fidc", tasks: 156, success: 145, tokens: "5.1M", cost: "$82",  avgLatency: "8.9s" },
  { name: "Gestor",              emoji: "📊", domain: "fidc", tasks: 267, success: 254, tokens: "7.3M", cost: "$112", avgLatency: "6.4s" },
  { name: "Investor Relations",  emoji: "💬", domain: "fidc", tasks: 89,  success: 86,  tokens: "1.8M", cost: "$29",  avgLatency: "3.1s" },
  { name: "Pricing Engine",      emoji: "💰", domain: "fidc", tasks: 198, success: 187, tokens: "8.9M", cost: "$145", avgLatency: "9.2s" },
  { name: "Regulatory Watch",    emoji: "📡", domain: "fidc", tasks: 145, success: 140, tokens: "3.2M", cost: "$52",  avgLatency: "4.8s" },
  { name: "Reporting",           emoji: "📄", domain: "fidc", tasks: 123, success: 118, tokens: "2.9M", cost: "$47",  avgLatency: "5.4s" },
];

const ROI_DATA = {
  totalInvested:    1899,
  humanHoursSaved:  2340,
  humanHourRate:    50,
  valueSaved:       117000,
  roi:              "61.6x",
  monthlyTrend: [
    { month: "Jan", invested: 234,  saved: 12400, roi: "53x" },
    { month: "Fev", invested: 456,  saved: 28900, roi: "63x" },
    { month: "Mar", invested: 1209, saved: 75700, roi: "63x" },
  ],
};

const MODEL_COSTS = [
  { model: "claude-opus-4-6-thinking", tokens: "34.2M", cost: "$678", pct: 35.7 },
  { model: "claude-sonnet-4-6",        tokens: "52.1M", cost: "$523", pct: 27.5 },
  { model: "gpt-5.3-codex",            tokens: "15.2M", cost: "$456", pct: 24.0 },
  { model: "gemini-3-flash",           tokens: "8.4M",  cost: "$42",  pct: 2.2  },
  { model: "Qwen3.5-27B (Tinker)",     tokens: "2.1M",  cost: "$200", pct: 10.5 },
];

// Generate 84 cells (12 weeks × 7 days) with realistic weekday-heavy data
function generateHeatmapData(): number[] {
  const seed = [3, 14, 8, 22, 19, 5, 1, 11, 17, 24, 9, 2, 16, 6, 0, 13, 21, 18, 7, 4, 12, 20, 15, 10, 0, 8, 18, 25, 14, 3, 1, 9, 22, 17, 6, 0, 11, 19, 13, 7, 2, 0, 5, 16, 24, 20, 12, 4, 1, 0, 10, 18, 15, 8, 3, 0, 6, 21, 17, 11, 4, 2, 0, 14, 23, 19, 9, 5, 1, 0, 7, 16, 13, 8, 3, 0, 20, 25, 18, 12, 6, 2, 0, 0];
  return seed;
}

// Generate 30 days of daily throughput data
function generateDailyData(): { day: number; tasks: number; successRate: number }[] {
  const base = [42,38,51,47,55,12,3,46,52,49,61,58,44,8,2,53,47,62,58,41,15,4,49,55,63,71,58,9,1,67];
  return base.map((tasks, i) => ({
    day: i + 1,
    tasks,
    successRate: Math.min(99.5, 88 + Math.random() * 10),
  }));
}

const HEATMAP_DATA = generateHeatmapData();
const DAILY_DATA    = generateDailyData();

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-card p-4" style={{ flex: 1, minWidth: 160 }}>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        letterSpacing: "0.1em",
        color: "var(--text-4)",
        textTransform: "uppercase",
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div className="stat-value">{value}</div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        color: "var(--text-3)",
        marginTop: 4,
      }}>
        {sub}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "var(--font-display)",
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "var(--text-1)",
      margin: "2rem 0 1rem",
    }}>
      {children}
    </h2>
  );
}

function Badge({ label, variant }: { label: string; variant: "code" | "fidc" | "success" | "warn" | "neutral" }) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    code:    { bg: "rgba(0,255,128,0.12)",  color: "var(--accent)", border: "rgba(0,255,128,0.3)"  },
    fidc:    { bg: "rgba(0,229,255,0.12)",  color: "var(--cyan)",   border: "rgba(0,229,255,0.3)"  },
    success: { bg: "rgba(0,255,128,0.12)",  color: "var(--accent)", border: "rgba(0,255,128,0.3)"  },
    warn:    { bg: "rgba(255,160,0,0.12)",  color: "#ffa000",       border: "rgba(255,160,0,0.3)"  },
    neutral: { bg: "rgba(255,255,255,0.06)", color: "var(--text-2)", border: "rgba(255,255,255,0.12)" },
  };
  const c = colors[variant] || colors.neutral;
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: "0.8125rem",
      padding: "2px 8px",
      borderRadius: "var(--radius)",
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function SuccessBar({ rate }: { rate: number }) {
  const variant = rate >= 97 ? "success" : rate >= 93 ? "neutral" : "warn";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{
        flex: 1,
        height: 6,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${rate}%`,
          height: "100%",
          background: rate >= 97 ? "var(--accent)" : rate >= 93 ? "var(--cyan)" : "#ffa000",
          borderRadius: 3,
          transition: "width 0.6s ease",
        }} />
      </div>
      <Badge label={`${rate.toFixed(1)}%`} variant={variant} />
    </div>
  );
}

// ─── TAB 1: CONTABILIDADE ─────────────────────────────────────────────────────

function TabContabilidade() {
  const maxRuns = Math.max(...STAGE_METRICS.map(s => s.runs));

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: "2rem" }}>
        <StatCard label="TASKS EXECUTADAS"  value="1.847"  sub="Desde o início do projeto" />
        <StatCard label="PIPELINE COMPLETOS" value="312"   sub="BMAD-CE full pipeline runs" />
        <StatCard label="TAXA DE SUCESSO"    value="94.2%" sub="1.740 de 1.847 concluídas" />
        <StatCard label="TEMPO MÉDIO"        value="4.2min" sub="Tempo médio de execução" />
      </div>

      {/* Stage Breakdown */}
      <SectionTitle>Execuções por Etapa BMAD-CE</SectionTitle>
      <p className="section-help">Pipeline completo com 18 etapas — execuções individuais por stage</p>

      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STAGE_METRICS.map((s) => (
            <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Stage number */}
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-4)",
                width: 20,
                textAlign: "right",
                flexShrink: 0,
              }}>
                {s.stage}
              </div>

              {/* Stage name */}
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--text-2)",
                width: 150,
                flexShrink: 0,
              }}>
                {s.name}
              </div>

              {/* Bar */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  flex: 1,
                  height: 8,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${(s.runs / maxRuns) * 100}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--accent) 0%, rgba(0,255,128,0.5) 100%)",
                    borderRadius: 4,
                  }} />
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  color: "var(--text-3)",
                  width: 40,
                  textAlign: "right",
                  flexShrink: 0,
                }}>
                  {s.runs.toLocaleString()}
                </span>
              </div>

              {/* Avg time */}
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-3)",
                width: 60,
                textAlign: "right",
                flexShrink: 0,
              }}>
                {s.avgTime}
              </div>

              {/* Success rate */}
              <div style={{ width: 170, flexShrink: 0 }}>
                <SuccessBar rate={s.successRate} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Breakdown */}
      <SectionTitle>Distribuição por Tier</SectionTitle>
      <p className="section-help">Classificação por complexidade e tempo de execução estimado</p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {TIER_BREAKDOWN.map((t) => (
          <div key={t.tier} className="glass-card p-4" style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: t.color,
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                fontWeight: 700,
                color: t.color,
              }}>
                {t.tier}
              </span>
            </div>
            <div className="stat-value" style={{ fontSize: "1.75rem" }}>{t.count.toLocaleString()}</div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--text-3)",
              marginTop: 4,
              marginBottom: 8,
            }}>
              {t.pct}% do total · {t.avgTime} avg
            </div>
            {/* Mini bar */}
            <div style={{
              height: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${t.pct * 2}%`,
                height: "100%",
                background: t.color,
                borderRadius: 2,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB 2: PERFORMANCE ───────────────────────────────────────────────────────

function TabPerformance() {
  const [sortKey, setSortKey] = useState<"tasks" | "success" | "cost" | "latency">("tasks");
  const [domainFilter, setDomainFilter] = useState<"all" | "code" | "fidc">("all");

  const sorted = [...AGENT_PERFORMANCE]
    .filter(a => domainFilter === "all" || a.domain === domainFilter)
    .sort((a, b) => {
      if (sortKey === "tasks")   return b.tasks - a.tasks;
      if (sortKey === "success") return (b.success / b.tasks) - (a.success / a.tasks);
      if (sortKey === "cost")    return parseFloat(b.cost.replace("$","")) - parseFloat(a.cost.replace("$",""));
      if (sortKey === "latency") return parseFloat(a.avgLatency) - parseFloat(b.avgLatency);
      return 0;
    });

  const btnStyle = (active: boolean) => ({
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
    letterSpacing: "0.08em",
    padding: "6px 14px",
    borderRadius: "var(--radius)",
    border: active ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(0,255,128,0.12)" : "transparent",
    color: active ? "var(--accent)" : "var(--text-3)",
    cursor: "pointer",
    transition: "all 0.2s",
  });

  return (
    <div>
      {/* Domain Summary Cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: "2rem", flexWrap: "wrap" }}>
        <div className="glass-card p-4" style={{ flex: 1, minWidth: 200, borderColor: "rgba(0,255,128,0.25)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 8 }}>⬛ CODE DOMAIN</div>
          <div className="stat-value">3,673 <span style={{ fontSize: "1rem", color: "var(--text-3)" }}>tasks</span></div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>
            96.2% success · 65.4M tokens · $1,200
          </div>
        </div>
        <div className="glass-card p-4" style={{ flex: 1, minWidth: 200, borderColor: "rgba(0,229,255,0.25)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--cyan)", marginBottom: 8 }}>⬛ FIDC DOMAIN</div>
          <div className="stat-value">1,702 <span style={{ fontSize: "1rem", color: "var(--text-3)" }}>tasks</span></div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>
            94.8% success · 43.6M tokens · $699
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>DOMÍNIO:</span>
        {(["all", "code", "fidc"] as const).map(d => (
          <button key={d} style={btnStyle(domainFilter === d)} onClick={() => setDomainFilter(d)}>
            {d === "all" ? "TODOS" : d.toUpperCase()}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>ORDENAR:</span>
        {([["tasks","TASKS"],["success","SUCESSO"],["cost","CUSTO"],["latency","LATÊNCIA"]] as const).map(([k, label]) => (
          <button key={k} style={btnStyle(sortKey === k)} onClick={() => setSortKey(k as typeof sortKey)}>
            {label}
          </button>
        ))}
      </div>

      {/* Agent Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 90px 80px 1fr 80px 70px 80px",
          gap: 12,
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          color: "var(--text-4)",
          textTransform: "uppercase",
        }}>
          <div>Agente</div>
          <div>Domínio</div>
          <div style={{ textAlign: "right" }}>Tasks</div>
          <div>Taxa Sucesso</div>
          <div style={{ textAlign: "right" }}>Tokens</div>
          <div style={{ textAlign: "right" }}>Custo</div>
          <div style={{ textAlign: "right" }}>Latência</div>
        </div>

        {/* Rows */}
        {sorted.map((agent) => {
          const successRate = (agent.success / agent.tasks) * 100;
          return (
            <div key={`${agent.domain}-${agent.name}`} style={{
              display: "grid",
              gridTemplateColumns: "2fr 90px 80px 1fr 80px 70px 80px",
              gap: 12,
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              alignItems: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.1rem" }}>{agent.emoji}</span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.875rem",
                  color: "var(--text-1)",
                }}>
                  {agent.name}
                </span>
              </div>
              <div>
                <Badge label={agent.domain.toUpperCase()} variant={agent.domain as "code" | "fidc"} />
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.875rem",
                color: "var(--text-2)",
                textAlign: "right",
              }}>
                {agent.tasks.toLocaleString()}
              </div>
              <div>
                <SuccessBar rate={successRate} />
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--text-3)",
                textAlign: "right",
              }}>
                {agent.tokens}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.875rem",
                color: "var(--text-2)",
                textAlign: "right",
              }}>
                {agent.cost}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--text-3)",
                textAlign: "right",
              }}>
                {agent.avgLatency}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB 3: ROI ───────────────────────────────────────────────────────────────

function TabROI() {
  const maxSaved = Math.max(...ROI_DATA.monthlyTrend.map(m => m.saved));
  const svgW = 480, svgH = 200, pad = 40;
  const months = ROI_DATA.monthlyTrend;
  const barW = 40;
  const slotW = (svgW - pad * 2) / months.length;

  return (
    <div>
      {/* Giant ROI Number */}
      <div style={{
        textAlign: "center",
        padding: "2.5rem 0 2rem",
      }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: "6rem",
          fontWeight: 900,
          color: "var(--accent)",
          lineHeight: 1,
          textShadow: "0 0 60px rgba(0,255,128,0.5), 0 0 120px rgba(0,255,128,0.25)",
          letterSpacing: "-0.02em",
        }}>
          {ROI_DATA.roi}
        </div>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.875rem",
          letterSpacing: "0.15em",
          color: "var(--text-4)",
          textTransform: "uppercase",
          marginTop: 8,
        }}>
          Return on Investment
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: "2rem", flexWrap: "wrap" }}>
        <StatCard label="TOTAL INVESTIDO"       value="$1,899"  sub="Custo de compute USD" />
        <StatCard label="HORAS HUMANAS SALVAS"  value="2.340h"  sub="@ $50/hora equivalente" />
        <StatCard label="VALOR GERADO"          value="$117K"   sub="Economia total estimada" />
      </div>

      {/* Monthly SVG Bar Chart */}
      <SectionTitle>Tendência Mensal</SectionTitle>
      <p className="section-help">Investimento vs. valor economizado por mês (USD)</p>

      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", maxWidth: svgW, display: "block" }}>
          {/* Y grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <g key={t}>
              <line
                x1={pad} y1={pad + (svgH - pad * 2) * (1 - t)}
                x2={svgW - pad} y2={pad + (svgH - pad * 2) * (1 - t)}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1}
              />
              <text
                x={pad - 6} y={pad + (svgH - pad * 2) * (1 - t) + 4}
                textAnchor="end" fill="rgba(255,255,255,0.3)"
                fontSize={10} fontFamily="var(--font-mono)"
              >
                ${Math.round(maxSaved * t / 1000)}K
              </text>
            </g>
          ))}

          {/* Bars */}
          {months.map((m, i) => {
            const cx = pad + slotW * i + slotW / 2;
            const availH = svgH - pad * 2;
            const savedH = (m.saved / maxSaved) * availH;
            const investH = (m.invested / maxSaved) * availH;

            return (
              <g key={m.month}>
                {/* Saved bar (green) */}
                <rect
                  x={cx - barW / 2}
                  y={pad + availH - savedH}
                  width={barW / 2 - 2}
                  height={savedH}
                  fill="var(--accent)"
                  opacity={0.7}
                  rx={3}
                />
                {/* Invested bar (cyan) */}
                <rect
                  x={cx + 2}
                  y={pad + availH - investH}
                  width={barW / 2 - 2}
                  height={investH}
                  fill="var(--cyan)"
                  opacity={0.7}
                  rx={3}
                />
                {/* Month label */}
                <text
                  x={cx} y={svgH - 4}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={11}
                  fontFamily="var(--font-mono)"
                >
                  {m.month}
                </text>
                {/* ROI label */}
                <text
                  x={cx} y={pad + availH - savedH - 6}
                  textAnchor="middle"
                  fill="var(--accent)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                >
                  {m.roi}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
          {[
            { color: "var(--accent)", label: "Valor economizado" },
            { color: "var(--cyan)",   label: "Investimento compute" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, opacity: 0.8 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Model Cost Breakdown */}
      <SectionTitle>Custo por Modelo</SectionTitle>
      <p className="section-help">Distribuição de custo de tokens por modelo de IA</p>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {MODEL_COSTS.map((m, i) => (
          <div key={m.model} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: i < MODEL_COSTS.length - 1 ? 16 : 0,
          }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              color: "var(--text-2)",
              width: 200,
              flexShrink: 0,
            }}>
              {m.model}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                height: 8,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 4,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${m.pct}%`,
                  height: "100%",
                  background: `hsl(${140 + i * 30}, 80%, 55%)`,
                  borderRadius: 4,
                }} />
              </div>
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--text-3)",
              width: 60,
              textAlign: "right",
              flexShrink: 0,
            }}>
              {m.tokens}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              color: "var(--text-1)",
              width: 55,
              textAlign: "right",
              flexShrink: 0,
            }}>
              {m.cost}
            </div>
            <Badge label={`${m.pct}%`} variant="neutral" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB 4: TENDÊNCIAS ────────────────────────────────────────────────────────

function HeatmapCell({ count }: { count: number }) {
  let bg = "rgba(255,255,255,0.04)";
  if (count >= 16) bg = "var(--accent)";
  else if (count >= 6) bg = "rgba(0,255,128,0.5)";
  else if (count >= 1) bg = "rgba(0,255,128,0.2)";

  return (
    <div
      title={`${count} tasks`}
      style={{
        width: 14,
        height: 14,
        borderRadius: 2,
        background: bg,
        cursor: "default",
        transition: "transform 0.1s",
      }}
    />
  );
}

function TabTendencias() {
  const weeks = 12;
  const days  = 7;
  const data  = HEATMAP_DATA;

  // SVG line chart for daily throughput
  const svgW = 600, svgH = 200, pad = 48;
  const maxTasks = Math.max(...DAILY_DATA.map(d => d.tasks));
  const pts = DAILY_DATA.map((d, i) => {
    const x = pad + (i / (DAILY_DATA.length - 1)) * (svgW - pad * 2);
    const y = pad + (1 - d.tasks / maxTasks) * (svgH - pad * 2);
    return { x, y, ...d };
  });
  const srPts = DAILY_DATA.map((d, i) => {
    const x = pad + (i / (DAILY_DATA.length - 1)) * (svgW - pad * 2);
    const y = pad + (1 - (d.successRate - 80) / 20) * (svgH - pad * 2);
    return { x, y, ...d };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const srLine   = srPts.map(p => `${p.x},${p.y}`).join(" ");

  // Area fill
  const areaPath = `M ${pts[0].x},${svgH - pad} ` +
    pts.map(p => `L ${p.x},${p.y}`).join(" ") +
    ` L ${pts[pts.length - 1].x},${svgH - pad} Z`;

  const dayLabels = ["D","S","T","Q","Q","S","S"];

  return (
    <div>
      {/* Heatmap */}
      <SectionTitle>Atividade Semanal — Últimas 12 Semanas</SectionTitle>
      <p className="section-help">Cada célula representa um dia. Intensidade = número de tasks executadas</p>

      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem", display: "inline-block", width: "100%" }}>
        {/* Day-of-week labels */}
        <div style={{ display: "flex", gap: 4, marginBottom: 6, paddingLeft: 0 }}>
          {dayLabels.map((d, i) => (
            <div key={i} style={{
              width: 14,
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--text-4)",
              textAlign: "center",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid: rows = days (7), cols = weeks (12) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {Array.from({ length: days }).map((_, dayIdx) => (
            <div key={dayIdx} style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: weeks }).map((_, weekIdx) => {
                const cellIdx = weekIdx * days + dayIdx;
                return <HeatmapCell key={weekIdx} count={data[cellIdx] ?? 0} />;
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>Menos</span>
          {[0, 2, 8, 18].map(n => <HeatmapCell key={n} count={n} />)}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>Mais</span>
        </div>
      </div>

      {/* Daily Throughput */}
      <SectionTitle>Throughput Diário — Últimos 30 Dias</SectionTitle>
      <p className="section-help">Tasks por dia (verde) e taxa de sucesso (ciano)</p>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }}>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <g key={t}>
              <line
                x1={pad} y1={pad + (svgH - pad * 2) * t}
                x2={svgW - pad} y2={pad + (svgH - pad * 2) * t}
                stroke="rgba(255,255,255,0.05)" strokeWidth={1}
              />
              <text
                x={pad - 6} y={pad + (svgH - pad * 2) * t + 4}
                textAnchor="end" fill="rgba(255,255,255,0.25)"
                fontSize={9} fontFamily="var(--font-mono)"
              >
                {Math.round(maxTasks * (1 - t))}
              </text>
              {/* Secondary Y (success rate 80–100%) */}
              <text
                x={svgW - pad + 6} y={pad + (svgH - pad * 2) * t + 4}
                textAnchor="start" fill="rgba(0,229,255,0.4)"
                fontSize={9} fontFamily="var(--font-mono)"
              >
                {Math.round(80 + 20 * (1 - t))}%
              </text>
            </g>
          ))}

          {/* Area fill */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Tasks line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Success rate line */}
          <polyline
            points={srLine}
            fill="none"
            stroke="var(--cyan)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />

          {/* Data points (tasks) */}
          {pts.filter((_, i) => i % 5 === 0 || i === pts.length - 1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3}
              fill="var(--accent)" stroke="rgba(0,0,0,0.6)" strokeWidth={1}
            />
          ))}

          {/* X axis labels */}
          {pts.filter((_, i) => i % 5 === 0).map((p, i) => (
            <text key={i} x={p.x} y={svgH - 2}
              textAnchor="middle" fill="rgba(255,255,255,0.3)"
              fontSize={9} fontFamily="var(--font-mono)"
            >
              D{p.day}
            </text>
          ))}
        </svg>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
          {[
            { color: "var(--accent)", label: "Tasks/dia", dashed: false },
            { color: "var(--cyan)",   label: "Taxa sucesso", dashed: true },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 20, height: 2,
                background: l.color,
                borderRadius: 1,
                borderTop: l.dashed ? `2px dashed ${l.color}` : undefined,
              }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ROOT ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "contabilidade", label: "📊 CONTABILIDADE" },
  { id: "performance",   label: "🤖 PERFORMANCE" },
  { id: "roi",           label: "💰 ROI" },
  { id: "tendencias",    label: "📈 TENDÊNCIAS" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function MetricsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("contabilidade");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
    letterSpacing: "0.08em",
    padding: "10px 20px",
    borderRadius: "var(--radius)",
    border: active ? "1px solid var(--accent)" : "1px solid transparent",
    background: active ? "rgba(0,255,128,0.1)" : "transparent",
    color: active ? "var(--accent)" : "var(--text-3)",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "2rem",
          fontWeight: 700,
          color: "var(--text-1)",
          margin: 0,
        }}>
          Métricas & Contabilidade
        </h1>
        <p className="section-help" style={{ marginTop: 6 }}>
          Task accounting, agent performance, ROI e tendências — domínios Code + FIDC Finance
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            style={tabBtnStyle(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "contabilidade" && <TabContabilidade />}
      {activeTab === "performance"   && <TabPerformance />}
      {activeTab === "roi"           && <TabROI />}
      {activeTab === "tendencias"    && <TabTendencias />}
    </div>
  );
}
