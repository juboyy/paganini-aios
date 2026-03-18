"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType = "FUNDO" | "EMPRESA" | "REGULAÇÃO" | "PESSOA" | "MÓDULO" | "OBRIGAÇÃO" | "SKILL";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  type: NodeType;
  desc: string;
  updatedAt: string;
}

interface Edge {
  source: string;
  target: string;
}

// ─── Color map ────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<NodeType, string> = {
  FUNDO:    "#22d3ee",
  EMPRESA:  "#4ade80",
  REGULAÇÃO:"#fbbf24",
  PESSOA:   "#a78bfa",
  MÓDULO:   "#2dd4bf",
  OBRIGAÇÃO:"#f87171",
  SKILL:    "#94a3b8",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const NODES: Node[] = [
  // CENTER
  { id: "p1",  label: "Paganini I FIDC",   x: 500, y: 300, r: 32, type: "FUNDO",    desc: "Fundo principal de investimento em direitos creditórios.",        updatedAt: "18/03/2026" },
  { id: "p2",  label: "Paganini II FIDC",  x: 380, y: 200, r: 28, type: "FUNDO",    desc: "Segunda série do FIDC Paganini, foco em recebíveis industriais.", updatedAt: "17/03/2026" },
  { id: "p3",  label: "Paganini III FIDC", x: 620, y: 400, r: 28, type: "FUNDO",    desc: "Terceira série, concentrada em crédito agro.",                    updatedAt: "16/03/2026" },

  // MIDDLE RING
  { id: "cn",  label: "Cimento Norte",     x: 200, y: 150, r: 18, type: "EMPRESA",  desc: "Cedente âncora do segmento de construção civil.",                updatedAt: "15/03/2026" },
  { id: "ma",  label: "Metalúrgica ABC",   x: 780, y: 180, r: 18, type: "EMPRESA",  desc: "Cedente do setor metalúrgico, rating A+.",                       updatedAt: "14/03/2026" },
  { id: "ac",  label: "Agro Cerrado",      x: 160, y: 420, r: 18, type: "EMPRESA",  desc: "Cedente agro, safras de soja e milho.",                          updatedAt: "13/03/2026" },
  { id: "es",  label: "Energia Solar",     x: 820, y: 380, r: 18, type: "EMPRESA",  desc: "Cedente de recebíveis do setor de energia renovável.",            updatedAt: "12/03/2026" },
  { id: "cv",  label: "CVM 175",           x: 350, y:  80, r: 18, type: "REGULAÇÃO",desc: "Resolução CVM 175 — nova regulamentação de fundos de investimento.", updatedAt: "11/03/2026" },
  { id: "bc",  label: "BACEN 4.966",       x: 650, y:  80, r: 18, type: "REGULAÇÃO",desc: "Resolução BCB 4.966 — critérios de elegibilidade de crédito.",   updatedAt: "10/03/2026" },
  { id: "cs",  label: "Carlos Silva",      x: 280, y: 350, r: 18, type: "PESSOA",   desc: "Gestor sênior responsável pela originação de crédito.",           updatedAt: "09/03/2026" },
  { id: "an",  label: "Ana Costa",         x: 700, y: 280, r: 18, type: "PESSOA",   desc: "Analista de risco e compliance do fundo.",                       updatedAt: "08/03/2026" },

  // OUTER RING
  { id: "py1", label: "pricing.py",        x: 420, y: 380, r: 12, type: "MÓDULO",   desc: "Módulo de precificação de cotas e marcação a mercado.",          updatedAt: "07/03/2026" },
  { id: "py2", label: "compliance.py",     x: 580, y: 220, r: 12, type: "MÓDULO",   desc: "Verificações automáticas de limites e enquadramento.",            updatedAt: "06/03/2026" },
  { id: "py3", label: "risk.py",           x: 500, y: 440, r: 12, type: "MÓDULO",   desc: "Cálculo de VaR, stress test e concentração.",                    updatedAt: "05/03/2026" },
  { id: "le",  label: "Lei 14.430",        x: 830, y: 500, r: 12, type: "REGULAÇÃO",desc: "Lei que disciplina os FIDCs no Brasil.",                         updatedAt: "04/03/2026" },
  { id: "ca",  label: "CADOC 3040",        x: 100, y: 520, r: 12, type: "OBRIGAÇÃO",desc: "Relatório regulatório mensal ao Banco Central.",                  updatedAt: "03/03/2026" },
  { id: "im",  label: "Informe Mensal",    x: 500, y: 540, r: 12, type: "OBRIGAÇÃO",desc: "Informe mensal de desempenho enviado à CVM.",                    updatedAt: "02/03/2026" },
  { id: "sk1", label: "fidc-rules-base",   x: 200, y: 530, r: 12, type: "SKILL",    desc: "Base de regras de negócio dos FIDCs para o agente RAG.",         updatedAt: "01/03/2026" },
  { id: "sk2", label: "fidc-orchestrator", x: 380, y: 520, r: 12, type: "SKILL",    desc: "Orquestrador de tarefas automáticas do fundo.",                  updatedAt: "28/02/2026" },
  { id: "sk3", label: "stress-test",       x: 680, y: 480, r: 12, type: "SKILL",    desc: "Skill de simulação de cenários adversos.",                       updatedAt: "27/02/2026" },
];

