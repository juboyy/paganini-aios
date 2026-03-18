"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const KnowledgeGraph3D = dynamic(() => import("../../components/charts/knowledge-graph-3d"), { ssr: false });

const CORPUS_SOURCES = [
  { label: "CVM Publications", value: 2140, total: 5640 },
  { label: "Fund Regulations", value: 1850, total: 5640 },
  { label: "BACEN Norms", value: 890, total: 5640 },
  { label: "Internal Policies", value: 480, total: 5640 },
  { label: "Cedente Docs", value: 280, total: 5640 },
];

const RAG_NODES = [
  { id: "query", label: "QUERY", x: 0 },
  { id: "embed", label: "EMBED", x: 1 },
  { id: "vector", label: "VECTOR SEARCH", x: 2 },
  { id: "bm25", label: "BM25", x: 3 },
  { id: "rerank", label: "RERANK", x: 4 },
  { id: "topk", label: "TOP-K", x: 5 },
  { id: "agent", label: "AGENT", x: 6 },
];

const RECENT_QUERIES = [
  {
    query: "Qual o CNAE da Cimento Norte Ltda e quais sócios aparecem no quadro societário?",
    agent: "due-diligence",
    confidence: 94,
    citations: 4,
    latency: "0.31s",
  },
  {
    query: "Resolução BACEN 4.966 covenants aplicáveis a FIDCs com cedente risco B",
    agent: "compliance",
    confidence: 97,
    citations: 7,
    latency: "0.28s",
  },
  {
    query: "Como calcular NAV ajustado por perdas esperadas no portfólio do Paganini I?",
    agent: "fund-manager",
    confidence: 88,
    citations: 3,
    latency: "0.44s",
  },
  {
    query: "Quais empresas do grupo têm dívida com o INSS acima de R$500K?",
    agent: "risk-agent",
    confidence: 91,
    citations: 5,
    latency: "0.37s",
  },
  {
    query: "Circular CVM 3.932 sobre informes periódicos de FIDCs — prazo de entrega",
    agent: "report-agent",
    confidence: 99,
    citations: 1,
    latency: "0.19s",
  },
];

const INGEST_HISTORY = [
  { company: "Cimento Norte Ltda", cnpj: "34.567.890/0001-22", docs: 12, chunks: 847, entities: 38, time: "7.2s", ts: "13:04:19" },
  { company: "Fundo Paganini I", cnpj: "N/A", docs: 28, chunks: 2140, entities: 124, time: "18.4s", ts: "12:51:33" },
  { company: "BACEN Res. 4.966 Update", cnpj: "N/A", docs: 5, chunks: 412, entities: 67, time: "5.1s", ts: "12:34:07" },
  { company: "Metalúrgica ABC S/A", cnpj: "12.345.678/0001-99", docs: 8, chunks: 544, entities: 29, time: "4.8s", ts: "11:22:44" },
  { company: "CVM ICVM 356 (Rev.2025)", cnpj: "N/A", docs: 3, chunks: 188, entities: 41, time: "2.9s", ts: "10:08:12" },
];

const SKILL_EVOLUTION = [
  {
    skill: "compliance-pdd-check",
    scoreFrom: 0.31,
    scoreTo: 0.87,
    status: "PROMOTED",
    date: "2025-03-18",
    desc: "Detects PDD incompatibilities in fund docs",
  },
  {
    skill: "cnpj-pep-fast",
    scoreFrom: 0.54,
    scoreTo: 0.76,
    status: "STAGING",
    date: "2025-03-17",
    desc: "Combined CNPJ + PEP lookup in single call",
  },
  {
    skill: "covenant-breach-alert",
    scoreFrom: 0.44,
    scoreTo: 0.91,
    status: "PROMOTED",
    date: "2025-03-15",
    desc: "Early warning on covenant threshold proximity",
  },
  {
    skill: "nav-delta-explain",
    scoreFrom: 0.62,
    scoreTo: 0.69,
    status: "EVAL",
    date: "2025-03-14",
    desc: "Natural language explanation of NAV movements",
  },
];

