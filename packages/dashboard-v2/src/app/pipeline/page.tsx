"use client";

import { useState } from "react";

// ── Dados de throughput (24h, um por hora) ────────────────────────────────────
const throughputData = [
  12, 18, 9, 6, 4, 7, 14, 28, 41, 56, 72, 89,
  94, 88, 76, 83, 97, 78, 65, 54, 48, 39, 27, 19,
];
const maxThroughput = Math.max(...throughputData);
const peakHour = throughputData.indexOf(maxThroughput);

// ── Estágios do Pipeline ──────────────────────────────────────────────────────
const stages = [
  {
    num: "01",
    name: "CLASSIFICAR",
    desc: "Detecção de intenção e tipagem de tarefa via roteador LLM",
    latency: "0.3s",
    queue: 4,
    color: "var(--accent)",
  },
  {
    num: "02",
    name: "ROTEAR",
    desc: "Seleção de agente pelo registro de capacidades",
    latency: "0.1s",
    queue: 2,
    color: "var(--cyan)",
  },
  {
    num: "03",
    name: "EXECUTAR",
    desc: "Spawning recursivo de agentes e execução de tarefas",
    latency: "3.9s",
    queue: 11,
    color: "var(--accent)",
  },
  {
    num: "04",
    name: "GUARDRAIL",
    desc: "Validação multi-portão de compliance e risco",
    latency: "0.3s",
    queue: 3,
    color: "#f59e0b",
  },
  {
    num: "05",
    name: "ENTREGAR",
    desc: "Serialização do resultado e despacho de webhooks",
    latency: "0.1s",
    queue: 1,
    color: "var(--accent)",
  },
];

// ── Histórico de tarefas com custos detalhados ───────────────────────────────
const taskHistory = [
  {
    desc: "Onboard cedente CNPJ 34.567.890/0001-22",
    agent: "DD+Compliance+KG",
    subAgents: 9,
    depth: 2,
    time: "7.2s",
    status: "success",
    cost: {
      total: 0.0847,
      breakdown: { llm: 0.0612, embedding: 0.0148, vector: 0.0052, infra: 0.0035 },
      tokens: { input: 14230, output: 3841, cached: 8120 },
      model: "gemini-3-flash",
    },
  },
  {
    desc: "Avaliar recebível NF-e 2024-0043821",
    agent: "Pricing+Risk",
    subAgents: 4,
    depth: 2,
    time: "3.1s",
    status: "success",
    cost: {
      total: 0.0312,
      breakdown: { llm: 0.0218, embedding: 0.0061, vector: 0.0022, infra: 0.0011 },
      tokens: { input: 5480, output: 1290, cached: 3200 },
      model: "gemini-3-flash",
    },
  },
  {
    desc: "Verificar concentração cedente Top-5",
    agent: "Compliance",
    subAgents: 2,
    depth: 1,
    time: "1.4s",
    status: "success",
    cost: {
      total: 0.0089,
      breakdown: { llm: 0.0054, embedding: 0.0021, vector: 0.0009, infra: 0.0005 },
      tokens: { input: 1840, output: 520, cached: 1100 },
      model: "gemini-3-flash",
    },
  },
  {
    desc: "Calcular NAV posição D+0",
    agent: "Pricing+Admin",
    subAgents: 3,
    depth: 2,
    time: "4.8s",
    status: "success",
    cost: {
      total: 0.0523,
      breakdown: { llm: 0.0381, embedding: 0.0089, vector: 0.0033, infra: 0.0020 },
      tokens: { input: 9120, output: 2450, cached: 5400 },
      model: "gemini-3-flash",
    },
  },
  {
    desc: "PLD/AML screen — sacado 87.654.321/0001-00",
    agent: "Compliance",
    subAgents: 2,
    depth: 2,
    time: "2.2s",
    status: "warning",
    cost: {
      total: 0.0198,
      breakdown: { llm: 0.0134, embedding: 0.0038, vector: 0.0016, infra: 0.0010 },
      tokens: { input: 3200, output: 890, cached: 1800 },
      model: "gemini-3-flash",
    },
  },
  {
    desc: "Gerar relatório CVM 175 — Março 2026",
    agent: "Reporting+Compliance",
    subAgents: 6,
    depth: 3,
    time: "11.7s",
    status: "success",
    cost: {
      total: 0.1432,
      breakdown: { llm: 0.1048, embedding: 0.0231, vector: 0.0098, infra: 0.0055 },
      tokens: { input: 24800, output: 6720, cached: 14200 },
      model: "gemini-3-flash",
    },
  },
];

