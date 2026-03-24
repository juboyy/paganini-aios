"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Deliverable {
  id?: string;
  name?: string;
  title?: string;
  type?: string;
  status?: string;
  task_id?: string;
  created_at: string;
  [key: string]: unknown;
}

interface DeployEvent {
  id?: string;
  title: string;
  description?: string;
  type: string;
  agent_id?: string;
  created_at: string;
}

interface ReportsData {
  deliverables: Deliverable[];
  deployEvents: DeployEvent[];
}

// ── Static terminal demo ────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { text: '$ paganini report --type informe-mensal --fund "Paganini I FIDC"', type: "cmd" },
  { text: "", type: "blank" },
  { text: "📊 Gerando Informe Mensal CVM...", type: "info" },
  { text: "  Período: Fev/2026", type: "data" },
  { text: "  PL: R$ 245.000.000,00", type: "data" },
  { text: "  Rentabilidade Cota Sênior: CDI + 2.8%", type: "data" },
  { text: "  PDD: R$ 4.200.000,00 (1.7% do PL)", type: "data" },
  { text: "", type: "blank" },
  { text: "✓ Relatório salvo em: reports/informe-mensal-2026-02.pdf", type: "success" },
  { text: "✓ Enviado para: CVM, Administrador, Investidores", type: "success" },
];

const STATIC_REPORT_TYPES = [
  { icon: "📊", name: "Informe Mensal CVM", desc: "Geração automática do informe mensal obrigatório conforme CVM 175", frequency: "MENSAL" },
  { icon: "📋", name: "CADOC 3040", desc: "Demonstrativo de créditos cedidos para o BACEN", frequency: "MENSAL" },
  { icon: "📈", name: "Relatório de PDD", desc: "Provisão para devedores duvidosos com aging BACEN 2682/99", frequency: "DIÁRIO" },
  { icon: "⚖️", name: "Compliance Check", desc: "Verificação de limites, covenants e concentração por cedente", frequency: "DIÁRIO" },
];

const FREQ_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  MENSAL:       { color: "hsl(180 100% 55%)", bg: "hsl(180 100% 50% / 0.08)", border: "hsl(180 100% 50% / 0.3)" },
  DIÁRIO:       { color: "hsl(150 100% 55%)", bg: "hsl(150 100% 50% / 0.08)", border: "hsl(150 100% 50% / 0.3)" },
  "SOB DEMANDA":{ color: "hsl(45 100% 60%)",  bg: "hsl(45 100% 50% / 0.08)",  border: "hsl(45 100% 50% / 0.3)"  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ReportTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;
    const delay =
      TERMINAL_LINES[visibleLines]?.type === "blank" ? 80
      : TERMINAL_LINES[visibleLines]?.type === "cmd" ? 200
      : TERMINAL_LINES[visibleLines]?.type === "success" ? 200
      : 70;
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div style={{ background: "hsl(220 20% 4%)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", background: "hsl(220 20% 6%)" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.08em", marginLeft: "0.5rem" }}>
          paganini — bash
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setVisibleLines(0)}
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", background: "transparent", border: "1px solid var(--border)", borderRadius: "3px", padding: "2px 8px", cursor: "pointer", letterSpacing: "0.08em" }}
          >
            REPLAY
          </button>
        </div>
      </div>
      <div style={{ padding: "1rem 1.25rem", minHeight: "14rem" }}>
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => {
          const color =
            line.type === "cmd" ? "hsl(150 100% 60%)"
            : line.type === "success" ? "hsl(150 100% 55%)"
            : line.type === "info" ? "hsl(180 100% 65%)"
            : line.type === "data" ? "hsl(220 20% 75%)"
            : "transparent";
          return (
            <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color, lineHeight: 1.7, whiteSpace: "pre" }}>
              {line.text || "\u00a0"}
            </div>
          );
        })}
        {visibleLines < TERMINAL_LINES.length && (
          <span style={{ display: "inline-block", width: 8, height: 14, background: "hsl(150 100% 55%)", marginTop: 2 }} />
        )}
      </div>
    </div>
  );
}

