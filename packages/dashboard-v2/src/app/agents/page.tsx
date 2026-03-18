"use client";

import { useState } from "react";

const AGENTS_DATA = [
  {
    slug: "orchestrator",
    emoji: "🎯",
    status: "active",
    role: "Coordenador central — decompõe tarefas, executa fluxos (Purchase/Report/Onboard), resolve conflitos",
    domains: ["orquestração", "roteamento"],
    capabilities: ["decompose_task()", "execute_flow()", "aggregate_results()", "resolve_conflicts()"],
    tasks: 1284,
    avgLatency: "1.2s",
    tokens: "2.1M",
  },
  {
    slug: "administrador",
    emoji: "📊",
    status: "active",
    role: "Cálculo de NAV (PL), gestão de cotas sênior/subordinada, relatórios ANBIMA",
    domains: ["nav", "cotas", "relatórios"],
    capabilities: ["calculate_nav()", "calculate_quota_price()", "issue_quotas()", "process_redemption()", "generate_daily_report()"],
    tasks: 847,
    avgLatency: "4.8s",
    tokens: "890K",
  },
  {
    slug: "compliance",
    emoji: "🛡️",
    status: "active",
    role: "Pipeline de 6 portões: Elegibilidade → Concentração → Covenant → PLD/AML → CVM 175 → Risco",
    domains: ["compliance", "aml", "regulação"],
    capabilities: ["check_eligibility()", "check_concentration()", "check_covenant()", "check_pld_aml()", "check_compliance()", "check_risk()", "run_pipeline()"],
    tasks: 1847,
    avgLatency: "3.1s",
    tokens: "1.4M",
  },
  {
    slug: "custodia",
    emoji: "🔐",
    status: "active",
    role: "Registro de títulos, verificação de lastro, reconciliação D+2, liquidação",
    domains: ["custódia", "lastro", "liquidação"],
    capabilities: ["register_title()", "verify_collateral()", "reconcile_portfolio()", "process_settlement()"],
    tasks: 622,
    avgLatency: "2.2s",
    tokens: "520K",
  },
  {
    slug: "due-diligence",
    emoji: "🔍",
    status: "active",
    role: "Scoring de cedentes (5 critérios), validação CNPJ mod-11, análise financeira",
    domains: ["dd", "cnpj", "scoring"],
    capabilities: ["score_cedente()", "validate_cnpj()", "check_pep()", "analyze_financials()", "run_onboarding_pipeline()"],
    tasks: 413,
    avgLatency: "7.2s",
    tokens: "670K",
  },
  {
    slug: "gestor",
    emoji: "📈",
    status: "active",
    role: "Alocação de carteira, limites de concentração (HHI), rebalanceamento, stress test",
    domains: ["portfolio", "concentração", "risco"],
    capabilities: ["calculate_portfolio_allocation()", "check_concentration_limits()", "rebalance_portfolio()", "stress_test()"],
    tasks: 534,
    avgLatency: "4.2s",
    tokens: "780K",
  },
  {
    slug: "pricing",
    emoji: "💰",
    status: "active",
    role: "PDD BACEN 2682/99 (7 buckets), mark-to-market (DCF), yield anualizado",
    domains: ["pricing", "pdd", "mtm"],
    capabilities: ["calculate_pdd_aging()", "mark_to_market()", "calculate_discount_rate()", "calculate_yield()"],
    tasks: 956,
    avgLatency: "3.8s",
    tokens: "1.1M",
  },
  {
    slug: "risk",
    emoji: "⚡",
    status: "active",
    role: "VaR histórico e paramétrico, Expected/Unexpected Loss (Basel II), concentração HHI",
    domains: ["risco", "var", "stress"],
    capabilities: ["calculate_var()", "stress_test()", "calculate_expected_loss()", "concentration_risk()", "risk_rating()"],
    tasks: 478,
    avgLatency: "5.1s",
    tokens: "890K",
  },
  {
    slug: "treasury",
    emoji: "🏦",
    status: "active",
    role: "Projeção de fluxo de caixa 90d, índice LCR, duration gap, aprovação de resgates",
    domains: ["tesouraria", "liquidez", "caixa"],
    capabilities: ["project_cash_flow()", "calculate_liquidity_ratio()", "duration_gap()", "process_redemption_request()"],
    tasks: 312,
    avgLatency: "3.4s",
    tokens: "440K",
  },
  {
    slug: "auditor",
    emoji: "🔬",
    status: "active",
    role: "Validação aritmética de NAV, detecção de anomalias (2σ), auditoria cruzada entre agentes",
    domains: ["auditoria", "qa", "anomalias"],
    capabilities: ["validate_nav()", "cross_validate_agents()", "detect_anomalies()", "audit_execution_trace()"],
    tasks: 267,
    avgLatency: "6.3s",
    tokens: "520K",
  },
  {
    slug: "reporting",
    emoji: "📋",
    status: "active",
    role: "Informes CVM 175, cartas ao investidor, relatórios por cedente, formatação BRL",
    domains: ["relatórios", "cvm", "documentos"],
    capabilities: ["generate_monthly_report()", "generate_cvm_filing()", "generate_investor_letter()"],
    tasks: 196,
    avgLatency: "15.2s",
    tokens: "440K",
  },
  {
    slug: "investor-relations",
    emoji: "🤝",
    status: "active",
    role: "Performance MTD/YTD, Sharpe vs CDI, max drawdown, distribuição de rendimentos",
    domains: ["ir", "performance", "investidor"],
    capabilities: ["calculate_performance()", "calculate_sharpe_ratio()", "generate_factsheet()", "calculate_distribution()"],
    tasks: 178,
    avgLatency: "4.5s",
    tokens: "380K",
  },
  {
    slug: "regulatory-watch",
    emoji: "📡",
    status: "watching",
    role: "Monitoramento CVM/BACEN, calendário de obrigações (CADOC 3040, AGO), alertas",
    domains: ["regulatório", "cvm", "bacen"],
    capabilities: ["check_cvm_publications()", "assess_impact()", "check_compliance_calendar()"],
    tasks: 89,
    avgLatency: "8.1s",
    tokens: "280K",
  },
  {
    slug: "knowledge-graph",
    emoji: "🧠",
    status: "active",
    role: "Extração de entidades, grafo de relacionamentos, resolução de entidades, ChromaDB",
    domains: ["kg", "rag", "embeddings"],
    capabilities: ["extract_entities()", "build_relationships()", "query_graph()", "entity_resolution()"],
    tasks: 284,
    avgLatency: "12.3s",
    tokens: "3.2M",
  },
];

