"use client";

const TOP_STATS = [
  { label: "TOTAL CHECKS", value: "1,847" },
  { label: "PASS RATE", value: "97.3%" },
  { label: "ACTIVE ALERTS", value: "2", alert: true },
  { label: "LAST FULL SCAN", value: "5min ago" },
];

const GATES = [
  {
    id: "eligibility",
    name: "Eligibility",
    subtitle: "tipo / prazo / rating",
    status: "PASS",
    lastCheck: "há 4min",
    checksToday: 312,
    passRate: 99.4,
    description:
      "Verifica tipo de ativo, prazo máximo permitido e rating mínimo exigido pelo regulamento do fundo.",
  },
  {
    id: "concentration",
    name: "Concentration",
    subtitle: "cedente ≤15% · sacado ≤10%",
    status: "WARN",
    lastCheck: "há 2min",
    checksToday: 289,
    passRate: 96.2,
    description:
      "Controla concentração por cedente (máx 15%) e sacado (máx 10%) sobre PL total do fundo.",
  },
  {
    id: "covenant",
    name: "Covenant",
    subtitle: "liquidez ≥1.05x · sub ≥20% · inad ≤5%",
    status: "PASS",
    lastCheck: "há 6min",
    checksToday: 301,
    passRate: 98.7,
    description:
      "Monitora covenants: índice de liquidez ≥1.05x, subordinação ≥20% e inadimplência ≤5%.",
  },
  {
    id: "pld-aml",
    name: "PLD / AML",
    subtitle: "OFAC · PEP · transações atípicas",
    status: "WARN",
    lastCheck: "há 1min",
    checksToday: 278,
    passRate: 94.6,
    description:
      "Screening contra listas OFAC e PEP. Detecção de transações atípicas via análise comportamental.",
  },
  {
    id: "compliance",
    name: "Compliance",
    subtitle: "CVM 175 · regulamento",
    status: "PASS",
    lastCheck: "há 3min",
    checksToday: 334,
    passRate: 99.1,
    description:
      "Conformidade com CVM Resolução 175 e cláusulas do regulamento do FIDC.",
  },
  {
    id: "risk",
    name: "Risk",
    subtitle: "PDD projetada · stress test",
    status: "PASS",
    lastCheck: "há 5min",
    checksToday: 333,
    passRate: 97.9,
    description:
      "PDD projetada por safra e cenários de stress test para inadimplência e concentração.",
  },
];

const GATE_EVENTS = [
  { time: "12:57:42", gate: "PLD / AML", event: "WARN — cedente flagged PEP tier-2", status: "WARN" },
  { time: "12:55:18", gate: "Concentration", event: "WARN — Sacado ABC acima de 9.8%", status: "WARN" },
  { time: "12:53:01", gate: "Eligibility", event: "PASS — Lote #4821 aprovado (48 recebíveis)", status: "PASS" },
  { time: "12:50:34", gate: "Risk", event: "PASS — PDD projetada 2.1% dentro do limite", status: "PASS" },
  { time: "12:48:59", gate: "Covenant", event: "PASS — Subordinação 22.4% ✓", status: "PASS" },
  { time: "12:46:12", gate: "Compliance", event: "PASS — CVM 175 Art. 43 conforme", status: "PASS" },
  { time: "12:44:07", gate: "Eligibility", event: "PASS — Lote #4820 aprovado (61 recebíveis)", status: "PASS" },
  { time: "12:41:55", gate: "PLD / AML", event: "PASS — Screening OFAC limpo (12 cnpjs)", status: "PASS" },
  { time: "12:39:28", gate: "Concentration", event: "PASS — Distribuição cedentes dentro dos limites", status: "PASS" },
  { time: "12:37:14", gate: "Risk", event: "PASS — Stress test cenário base OK", status: "PASS" },
];

const STATUS_COLORS: Record<string, string> = {
  PASS: "var(--accent)",
  WARN: "var(--amber)",
  REJECT: "var(--red)",
};

