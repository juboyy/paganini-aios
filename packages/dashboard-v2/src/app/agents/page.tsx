"use client";

const AGENTS = [
  {
    id: "administrador",
    name: "Administrador",
    role: "Cálculo de NAV e gestão de cotas do fundo",
    status: "active",
    tasks: 28,
    avgLatency: "0.9s",
    capabilities: ["Cálculo NAV", "Emissão cotas", "Conciliação"],
    lastAction: "há 12s",
  },
  {
    id: "compliance",
    name: "Compliance",
    role: "Monitoramento de 6 gates regulatórios",
    status: "active",
    tasks: 19,
    avgLatency: "1.4s",
    capabilities: ["6 gates CVM", "Regulamento", "Alertas"],
    lastAction: "há 34s",
  },
  {
    id: "custodia",
    name: "Custódia",
    role: "Controle de títulos e verificação de lastro",
    status: "active",
    tasks: 22,
    avgLatency: "1.1s",
    capabilities: ["Títulos", "Lastro", "Liquidação"],
    lastAction: "há 8s",
  },
  {
    id: "due-diligence",
    name: "Due Diligence",
    role: "Score e análise de cedentes",
    status: "active",
    tasks: 15,
    avgLatency: "2.1s",
    capabilities: ["Score cedentes", "KYC", "Análise crédito"],
    lastAction: "há 2min",
  },
  {
    id: "gestor",
    name: "Gestor",
    role: "Estratégia de alocação e política de investimento",
    status: "active",
    tasks: 11,
    avgLatency: "0.8s",
    capabilities: ["Alocação", "Política inv.", "Rebalanceamento"],
    lastAction: "há 45s",
  },
  {
    id: "ir",
    name: "IR",
    role: "Apuração de IR para cotistas",
    status: "idle",
    tasks: 7,
    avgLatency: "1.6s",
    capabilities: ["Come-cotas", "DARF", "Informe rendimentos"],
    lastAction: "há 18min",
  },
  {
    id: "pricing",
    name: "Pricing",
    role: "PDD projetada e cálculo de taxas",
    status: "active",
    tasks: 18,
    avgLatency: "1.3s",
    capabilities: ["PDD", "Taxa desconto", "Mark-to-market"],
    lastAction: "há 22s",
  },
  {
    id: "reg-watch",
    name: "Reg Watch",
    role: "Monitoramento contínuo CVM e BACEN",
    status: "watching",
    tasks: 14,
    avgLatency: "0.7s",
    capabilities: ["CVM 175", "BACEN", "Normativos"],
    lastAction: "há 5s",
  },
  {
    id: "reporting",
    name: "Reporting",
    role: "Geração de demonstrações e relatórios",
    status: "idle",
    tasks: 8,
    avgLatency: "1.9s",
    capabilities: ["Demonstrações", "Lâmina", "Carta gestão"],
    lastAction: "há 31min",
  },
];

const TOP_STATS = [
  { label: "TOTAL TASKS TODAY", value: "142" },
  { label: "AVG LATENCY", value: "1.2s" },
  { label: "ACTIVE AGENTS", value: "7/9" },
  { label: "ERRORS TODAY", value: "0" },
];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: "var(--accent)", label: "ACTIVE" },
  idle: { color: "var(--text-4)", label: "IDLE" },
  watching: { color: "var(--cyan)", label: "WATCHING" },
};

export default function AgentsPage() {
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
          SISTEMA FIDC / AGENTES
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
          Agent Fleet
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
          9 agentes especializados · sincronizado há 5s
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
                color:
                  stat.label === "ERRORS TODAY"
                    ? "var(--accent)"
                    : stat.label === "ACTIVE AGENTS"
                    ? "var(--cyan)"
                    : "var(--text-1)",
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Agent Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
      >
        {AGENTS.map((agent) => {
          const sc = STATUS_CONFIG[agent.status];
          return (
            <div key={agent.id} className="glass-card p-4">
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "var(--text-1)",
                      letterSpacing: "-0.01em",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {agent.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.5rem",
                      letterSpacing: "0.08em",
                      color: "var(--text-4)",
                      lineHeight: 1.4,
                    }}
                  >
                    {agent.role}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    flexShrink: 0,
                    marginLeft: "0.5rem",
                  }}
                >
                  <span
                    className="pulse-dot"
                    style={{ color: sc.color }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.4375rem",
                      letterSpacing: "0.12em",
                      color: sc.color,
                    }}
                  >
                    {sc.label}
                  </span>
                </div>
              </div>

              {/* Metrics Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    background: "hsl(220 20% 4% / 0.5)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)",
                    padding: "0.5rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.4375rem",
                      letterSpacing: "0.12em",
                      color: "var(--text-4)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    TASKS
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "var(--text-1)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {agent.tasks}
                  </p>
                </div>
                <div
                  style={{
                    background: "hsl(220 20% 4% / 0.5)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius)",
                    padding: "0.5rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.4375rem",
                      letterSpacing: "0.12em",
                      color: "var(--text-4)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    AVG LATENCY
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "var(--cyan)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {agent.avgLatency}
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div style={{ marginBottom: "0.75rem" }}>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.4375rem",
                    letterSpacing: "0.12em",
                    color: "var(--text-4)",
                    marginBottom: "0.4rem",
                  }}
                >
                  CAPABILITIES
                </p>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className={
                        agent.status === "watching" ? "tag-badge-cyan" : "tag-badge"
                      }
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.4375rem",
                    letterSpacing: "0.08em",
                    color: "var(--text-4)",
                  }}
                >
                  LAST ACTION
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.4375rem",
                    letterSpacing: "0.08em",
                    color: "var(--text-3)",
                  }}
                >
                  {agent.lastAction}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
