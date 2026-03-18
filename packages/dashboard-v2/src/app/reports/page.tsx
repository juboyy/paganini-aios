"use client";

import { useState, useEffect } from "react";

const REPORT_TYPES = [
  {
    icon: "📊",
    name: "Informe Mensal CVM",
    desc: "Geração automática do informe mensal obrigatório conforme CVM 175",
    frequency: "MENSAL",
    lastGen: "18/03/2026 02:00",
    status: "ok",
  },
  {
    icon: "📋",
    name: "CADOC 3040",
    desc: "Demonstrativo de créditos cedidos para o BACEN",
    frequency: "MENSAL",
    lastGen: "01/03/2026 08:30",
    status: "ok",
  },
  {
    icon: "📈",
    name: "Relatório de PDD",
    desc: "Provisão para devedores duvidosos com aging BACEN 2682/99",
    frequency: "DIÁRIO",
    lastGen: "18/03/2026 06:15",
    status: "ok",
  },
  {
    icon: "📉",
    name: "Stress Test",
    desc: "Cenários de stress sobre a carteira: VaR histórico, Expected Loss",
    frequency: "SOB DEMANDA",
    lastGen: "15/03/2026 14:22",
    status: "ok",
  },
  {
    icon: "⚖️",
    name: "Compliance Check",
    desc: "Verificação de limites, covenants e concentração por cedente",
    frequency: "DIÁRIO",
    lastGen: "18/03/2026 07:00",
    status: "ok",
  },
  {
    icon: "📄",
    name: "Relatório para Investidores",
    desc: "IR periódico com performance MTD/YTD e composição da carteira",
    frequency: "MENSAL",
    lastGen: "01/03/2026 10:00",
    status: "ok",
  },
];

const REPORT_HISTORY = [
  {
    type: "Informe Mensal CVM",
    date: "18/03/2026",
    fund: "Paganini I FIDC",
    status: "ok",
    file: "informe-mensal-2026-03.pdf",
  },
  {
    type: "Relatório de PDD",
    date: "18/03/2026",
    fund: "Brahms Recebíveis FIDC",
    status: "ok",
    file: "pdd-2026-03-18.pdf",
  },
  {
    type: "Compliance Check",
    date: "17/03/2026",
    fund: "Paganini I FIDC",
    status: "ok",
    file: "compliance-2026-03-17.pdf",
  },
  {
    type: "Stress Test",
    date: "15/03/2026",
    fund: "Liszt Capital FIDC",
    status: "ok",
    file: "stress-test-2026-03-15.pdf",
  },
  {
    type: "CADOC 3040",
    date: "01/03/2026",
    fund: "Paganini I FIDC",
    status: "ok",
    file: "cadoc-3040-2026-03.pdf",
  },
];

const TERMINAL_LINES = [
  { text: '$ paganini report --type informe-mensal --fund "Paganini I FIDC"', type: "cmd" },
  { text: "", type: "blank" },
  { text: "📊 Gerando Informe Mensal CVM...", type: "info" },
  { text: "  Período: Fev/2026", type: "data" },
  { text: "  PL: R$ 245.000.000,00", type: "data" },
  { text: "  Rentabilidade Cota Sênior: CDI + 2.8%", type: "data" },
  { text: "  Inadimplência 0-30d: 1.2%", type: "data" },
  { text: "  Inadimplência 31-60d: 0.4%", type: "data" },
  { text: "  PDD: R$ 4.200.000,00 (1.7% do PL)", type: "data" },
  { text: "  Razão Subordinação: 26.5%", type: "data" },
  { text: "", type: "blank" },
  { text: "✓ Relatório salvo em: reports/informe-mensal-2026-02.pdf", type: "success" },
  { text: "✓ Enviado para: CVM, Administrador, Investidores", type: "success" },
];

