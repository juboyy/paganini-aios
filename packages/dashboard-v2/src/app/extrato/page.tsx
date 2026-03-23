"use client";

import { useState, useMemo } from "react";

/* ── Types ── */
interface ExtractEntry {
  id: string;
  time: string;
  type: "task" | "deploy" | "alert" | "chat" | "gate" | "commit" | "monitor" | "cron";
  agent: string;
  title: string;
  detail?: string;
  status: "success" | "warning" | "error" | "info";
  cost?: number;
  tokens?: number;
  duration?: string;
}

/* ── Mock data generator ── */
function generateEntries(date: string): ExtractEntry[] {
  const base: ExtractEntry[] = [
    { id: "e01", time: "08:00", type: "cron", agent: "OraCLI", title: "Heartbeat — pulse check, ROI sync, tmux health", status: "success", tokens: 2400, cost: 0.003 },
    { id: "e02", time: "08:02", type: "monitor", agent: "OraCLI", title: "UFLA Pós Lato Sensu — sem alterações", status: "info", tokens: 1100, cost: 0.001 },
    { id: "e03", time: "08:02", type: "monitor", agent: "OraCLI", title: "Terceirizados Federal — sem alterações", status: "info", tokens: 1100, cost: 0.001 },
    { id: "e04", time: "08:30", type: "cron", agent: "Standup", title: "Standup report enviado ao Slack #engineering", status: "success", tokens: 3200, cost: 0.004 },
    { id: "e05", time: "09:15", type: "gate", agent: "OraCLI", title: "Gate — SPEAR report: 4 novas seções (anatomia, antes/depois, moat, timing)", detail: "Tier: feature · Token: GATE-20260323-0915", status: "success", tokens: 8500, cost: 0.012 },
    { id: "e06", time: "09:18", type: "task", agent: "Code Agent", title: "Seção 'Anatomia de Uma Operação' — walkthrough cessão R$ 2.4M", detail: "7 passos, 6 gates, timeline visual, flag PLD/AML", status: "success", tokens: 12000, cost: 0.016, duration: "3m" },
    { id: "e07", time: "09:25", type: "task", agent: "Code Agent", title: "Seção 'Antes vs Depois' — tabela comparativa 7 linhas", status: "success", tokens: 6200, cost: 0.008, duration: "2m" },
    { id: "e08", time: "09:30", type: "task", agent: "Code Agent", title: "Seção 'Moat' — 3 cards defensibilidade + timing CVM 175", status: "success", tokens: 9800, cost: 0.013, duration: "4m" },
    { id: "e09", time: "09:35", type: "deploy", agent: "Infra", title: "Deploy prod → dashboard-v2-pearl-rho.vercel.app", detail: "spear-report.html atualizado", status: "success", duration: "35s" },
    { id: "e10", time: "09:36", type: "commit", agent: "OraCLI", title: "feat: SPEAR report — 4 new sections for investor pitch", detail: "d5d61dd · 238 insertions", status: "success" },
    { id: "e11", time: "10:30", type: "alert", agent: "OraCLI", title: "OraCLI dark section — texto invisível no mobile", detail: "CSS global forçava color:var(--ink) sobre fundo var(--ink)", status: "warning" },
    { id: "e12", time: "10:35", type: "task", agent: "Code Agent", title: "Fix CSS: hex hardcoded + seletor section#oracli *", detail: "1ª tentativa (vars) falhou, 2ª (hex) funcionou", status: "success", tokens: 4200, cost: 0.006, duration: "5m" },
    { id: "e13", time: "10:40", type: "deploy", agent: "Infra", title: "Deploy prod — CSS nuclear override", status: "success", duration: "36s" },
    { id: "e14", time: "14:00", type: "cron", agent: "OraCLI", title: "Heartbeat — pulse, health check, gate audit", status: "success", tokens: 2800, cost: 0.004 },
    { id: "e15", time: "14:48", type: "task", agent: "OraCLI", title: "Monitor UFLA Pós Lato Sensu — setup completo", detail: "7.194 registros, 22 cursos, 17 períodos, baseline + cron 6h", status: "success", tokens: 15000, cost: 0.020, duration: "8m" },
    { id: "e16", time: "14:55", type: "task", agent: "Code Agent", title: "Relatório HTML UFLA — análise editorial com gráficos", detail: "Trend chart, barras de cursos, tabela unidades, 5 insights", status: "success", tokens: 18000, cost: 0.024, duration: "6m" },
    { id: "e17", time: "14:58", type: "deploy", agent: "Infra", title: "Deploy prod — ufla-report.html", status: "success", duration: "35s" },
    { id: "e18", time: "15:12", type: "task", agent: "OraCLI", title: "Monitor Terceirizados Federal — 14 CSVs baixados (1.16M registros)", detail: "2019-01 a 2023-09, análise profunda 81.941 registros", status: "success", tokens: 32000, cost: 0.042, duration: "12m" },
    { id: "e19", time: "15:25", type: "task", agent: "Code Agent", title: "Relatório HTML Terceirizados — R$ 5.6bi/ano, 80 órgãos", detail: "Evolução efetivo, custos, categorias, empresas, Decreto 12.174", status: "success", tokens: 24000, cost: 0.032, duration: "10m" },
    { id: "e20", time: "15:30", type: "deploy", agent: "Infra", title: "Deploy prod — terceirizados-report.html", status: "success", duration: "34s" },
    { id: "e21", time: "15:36", type: "task", agent: "OraCLI", title: "Busca entidades: SANTA FE SERVICOS + WAGNER APARECIDO BAPTISTA", detail: "8.373 registros Santa Fe, 6 aparições Wagner (UFJF)", status: "success", tokens: 28000, cost: 0.037, duration: "3m" },
    { id: "e22", time: "17:00", type: "cron", agent: "Research", title: "Pesquisa Proativa — 6 insights (AI agents, fintech, SaaS, dev tooling)", detail: "Gartner 40% AI agents 2026, Mastercard BVNK $1.8B, vibe coding", status: "success", tokens: 8500, cost: 0.011 },
    { id: "e23", time: "20:00", type: "cron", agent: "OraCLI", title: "Heartbeat — ROI sync, realtime sync, gate audit", status: "success", tokens: 3100, cost: 0.004 },
  ];
  return base;
}

