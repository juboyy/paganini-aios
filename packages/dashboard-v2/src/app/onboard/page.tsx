"use client";

import { useState, useEffect } from "react";

const TERMINAL_LINES = [
  { text: "$ paganini onboard auto --cnpj 47.388.724/0001-18", type: "cmd" },
  { text: "", type: "blank" },
  { text: "🔍 Buscando dados na CVM...", type: "info" },
  { text: "  CNPJ: 47.388.724/0001-18", type: "data" },
  { text: "  Razão Social: FUNDO DE INVESTIMENTO EM DIREITOS CREDITÓRIOS EXAMPLE", type: "data" },
  { text: "  Administrador: BANCO XYZ S.A.", type: "data" },
  { text: "  Custodiante: CUSTODIANTE ABC DTVM", type: "data" },
  { text: "  Tipo: FIDC Padrão", type: "data" },
  { text: "  PL: R$ 245.000.000,00", type: "data" },
  { text: "  Cotas Sênior: 180.000", type: "data" },
  { text: "  Cotas Subordinada: 65.000", type: "data" },
  { text: "", type: "blank" },
  { text: "✓ Regulamento baixado e indexado (142 páginas)", type: "success" },
  { text: "✓ 9 agentes especializados configurados", type: "success" },
  { text: "✓ 12 skills ativadas", type: "success" },
  { text: "✓ 6 guardrails aplicados", type: "success" },
  { text: "✓ Corpus regulatório sincronizado (5.640 chunks)", type: "success" },
  { text: "", type: "blank" },
  { text: '🎻 Fundo operacional. Use: paganini query "sua pergunta sobre o fundo"', type: "complete" },
];

const EXAMPLE_FUNDS = [
  {
    name: "Paganini I FIDC",
    tipo: "FIDC Padrão",
    pl: "R$ 245.000.000",
    agentes: 9,
    skills: 12,
    lastActivity: "há 3 min",
    status: "ativo",
  },
  {
    name: "Brahms Recebíveis FIDC",
    tipo: "FIDC Multioriginator",
    pl: "R$ 98.500.000",
    agentes: 9,
    skills: 12,
    lastActivity: "há 18 min",
    status: "ativo",
  },
  {
    name: "Liszt Capital FIDC",
    tipo: "FIDC NP Subordinado",
    pl: "R$ 512.000.000",
    agentes: 9,
    skills: 12,
    lastActivity: "há 1h",
    status: "ativo",
  },
];