const totalCost = taskHistory.reduce((s, t) => s + t.cost.total, 0);
const totalTokensIn = taskHistory.reduce((s, t) => s + t.cost.tokens.input, 0);
const totalTokensOut = taskHistory.reduce((s, t) => s + t.cost.tokens.output, 0);
const totalCached = taskHistory.reduce((s, t) => s + t.cost.tokens.cached, 0);
const cacheRatio = totalCached / totalTokensIn;

// ── Tree node component ───────────────────────────────────────────────────────
type TreeNode = {
  label: string;
  meta?: string;
  result?: string;
  color: string;
  children?: TreeNode[];
  isResult?: boolean;
};

function TreeNodeRow({
  node,
  depth = 0,
}: {
  node: TreeNode;
  depth?: number;
  isLast?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ fontFamily: "var(--font-mono)" }}>
      <div
        className="flex items-start gap-2 py-1 px-2 rounded-sm cursor-pointer hover:bg-white/5 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        <span
          style={{
            display: "inline-block",
            width: 3,
            minWidth: 3,
            height: 18,
            borderRadius: 1,
            background: node.color,
            marginTop: 2,
            boxShadow: `0 0 6px ${node.color}80`,
          }}
        />
        {hasChildren ? (
          <span style={{ color: node.color, fontSize: "0.75rem", marginTop: 2, minWidth: 10 }}>
            {open ? "▼" : "▶"}
          </span>
        ) : (
          <span style={{ minWidth: 10, display: "inline-block" }} />
        )}
        <span style={{ color: node.color, fontWeight: 600, fontSize: "0.8125rem" }}>
          {node.label}
        </span>
        {node.meta && (
          <span style={{ color: "var(--text-3)", fontSize: "0.75rem", marginTop: 1 }}>
            [{node.meta}]
          </span>
        )}
        {node.result && (
          <>
            <span style={{ color: "var(--text-4)", fontSize: "0.75rem", marginTop: 1 }}>→</span>
            <span
              style={{
                color: node.isResult ? node.color : "var(--text-2)",
                fontSize: "0.75rem",
                marginTop: 1,
                fontStyle: node.isResult ? "italic" : "normal",
              }}
            >
              {node.result}
            </span>
          </>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNodeRow
              key={i}
              node={child}
              depth={depth + 1}
              isLast={i === node.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Árvore de execução ────────────────────────────────────────────────────────
const executionTree: TreeNode = {
  label: 'Tarefa: "Onboard cedente CNPJ 34.567.890/0001-22"',
  meta: "7.2s • $0.0847",
  color: "var(--text-1)",
  children: [
    {
      label: "Agente:DD",
      meta: "profundidade=1, 3.1s, $0.038",
      color: "var(--accent)",
      children: [
        { label: "Sub:ReceitaFederal", meta: "prof=2, 0.8s", result: "CNAE 6613-4, ativa", color: "var(--accent)" },
        { label: "Sub:SerasaScore", meta: "prof=2, 1.2s", result: "Score 847", color: "var(--accent)" },
        { label: "Sub:PEPCheck", meta: "prof=2, 0.6s", result: "0 matches", color: "var(--accent)" },
        { label: "Resultado", result: "Score 91/100 (baixo risco)", color: "var(--accent)", isResult: true },
      ],
    },
    {
      label: "Agente:Compliance",
      meta: "profundidade=1, 2.4s, $0.029",
      color: "var(--cyan)",
      children: [
        { label: "Portão:Elegibilidade", meta: "0.1s", result: "✓ APROVADO", color: "var(--cyan)" },
        { label: "Portão:Concentração", meta: "0.1s", result: "✓ APROVADO", color: "var(--cyan)" },
        { label: "Portão:Covenant", meta: "0.2s", result: "✓ APROVADO", color: "var(--cyan)" },
        { label: "Portão:PLD/AML", meta: "0.8s", result: "✓ APROVADO", color: "var(--cyan)" },
        { label: "Portão:Compliance", meta: "0.1s", result: "✓ APROVADO", color: "var(--cyan)" },
        { label: "Portão:Risco", meta: "0.3s", result: "✓ APROVADO", color: "var(--cyan)" },
        { label: "Resultado", result: "6/6 APROVADO — LIBERADO", color: "var(--cyan)", isResult: true },
      ],
    },
    {
      label: "Agente:KG",
      meta: "profundidade=1, 1.7s, $0.018",
      color: "#f59e0b",
      children: [
        { label: "Entidades", result: "28 extraídas", color: "#f59e0b" },
        { label: "Arestas", result: "54 mapeadas", color: "#f59e0b" },
        { label: "Resultado", result: "Grafo de conhecimento atualizado", color: "#f59e0b", isResult: true },
      ],
    },
  ],
};

// ── Gráfico de throughput ─────────────────────────────────────────────────────
function ThroughputChart() {
  const W = 800;
  const H = 130;
  const pad = { l: 36, r: 16, t: 12, b: 28 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const points = throughputData.map((v, i) => ({
    x: pad.l + (i / (throughputData.length - 1)) * chartW,
    y: pad.t + chartH - (v / maxThroughput) * chartH,
    v,
  }));

  const linePath = "M " + points.map((p) => `${p.x},${p.y}`).join(" L ");
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x},${pad.t + chartH} L ${points[0].x},${pad.t + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
      <defs>
        <linearGradient id="throughput-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad.l}
          x2={W - pad.r}
          y1={pad.t + chartH * (1 - f)}
          y2={pad.t + chartH * (1 - f)}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      <path d={areaPath} fill="url(#throughput-grad)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={points[peakHour].x}
        cy={points[peakHour].y}
        r={5}
        fill="var(--accent)"
        style={{ filter: "drop-shadow(0 0 6px var(--accent))" }}
      />
      <text
        x={points[peakHour].x}
        y={points[peakHour].y - 10}
        textAnchor="middle"
        fontSize={10}
        fill="var(--accent)"
        fontFamily="var(--font-mono)"
        fontWeight={600}
      >
        {maxThroughput}/h
      </text>
      {[0, 6, 12, 18, 23].map((h) => (
        <text
          key={h}
          x={points[h].x}
          y={H - 6}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-4)"
          fontFamily="var(--font-mono)"
        >
          {String(h).padStart(2, "0")}h
        </text>
      ))}
    </svg>
  );
}

// ── Custo breakdown mini-bar ──────────────────────────────────────────────────
function CostBreakdownBar({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const colors: Record<string, string> = {
    llm: "var(--accent)",
    embedding: "var(--cyan)",
    vector: "#f59e0b",
    infra: "var(--text-4)",
  };
  const labels: Record<string, string> = {
    llm: "LLM",
    embedding: "Embedding",
    vector: "Vector",
    infra: "Infra",
  };

  return (
    <div>
      {/* Bar */}
      <div className="flex" style={{ height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
        {Object.entries(breakdown).map(([k, v]) => (
          <div
            key={k}
            style={{
              width: `${(v / total) * 100}%`,
              background: colors[k] || "var(--text-4)",
            }}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(breakdown).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: 1,
                background: colors[k],
              }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>
              {labels[k]}: ${v.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="tag-badge">PIPELINE</span>
            <span className="tag-badge-cyan">MOTOR RECURSIVO</span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text-1)",
              letterSpacing: "-0.03em",
            }}
          >
            Pipeline de Execução
          </h1>
          <p className="section-help" style={{ marginTop: 4 }}>
            Fluxo de tarefas em tempo real com spawning recursivo de agentes e rastreamento de custos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <span style={{ color: "var(--accent)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
            AO VIVO
          </span>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "TAREFAS HOJE", value: "312", unit: "" },
          { label: "PROF. MÉDIA", value: "2.3", unit: "níveis" },
          { label: "PROF. MÁXIMA", value: "6", unit: "níveis" },
          { label: "TEMPO MÉDIO", value: "4.7", unit: "s" },
          { label: "TAXA SUCESSO", value: "98.3", unit: "%" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3">
            <div className="mono-label" style={{ marginBottom: 4, fontSize: "0.75rem" }}>
              {s.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{
                  color: "var(--accent)",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </span>
              {s.unit && (
                <span style={{ color: "var(--text-3)", fontSize: "0.8125rem" }}>{s.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custos Acumulados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="mono-label">CUSTO TOTAL (HOJE)</div>
          <div className="stat-value" style={{ color: "var(--accent)" }}>
            ${totalCost.toFixed(4)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>
            312 tarefas executadas
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="mono-label">TOKENS PROCESSADOS</div>
          <div className="stat-value" style={{ color: "var(--text-1)" }}>
            {((totalTokensIn + totalTokensOut) / 1000).toFixed(1)}K
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>
            {(totalTokensIn / 1000).toFixed(1)}K entrada • {(totalTokensOut / 1000).toFixed(1)}K saída
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="mono-label">TAXA DE CACHE</div>
          <div className="stat-value" style={{ color: "var(--cyan)" }}>
            {(cacheRatio * 100).toFixed(1)}%
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>
            {(totalCached / 1000).toFixed(1)}K tokens cacheados
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="mono-label">CUSTO / TAREFA</div>
          <div className="stat-value" style={{ color: "var(--text-1)" }}>
            ${(totalCost / taskHistory.length).toFixed(4)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>
            Média por execução
          </div>
        </div>
      </div>

      {/* Pipeline 5 Estágios */}
      <div className="glass-card p-5">
        <h2 className="mono-label" style={{ marginBottom: 20 }}>
          PIPELINE DE 5 ESTÁGIOS
        </h2>
        <div className="flex flex-col md:flex-row items-stretch gap-0">
          {stages.map((stage, i) => (
            <div key={stage.num} className="flex md:flex-col items-center flex-1">
              <div
                style={{
                  background: "var(--bg)",
                  border: `1px solid ${stage.color}40`,
                  borderRadius: "var(--radius)",
                  padding: "14px 12px",
                  flex: 1,
                  width: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: stage.color,
                    boxShadow: `0 0 8px ${stage.color}`,
                  }}
                />
                <div style={{ color: stage.color, fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                  {stage.num}
                </div>
                <div
                  style={{
                    color: stage.color,
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {stage.name}
                </div>
                <div style={{ color: "var(--text-3)", fontSize: "0.8125rem", lineHeight: 1.5, marginBottom: 12 }}>
                  {stage.desc}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div style={{ color: "var(--text-4)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                      Latência
                    </div>
                    <div style={{ color: stage.color, fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                      {stage.latency}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "var(--text-4)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                      Fila
                    </div>
                    <div style={{ color: "var(--text-2)", fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                      {stage.queue}
                    </div>
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div
                  className="flex items-center justify-center"
                  style={{ width: 28, minWidth: 28, height: 28, minHeight: 28, color: "var(--accent)", fontSize: 16, opacity: 0.5 }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Árvore de Execução Recursiva */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mono-label" style={{ margin: 0 }}>
            ÁRVORE DE EXECUÇÃO RECURSIVA
          </h2>
          <div className="flex items-center gap-4">
            {[
              { label: "Completo", color: "var(--accent)" },
              { label: "Em andamento", color: "var(--cyan)" },
              { label: "Alerta", color: "#f59e0b" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: 12,
                    background: l.color,
                    borderRadius: 1,
                    boxShadow: `0 0 4px ${l.color}`,
                  }}
                />
                <span style={{ color: "var(--text-3)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "12px 4px",
          }}
        >
          <TreeNodeRow node={executionTree} />
        </div>
      </div>

      {/* Gráfico de Throughput */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="mono-label" style={{ margin: 0 }}>
            THROUGHPUT — ÚLTIMAS 24H
          </h2>
          <span className="tag-badge">TAREFAS / HORA</span>
        </div>
        <ThroughputChart />
      </div>

      {/* Execuções Recentes com Custos */}
      <div className="glass-card p-5">
        <h2 className="mono-label" style={{ marginBottom: 16 }}>
          EXECUÇÕES RECENTES — CUSTO DETALHADO
        </h2>

        <div className="space-y-2">
          {taskHistory.map((t, i) => (
            <div key={i}>
              {/* Linha principal */}
              <div
                onClick={() => setExpandedTask(expandedTask === i ? null : i)}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: expandedTask === i ? "var(--radius) var(--radius) 0 0" : "var(--radius)",
                  padding: "12px 16px",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                className="hover:border-[var(--accent)]"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  {/* Descrição */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--text-1)",
                        fontSize: "0.875rem",
                        fontFamily: "var(--font-mono)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.desc}
                    </div>
                    <div style={{ color: "var(--text-4)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {t.agent} • {t.subAgents} sub-agentes • prof. {t.depth}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "var(--text-4)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                        TEMPO
                      </div>
                      <div style={{ color: "var(--accent)", fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {t.time}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "var(--text-4)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                        CUSTO
                      </div>
                      <div style={{ color: "var(--cyan)", fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        ${t.cost.total.toFixed(4)}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "var(--text-4)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                        TOKENS
                      </div>
                      <div style={{ color: "var(--text-2)", fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {((t.cost.tokens.input + t.cost.tokens.output) / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <div>
                      {t.status === "success" ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            background: "rgba(0,255,128,0.1)",
                            color: "var(--accent)",
                            border: "1px solid rgba(0,255,128,0.3)",
                            borderRadius: "var(--radius)",
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          ✓ OK
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            background: "rgba(245,158,11,0.1)",
                            color: "#f59e0b",
                            border: "1px solid rgba(245,158,11,0.3)",
                            borderRadius: "var(--radius)",
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          ⚠ ALERTA
                        </span>
                      )}
                    </div>
                    <span style={{ color: "var(--text-4)", fontSize: "0.75rem" }}>
                      {expandedTask === i ? "▼" : "▶"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalhes expandidos */}
              {expandedTask === i && (
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderTop: "none",
                    borderRadius: "0 0 var(--radius) var(--radius)",
                    padding: "16px",
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Breakdown de Custo */}
                    <div>
                      <div className="mono-label" style={{ marginBottom: 8 }}>
                        BREAKDOWN DE CUSTO
                      </div>
                      <CostBreakdownBar breakdown={t.cost.breakdown} />
                    </div>

                    {/* Tokens */}
                    <div>
                      <div className="mono-label" style={{ marginBottom: 8 }}>
                        TOKENS
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          <span style={{ color: "var(--text-3)" }}>Entrada</span>
                          <span style={{ color: "var(--text-1)" }}>{t.cost.tokens.input.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          <span style={{ color: "var(--text-3)" }}>Saída</span>
                          <span style={{ color: "var(--text-1)" }}>{t.cost.tokens.output.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          <span style={{ color: "var(--cyan)" }}>Cacheados</span>
                          <span style={{ color: "var(--cyan)" }}>{t.cost.tokens.cached.toLocaleString()}</span>
                        </div>
                        <div
                          style={{
                            borderTop: "1px solid var(--border)",
                            paddingTop: 6,
                          }}
                          className="flex justify-between"
                        >
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-3)" }}>
                            Taxa cache
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 600 }}>
                            {((t.cost.tokens.cached / t.cost.tokens.input) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Modelo */}
                    <div>
                      <div className="mono-label" style={{ marginBottom: 8 }}>
                        DETALHES
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          <span style={{ color: "var(--text-3)" }}>Modelo</span>
                          <span style={{ color: "var(--cyan)" }}>{t.cost.model}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          <span style={{ color: "var(--text-3)" }}>Sub-agentes</span>
                          <span style={{ color: "var(--text-1)" }}>{t.subAgents}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          <span style={{ color: "var(--text-3)" }}>Profundidade</span>
                          <span style={{ color: "var(--text-1)" }}>{t.depth}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          <span style={{ color: "var(--text-3)" }}>Custo/token</span>
                          <span style={{ color: "var(--text-1)" }}>
                            ${(t.cost.total / (t.cost.tokens.input + t.cost.tokens.output) * 1000).toFixed(4)}/1K
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