const EDGES: Edge[] = [
  // Fund interconnections
  { source: "p1", target: "p2" },
  { source: "p1", target: "p3" },
  // Funds → Companies
  { source: "p1", target: "cn" },
  { source: "p1", target: "ma" },
  { source: "p2", target: "ac" },
  { source: "p3", target: "es" },
  // Funds → Regulation
  { source: "p1", target: "cv" },
  { source: "p1", target: "bc" },
  { source: "p2", target: "cv" },
  { source: "p3", target: "le" },
  // Funds → People
  { source: "p1", target: "cs" },
  { source: "p1", target: "an" },
  // Funds → Modules
  { source: "p1", target: "py1" },
  { source: "p1", target: "py2" },
  { source: "p1", target: "py3" },
  // Funds → Obligations
  { source: "p1", target: "ca" },
  { source: "p1", target: "im" },
  // Regulation → Obligations
  { source: "cv", target: "im" },
  { source: "bc", target: "ca" },
  // People → Modules
  { source: "cs", target: "py1" },
  { source: "an", target: "py2" },
  // Skills
  { source: "p1", target: "sk1" },
  { source: "p1", target: "sk2" },
  { source: "py3", target: "sk3" },
  { source: "p3", target: "sk3" },
];

// ─── Queries ──────────────────────────────────────────────────────────────────

const QUERIES = [
  { q: "Quais são os limites de concentração do Paganini I?",   agent: "Compliance", conf: 94 },
  { q: "Calcule o VaR 95% para o portfólio atual",              agent: "Risk",       conf: 88 },
  { q: "Status do informe mensal de fevereiro/2026",            agent: "Ops",        conf: 97 },
  { q: "Elegibilidade dos recebíveis da Agro Cerrado",          agent: "Credit",     conf: 91 },
  { q: "Impacto da Resolução CVM 175 no Paganini II",           agent: "Legal",      conf: 85 },
];

const RAG_PIPELINE = [
  { name: "CONSULTA",        desc: "Input do usuário" },
  { name: "EMBED",           desc: "text-embedding-3-large" },
  { name: "BUSCA VETORIAL",  desc: "pgvector cosine" },
  { name: "BM25",            desc: "Keyword sparse" },
  { name: "RERANK",          desc: "Cohere reranker" },
  { name: "TOP-K",           desc: "K=8 chunks" },
  { name: "AGENTE",          desc: "Claude 3.5 Sonnet" },
];

const LEGEND_TYPES: NodeType[] = ["FUNDO", "EMPRESA", "REGULAÇÃO", "PESSOA", "MÓDULO", "OBRIGAÇÃO", "SKILL"];

// ─── Dot Grid Background ──────────────────────────────────────────────────────