const SPAWN_HISTORY = [
  { ts: "14:08:31", parent: "orchestrator",     child: "due-diligence",     depth: 1, duration: "7.2s",  status: "OK" },
  { ts: "14:08:22", parent: "due-diligence",    child: "compliance",        depth: 2, duration: "3.1s",  status: "OK" },
  { ts: "14:08:19", parent: "compliance",       child: "auditor",           depth: 3, duration: "6.3s",  status: "OK" },
  { ts: "14:07:55", parent: "orchestrator",     child: "pricing",           depth: 1, duration: "3.8s",  status: "OK" },
  { ts: "14:07:48", parent: "pricing",          child: "risk",              depth: 2, duration: "5.1s",  status: "OK" },
  { ts: "14:07:41", parent: "orchestrator",     child: "gestor",            depth: 1, duration: "4.2s",  status: "OK" },
  { ts: "14:07:30", parent: "orchestrator",     child: "treasury",          depth: 1, duration: "3.4s",  status: "OK" },
  { ts: "14:07:22", parent: "orchestrator",     child: "administrador",     depth: 1, duration: "4.8s",  status: "OK" },
  { ts: "14:07:10", parent: "administrador",    child: "custodia",          depth: 2, duration: "2.2s",  status: "OK" },
  { ts: "14:06:58", parent: "orchestrator",     child: "reporting",         depth: 1, duration: "15.2s", status: "OK" },
  { ts: "14:06:41", parent: "reporting",        child: "investor-relations",depth: 2, duration: "4.5s",  status: "OK" },
  { ts: "14:06:20", parent: "regulatory-watch", child: "compliance",        depth: 2, duration: "3.1s",  status: "WARN" },
  { ts: "14:05:59", parent: "orchestrator",     child: "knowledge-graph",   depth: 1, duration: "12.3s", status: "OK" },
  { ts: "14:05:38", parent: "due-diligence",    child: "knowledge-graph",   depth: 2, duration: "8.7s",  status: "OK" },
];