function CorpusBarChart() {
  const maxVal = Math.max(...CORPUS_SOURCES.map((s) => s.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {CORPUS_SOURCES.map((src, i) => {
        const pct = (src.value / maxVal) * 100;
        return (
          <div key={src.label} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-3)", width: 160, flexShrink: 0, textAlign: "right" }}>
              {src.label}
            </div>
            <div style={{ flex: 1, height: 10, background: "rgba(0,0,0,0.4)", borderRadius: "1px", overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, var(--accent), hsl(150 100% 50% / 0.5))`,
                  borderRadius: "1px",
                  boxShadow: "0 0 8px hsl(150 100% 50% / 0.3)",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--accent)", width: 50, flexShrink: 0 }}>
              {src.value.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RAGPipeline() {
  const nodeW = 90;
  const nodeH = 36;
  const gap = 24;
  const totalW = RAG_NODES.length * nodeW + (RAG_NODES.length - 1) * gap;
  const svgH = 80;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={totalW} height={svgH} viewBox={`0 0 ${totalW} ${svgH}`} style={{ display: "block", minWidth: totalW }}>
        <defs>
          <linearGradient id="rag-node-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(150 100% 50% / 0.15)" />
            <stop offset="100%" stopColor="hsl(150 100% 50% / 0.05)" />
          </linearGradient>
          <marker id="rag-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(150 100% 50% / 0.6)" />
          </marker>
        </defs>

        {RAG_NODES.map((node, i) => {
          const x = i * (nodeW + gap);
          const cy = svgH / 2;
          const textY = cy + 4;

          return (
            <g key={node.id}>
              {/* Arrow to next */}
              {i < RAG_NODES.length - 1 && (
                <line
                  x1={x + nodeW}
                  y1={cy}
                  x2={x + nodeW + gap - 2}
                  y2={cy}
                  stroke="hsl(150 100% 50% / 0.5)"
                  strokeWidth={1.5}
                  markerEnd="url(#rag-arrow)"
                />
              )}
              {/* Node box */}
              <rect
                x={x}
                y={cy - nodeH / 2}
                width={nodeW}
                height={nodeH}
                rx={2}
                fill="url(#rag-node-grad)"
                stroke={i === RAG_NODES.length - 1 ? "var(--accent)" : "hsl(150 100% 50% / 0.25)"}
                strokeWidth={i === RAG_NODES.length - 1 ? 1.5 : 1}
              />
              {/* Label */}
              <text
                x={x + nodeW / 2}
                y={textY}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.5rem",
                  fill: i === RAG_NODES.length - 1 ? "hsl(150 100% 50%)" : "hsl(150 20% 70%)",
                  fontWeight: i === RAG_NODES.length - 1 ? 700 : 400,
                  letterSpacing: "0.05em",
                }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ScoreBar({ from, to }: { from: number; to: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)", width: 28 }}>{from.toFixed(2)}</span>
      <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.4)", borderRadius: "1px", overflow: "hidden", position: "relative" }}>
        {/* from marker */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${from * 100}%`,
            height: "100%",
            background: "hsl(150 100% 50% / 0.2)",
          }}
        />
        {/* to fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${to * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, hsl(150 100% 50% / 0.3), var(--accent))",
            borderRadius: "1px",
          }}
        />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)", width: 28, textAlign: "right" }}>{to.toFixed(2)}</span>
    </div>
  );
}

export default function MemoryPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
          PAGANINI AIOS · KNOWLEDGE ENGINE
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          Memory{" "}
          <span style={{ color: "var(--accent)" }}>+ Knowledge Graph</span>
        </h1>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {[
          { label: "DOCUMENTS", value: "5,640", sub: "+280 today", color: "var(--text-1)" },
          { label: "CHUNKS", value: "48,312", sub: "avg 8.6 chunks/doc", color: "var(--accent)" },
          { label: "ENTITIES", value: "847", sub: "ChromaDB nodes", color: "var(--cyan)" },
          { label: "RELATIONSHIPS", value: "2,193", sub: "graph edges", color: "var(--text-1)" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.625rem", color: "var(--text-4)", marginTop: "0.25rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 3D Knowledge Graph */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.75rem" }}>
          3D KNOWLEDGE GRAPH · ENTITY RELATIONSHIPS
        </div>
        <div style={{ height: 420, borderRadius: "var(--radius)", overflow: "hidden", background: "rgba(0,0,0,0.4)" }}>
          <Suspense fallback={
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-4)" }}>
              Loading knowledge graph…
            </div>
          }>
            <KnowledgeGraph3D />
          </Suspense>
        </div>
      </div>

      {/* Corpus Analytics + RAG Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "start" }}>
        {/* Corpus Analytics */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
            CORPUS ANALYTICS · DOCUMENT SOURCES
          </div>
          <CorpusBarChart />
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: "0.5625rem",
              color: "var(--text-4)",
            }}
          >
            <span>TOTAL CORPUS</span>
            <span style={{ color: "var(--accent)" }}>5,640 documents · 48,312 chunks</span>
          </div>
        </div>

        {/* RAG Pipeline */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
            RAG PIPELINE FLOW · QUERY → AGENT
          </div>
          <RAGPipeline />
          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { stage: "EMBED", detail: "text-embedding-3-large · 3072d", color: "var(--cyan)" },
              { stage: "VECTOR", detail: "ChromaDB · cosine similarity · top-20", color: "var(--accent)" },
              { stage: "BM25", detail: "BM25 sparse retrieval · top-10 merge", color: "var(--accent)" },
              { stage: "RERANK", detail: "Cohere rerank-v3 · threshold 0.7", color: "var(--accent)" },
              { stage: "TOP-K", detail: "k=5 · context window: 8K tokens", color: "var(--accent)" },
            ].map((s) => (
              <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: s.color, width: 52, flexShrink: 0, letterSpacing: "0.08em" }}>
                  {s.stage}
                </span>
                <span style={{ fontSize: "0.5625rem", color: "var(--text-3)" }}>{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Queries */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          RECENT RAG QUERIES · LIVE
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["QUERY", "AGENT", "CONFIDENCE", "CITATIONS", "LATENCY"].map((h) => (
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
              {RECENT_QUERIES.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid hsl(150 100% 50% / 0.04)",
                    background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      padding: "0.6rem 0.75rem",
                      color: "var(--text-2)",
                      maxWidth: 340,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.5625rem",
                    }}
                  >
                    {row.query}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)" }}>{row.agent}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: 40, height: 4, background: "rgba(0,0,0,0.4)", borderRadius: "1px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${row.confidence}%`,
                            height: "100%",
                            background: row.confidence >= 95 ? "var(--accent)" : "hsl(150 100% 50% / 0.6)",
                          }}
                        />
                      </div>
                      <span style={{ color: "var(--accent)" }}>{row.confidence}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--cyan)" }}>{row.citations} src</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-3)" }}>{row.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingest History */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          INGEST HISTORY · paganini ingest [--cnpj] [--source]
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["TIME", "COMPANY", "CNPJ", "DOCS", "CHUNKS", "ENTITIES", "ELAPSED"].map((h) => (
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
              {INGEST_HISTORY.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid hsl(150 100% 50% / 0.04)",
                    background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                  }}
                >
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-4)" }}>{row.ts}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-1)", fontWeight: 500 }}>{row.company}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-3)" }}>{row.cnpj}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--cyan)" }}>{row.docs}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--accent)" }}>{row.chunks.toLocaleString()}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-2)" }}>{row.entities}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-3)" }}>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MetaClaw Skill Evolution */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "2px" }}>
              METACLAW · SKILL EVOLUTION
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>Self-Learning Timeline</div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <span className="tag-badge">2 PROMOTED</span>
            <span className="tag-badge-cyan">2 IN EVAL</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {SKILL_EVOLUTION.map((skill, i) => {
            const statusColor =
              skill.status === "PROMOTED" ? "var(--accent)" :
              skill.status === "STAGING" ? "var(--cyan)" :
              "hsl(45 100% 50%)";
            const statusBg =
              skill.status === "PROMOTED" ? "hsl(150 100% 50% / 0.1)" :
              skill.status === "STAGING" ? "hsl(180 100% 50% / 0.1)" :
              "hsl(45 100% 50% / 0.1)";

            return (
              <div
                key={skill.skill}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  paddingBottom: i < SKILL_EVOLUTION.length - 1 ? "1rem" : 0,
                  borderBottom: i < SKILL_EVOLUTION.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* Timeline dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: statusColor,
                      boxShadow: skill.status === "PROMOTED" ? `0 0 8px ${statusColor}` : "none",
                      marginTop: "2px",
                    }}
                  />
                  {i < SKILL_EVOLUTION.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: "6px", minHeight: 20 }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: statusColor, fontWeight: 600 }}>
                        {skill.skill}
                      </span>
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: "var(--radius)",
                          background: statusBg,
                          border: `1px solid ${statusColor}`,
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.4375rem",
                          color: statusColor,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {skill.status}
                      </span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)" }}>{skill.date}</span>
                  </div>
                  <div style={{ fontSize: "0.5625rem", color: "var(--text-3)", marginBottom: "8px" }}>{skill.desc}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)", flexShrink: 0 }}>SCORE</span>
                    <ScoreBar from={skill.scoreFrom} to={skill.scoreTo} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)", flexShrink: 0 }}>
                      {skill.scoreFrom.toFixed(2)}→{skill.scoreTo.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