// ── Status badge helper ────────────────────────────────────────────────────────
function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "done" || s === "completed" || s === "delivered") {
    return { label: "ENTREGUE", color: "var(--accent)", bg: "rgba(0,255,136,0.1)", border: "rgba(0,255,136,0.3)" };
  }
  if (s === "in_progress" || s === "wip") {
    return { label: "EM ANDAMENTO", color: "var(--cyan)", bg: "rgba(0,229,255,0.1)", border: "rgba(0,229,255,0.3)" };
  }
  if (s === "error" || s === "failed") {
    return { label: "ERRO", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" };
  }
  return { label: (status || "PENDENTE").toUpperCase(), color: "var(--text-3)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Falha ao conectar com a API"))
      .finally(() => setLoading(false));
  }, []);

  const deliverables = data?.deliverables ?? [];
  const deployEvents = data?.deployEvents ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>PAGANINI AIOS · REPORTING REGULATÓRIO</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.5rem" }}>
          Relatórios{" "}
          <span style={{ color: "var(--accent)" }}>& Entregas</span>
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <span className="tag-badge" style={{ background: "hsl(150 100% 50% / 0.12)", color: "hsl(150 100% 60%)", borderColor: "hsl(150 100% 50% / 0.4)", padding: "4px 12px" }}>
            {loading ? "..." : `${deliverables.length} DELIVERABLES`}
          </span>
          <span className="tag-badge-cyan" style={{ padding: "4px 12px" }}>AUTOMÁTICO</span>
        </div>
        <p className="section-help">
          Deliverables registrados no Supabase + histórico de deploy events. Dados reais em tempo real.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#ef4444" }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.1em" }}>
          CARREGANDO...
        </div>
      )}

      {/* Deliverables from Supabase */}
      {!loading && deliverables.length > 0 && (
        <div>
          <div className="mono-label" style={{ marginBottom: "0.75rem" }}>DELIVERABLES — SUPABASE</div>
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["NOME", "TIPO", "STATUS", "TASK", "DATA"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-4)", fontSize: "0.75rem", letterSpacing: "0.1em", fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deliverables.map((d, i) => {
                    const badge = statusBadge(d.status);
                    const name = d.name || d.title || (d.id ? `deliverable-${String(d.id).slice(0, 8)}` : "—");
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: i < deliverables.length - 1 ? "1px solid hsl(150 100% 50% / 0.06)" : "none",
                          background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-1)", fontWeight: 600, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {name}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--cyan)" }}>
                          {d.type || "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px",
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            borderRadius: "var(--radius)",
                            fontSize: "0.7rem",
                            color: badge.color,
                            letterSpacing: "0.06em",
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-4)", fontSize: "0.75rem" }}>
                          {d.task_id ? String(d.task_id).slice(0, 12) + "…" : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)" }}>
                          {fmtDate(d.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && deliverables.length === 0 && (
        <div style={{ padding: "1.5rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-4)" }}>
          Nenhum deliverable registrado ainda.
        </div>
      )}

      {/* Deploy Events */}
      {!loading && deployEvents.length > 0 && (
        <div>
          <div className="mono-label" style={{ marginBottom: "0.75rem" }}>HISTÓRICO DE DEPLOY — timeline_events type=deploy</div>
          <div className="glass-card" style={{ overflow: "hidden" }}>
            {deployEvents.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "0.875rem 1.25rem",
                  borderBottom: i < deployEvents.length - 1 ? "1px solid hsl(150 100% 50% / 0.06)" : "none",
                  background: i % 2 === 0 ? "rgba(0,0,0,0.1)" : "transparent",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, marginTop: "2px" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", display: "inline-block" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent)", letterSpacing: "0.1em" }}>DEPLOY</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-1)", fontWeight: 600, marginBottom: "0.25rem" }}>{ev.title}</div>
                  {ev.description && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.description}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {ev.agent_id && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-4)", marginBottom: "0.2rem" }}>{ev.agent_id}</div>
                  )}
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-4)" }}>{fmtDate(ev.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && deployEvents.length === 0 && (
        <div style={{ padding: "1rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-4)" }}>
          Nenhum evento de deploy registrado ainda.
        </div>
      )}

      {/* Static report type cards */}
      <div>
        <div className="mono-label" style={{ marginBottom: "1rem" }}>TIPOS DE RELATÓRIO REGULATÓRIO</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {STATIC_REPORT_TYPES.map((report) => {
            const freq = FREQ_COLOR[report.frequency] ?? FREQ_COLOR["SOB DEMANDA"];
            return (
              <div
                key={report.name}
                className="glass-card"
                style={{ padding: "1.25rem", position: "relative", overflow: "hidden" }}
              >
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${freq.color}00, ${freq.color}, ${freq.color}00)`,
                }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{report.icon}</span>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-1)", fontWeight: 700 }}>
                      {report.name}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                    padding: "3px 8px", borderRadius: "var(--radius)",
                    background: freq.bg, color: freq.color, border: `1px solid ${freq.border}`,
                    letterSpacing: "0.08em", whiteSpace: "nowrap",
                  }}>
                    {report.frequency}
                  </span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-3)", lineHeight: 1.5, margin: "0 0 0.875rem" }}>
                  {report.desc}
                </p>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", display: "inline-block" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)", letterSpacing: "0.1em" }}>PRONTO</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>GERAÇÃO VIA CLI</div>
        <ReportTerminal />
      </div>

    </div>
  );
}
