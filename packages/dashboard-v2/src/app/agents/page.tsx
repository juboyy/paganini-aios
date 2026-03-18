"use client";

import { useState } from "react";

// ─── 9 AGENTES FIDC ──────────────────────────────────────────────────────────
const FIDC_AGENTS = [
  {
    slug: "administrador",
    name: "Administrador Fiduciário",
    emoji: "📋",
    domains: ["regulatório", "compliance", "risco", "reporting", "investidores"],
    confidence: 97,
    exampleQuery: "Qual o PL atual do fundo e a razão de subordinação das cotas sênior?",
    status: "active",
  },
  {
    slug: "compliance",
    name: "Compliance",
    emoji: "⚖️",
    domains: ["regulatório", "compliance", "reporting", "investidores"],
    confidence: 95,
    exampleQuery: "O fundo está dentro dos limites de concentração por cedente da CVM 175?",
    status: "active",
  },
  {
    slug: "custodiante",
    name: "Custodiante",
    emoji: "🔐",
    domains: ["custódia"],
    confidence: 98,
    exampleQuery: "Qual o status de reconciliação D+2 dos títulos registrados hoje?",
    status: "active",
  },
  {
    slug: "due-diligence",
    name: "Due Diligence",
    emoji: "🔍",
    domains: ["compliance", "reporting", "due_diligence"],
    confidence: 93,
    exampleQuery: "Qual o score de elegibilidade do cedente CNPJ 12.345.678/0001-99?",
    status: "active",
  },
  {
    slug: "gestor",
    name: "Gestor",
    emoji: "📊",
    domains: ["contabilidade", "due_diligence"],
    confidence: 94,
    exampleQuery: "Como está a alocação da carteira e há concentração acima do limite HHI?",
    status: "active",
  },
  {
    slug: "investor-relations",
    name: "Investor Relations",
    emoji: "💬",
    domains: ["compliance", "reporting", "investidores"],
    confidence: 96,
    exampleQuery: "Qual a rentabilidade MTD das cotas sênior comparada ao CDI?",
    status: "active",
  },
  {
    slug: "pricing",
    name: "Pricing Engine",
    emoji: "💰",
    domains: ["regulatório", "risco", "pricing"],
    confidence: 99,
    exampleQuery: "Qual o PDD da carteira usando aging BACEN 2682/99 com o bucket de 31-60 dias?",
    status: "active",
  },
  {
    slug: "regulatory-watch",
    name: "Regulatory Watch",
    emoji: "📡",
    domains: ["regulatório", "compliance"],
    confidence: 91,
    exampleQuery: "Houve novas publicações CVM ou BACEN relevantes para FIDCs esta semana?",
    status: "active",
  },
  {
    slug: "reporting",
    name: "Reporting",
    emoji: "📄",
    domains: ["regulatório", "contabilidade", "reporting", "investidores"],
    confidence: 96,
    exampleQuery: "Gere o informe mensal CVM 175 do fundo Paganini I FIDC para Fev/2026.",
    status: "active",
  },
];

// ─── PLATAFORMA (dev agents, collapsible) ────────────────────────────────────
const PLATAFORMA_AGENTS = [
  { name: "OraCLI", emoji: "🧠", role: "Chief Orchestrator", model: "claude-opus-4-6-thinking" },
  { name: "Code Agent", emoji: "💻", role: "CTO / Codex Supervisor", model: "claude-sonnet-4-6" },
  { name: "Docs Agent", emoji: "📝", role: "Docs Lead", model: "claude-sonnet-4-6" },
  { name: "Infra Agent", emoji: "🏗️", role: "DevOps Lead", model: "claude-sonnet-4-6" },
  { name: "General Agent", emoji: "🤖", role: "Generalist", model: "claude-sonnet-4-6" },
  { name: "Architect Agent", emoji: "🏛️", role: "System Architect", model: "claude-opus-4-6-thinking" },
  { name: "PM Agent", emoji: "📋", role: "Project Manager", model: "claude-sonnet-4-6" },
  { name: "Data Agent", emoji: "📊", role: "Data Engineer", model: "claude-sonnet-4-6" },
  { name: "QA Agent", emoji: "🧪", role: "QA Lead", model: "claude-sonnet-4-6" },
  { name: "Security Agent", emoji: "🛡️", role: "Security Lead", model: "claude-sonnet-4-6" },
  { name: "Codex", emoji: "⚡", role: "Code Execution Engine", model: "gpt-5.3-codex" },
  { name: "João CEO", emoji: "👔", role: "Founder (Aprovações)", model: "human" },
];