// SVG topology — 14 nodes in radial layout
const TOPOLOGY_AGENTS = [
  { id: "orchestrator",       label: "ORCH",  x: 360, y: 220 },
  { id: "administrador",      label: "ADMIN", x: 360, y: 105 },
  { id: "compliance",         label: "COMP",  x: 490, y: 148 },
  { id: "custodia",           label: "CUST",  x: 530, y: 275 },
  { id: "due-diligence",      label: "DD",    x: 445, y: 375 },
  { id: "gestor",             label: "GEST",  x: 280, y: 390 },
  { id: "pricing",            label: "PRICE", x: 192, y: 308 },
  { id: "risk",               label: "RISK",  x: 192, y: 148 },
  { id: "treasury",           label: "TREAS", x: 600, y: 88  },
  { id: "auditor",            label: "AUDIT", x: 648, y: 200 },
  { id: "reporting",          label: "RPT",   x: 625, y: 358 },
  { id: "investor-relations", label: "IR",    x: 488, y: 460 },
  { id: "regulatory-watch",   label: "REGW",  x: 78,  y: 98  },
  { id: "knowledge-graph",    label: "KG",    x: 78,  y: 338 },
];

const ACTIVE_EDGES: [string, string][] = [
  ["orchestrator", "administrador"],
  ["orchestrator", "compliance"],
  ["orchestrator", "due-diligence"],
  ["orchestrator", "pricing"],
  ["orchestrator", "gestor"],
  ["orchestrator", "treasury"],
  ["orchestrator", "knowledge-graph"],
  ["orchestrator", "reporting"],
  ["due-diligence", "compliance"],
  ["due-diligence", "knowledge-graph"],
  ["compliance", "auditor"],
  ["pricing", "risk"],
  ["administrador", "custodia"],
  ["reporting", "investor-relations"],
  ["regulatory-watch", "compliance"],
  ["risk", "gestor"],
];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active"
      ? "var(--accent)"
      : status === "watching"
      ? "var(--cyan)"
      : "var(--text-4)";
  const bg =
    status === "active"
      ? "hsl(150 100% 50% / 0.1)"
      : status === "watching"
      ? "hsl(180 100% 50% / 0.1)"
      : "transparent";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: "var(--radius)",
        background: bg,
        border: `1px solid ${color}`,
        fontFamily: "var(--font-mono)",
        fontSize: "0.5625rem",
        color,
        letterSpacing: "0.1em",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          boxShadow: status === "active" ? `0 0 6px ${color}` : "none",
          animation: status === "active" ? "pulse-neon 2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {status === "active" ? "ATIVO" : status === "watching" ? "MONIT." : status.toUpperCase()}
    </span>
  );
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const getNodePos = (id: string) =>
    TOPOLOGY_AGENTS.find((a) => a.id === id) || { x: 0, y: 0 };

  const totalTasks = AGENTS_DATA.reduce((acc, a) => acc + a.tasks, 0);
  const activeCount = AGENTS_DATA.filter((a) => a.status === "active").length;
  const watchingCount = AGENTS_DATA.filter((a) => a.status === "watching").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Cabeçalho */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "0.25rem",
          }}
        >
          PAGANINI AIOS · FROTA DE AGENTES
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          14 Agentes{" "}
          <span style={{ color: "var(--accent)" }}>+ Topologia de Delegação</span>
        </h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          Frota especializada operando em tempo real — fluxos Purchase, Report e Onboard
        </p>
      </div>

      {/* Métricas principais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {[
          { label: "TOTAL DE AGENTES", value: "14",                                       color: "var(--text-1)" },
          { label: "ATIVOS",            value: String(activeCount),                        color: "var(--accent)" },
          { label: "MONITORANDO",       value: String(watchingCount),                      color: "var(--cyan)" },
          { label: "TAREFAS HOJE",      value: totalTasks.toLocaleString("pt-BR"),         color: "var(--text-1)" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.5625rem",
                letterSpacing: "0.12em",
                color: "var(--text-4)",
                marginBottom: "0.25rem",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: s.color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Grade de cards de agentes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "1rem",
        }}
      >
        {AGENTS_DATA.map((agent) => (
          <div
            key={agent.slug}
            className="glass-card"
            style={{
              padding: "1.25rem",
              cursor: "pointer",
              border: selectedAgent === agent.slug ? "1px solid var(--accent)" : undefined,
              boxShadow:
                selectedAgent === agent.slug ? "0 0 20px hsl(150 100% 50% / 0.2)" : undefined,
            }}
            onClick={() =>
              setSelectedAgent(selectedAgent === agent.slug ? null : agent.slug)
            }
          >
            {/* Cabeçalho do card */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2px" }}
                >
                  <span style={{ fontSize: "1rem" }}>{agent.emoji}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.875rem",
                      color: "var(--accent)",
                      fontWeight: 600,
                    }}
                  >
                    {agent.slug}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--text-3)",
                    marginTop: "2px",
                    lineHeight: 1.4,
                  }}
                >
                  {agent.role}
                </div>
              </div>
              <StatusBadge status={agent.status} />
            </div>

            {/* Domínios */}
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "0.75rem" }}
            >
              {agent.domains.map((d) => (
                <span key={d} className="tag-badge-cyan">
                  {d}
                </span>
              ))}
            </div>

            {/* Capacidades */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.5625rem",
                  letterSpacing: "0.12em",
                  color: "var(--text-4)",
                  marginBottom: "4px",
                }}
              >
                CAPACIDADES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.5625rem",
                      color: "var(--text-3)",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border)",
                      padding: "1px 6px",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Rodapé de métricas */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.5rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              {[
                { label: "TAREFAS",      value: agent.tasks.toLocaleString("pt-BR") },
                { label: "LATÊNCIA MÉD.", value: agent.avgLatency },
                { label: "TOKENS",       value: agent.tokens },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.4375rem",
                      letterSpacing: "0.1em",
                      color: "var(--text-4)",
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      color: "var(--text-1)",
                      fontWeight: 600,
                      marginTop: "2px",
                    }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SVG de Topologia */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "0.5rem",
          }}
        >
          TOPOLOGIA DE DELEGAÇÃO · 14 NÓS · CAMINHOS ATIVOS
        </div>
        <p style={{ color: "var(--text-4)", fontSize: 11, marginBottom: "1rem" }}>
          Clique num agente para destacar suas conexões
        </p>
        <div style={{ overflowX: "auto" }}>
          <svg
            width="730"
            height="530"
            viewBox="0 0 730 530"
            style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
          >
            <defs>
              <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(150 100% 50% / 0.8)" />
              </marker>
              <marker id="arrow-dim" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(150 100% 50% / 0.12)" />
              </marker>
              <radialGradient id="glow-green" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(150 100% 50% / 0.3)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="glow-cyan" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(180 100% 50% / 0.25)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {ACTIVE_EDGES.map(([from, to]) => {
              const f = getNodePos(from);
              const t = getNodePos(to);
              const highlighted =
                selectedAgent === null ||
                selectedAgent === from ||
                selectedAgent === to;
              return (
                <line
                  key={`${from}-${to}`}
                  x1={f.x}
                  y1={f.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={highlighted ? "hsl(150 100% 50% / 0.55)" : "hsl(150 100% 50% / 0.07)"}
                  strokeWidth="1.5"
                  markerEnd={highlighted ? "url(#arrow-active)" : "url(#arrow-dim)"}
                  style={{ transition: "stroke 0.2s" }}
                />
              );
            })}

            {TOPOLOGY_AGENTS.map((node) => {
              const agent = AGENTS_DATA.find((a) => a.slug === node.id);
              const isActive = agent?.status === "active";
              const isSelected = selectedAgent === node.id;
              const isDimmed =
                selectedAgent !== null &&
                !isSelected &&
                !ACTIVE_EDGES.some(
                  ([f, t]) =>
                    (f === selectedAgent && t === node.id) ||
                    (t === selectedAgent && f === node.id)
                );

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedAgent(isSelected ? null : node.id)}
                  style={{
                    cursor: "pointer",
                    opacity: isDimmed ? 0.3 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {isActive && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={30}
                      fill="url(#glow-green)"
                    />
                  )}
                  {!isActive && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={28}
                      fill="url(#glow-cyan)"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 24 : 20}
                    fill={isSelected ? "hsl(150 100% 50% / 0.2)" : "hsl(220 18% 9%)"}
                    stroke={
                      isSelected
                        ? "hsl(150 100% 50%)"
                        : isActive
                        ? "hsl(150 100% 50% / 0.8)"
                        : "hsl(180 100% 50% / 0.5)"
                    }
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.44rem",
                      fill: isActive ? "hsl(150 100% 50%)" : "hsl(180 100% 50%)",
                      fontWeight: 700,
                      pointerEvents: "none",
                    }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legenda */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            justifyContent: "center",
            marginTop: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              el: <div style={{ width: 20, height: 1.5, background: "hsl(150 100% 50% / 0.8)" }} />,
              label: "CAMINHO ATIVO",
            },
            {
              el: (
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    border: "1px solid var(--accent)",
                    background: "hsl(150 100% 50% / 0.15)",
                  }}
                />
              ),
              label: "AGENTE ATIVO",
            },
            {
              el: (
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    border: "1px solid var(--cyan)",
                    background: "transparent",
                  }}
                />
              ),
              label: "MONITORANDO",
            },
          ].map(({ el, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {el}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.5625rem",
                  color: "var(--text-4)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de spawn */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            letterSpacing: "0.12em",
            color: "var(--text-4)",
            marginBottom: "1rem",
          }}
        >
          HISTÓRICO DE SPAWN · CHAMADAS RECURSIVAS RECENTES
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["HORÁRIO", "PAI", "FILHO", "PROFUNDIDADE", "DURAÇÃO", "RESULTADO"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      color: "var(--text-4)",
                      fontSize: "0.5625rem",
                      letterSpacing: "0.1em",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPAWN_HISTORY.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid hsl(150 100% 50% / 0.04)",
                    background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                  }}
                >
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-4)" }}>
                    {row.ts}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--accent)" }}>
                    {row.parent}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--cyan)" }}>
                    {row.child}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-2)" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "1px 8px",
                        background: `hsl(150 100% 50% / ${row.depth * 0.06})`,
                        border: "1px solid hsl(150 100% 50% / 0.2)",
                        borderRadius: "var(--radius)",
                        color: "var(--accent)",
                      }}
                    >
                      depth={row.depth}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-3)" }}>
                    {row.duration}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <span
                      style={{
                        padding: "1px 8px",
                        borderRadius: "var(--radius)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.5625rem",
                        background:
                          row.status === "OK"
                            ? "hsl(150 100% 50% / 0.1)"
                            : "hsl(45 100% 50% / 0.1)",
                        color: row.status === "OK" ? "var(--accent)" : "#f59e0b",
                        border: `1px solid ${row.status === "OK" ? "hsl(150 100% 50% / 0.3)" : "hsl(45 100% 50% / 0.3)"}`,
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
