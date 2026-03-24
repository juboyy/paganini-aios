"use client";

import { useState, useEffect } from "react";

// ─── FIDC AGENTS (Pack vertical) ─────────────────────────────────────────────
const FIDC_AGENTS = [
  { name: "Administrador Fiduciário", emoji: "📋", domain: "Regulatório & Compliance" },
  { name: "Compliance", emoji: "⚖️", domain: "Regulatório & Reporting" },
  { name: "Custodiante", emoji: "🔐", domain: "Custódia de Ativos" },
  { name: "Due Diligence", emoji: "🔍", domain: "Análise de Cedentes" },
  { name: "Gestor", emoji: "📊", domain: "Gestão de Carteira" },
  { name: "Investor Relations", emoji: "💬", domain: "Comunicação com Cotistas" },
  { name: "Pricing Engine", emoji: "💰", domain: "Precificação & PDD" },
  { name: "Regulatory Watch", emoji: "📡", domain: "Monitoramento CVM/BACEN" },
  { name: "Reporting", emoji: "📄", domain: "Informes & Relatórios" },
];

// ─── MODEL BADGE ─────────────────────────────────────────────────────────────
function ModelBadge({ model }: { model: string }) {
  let color = "hsl(150 100% 55%)";
  let bg = "hsl(150 100% 55% / 0.08)";
  let border = "hsl(150 100% 55% / 0.25)";

  if (model === "claude-opus-4-6-thinking") {
    color = "hsl(270 80% 70%)";
    bg = "hsl(270 80% 70% / 0.1)";
    border = "hsl(270 80% 70% / 0.3)";
  } else if (model === "claude-sonnet-4-6") {
    color = "hsl(190 100% 60%)";
    bg = "hsl(190 100% 60% / 0.08)";
    border = "hsl(190 100% 60% / 0.25)";
  } else if (model === "gpt-5.3-codex") {
    color = "hsl(45 100% 60%)";
    bg = "hsl(45 100% 60% / 0.1)";
    border = "hsl(45 100% 60% / 0.3)";
  } else if (model === "human") {
    color = "hsl(25 100% 65%)";
    bg = "hsl(25 100% 65% / 0.1)";
    border = "hsl(25 100% 65% / 0.3)";
  }

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        padding: "2px 8px",
        borderRadius: "var(--radius)",
        background: bg,
        border: `1px solid ${border}`,
        color,
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
      }}
    >
      {model}
    </span>
  );
}

// ─── CODE AGENT CARD ─────────────────────────────────────────────────────────
interface CodeAgent {
  emoji: string;
  name: string;
  title: string;
  model: string;
  responsibilities: string[];
  skills: string[];
}