const DOMAIN_COLOR: Record<string, string> = {
  regulatório:   "hsl(150 100% 50%)",
  compliance:    "hsl(180 100% 50%)",
  risco:         "hsl(45 100% 55%)",
  reporting:     "hsl(260 100% 70%)",
  investidores:  "hsl(320 80% 65%)",
  custódia:      "hsl(195 100% 60%)",
  due_diligence: "hsl(38 100% 60%)",
  contabilidade: "hsl(155 80% 55%)",
  pricing:       "hsl(45 100% 65%)",
};

function AgentHeroCard({ agent }: { agent: typeof FIDC_AGENTS[0] }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
        borderTop: "2px solid hsl(150 100% 50% / 0.5)",
      }}
    >
      {/* Glow accent */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(180deg, hsl(150 100% 50% / 0.05), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "2rem", lineHeight: 1 }}>{agent.emoji}</span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.9375rem",
                color: "var(--text-1)", fontWeight: 700, letterSpacing: "-0.02em",
              }}
            >
              {agent.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--accent)", boxShadow: "0 0 8px var(--accent)",
                  display: "inline-block", animation: "pulse-neon 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                  color: "var(--accent)", letterSpacing: "0.12em",
                }}
              >
                ATIVO
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.625rem",
            color: "hsl(150 100% 50%)", letterSpacing: "0.1em",
            background: "hsl(150 100% 50% / 0.08)",
            border: "1px solid hsl(150 100% 50% / 0.25)",
            borderRadius: "var(--radius)", padding: "3px 10px",
          }}
        >
          {agent.confidence}% conf.
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5rem",
            color: "var(--text-4)", letterSpacing: "0.12em", marginBottom: 5,
          }}
        >
          CONFIANÇA
        </div>
        <div
          style={{
            height: 4, background: "hsl(150 100% 50% / 0.1)",
            borderRadius: 2, overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%", width: `${agent.confidence}%`,
              background: `linear-gradient(90deg, hsl(150 100% 40%), hsl(150 100% 60%))`,
              borderRadius: 2,
              boxShadow: "0 0 8px hsl(150 100% 50% / 0.6)",
            }}
          />
        </div>
      </div>

      {/* Domains */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: "1rem" }}>
        {agent.domains.map((d) => (
          <span
            key={d}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
              padding: "2px 8px", borderRadius: "var(--radius)",
              background: `${DOMAIN_COLOR[d] ?? "hsl(150 100% 50%)"}14`,
              border: `1px solid ${DOMAIN_COLOR[d] ?? "hsl(150 100% 50%)"}40`,
              color: DOMAIN_COLOR[d] ?? "hsl(150 100% 50%)",
              letterSpacing: "0.08em",
            }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Example query */}
      <div
        style={{
          borderTop: "1px solid var(--border)", paddingTop: "0.75rem",
          marginTop: "0.25rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5rem",
            color: "var(--text-4)", letterSpacing: "0.12em", marginBottom: 6,
          }}
        >
          EXEMPLO DE CONSULTA
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6875rem",
            color: "var(--text-3)", lineHeight: 1.5,
            background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "8px 12px",
            fontStyle: "italic",
          }}
        >
          &ldquo;{agent.exampleQuery}&rdquo;
        </div>
      </div>
    </div>
  );
}