/* ── Helpers ── */
const TYPE_ICONS: Record<string, string> = {
  task: "▸", deploy: "▲", alert: "⚠", chat: "◆", gate: "⛊", commit: "◉", monitor: "◎", cron: "↻",
};
const TYPE_COLORS: Record<string, string> = {
  task: "var(--accent)", deploy: "var(--cyan)", alert: "var(--amber)", chat: "var(--blue)",
  gate: "var(--teal)", commit: "hsl(280 80% 65%)", monitor: "var(--text-3)", cron: "var(--text-4)",
};
const STATUS_COLORS: Record<string, string> = {
  success: "var(--accent)", warning: "var(--amber)", error: "var(--red)", info: "var(--text-3)",
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ExtratoPage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(formatDate(today));
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");

  const entries = useMemo(() => generateEntries(selectedDate), [selectedDate]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterAgent !== "all" && e.agent !== filterAgent) return false;
      return true;
    });
  }, [entries, filterType, filterAgent]);

  const agents = [...new Set(entries.map((e) => e.agent))];
  const types = [...new Set(entries.map((e) => e.type))];

  const totalTokens = filtered.reduce((s, e) => s + (e.tokens || 0), 0);
  const totalCost = filtered.reduce((s, e) => s + (e.cost || 0), 0);
  const successCount = filtered.filter((e) => e.status === "success").length;
  const alertCount = filtered.filter((e) => e.status === "warning" || e.status === "error").length;

  // Date nav
  const goDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === formatDate(today);
  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
          EXTRATO DE OPERAÇÕES
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          Registro Diário
        </h1>
      </div>

      {/* Date nav + filters */}
      <div className="glass-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={() => goDay(-1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text-2)", padding: "0.35rem 0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", cursor: "pointer" }}>
            ←
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, color: "var(--text-1)", textTransform: "capitalize" }}>
              {dateLabel}
            </div>
            {isToday && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.15em", color: "var(--accent)", background: "var(--accent-bg)", padding: "0.1rem 0.5rem", borderRadius: "var(--radius)" }}>
                HOJE
              </span>
            )}
          </div>
          <button onClick={() => goDay(1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text-2)", padding: "0.35rem 0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", cursor: "pointer" }}>
            →
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text-2)", padding: "0.35rem 0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem", cursor: "pointer" }}>
            <option value="all">Todos os tipos</option>
            {types.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
          <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text-2)", padding: "0.35rem 0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem", cursor: "pointer" }}>
            <option value="all">Todos os agentes</option>
            {agents.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "OPERAÇÕES", value: filtered.length.toString(), color: "var(--text-1)" },
          { label: "SUCESSO", value: successCount.toString(), color: "var(--accent)" },
          { label: "ALERTAS", value: alertCount.toString(), color: alertCount > 0 ? "var(--amber)" : "var(--text-3)" },
          { label: "TOKENS", value: totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(0)}K` : totalTokens.toString(), color: "var(--cyan)" },
          { label: "CUSTO", value: `$${totalCost.toFixed(3)}`, color: "var(--amber)" },
        ].map((c) => (
          <div key={c.label} className="glass-card" style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.15em", color: "var(--text-4)", marginTop: "0.15rem" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="glass-card" style={{ padding: "0.5rem 0" }}>
        {filtered.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 20px 1fr auto",
              gap: "0.75rem",
              alignItems: "start",
              padding: "0.75rem 1.25rem",
              borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {/* Time */}
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", paddingTop: "0.1rem" }}>
              {entry.time}
            </div>

            {/* Icon */}
            <div style={{ fontSize: "0.85rem", color: TYPE_COLORS[entry.type] || "var(--text-3)", textAlign: "center", paddingTop: "0.05rem" }}>
              {TYPE_ICONS[entry.type] || "·"}
            </div>

            {/* Content */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.12em", color: TYPE_COLORS[entry.type], background: `color-mix(in srgb, ${TYPE_COLORS[entry.type]} 12%, transparent)`, padding: "0.1rem 0.4rem", borderRadius: "var(--radius)" }}>
                  {entry.type.toUpperCase()}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)" }}>
                  {entry.agent}
                </span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-1)", marginTop: "0.2rem", lineHeight: 1.4 }}>
                {entry.title}
              </div>
              {entry.detail && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: "0.15rem", lineHeight: 1.4 }}>
                  {entry.detail}
                </div>
              )}
            </div>

            {/* Meta */}
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[entry.status], boxShadow: entry.status === "success" ? "0 0 6px var(--accent)" : "none", display: "inline-block" }} />
              {entry.tokens && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)", marginTop: "0.25rem" }}>
                  {entry.tokens > 1000 ? `${(entry.tokens / 1000).toFixed(1)}K` : entry.tokens} tok
                </div>
              )}
              {entry.duration && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>
                  {entry.duration}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