function DotGrid() {
  const dots: { cx: number; cy: number }[] = [];
  for (let x = 0; x <= 1000; x += 40) {
    for (let y = 0; y <= 600; y += 40) {
      dots.push({ cx: x, cy: y });
    }
  }
  return (
    <>
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={1.5} fill="#ffffff" opacity={0.05} />
      ))}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const active = selected || hovered;

  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  const connectedIds = active
    ? new Set(
        EDGES.flatMap((e) =>
          e.source === active ? [e.target] : e.target === active ? [e.source] : []
        )
      )
    : null;

  const activeNode = active ? nodeMap[active] : null;
  const connCount = active
    ? EDGES.filter((e) => e.source === active || e.target === active).length
    : 0;

  function edgeOpacity(e: Edge) {
    if (!active) return 0.2;
    if (e.source === active || e.target === active) return 0.6;
    return 0.04;
  }

  function nodeOpacity(n: Node) {
    if (!active) return 1;
    if (n.id === active) return 1;
    if (connectedIds?.has(n.id)) return 1;
    return 0.1;
  }

  function edgeColor(e: Edge) {
    const src = nodeMap[e.source];
    return TYPE_COLOR[src.type];
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <span className="tag-badge tag-badge-cyan" style={{ fontSize: "0.75rem" }}>Knowledge Graph</span>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
          Grafo de Conhecimento
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.375rem" }}>
          Entidades, relações e módulos do ecossistema Paganini FIDC
        </p>
      </div>

      {/* ── Knowledge Graph SVG ── */}
      <div className="glass-card" style={{ padding: "1rem", marginBottom: "1.5rem", overflow: "hidden" }}>
        <svg
          viewBox="0 0 1000 600"
          style={{ width: "100%", height: "auto", display: "block" }}
          onClick={(e) => { if ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).tagName === "rect") setSelected(null); }}
        >
          {/* Background dot grid */}
          <DotGrid />

          {/* Edges */}
          {EDGES.map((e, i) => {
            const src = nodeMap[e.source];
            const tgt = nodeMap[e.target];
            const isConnected = active && (e.source === active || e.target === active);
            return (
              <line
                key={i}
                x1={src.x} y1={src.y}
                x2={tgt.x} y2={tgt.y}
                stroke={edgeColor(e)}
                strokeWidth={isConnected ? 1.5 : 1}
                opacity={edgeOpacity(e)}
                style={{ transition: "opacity 0.3s ease-out, stroke-width 0.2s" }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((n) => {
            const color = TYPE_COLOR[n.type];
            const isActive = active === n.id;
            const opacity = nodeOpacity(n);
            const r = isActive ? n.r * 1.2 : n.r;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(selected === n.id ? null : n.id)}
                style={{ cursor: "pointer" }}
                opacity={opacity}
              >
                <circle
                  r={r}
                  fill={color + "20"}
                  stroke={color}
                  strokeWidth={isActive ? 2.5 : 1}
                  style={{
                    filter: isActive ? `drop-shadow(0 0 10px ${color}90)` : "none",
                    transition: "r 0.25s ease-out, stroke-width 0.2s, filter 0.2s",
                  }}
                />
                <text
                  y={n.r + 14}
                  textAnchor="middle"
                  fill={color}
                  fontSize="11"
                  fontFamily="var(--font-mono, monospace)"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                    opacity: isActive ? 1 : 0.85,
                    fontWeight: isActive ? 700 : 400,
                    transition: "opacity 0.2s, font-weight 0.2s",
                  }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          {LEGEND_TYPES.map((type, i) => {
            const color = TYPE_COLOR[type];
            const x = 60 + i * 135;
            const y = 582;
            return (
              <g key={type} transform={`translate(${x},${y})`}>
                <circle r={5} fill={color + "30"} stroke={color} strokeWidth={1} />
                <text
                  x={10}
                  y={4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Info Panel ── */}
      <div
        className="glass-card"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          minHeight: "5.5rem",
          display: "flex",
          alignItems: activeNode ? "flex-start" : "center",
          transition: "all 0.3s",
        }}
      >
        {activeNode ? (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f1f5f9" }}>
                {activeNode.label}
              </span>
              <span
                className="tag-badge"
                style={{
                  background: TYPE_COLOR[activeNode.type] + "20",
                  color: TYPE_COLOR[activeNode.type],
                  border: `1px solid ${TYPE_COLOR[activeNode.type]}40`,
                  fontSize: "0.75rem",
                }}
              >
                {activeNode.type}
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: "0 0 0.625rem" }}>
              {activeNode.desc}
            </p>
            <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8125rem", color: "#64748b" }}>
              <span>{connCount} conexões</span>
              <span>Atualizado em {activeNode.updatedAt}</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "#475569", margin: 0 }}>
            Passe o mouse sobre um nó para ver detalhes.
          </p>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Entidades",       value: "1.847" },
          { label: "Relacionamentos", value: "4.231" },
          { label: "Documentos",      value: "5.640" },
          { label: "Chunks",          value: "28.420" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22d3ee", letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── RAG Pipeline ── */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "1rem" }}>
          Pipeline RAG
        </h2>
        <div style={{ display: "flex", alignItems: "stretch", gap: "0", overflowX: "auto" }}>
          {RAG_PIPELINE.map((step, i) => (
            <div key={step.name} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <div
                className="glass-card"
                style={{
                  padding: "0.75rem 0.875rem",
                  flex: 1,
                  minWidth: 0,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.25rem", whiteSpace: "nowrap" }}>
                  {step.name}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {step.desc}
                </div>
              </div>
              {i < RAG_PIPELINE.length - 1 && (
                <span style={{ fontSize: "1rem", color: "#334155", padding: "0 0.375rem", flexShrink: 0 }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── RAG Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Precisão",  value: "91.2%",  color: "#4ade80" },
          { label: "Latência",  value: "105ms",  color: "#22d3ee" },
          { label: "Top-K",     value: "8",      color: "#a78bfa" },
        ].map((m) => (
          <div key={m.label} className="glass-card" style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: m.color, letterSpacing: "-0.02em" }}>
              {m.value}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Consultas Recentes ── */}
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "1rem" }}>
          Consultas Recentes
        </h2>
        <div className="glass-card" style={{ overflow: "hidden" }}>
          {QUERIES.map((q, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                alignItems: "center",
                gap: "1rem",
                padding: "0.875rem 1.25rem",
                borderBottom: i < QUERIES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {q.q}
              </span>
              <span
                className="tag-badge"
                style={{ fontSize: "0.75rem", color: "#22d3ee", background: "#22d3ee15", border: "1px solid #22d3ee30", flexShrink: 0 }}
              >
                {q.agent}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                <div style={{ width: "60px", height: "4px", background: "#1e293b", borderRadius: "2px" }}>
                  <div
                    style={{
                      width: `${q.conf}%`,
                      height: "100%",
                      background: q.conf >= 90 ? "#4ade80" : q.conf >= 80 ? "#fbbf24" : "#f87171",
                      borderRadius: "2px",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.8125rem", color: "#64748b", minWidth: "2.5rem", textAlign: "right" }}>
                  {q.conf}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