// ─── SVG ROUTING DIAGRAM ─────────────────────────────────────────────────────
function RoutingDiagram() {
  const agentNames = FIDC_AGENTS.map((a) => `${a.emoji} ${a.name}`);
  const boxW = 160, boxH = 28, colX = 520;
  const startY = 30;
  const gap = 36;
  const totalH = startY * 2 + agentNames.length * gap;
  const svgH = Math.max(totalH, 380);
  const midY = svgH / 2;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 760 ${svgH}`}
        width="760"
        style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
      >
        <defs>
          <marker id="arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="hsl(150 100% 50% / 0.7)" />
          </marker>
          <marker id="arr-g" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="hsl(150 100% 50% / 0.4)" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* CONSULTA box */}
        <rect x="10" y={midY - 22} width="110" height="44" rx="6"
          fill="hsl(150 100% 50% / 0.08)" stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.2" />
        <text x="65" y={midY - 5} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", fill: "hsl(150 100% 60%)", fontWeight: 700 }}>
          CONSULTA
        </text>
        <text x="65" y={midY + 10} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", fill: "hsl(150 100% 50% / 0.6)" }}>
          do usuário
        </text>

        {/* Arrow: CONSULTA → ROUTER */}
        <line x1="120" y1={midY} x2="170" y2={midY}
          stroke="hsl(150 100% 50% / 0.7)" strokeWidth="1.5" markerEnd="url(#arr)" />

        {/* ROUTER box */}
        <rect x="170" y={midY - 30} width="145" height="60" rx="6"
          fill="hsl(150 100% 50% / 0.12)" stroke="hsl(150 100% 50% / 0.7)" strokeWidth="1.5"
          filter="url(#glow)" />
        <text x="242" y={midY - 10} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", fill: "hsl(150 100% 65%)", fontWeight: 700, letterSpacing: "0.08em" }}>
          ROUTER COGNITIVO
        </text>
        <text x="242" y={midY + 6} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", fill: "hsl(150 100% 50% / 0.7)" }}>
          embeddings + pgvector
        </text>
        <text x="242" y={midY + 20} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", fill: "hsl(45 100% 60%)", fontWeight: 700 }}>
          85.4% accuracy
        </text>

        {/* Lines: ROUTER → each agent */}
        {agentNames.map((_, i) => {
          const ay = startY + i * gap + boxH / 2;
          return (
            <line
              key={i}
              x1="315" y1={midY}
              x2={colX} y2={ay}
              stroke="hsl(150 100% 50% / 0.25)" strokeWidth="1"
              markerEnd="url(#arr-g)"
            />
          );
        })}

        {/* Agent boxes */}
        {agentNames.map((name, i) => {
          const ay = startY + i * gap;
          return (
            <g key={i}>
              <rect x={colX} y={ay} width={boxW} height={boxH} rx="4"
                fill="hsl(150 100% 50% / 0.06)" stroke="hsl(150 100% 50% / 0.3)" strokeWidth="1" />
              <text x={colX + 8} y={ay + 18}
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", fill: "hsl(150 100% 55%)" }}>
                {name}
              </text>
            </g>
          );
        })}

        {/* Arrow: agents → GUARDRAILS */}
        <line x1={colX + boxW} y1={midY} x2={colX + boxW + 10} y2={midY}
          stroke="hsl(150 100% 50% / 0.7)" strokeWidth="1.5" markerEnd="url(#arr)" />

        {/* GUARDRAILS box */}
        <rect x={colX + boxW + 10} y={midY - 22} width="100" height="44" rx="6"
          fill="hsl(45 100% 50% / 0.08)" stroke="hsl(45 100% 50% / 0.5)" strokeWidth="1.2" />
        <text x={colX + boxW + 60} y={midY - 5} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", fill: "hsl(45 100% 60%)", fontWeight: 700 }}>
          GUARDRAILS
        </text>
        <text x={colX + boxW + 60} y={midY + 10} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", fill: "hsl(45 100% 50% / 0.6)" }}>
          6 portões
        </text>

        {/* Arrow: GUARDRAILS → RESPOSTA */}
        <line x1={colX + boxW + 110} y1={midY} x2={colX + boxW + 155} y2={midY}
          stroke="hsl(150 100% 50% / 0.7)" strokeWidth="1.5" markerEnd="url(#arr)" />

        {/* RESPOSTA box */}
        <rect x={colX + boxW + 155} y={midY - 22} width="100" height="44" rx="6"
          fill="hsl(150 100% 50% / 0.08)" stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.2" />
        <text x={colX + boxW + 205} y={midY - 5} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", fill: "hsl(150 100% 60%)", fontWeight: 700 }}>
          RESPOSTA
        </text>
        <text x={colX + boxW + 205} y={midY + 10} textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", fill: "hsl(150 100% 50% / 0.6)" }}>
          auditada
        </text>
      </svg>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [plataformaOpen, setPlataformaOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Header ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>
          PAGANINI AIOS · AGENTES ESPECIALIZADOS
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          9 Agentes{" "}
          <span style={{ color: "var(--accent)" }}>FIDC</span>
        </h1>
        <p className="section-help" style={{ marginTop: 6 }}>
          Agentes especializados em regulação, compliance e operações de fundos de investimento em direitos creditórios. Cada agente é treinado com o corpus regulatório completo: CVM 175, BACEN 2682/99, ANBIMA e documentação específica do fundo.
        </p>
      </div>

      {/* ── Section 1: FIDC Agent Cards ── */}
      <div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              flex: 1, height: 1,
              background: "linear-gradient(90deg, hsl(150 100% 50% / 0.4), transparent)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
              letterSpacing: "0.18em", color: "var(--accent)",
              padding: "4px 14px", border: "1px solid hsl(150 100% 50% / 0.3)",
              borderRadius: "var(--radius)", background: "hsl(150 100% 50% / 0.06)",
              whiteSpace: "nowrap",
            }}
          >
            AGENTES ESPECIALIZADOS FIDC · 9 AGENTES
          </span>
          <div
            style={{
              flex: 1, height: 1,
              background: "linear-gradient(90deg, transparent, hsl(150 100% 50% / 0.4))",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1rem",
          }}
        >
          {FIDC_AGENTS.map((agent) => (
            <AgentHeroCard key={agent.slug} agent={agent} />
          ))}
        </div>
      </div>

      {/* ── Section 2: Routing Diagram ── */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>
          ROTEAMENTO COGNITIVO
        </div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.5rem" }}>
          Como suas consultas chegam ao agente certo
        </h2>
        <p className="section-help" style={{ marginBottom: "1.25rem" }}>
          O Router Cognitivo usa embeddings semânticos para identificar o domínio da consulta e rotear para o agente especializado correto — com 85.4% de acerto sem qualquer configuração manual.
        </p>
        <RoutingDiagram />
      </div>

      {/* ── Section 3: Agent Metrics ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>
          MÉTRICAS DOS AGENTES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
          {[
            { label: "QUERIES PROCESSADAS",      value: "12.847",  color: "var(--text-1)", unit: "" },
            { label: "TEMPO MÉD. DE RESPOSTA",   value: "2.3",     color: "var(--accent)", unit: "s" },
            { label: "TAXA DE ACERTO DO ROUTER", value: "85.4",    color: "hsl(180 100% 55%)", unit: "%" },
            { label: "CONFIANÇA MÉDIA",          value: "93.7",    color: "hsl(45 100% 60%)", unit: "%" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card" style={{ padding: "1.25rem 1.5rem" }}>
              <div className="mono-label" style={{ marginBottom: "0.5rem" }}>{stat.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span className="stat-value" style={{ color: stat.color, fontSize: "2.5rem" }}>
                  {stat.value}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: stat.color, opacity: 0.7 }}>
                  {stat.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Plataforma (collapsible) ── */}
      <div>
        <button
          onClick={() => setPlataformaOpen(!plataformaOpen)}
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem", width: "100%",
            background: "transparent", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "0.75rem 1rem", cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            color: "var(--text-4)", letterSpacing: "0.12em",
          }}
        >
          <span style={{ color: "var(--text-3)" }}>{plataformaOpen ? "▼" : "▶"}</span>
          <span>PLATAFORMA DE DESENVOLVIMENTO</span>
          <span style={{ marginLeft: "auto", color: "var(--text-4)" }}>12 agentes internos</span>
        </button>

        {plataformaOpen && (
          <div
            style={{
              marginTop: "0.5rem", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", overflow: "hidden",
            }}
          >
            <div
              className="section-help"
              style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}
            >
              Agentes internos do time de desenvolvimento — não fazem parte do produto FIDC. Responsáveis pela infraestrutura, código, documentação e operações da plataforma Paganini.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 0 }}>
              {PLATAFORMA_AGENTS.map((agent, i) => (
                <div
                  key={agent.name}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.625rem 1rem",
                    borderBottom: i < PLATAFORMA_AGENTS.length - 1 ? "1px solid var(--border)" : "none",
                    borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{agent.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-2)" }}>
                      {agent.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)" }}>
                      {agent.role}
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.4375rem",
                      color: agent.model === "human" ? "#fb923c" : "var(--text-4)",
                      background: agent.model === "human" ? "rgba(251,146,60,0.1)" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${agent.model === "human" ? "rgba(251,146,60,0.3)" : "var(--border)"}`,
                      padding: "2px 6px", borderRadius: "var(--radius)", whiteSpace: "nowrap",
                    }}
                  >
                    {agent.model}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