const FREQ_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  MENSAL:       { color: "hsl(180 100% 55%)", bg: "hsl(180 100% 50% / 0.08)", border: "hsl(180 100% 50% / 0.3)" },
  DIÁRIO:       { color: "hsl(150 100% 55%)", bg: "hsl(150 100% 50% / 0.08)", border: "hsl(150 100% 50% / 0.3)" },
  "SOB DEMANDA":{ color: "hsl(45 100% 60%)",  bg: "hsl(45 100% 50% / 0.08)",  border: "hsl(45 100% 50% / 0.3)"  },
};

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
    <div
      style={{
        background: "hsl(220 20% 4%)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)",
          background: "hsl(220 20% 6%)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)", letterSpacing: "0.08em", marginLeft: "0.5rem" }}>
          paganini — bash
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setVisibleLines(0)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5rem",
              color: "var(--text-4)", background: "transparent",
              border: "1px solid var(--border)", borderRadius: "3px",
              padding: "2px 8px", cursor: "pointer", letterSpacing: "0.08em",
            }}
          >
            REPLAY
          </button>
        </div>
      </div>
      <div style={{ padding: "1rem 1.25rem", minHeight: "18rem" }}>
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => {
          const color =
            line.type === "cmd" ? "hsl(150 100% 60%)"
            : line.type === "success" ? "hsl(150 100% 55%)"
            : line.type === "info" ? "hsl(180 100% 65%)"
            : line.type === "data" ? "hsl(220 20% 75%)"
            : "transparent";
          return (
            <div
              key={i}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color, lineHeight: 1.7, whiteSpace: "pre" }}
            >
              {line.text || "\u00a0"}
            </div>
          );
        })}
        {visibleLines < TERMINAL_LINES.length && (
          <span style={{ display: "inline-block", width: 8, height: 14, background: "hsl(150 100% 55%)", animation: "pulse-neon 0.8s ease-in-out infinite", marginTop: 2 }} />
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Section 1: Header ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>
          PAGANINI AIOS · REPORTING REGULATÓRIO
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.5rem" }}>
          Relatórios{" "}
          <span style={{ color: "var(--accent)" }}>Regulatórios</span>
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <span
            className="tag-badge"
            style={{
              background: "hsl(150 100% 50% / 0.12)", color: "hsl(150 100% 60%)",
              borderColor: "hsl(150 100% 50% / 0.4)", padding: "4px 12px",
            }}
          >
            6 TIPOS
          </span>
          <span
            className="tag-badge-cyan"
            style={{ padding: "4px 12px" }}
          >
            AUTOMÁTICO
          </span>
        </div>
        <p className="section-help">
          Geração automática de todos os relatórios regulatórios obrigatórios para FIDCs: CVM 175, BACEN, ANBIMA e comunicação com investidores. Zero intervenção manual.
        </p>
      </div>

      {/* ── Section 2: Report Type Cards ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "1rem" }}>
          TIPOS DE RELATÓRIO
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {REPORT_TYPES.map((report) => {
            const freq = FREQ_COLOR[report.frequency] ?? FREQ_COLOR["SOB DEMANDA"];
            return (
              <div
                key={report.name}
                className="glass-card"
                style={{ padding: "1.25rem", position: "relative", overflow: "hidden" }}
              >
                <div
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, ${freq.color}00, ${freq.color}, ${freq.color}00)`,
                  }}
                />
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{report.icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-1)", fontWeight: 700 }}>
                        {report.name}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                      padding: "3px 8px", borderRadius: "var(--radius)",
                      background: freq.bg, color: freq.color, border: `1px solid ${freq.border}`,
                      letterSpacing: "0.08em", whiteSpace: "nowrap",
                    }}
                  >
                    {report.frequency}
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontSize: "0.6875rem", color: "var(--text-3)", lineHeight: 1.5, margin: "0 0 0.875rem" }}>
                  {report.desc}
                </p>

                {/* Footer */}
                <div
                  style={{
                    borderTop: "1px solid var(--border)", paddingTop: "0.75rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div className="mono-label" style={{ fontSize: "0.4375rem", marginBottom: 2 }}>ÚLTIMO GERADO</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-3)" }}>
                      {report.lastGen}
                    </div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", display: "inline-block" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--accent)", letterSpacing: "0.1em" }}>
                      PRONTO
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Terminal ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>
          GERAÇÃO VIA CLI
        </div>
        <ReportTerminal />
      </div>

      {/* ── Section 4: Histórico ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>
          HISTÓRICO DE RELATÓRIOS
        </div>
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["TIPO", "DATA", "FUNDO", "STATUS", "ARQUIVO"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left", padding: "0.75rem 1rem",
                        color: "var(--text-4)", fontSize: "0.5625rem",
                        letterSpacing: "0.1em", fontWeight: 500,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORT_HISTORY.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < REPORT_HISTORY.length - 1 ? "1px solid hsl(150 100% 50% / 0.06)" : "none",
                      background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-1)", fontWeight: 600 }}>
                      {row.type}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)" }}>{row.date}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)" }}>{row.fund}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", display: "inline-block" }} />
                        <span style={{ color: "var(--accent)", fontSize: "0.5625rem", letterSpacing: "0.1em" }}>ENTREGUE</span>
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <a
                        href="#"
                        style={{
                          fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                          color: "hsl(180 100% 55%)", textDecoration: "none",
                          border: "1px solid hsl(180 100% 50% / 0.3)",
                          background: "hsl(180 100% 50% / 0.07)",
                          borderRadius: "var(--radius)", padding: "2px 10px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        ↓ {row.file}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