export default function GuardrailsPage() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "0.25rem",
          }}
        >
          SISTEMA FIDC / GUARDRAILS
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--text-1)",
            letterSpacing: "-0.03em",
          }}
        >
          Guardrail Gates
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.625rem",
            color: "var(--text-4)",
            marginTop: "0.25rem",
            letterSpacing: "0.08em",
          }}
        >
          6 gates ativos · pipeline contínuo de compliance
        </p>
      </div>

      {/* Top Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {TOP_STATS.map((stat, i) => (
          <div key={i} className="glass-card p-4">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.5625rem",
                letterSpacing: "0.12em",
                color: "var(--text-4)",
                marginBottom: "0.5rem",
              }}
            >
              {stat.label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: stat.alert ? "var(--amber)" : "var(--text-1)",
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline Flow */}
      <div className="glass-card p-4" style={{ marginBottom: "1.5rem" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "1.25rem",
          }}
        >
          COMPLIANCE PIPELINE
        </p>

        {/* Pipeline visual */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "0",
            overflowX: "auto",
            paddingBottom: "0.5rem",
          }}
        >
          {GATES.map((gate, idx) => (
            <div
              key={gate.id}
              style={{ display: "flex", alignItems: "center", flex: 1 }}
            >
              {/* Gate node */}
              <div
                style={{
                  flex: 1,
                  background: "hsl(220 20% 4% / 0.5)",
                  border: `1px solid ${STATUS_COLORS[gate.status]}`,
                  borderRadius: "var(--radius)",
                  padding: "1rem 0.75rem",
                  position: "relative",
                  minWidth: "140px",
                }}
              >
                {/* Status bar top */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: STATUS_COLORS[gate.status],
                    borderRadius: "var(--radius) var(--radius) 0 0",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--text-1)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {gate.name}
                  </p>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.4375rem",
                      letterSpacing: "0.1em",
                      color: STATUS_COLORS[gate.status],
                      fontWeight: 700,
                    }}
                  >
                    {gate.status}
                  </span>
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.4375rem",
                    letterSpacing: "0.06em",
                    color: "var(--text-4)",
                    marginBottom: "0.75rem",
                    lineHeight: 1.5,
                  }}
                >
                  {gate.subtitle}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.375rem",
                        letterSpacing: "0.1em",
                        color: "var(--text-4)",
                        marginBottom: "0.15rem",
                      }}
                    >
                      CHECKS
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "var(--text-1)",
                      }}
                    >
                      {gate.checksToday}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.375rem",
                        letterSpacing: "0.1em",
                        color: "var(--text-4)",
                        marginBottom: "0.15rem",
                      }}
                    >
                      PASS RATE
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color:
                          gate.passRate >= 99
                            ? "var(--accent)"
                            : gate.passRate >= 96
                            ? "var(--amber)"
                            : "var(--red)",
                      }}
                    >
                      {gate.passRate}%
                    </p>
                  </div>
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.375rem",
                    letterSpacing: "0.06em",
                    color: "var(--text-4)",
                  }}
                >
                  {gate.lastCheck}
                </p>

                {/* Description */}
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.4375rem",
                    letterSpacing: "0.04em",
                    color: "var(--text-3)",
                    lineHeight: 1.6,
                    marginTop: "0.75rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  {gate.description}
                </p>
              </div>

              {/* Arrow connector */}
              {idx < GATES.length - 1 && (
                <div
                  style={{
                    flexShrink: 0,
                    width: "2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "1px",
                      background: "var(--border-subtle)",
                      position: "absolute",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.625rem",
                      color: "var(--text-4)",
                      position: "relative",
                      background: "var(--bg)",
                      paddingInline: "2px",
                    }}
                  >
                    →
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gate Events Log */}
      <div className="glass-card p-4">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "1rem",
          }}
        >
          RECENT GATE EVENTS — ÚLTIMOS 10
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {GATE_EVENTS.map((ev, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "5rem 7rem 1fr auto",
                gap: "1rem",
                alignItems: "center",
                padding: "0.5rem 0.75rem",
                background: "hsl(220 20% 4% / 0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius)",
                borderLeft: `2px solid ${STATUS_COLORS[ev.status]}`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.5rem",
                  letterSpacing: "0.08em",
                  color: "var(--text-4)",
                }}
              >
                {ev.time}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.5rem",
                  letterSpacing: "0.06em",
                  color: "var(--text-3)",
                  fontWeight: 600,
                }}
              >
                {ev.gate}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.5rem",
                  letterSpacing: "0.04em",
                  color: "var(--text-2)",
                }}
              >
                {ev.event}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.4375rem",
                  letterSpacing: "0.1em",
                  color: STATUS_COLORS[ev.status],
                  fontWeight: 700,
                }}
              >
                {ev.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