function CodeAgentCard({ agent, featured }: { agent: CodeAgent; featured?: boolean }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
        borderTop: featured
          ? "2px solid hsl(150 100% 50% / 0.8)"
          : "2px solid hsl(150 100% 50% / 0.35)",
      }}
    >
      {/* Glow */}
      {featured && (
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, height: 80,
            background: "linear-gradient(180deg, hsl(150 100% 50% / 0.07), transparent)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: featured ? "2.25rem" : "1.75rem", lineHeight: 1 }}>{agent.emoji}</span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: featured ? "1rem" : "0.875rem",
                color: "var(--text-1)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {agent.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-4)",
                marginTop: 2,
                letterSpacing: "0.06em",
              }}
            >
              {agent.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <span
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--accent)", boxShadow: "0 0 8px var(--accent)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                  color: "var(--accent)", letterSpacing: "0.12em",
                }}
              >
                ATIVO
              </span>
            </div>
          </div>
        </div>
        <ModelBadge model={agent.model} />
      </div>

      {/* Responsibilities */}
      <ul
        style={{
          margin: "0 0 1rem 0",
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {agent.responsibilities.map((r, i) => (
          <li
            key={i}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              color: "var(--text-3)",
              display: "flex",
              gap: 8,
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: "var(--accent)", flexShrink: 0 }}>▸</span>
            {r}
          </li>
        ))}
      </ul>

      {/* Skills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {agent.skills.map((s) => (
          <span key={s} className="tag-badge-cyan" style={{ fontSize: "0.75rem" }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── PIPELINE DIAGRAM ────────────────────────────────────────────────────────
function PipelineDiagram() {
  const nodes = [
    { emoji: "👔", label: "João", role: "task", color: "hsl(25 100% 65%)" },
    { emoji: "🧠", label: "OraCLI", role: "decompose", color: "hsl(270 80% 70%)" },
    { emoji: "💻", label: "Code Agent", role: "spec", color: "hsl(190 100% 60%)" },
    { emoji: "⚡", label: "Codex", role: "implement", color: "hsl(45 100% 60%)" },
    { emoji: "🧪", label: "QA Agent", role: "test", color: "hsl(190 100% 60%)" },
    { emoji: "🛡️", label: "Security", role: "scan", color: "hsl(190 100% 60%)" },
    { emoji: "🏗️", label: "Infra", role: "deploy", color: "hsl(190 100% 60%)" },
    { emoji: "📝", label: "Docs", role: "document", color: "hsl(190 100% 60%)" },
  ];

  const nodeW = 84;
  const nodeH = 88;
  const gap = 18;
  const totalW = nodes.length * nodeW + (nodes.length - 1) * gap;
  const svgW = totalW + 40;
  const svgH = nodeH + 60;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: "block", margin: "0 auto", maxWidth: "100%", minWidth: 520 }}
      >
        <defs>
          <marker id="pipe-arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="hsl(150 100% 50% / 0.6)" />
          </marker>
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Arrows between nodes */}
        {nodes.map((_, i) => {
          if (i === nodes.length - 1) return null;
          const x1 = 20 + i * (nodeW + gap) + nodeW;
          const x2 = 20 + (i + 1) * (nodeW + gap);
          const y = svgH / 2 - 10;
          return (
            <line
              key={i}
              x1={x1} y1={y} x2={x2 - 2} y2={y}
              stroke="hsl(150 100% 50% / 0.5)"
              strokeWidth="1.5"
              markerEnd="url(#pipe-arr)"
            />
          );
        })}

        {/* Nodes — using foreignObject for legible text */}
        {nodes.map((node, i) => {
          const x = 20 + i * (nodeW + gap);
          const y = 20;
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={nodeW} height={nodeH}
                rx="6"
                fill={`${node.color}12`}
                stroke={`${node.color}50`}
                strokeWidth="1.2"
                filter="url(#node-glow)"
              />
              {/* Emoji via text — larger */}
              <text x={x + nodeW / 2} y={y + 26} textAnchor="middle" style={{ fontSize: "1.375rem" }}>
                {node.emoji}
              </text>
              {/* Label via foreignObject for full font control */}
              <foreignObject x={x + 2} y={y + 38} width={nodeW - 4} height={28}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "hsl(0 0% 85%)",
                    textAlign: "center",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {node.label}
                </div>
              </foreignObject>
              <foreignObject x={x + 2} y={y + 62} width={nodeW - 4} height={20}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    color: node.color,
                    textAlign: "center",
                    letterSpacing: "0.06em",
                  }}
                >
                  {node.role}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── MODEL DISTRIBUTION CHART ─────────────────────────────────────────────────
function ModelChart() {
  const [mounted, setMounted] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const models = [
    {
      emoji: "🟣",
      name: "claude-opus-4-6-thinking",
      provider: "Anthropic",
      tagline: "Raciocínio Avançado",
      color: "#a855f7",
      agents: 2,
      total: 12,
      agentNames: "OraCLI, Architect Agent",
      context: "200K tokens",
      capability: "Pensamento em cadeia",
      cost: "~$15/M tokens",
      uso: "Orquestração e Design de Sistemas",
    },
    {
      emoji: "🔵",
      name: "claude-sonnet-4-6",
      provider: "Anthropic",
      tagline: "Execução Rápida",
      color: "#22d3ee",
      agents: 8,
      total: 12,
      agentNames: "Code, PM, Docs, Infra, Data, General, QA, Security",
      context: "200K tokens",
      capability: "Velocidade + Qualidade",
      cost: "~$3/M tokens",
      uso: "Implementação, Review, QA, Deploy",
    },
    {
      emoji: "🟡",
      name: "gpt-5.3-codex",
      provider: "OpenAI",
      tagline: "Motor de Código",
      color: "#eab308",
      agents: 1,
      total: 12,
      agentNames: "Codex",
      context: "192K tokens",
      capability: "Multi-agent parallelism",
      cost: "~$2/M tokens (ChatGPT Team)",
      uso: "Escrita de código a partir de specs",
    },
    {
      emoji: "🟠",
      name: "human",
      provider: "Homo Sapiens",
      tagline: "Gate de Aprovação",
      color: "#f97316",
      agents: 1,
      total: 12,
      agentNames: "João CEO",
      context: "∞",
      capability: "Julgamento, Intuição, Visão",
      cost: "Inestimável",
      uso: "Aprovação final de produção",
    },
  ];

  // Donut geometry
  const cx = 80; const cy = 80; const rOuter = 60; const rInner = 38;
  const total = models.reduce((s, m) => s + m.agents, 0);
  const gap = 0.05; // radians gap between segments
  let cumAngle = -Math.PI / 2;

  const segments = models.map((m) => {
    const angle = (m.agents / total) * Math.PI * 2;
    const start = cumAngle + gap / 2;
    const end = cumAngle + angle - gap / 2;
    cumAngle += angle;
    return { ...m, start, end, angle };
  });

  function arcPath(r: number, startA: number, endA: number) {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    const large = endA - startA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  function segmentPath(m: typeof segments[0], i: number) {
    const hover = hoveredSegment === i;
    const rO = hover ? rOuter + 5 : rOuter;
    const rI = rInner;
    const outer = arcPath(rO, m.start, m.end);
    const innerRev = arcPath(rI, m.end, m.start);
    return `${outer} ${innerRev.replace("M", "L")} Z`;
  }

  const providers = [
    { label: "Anthropic", agents: 10, pct: 83, color: "#a855f7" },
    { label: "OpenAI",    agents: 1,  pct: 8,  color: "#eab308" },
    { label: "Humano",    agents: 1,  pct: 8,  color: "#f97316" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Donut */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg
            viewBox="0 0 160 160"
            style={{ width: 160, height: 160, display: "block" }}
          >
            <defs>
              {segments.map((seg, i) => (
                <filter key={i} id={`seg-glow-${i}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor={seg.color} floodOpacity="0.7" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>
            {segments.map((seg, i) => {
              const isHov = hoveredSegment === i;
              return (
                <path
                  key={i}
                  d={segmentPath(seg, i)}
                  fill={seg.color}
                  opacity={isHov ? 1 : hoveredSegment !== null ? 0.3 : 0.75}
                  filter={isHov ? `url(#seg-glow-${i})` : undefined}
                  style={{
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={() => setHoveredSegment(i)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              );
            })}
            {/* Center text */}
            <text
              x={cx} y={cy - 7}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: 900,
                fill: hoveredSegment !== null ? segments[hoveredSegment].color : "var(--text-1)",
                transition: "fill 0.2s",
                letterSpacing: "-0.02em",
              }}
            >
              {hoveredSegment !== null ? `${segments[hoveredSegment].agents} AGT` : "12 AGENTES"}
            </text>
            <text
              x={cx} y={cy + 10}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fill: "var(--text-4)",
                letterSpacing: "0.1em",
              }}
            >
              {hoveredSegment !== null ? segments[hoveredSegment].name.slice(0, 14) : "4 MODELOS"}
            </text>
          </svg>
        </div>

        {/* Donut legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minWidth: 160 }}>
          {segments.map((seg, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredSegment(i)}
              onMouseLeave={() => setHoveredSegment(null)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                cursor: "pointer",
                opacity: hoveredSegment !== null && hoveredSegment !== i ? 0.35 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: seg.color, flex: 1, letterSpacing: "0.04em" }}>
                {seg.name.length > 22 ? seg.name.slice(0, 22) + "…" : seg.name}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-3)", fontWeight: 700 }}>
                {seg.agents}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Model Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {models.map((m, i) => {
          const pct = Math.round((m.agents / m.total) * 100);
          const isHov = hoveredCard === i;
          return (
            <div
              key={m.name}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: isHov ? `${m.color}0d` : "#ffffff04",
                border: `1px solid ${isHov ? m.color + "50" : m.color + "20"}`,
                borderRadius: 8,
                padding: "1rem 1.125rem",
                cursor: "default",
                transition: "all 0.25s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Left accent bar */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                background: `linear-gradient(180deg, ${m.color}, ${m.color}40)`,
                borderRadius: "8px 0 0 8px",
              }} />

              {/* Subtle glow on hover */}
              {isHov && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(ellipse 80% 60% at 0% 50%, ${m.color}06, transparent 70%)`,
                  pointerEvents: "none",
                }} />
              )}

              <div style={{ paddingLeft: 4, position: "relative" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "1rem" }}>{m.emoji}</span>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
                    color: m.color, fontWeight: 700, letterSpacing: "-0.01em",
                  }}>
                    {m.name}
                  </span>
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                  color: "var(--text-4)", letterSpacing: "0.06em", marginBottom: "0.75rem",
                }}>
                  {m.provider} · {m.tagline}
                </div>

                {/* Details grid */}
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 0.75rem", marginBottom: "0.875rem" }}>
                  {[
                    { key: "Agentes",     val: m.agentNames },
                    { key: "Contexto",    val: m.context },
                    { key: "Capacidade",  val: m.capability },
                    { key: "Custo",       val: m.cost },
                    { key: "Uso",         val: m.uso },
                  ].map(row => (
                    <>
                      <span key={`k-${row.key}`} style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {row.key}:
                      </span>
                      <span key={`v-${row.key}`} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-2)", lineHeight: 1.4 }}>
                        {row.val}
                      </span>
                    </>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <div style={{
                    flex: 1, height: 6, background: "#ffffff06",
                    borderRadius: 3, overflow: "hidden", border: "1px solid #ffffff08",
                  }}>
                    <div style={{
                      height: "100%",
                      width: mounted ? `${pct}%` : "0%",
                      background: `linear-gradient(90deg, ${m.color}70, ${m.color})`,
                      borderRadius: 3,
                      boxShadow: `0 0 8px ${m.color}60`,
                      transition: `width ${1.2 + i * 0.15}s ease`,
                    }} />
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                    color: m.color, fontWeight: 700, minWidth: 120, letterSpacing: "0.04em",
                  }}>
                    {pct}% dos agentes
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Provider Summary */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.625rem",
        paddingTop: "0.75rem",
        borderTop: "1px solid var(--border)",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.08em", alignSelf: "center", marginRight: 4 }}>
          PROVEDORES:
        </span>
        {providers.map(p => (
          <div key={p.label} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px",
            background: `${p.color}0c`, border: `1px solid ${p.color}30`,
            borderRadius: "var(--radius)",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: p.color, letterSpacing: "0.05em" }}>
              {p.label}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>
              {p.agents} {p.agents === 1 ? "agente" : "agentes"} ({p.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TIER DIVIDER ─────────────────────────────────────────────────────────────
function TierLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", marginTop: "0.5rem" }}>
      <div
        style={{
          flex: 1, height: 1,
          background: "linear-gradient(90deg, hsl(150 100% 50% / 0.3), transparent)",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.875rem",
            letterSpacing: "0.18em", color: "var(--accent)",
            padding: "4px 14px", border: "1px solid hsl(150 100% 50% / 0.3)",
            borderRadius: "var(--radius)", background: "hsl(150 100% 50% / 0.06)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {sub && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginTop: 4, letterSpacing: "0.12em" }}>
            {sub}
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1, height: 1,
          background: "linear-gradient(90deg, transparent, hsl(150 100% 50% / 0.3))",
        }}
      />
    </div>
  );
}

// ─── AGENT DATA ───────────────────────────────────────────────────────────────
const TIER1: CodeAgent[] = [
  {
    emoji: "👔",
    name: "João CEO",
    title: "Founder & Decisor Final",
    model: "human",
    responsibilities: [
      "Aprova deploys de produção — gate humano do sistema.",
      "Define prioridades estratégicas e visão do produto.",
      "Decisão final em conflitos e mudanças de arquitetura.",
    ],
    skills: ["strategy", "leadership", "product"],
  },
  {
    emoji: "🧠",
    name: "OraCLI",
    title: "Orquestrador Chefe",
    model: "claude-opus-4-6-thinking",
    responsibilities: [
      "Decompõe tarefas e delega para agentes especializados.",
      "Garante qualidade via pipeline BMAD-CE de 18 estágios.",
      "Context Scout: busca memória antes de qualquer ação.",
    ],
    skills: ["Orchestration", "Context Scout", "Pipeline Management"],
  },
];

const TIER2: CodeAgent[] = [
  {
    emoji: "💻",
    name: "Code Agent",
    title: "CTO / Supervisor Codex",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Escreve specs técnicas e supervisiona implementação via Codex.",
      "Code review automatizado com padrões de qualidade.",
      "Bridge entre produto e execução de código.",
    ],
    skills: ["TypeScript", "React", "Node.js", "Code Review"],
  },
  {
    emoji: "🏗️",
    name: "Architect Agent",
    title: "Arquiteto de Sistemas",
    model: "claude-opus-4-6-thinking",
    responsibilities: [
      "Design de sistemas distribuídos e API contracts.",
      "Data models, decisões de arquitetura e ADRs.",
      "Pre-dev quality gate e revisão de blueprints.",
    ],
    skills: ["System Design", "API Design", "Data Modeling"],
  },
  {
    emoji: "📋",
    name: "PM Agent",
    title: "Gerente de Projeto",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Sprint planning, decomposição de stories e priorização.",
      "Tradução de requisitos de negócio para specs técnicas.",
      "Gerenciamento de backlog e status no Linear.",
    ],
    skills: ["Requirements", "Sprint Planning", "Story Decomposition"],
  },
  {
    emoji: "📝",
    name: "Docs Agent",
    title: "Líder de Documentação",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Documentação técnica, Confluence e knowledge base.",
      "QMD reports, retrospectivas e lições aprendidas.",
      "Persistência de conhecimento em pgvector/memória.",
    ],
    skills: ["Technical Writing", "Confluence", "Knowledge Management"],
  },
  {
    emoji: "🏗️",
    name: "Infra & DevOps Agent",
    title: "Líder de Infraestrutura",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Deploy, Docker, monitoring, CI/CD e Vercel.",
      "Cloud management, smoke tests pós-deploy.",
      "Security gate de produção junto ao Security Agent.",
    ],
    skills: ["Docker", "Vercel", "CI/CD", "Monitoring"],
  },
  {
    emoji: "📊",
    name: "Data Agent",
    title: "Agente de Dados",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Schemas de banco, migrations e qualidade de dados.",
      "Analytics, métricas de ROI no Supabase.",
      "Suporte a Data Modeling e decisões de schema.",
    ],
    skills: ["SQL", "Supabase", "Migrations", "Analytics"],
  },
  {
    emoji: "🤖",
    name: "General Agent",
    title: "Generalista",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Triagem de tarefas e roteamento para o agente correto.",
      "UX review, pesquisa técnica e competitive analysis.",
      "Comunicação Slack/Telegram e suporte operacional.",
    ],
    skills: ["Triage", "UX", "Research", "Communication"],
  },
];

const TIER3: CodeAgent[] = [
  {
    emoji: "⚡",
    name: "Codex",
    title: "Motor de Execução de Código",
    model: "gpt-5.3-codex",
    responsibilities: [
      "Recebe specs do Code Agent e implementa código completo.",
      "Multi-agent parallelism — o braço que escreve o código.",
      "Executa em sandbox isolado: sem APIs externas, sem deploy.",
    ],
    skills: ["Implementation", "Testing", "Security Audit"],
  },
  {
    emoji: "🧪",
    name: "QA Agent",
    title: "Agente de Qualidade",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Estratégia de testes, execução E2E e cobertura.",
      "Regressão automatizada a cada PR e deploy.",
      "Relatório de qualidade e critérios de aceite.",
    ],
    skills: ["E2E Testing", "Test Strategy", "Coverage"],
  },
  {
    emoji: "🛡️",
    name: "Security Agent",
    title: "Agente de Segurança",
    model: "claude-sonnet-4-6",
    responsibilities: [
      "Scan de vulnerabilidades em código e dependências.",
      "Gestão de secrets, controle de acesso e audit trail.",
      "Security gate pré-produção com relatório detalhado.",
    ],
    skills: ["Security Audit", "Vuln Scanning", "Access Control"],
  },
];

// ─── API Agent type ───────────────────────────────────────────────────────────
interface ApiAgent {
  id: string;
  name: string;
  emoji?: string;
  status: string;
  model: string;
  tasks_completed?: number;
  avg_time?: number;
  error_rate?: number;
  total_cost?: number;
  role?: string;
  title?: string;
  provider?: string;
  uptime?: number;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [apiAgents, setApiAgents] = useState<ApiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

  const fetchAgents = async () => {
    try {
      const [agentRes, statsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/stats"),
      ]);
      if (agentRes.ok) {
        const data = await agentRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setApiAgents(data);
        }
      }
      if (statsRes.ok) {
        const sd = await statsRes.json();
        setStatsData(sd);
      }
    } catch {
      // keep last known data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Derive stats from API data
  const activeAgents = apiAgents.filter(a => a.status === "active").length;
  const totalAgents = apiAgents.length;
  const totalTasksCompleted = apiAgents.reduce((s, a) => s + (a.tasks_completed ?? 0), 0);
  const avgErrorRate = apiAgents.length > 0
    ? apiAgents.reduce((s, a) => s + (a.error_rate ?? 0), 0) / apiAgents.length
    : 1.7;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

      {/* ── SECTION 1: Header ── */}
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
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 70% 80% at 50% 0%, hsl(150 100% 50% / 0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="mono-label" style={{ marginBottom: "0.5rem", color: "var(--accent)" }}>
            PAGANINI AIOS · PLATAFORMA DE DESENVOLVIMENTO
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              color: "var(--text-1)",
              letterSpacing: "-0.03em",
              margin: "0 0 0.75rem 0",
              lineHeight: 1.1,
            }}
          >
            Fábrica de Código{" "}
            <span style={{ color: "var(--accent)", textShadow: "0 0 30px hsl(150 100% 50% / 0.4)" }}>
              Autônoma
            </span>
          </h1>
          <p className="section-help" style={{ fontSize: "0.875rem", marginBottom: "1.5rem", maxWidth: 600 }}>
            {loading ? "Carregando agentes..." : `${totalAgents > 0 ? totalAgents : 12} agentes especializados que escrevem, testam, revisam e deployam código — autonomamente.`}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <span className="tag-badge">{loading ? "..." : `${totalAgents > 0 ? totalAgents : 12} AGENTES`}</span>
            <span className="tag-badge-cyan">AUTÔNOMOS</span>
            <span className="tag-badge" style={{ background: "hsl(270 80% 70% / 0.08)", color: "hsl(270 80% 70%)", borderColor: "hsl(270 80% 70% / 0.25)" }}>
              MULTI-MODEL
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Stats ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>MÉTRICAS DA FÁBRICA</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            { label: "LOC Geradas", value: loading ? "..." : (statsData?.totalLines > 0 ? (statsData.totalLines >= 1000000 ? (statsData.totalLines/1000000).toFixed(2)+"M" : statsData.totalLines >= 1000 ? (statsData.totalLines/1000).toFixed(1)+"K" : String(statsData.totalLines)) : "—"), color: "var(--accent)", icon: "📦" },
            { label: "Tasks Completadas", value: loading ? "..." : (totalTasksCompleted > 0 ? totalTasksCompleted.toLocaleString() : "—"), color: "hsl(190 100% 60%)", icon: "🔀" },
            {
              label: "Agentes Ativos",
              value: loading ? "..." : `${apiAgents.filter(a => ["active","online"].includes(a.status)).length}/${totalAgents}`,
              color: "hsl(270 80% 70%)", icon: "🚀",
            },
            {
              label: "Error Rate",
              value: loading ? "..." : `${avgErrorRate.toFixed(1)}%`,
              color: "hsl(150 100% 55%)", icon: "✅",
            },
          ].map((s) => (
            <div key={s.label} className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{s.icon}</div>
              <div className="stat-value" style={{ fontSize: "2rem", color: s.color }}>{s.value}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                  color: "var(--text-4)", marginTop: "0.5rem", letterSpacing: "0.1em",
                }}
              >
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: Hierarquia de Agentes ── */}
      <div>
        <div className="mono-label" style={{ marginBottom: "0.75rem" }}>HIERARQUIA DE AGENTES</div>

        {/* TIER 1 */}
        <TierLabel label="TIER 1 — LIDERANÇA" sub="Gate humano + Orquestrador Chefe" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {TIER1.map((a) => <CodeAgentCard key={a.name} agent={a} featured />)}
        </div>

        {/* TIER 2 */}
        <TierLabel label="TIER 2 — LÍDERES TÉCNICOS" sub="7 especialistas de domínio" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {TIER2.map((a) => <CodeAgentCard key={a.name} agent={a} />)}
        </div>

        {/* TIER 3 */}
        <TierLabel label="TIER 3 — ESPECIALISTAS" sub="Execução, qualidade e segurança" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {TIER3.map((a) => <CodeAgentCard key={a.name} agent={a} />)}
        </div>
      </div>

      {/* ── SECTION 4: Pipeline de Execução ── */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>PIPELINE DE EXECUÇÃO</div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 0.5rem" }}>
          BMAD-CE · Do Comando ao Deploy
        </h2>
        <p className="section-help" style={{ marginBottom: "1.25rem" }}>
          Cada tarefa flui por um pipeline estruturado de 18 estágios. Do pedido do João até o deploy em produção — tudo orquestrado autonomamente.
        </p>
        <PipelineDiagram />
      </div>

      {/* ── SECTION 5: Vertical Pack FIDC ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, hsl(45 100% 60% / 0.3), transparent)" }} />
          <span
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.875rem",
              letterSpacing: "0.18em", color: "hsl(45 100% 60%)",
              padding: "4px 14px", border: "1px solid hsl(45 100% 60% / 0.3)",
              borderRadius: "var(--radius)", background: "hsl(45 100% 60% / 0.06)",
              whiteSpace: "nowrap",
            }}
          >
            14 AGENTES DE DOMÍNIO
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, hsl(45 100% 60% / 0.3))" }} />
        </div>

        <div className="glass-card" style={{ padding: "1.5rem", borderTop: "2px solid hsl(45 100% 60% / 0.4)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="mono-label" style={{ marginBottom: "0.25rem", color: "hsl(45 100% 60%)" }}>
                VERTICAL: PACK FIDC
              </div>
              <p className="section-help" style={{ margin: 0 }}>
                A fábrica de código alimenta packs verticais especializados. O Pack FIDC é o primeiro: 9 agentes treinados com o corpus regulatório completo — CVM 175, BACEN 2682/99, ANBIMA.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.625rem" }}>
            {FIDC_AGENTS.map((a) => (
              <div
                key={a.name}
                style={{
                  display: "flex", alignItems: "center", gap: "0.625rem",
                  padding: "0.75rem 0.875rem",
                  background: "hsl(45 100% 60% / 0.04)",
                  border: "1px solid hsl(45 100% 60% / 0.15)",
                  borderRadius: "var(--radius)",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{a.emoji}</span>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-2)", fontWeight: 700 }}>
                    {a.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(45 100% 60% / 0.7)", letterSpacing: "0.06em" }}>
                    {a.domain}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 6: Modelos em Uso ── */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="mono-label" style={{ marginBottom: "0.25rem" }}>MODELOS EM USO</div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 1rem" }}>
          Distribuição por Modelo de IA
        </h2>
        <ModelChart />
        <div
          style={{
            marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)",
            fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
            color: "var(--text-4)", letterSpacing: "0.08em",
          }}
        >
          Total: 12 agentes · Maior cluster: claude-sonnet-4-6 (67%) · Reasoning habilitado: Opus + Architect
        </div>
      </div>

    </div>
  );
}