function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;
    const delay = TERMINAL_LINES[visibleLines]?.type === "blank" ? 80
      : TERMINAL_LINES[visibleLines]?.type === "cmd" ? 200
      : TERMINAL_LINES[visibleLines]?.type === "success" ? 180
      : 60;
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
      {/* Terminal title bar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "hsl(220 20% 6%)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.75rem",
            color: "var(--text-4)", letterSpacing: "0.08em", marginLeft: "0.5rem",
          }}
        >
          paganini — bash
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setVisibleLines(0)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.75rem",
              color: "var(--text-4)", background: "transparent",
              border: "1px solid var(--border)", borderRadius: "3px",
              padding: "2px 8px", cursor: "pointer", letterSpacing: "0.08em",
            }}
          >
            REPLAY
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div style={{ padding: "1rem 1.25rem", minHeight: "22rem" }}>
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => {
          const color =
            line.type === "cmd" ? "hsl(150 100% 60%)"
            : line.type === "success" ? "hsl(150 100% 55%)"
            : line.type === "complete" ? "hsl(150 100% 65%)"
            : line.type === "info" ? "hsl(180 100% 65%)"
            : line.type === "data" ? "hsl(220 20% 75%)"
            : "transparent";
          return (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
                color, lineHeight: 1.7, whiteSpace: "pre",
              }}
            >
              {line.text || "\u00a0"}
            </div>
          );
        })}
        {visibleLines < TERMINAL_LINES.length && (
          <span
            style={{
              display: "inline-block", width: 8, height: 14,
              background: "hsl(150 100% 55%)",
              animation: "pulse-neon 0.8s ease-in-out infinite",
              marginTop: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Section 1: Hero ── */}
      <div
        className="glass-card"
        style={{
          padding: "2.5rem 2rem",
          position: "relative",
          overflow: "hidden",
          borderTop: "2px solid hsl(150 100% 50% / 0.6)",
        }}
      >
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(ellipse at 30% 0%, hsl(150 100% 50% / 0.07), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div className="mono-label" style={{ marginBottom: "0.5rem" }}>
          PAGANINI AIOS · ONBOARDING AUTOMÁTICO
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.5rem" }}>
          Onboarding Automático{" "}
          <span style={{ color: "var(--accent)" }}>de Fundos</span>
        </h1>
        <p style={{ fontSize: "1.0625rem", color: "var(--text-3)", margin: "0 0 1.25rem" }}>
          De CNPJ a fundo operacional em{" "}
          <span style={{ color: "hsl(150 100% 60%)", fontWeight: 700 }}>30 segundos</span>
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            className="tag-badge"
            style={{
              background: "hsl(150 100% 50% / 0.12)",
              color: "hsl(150 100% 60%)",
              borderColor: "hsl(150 100% 50% / 0.4)",
              padding: "5px 14px",
              fontSize: "0.8125rem",
            }}
          >
            ZERO-TOUCH
          </span>
          <span
            className="tag-badge-cyan"
            style={{
              padding: "5px 14px",
              fontSize: "0.8125rem",
            }}
          >
            CVM INTEGRADA
          </span>
        </div>
      </div>

      {/* ── Section 2: Como Funciona ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "1rem" }}>
          COMO FUNCIONA
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: "0", alignItems: "center" }}>
          {[
            {
              step: "01",
              title: "CNPJ",
              desc: "Informe o CNPJ do fundo ou cedente. Paganini faz o resto.",
              icon: "🔢",
              color: "hsl(150 100% 50%)",
            },
            null, // arrow
            {
              step: "02",
              title: "DADOS CVM",
              desc: "Dados públicos extraídos automaticamente da CVM/Fundos.NET. Sem formulários.",
              icon: "⬇️",
              color: "hsl(180 100% 55%)",
            },
            null, // arrow
            {
              step: "03",
              title: "FUNDO ATIVO",
              desc: "Agentes configurados, skills carregadas, pronto para operar.",
              icon: "🎻",
              color: "hsl(150 100% 60%)",
            },
          ].map((item, i) => {
            if (item === null) {
              return (
                <div key={`arrow-${i}`} style={{ display: "flex", justifyContent: "center", padding: "0 0.5rem" }}>
                  <span style={{ color: "hsl(150 100% 50% / 0.5)", fontSize: "1.5rem" }}>→</span>
                </div>
              );
            }
            return (
              <div
                key={item.step}
                className="glass-card"
                style={{
                  padding: "1.5rem",
                  borderTop: `2px solid ${item.color}50`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{item.icon}</div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                    color: "var(--text-4)", letterSpacing: "0.16em", marginBottom: "0.25rem",
                  }}
                >
                  PASSO {item.step}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.875rem",
                    color: item.color, fontWeight: 700, marginBottom: "0.5rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {item.title}
                </div>
                <p className="section-help" style={{ margin: 0, fontSize: "0.8125rem" }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Demo Terminal ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>
          DEMO AO VIVO
        </div>
        <TerminalMockup />
      </div>

      {/* ── Section 4: Fundos Onboarded ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>
          FUNDOS ONBOARDED
        </div>
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["FUNDO", "TIPO", "PL", "AGENTES", "ÚLTIMA ATIVIDADE", "STATUS"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left", padding: "0.75rem 1rem",
                        color: "var(--text-4)", fontSize: "0.75rem",
                        letterSpacing: "0.1em", fontWeight: 500,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_FUNDS.map((fund, i) => (
                  <tr
                    key={fund.name}
                    style={{
                      borderBottom: i < EXAMPLE_FUNDS.length - 1 ? "1px solid hsl(150 100% 50% / 0.06)" : "none",
                      background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-1)", fontWeight: 600 }}>
                      {fund.name}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)" }}>{fund.tipo}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent)" }}>{fund.pl}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className="tag-badge">{fund.agentes} agentes · {fund.skills} skills</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-4)" }}>{fund.lastActivity}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: "var(--accent)", boxShadow: "0 0 6px var(--accent)",
                            display: "inline-block",
                          }}
                        />
                        <span style={{ color: "var(--accent)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
                          ATIVO
                        </span>
                      </span>
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
