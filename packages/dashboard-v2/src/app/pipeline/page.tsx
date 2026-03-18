"use client";

import { useState } from "react";

// ── Throughput data (24h, one per hour) ──────────────────────────────────────
const throughputData = [
  12, 18, 9, 6, 4, 7, 14, 28, 41, 56, 72, 89,
  94, 88, 76, 83, 97, 78, 65, 54, 48, 39, 27, 19,
];
const maxThroughput = Math.max(...throughputData);
const peakHour = throughputData.indexOf(maxThroughput);

// ── Pipeline stages ───────────────────────────────────────────────────────────
const stages = [
  {
    num: "01",
    name: "CLASSIFY",
    desc: "Intent detection & task typing via LLM router",
    latency: "0.3s",
    queue: 4,
    color: "var(--accent)",
  },
  {
    num: "02",
    name: "ROUTE",
    desc: "Agent selection from capability registry",
    latency: "0.1s",
    queue: 2,
    color: "var(--cyan)",
  },
  {
    num: "03",
    name: "EXECUTE",
    desc: "Recursive agent tree spawning & task execution",
    latency: "3.9s",
    queue: 11,
    color: "var(--accent)",
  },
  {
    num: "04",
    name: "GUARDRAIL",
    desc: "Multi-gate compliance & risk validation",
    latency: "0.3s",
    queue: 3,
    color: "#f59e0b",
  },
  {
    num: "05",
    name: "DELIVER",
    desc: "Result serialization & webhook dispatch",
    latency: "0.1s",
    queue: 1,
    color: "var(--accent)",
  },
];

// ── Task history ──────────────────────────────────────────────────────────────
const taskHistory = [
  {
    desc: "Onboard cedente CNPJ 34.567.890/0001-22",
    agent: "DD+Compliance+KG",
    subAgents: 9,
    depth: 2,
    time: "7.2s",
    status: "success",
  },
  {
    desc: "Avaliar recebível NF-e 2024-0043821",
    agent: "Pricing+Risk",
    subAgents: 4,
    depth: 2,
    time: "3.1s",
    status: "success",
  },
  {
    desc: "Verificar concentração cedente Top-5",
    agent: "Compliance",
    subAgents: 2,
    depth: 1,
    time: "1.4s",
    status: "success",
  },
  {
    desc: "Calcular NAV posição D+0",
    agent: "Pricing+Admin",
    subAgents: 3,
    depth: 2,
    time: "4.8s",
    status: "success",
  },
  {
    desc: "PLD/AML screen — sacado 87.654.321/0001-00",
    agent: "Compliance",
    subAgents: 2,
    depth: 2,
    time: "2.2s",
    status: "warning",
  },
  {
    desc: "Gerar relatório CVM 175 — Março 2026",
    agent: "Reporting+Compliance",
    subAgents: 6,
    depth: 3,
    time: "11.7s",
    status: "success",
  },
];

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
  isLast = false,
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
        {/* Left accent border indicator */}
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

        {/* Toggle icon */}
        {hasChildren ? (
          <span style={{ color: node.color, fontSize: 11, marginTop: 2, minWidth: 10 }}>
            {open ? "▼" : "▶"}
          </span>
        ) : (
          <span style={{ minWidth: 10, display: "inline-block" }} />
        )}

        {/* Label */}
        <span style={{ color: node.color, fontWeight: 600, fontSize: 12 }}>
          {node.label}
        </span>

        {/* Meta */}
        {node.meta && (
          <span style={{ color: "var(--text-3)", fontSize: 11, marginTop: 1 }}>
            [{node.meta}]
          </span>
        )}

        {/* Result */}
        {node.result && (
          <>
            <span style={{ color: "var(--text-4)", fontSize: 11, marginTop: 1 }}>→</span>
            <span
              style={{
                color: node.isResult ? node.color : "var(--text-2)",
                fontSize: 11,
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

// ── Execution tree data ───────────────────────────────────────────────────────
const executionTree: TreeNode = {
  label: 'Task: "Onboard cedente CNPJ 34.567.890/0001-22"',
  meta: "7.2s",
  color: "var(--text-1)",
  children: [
    {
      label: "Agent:DD",
      meta: "depth=1, 3.1s",
      color: "var(--accent)",
      children: [
        {
          label: "SubAgent:ReceitaFederal",
          meta: "depth=2, 0.8s",
          result: "CNAE 6613-4, ativa",
          color: "var(--accent)",
        },
        {
          label: "SubAgent:SerasaScore",
          meta: "depth=2, 1.2s",
          result: "Score 847",
          color: "var(--accent)",
        },
        {
          label: "SubAgent:PEPCheck",
          meta: "depth=2, 0.6s",
          result: "0 matches",
          color: "var(--accent)",
        },
        {
          label: "Result",
          result: "Score 91/100 (baixo risco)",
          color: "var(--accent)",
          isResult: true,
        },
      ],
    },
    {
      label: "Agent:Compliance",
      meta: "depth=1, 2.4s",
      color: "var(--cyan)",
      children: [
        {
          label: "Gate:Eligibility",
          meta: "0.1s",
          result: "✓ PASS",
          color: "var(--cyan)",
        },
        {
          label: "Gate:Concentration",
          meta: "0.1s",
          result: "✓ PASS",
          color: "var(--cyan)",
        },
        {
          label: "Gate:Covenant",
          meta: "0.2s",
          result: "✓ PASS",
          color: "var(--cyan)",
        },
        {
          label: "Gate:PLD/AML",
          meta: "0.8s",
          result: "✓ PASS",
          color: "var(--cyan)",
        },
        {
          label: "Gate:Compliance",
          meta: "0.1s",
          result: "✓ PASS",
          color: "var(--cyan)",
        },
        {
          label: "Gate:Risk",
          meta: "0.3s",
          result: "✓ PASS",
          color: "var(--cyan)",
        },
        {
          label: "Result",
          result: "6/6 PASS — CLEARED",
          color: "var(--cyan)",
          isResult: true,
        },
      ],
    },
    {
      label: "Agent:KG",
      meta: "depth=1, 1.7s",
      color: "#f59e0b",
      children: [
        {
          label: "Entities",
          result: "28 extracted",
          color: "#f59e0b",
        },
        {
          label: "Edges",
          result: "54 mapped",
          color: "#f59e0b",
        },
        {
          label: "Result",
          result: "Knowledge graph updated",
          color: "#f59e0b",
          isResult: true,
        },
      ],
    },
  ],
};

// ── Throughput area chart ─────────────────────────────────────────────────────
function ThroughputChart() {
  const W = 800;
  const H = 120;
  const pad = { l: 32, r: 16, t: 12, b: 24 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const points = throughputData.map((v, i) => ({
    x: pad.l + (i / (throughputData.length - 1)) * chartW,
    y: pad.t + chartH - (v / maxThroughput) * chartH,
    v,
  }));

  const linePath =
    "M " + points.map((p) => `${p.x},${p.y}`).join(" L ");
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x},${pad.t + chartH} L ${points[0].x},${pad.t + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id="throughput-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
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

      {/* Area fill */}
      <path d={areaPath} fill="url(#throughput-grad)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Peak highlight */}
      <circle
        cx={points[peakHour].x}
        cy={points[peakHour].y}
        r={4}
        fill="var(--accent)"
        style={{ filter: "drop-shadow(0 0 6px var(--accent))" }}
      />
      <text
        x={points[peakHour].x}
        y={points[peakHour].y - 8}
        textAnchor="middle"
        fontSize={9}
        fill="var(--accent)"
        fontFamily="var(--font-mono)"
      >
        {maxThroughput}/h
      </text>

      {/* Hour labels */}
      {[0, 6, 12, 18, 23].map((h) => (
        <text
          key={h}
          x={points[h].x}
          y={H - 6}
          textAnchor="middle"
          fontSize={9}
          fill="var(--text-4)"
          fontFamily="var(--font-mono)"
        >
          {String(h).padStart(2, "0")}h
        </text>
      ))}

      {/* Y label */}
      <text
        x={pad.l - 2}
        y={pad.t + chartH / 2}
        textAnchor="end"
        fontSize={8}
        fill="var(--text-4)"
        fontFamily="var(--font-mono)"
        dominantBaseline="middle"
      >
        {maxThroughput}
      </text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  return (
    <div
      className="min-h-screen p-4 md:p-6 space-y-6"
      style={{ background: "var(--bg)", fontFamily: "var(--font-display)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="tag-badge">PIPELINE</span>
            <span className="tag-badge-cyan">RECURSIVE ENGINE</span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}
          >
            Execution Pipeline
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>
            Real-time task flow with recursive agent spawning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="pulse-dot"
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
            }}
          />
          <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Tasks Today", value: "312", unit: "" },
          { label: "Avg Depth", value: "2.3", unit: "levels" },
          { label: "Max Depth", value: "6", unit: "levels" },
          { label: "Avg Exec Time", value: "4.7", unit: "s" },
          { label: "Success Rate", value: "98.3", unit: "%" },
        ].map((s) => (
          <div
            key={s.label}
            className="glass-card p-3"
            style={{ borderRadius: "var(--radius)" }}
          >
            <div
              style={{
                color: "var(--text-4)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{
                  color: "var(--accent)",
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </span>
              {s.unit && (
                <span style={{ color: "var(--text-3)", fontSize: 11 }}>{s.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 5-Stage Pipeline Visual */}
      <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
        <h2
          style={{
            color: "var(--text-1)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 20,
            fontFamily: "var(--font-mono)",
          }}
        >
          5-Stage Execution Pipeline
        </h2>

        <div className="flex flex-col md:flex-row items-stretch gap-0">
          {stages.map((stage, i) => (
            <div key={stage.num} className="flex md:flex-col items-center flex-1">
              {/* Stage card */}
              <div
                style={{
                  background: "var(--bg)",
                  border: `1px solid ${stage.color}40`,
                  borderRadius: "var(--radius)",
                  padding: "12px 10px",
                  flex: 1,
                  width: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Glow top bar */}
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
                <div
                  style={{
                    color: stage.color,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    marginBottom: 4,
                  }}
                >
                  {stage.num}
                </div>
                <div
                  style={{
                    color: stage.color,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {stage.name}
                </div>
                <div
                  style={{
                    color: "var(--text-3)",
                    fontSize: 11,
                    lineHeight: 1.4,
                    marginBottom: 10,
                  }}
                >
                  {stage.desc}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div
                      style={{
                        color: "var(--text-4)",
                        fontSize: 9,
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                      }}
                    >
                      Latency
                    </div>
                    <div
                      style={{
                        color: stage.color,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {stage.latency}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        color: "var(--text-4)",
                        fontSize: 9,
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                      }}
                    >
                      Queue
                    </div>
                    <div
                      style={{
                        color: "var(--text-2)",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {stage.queue}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector arrow */}
              {i < stages.length - 1 && (
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 28,
                    minWidth: 28,
                    height: 28,
                    minHeight: 28,
                    flexShrink: 0,
                    color: "var(--accent)",
                    fontSize: 16,
                    opacity: 0.5,
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recursive Execution Tree */}
      <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              color: "var(--text-1)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            Recursive Execution Tree
          </h2>
          <div className="flex items-center gap-4">
            {[
              { label: "Complete", color: "var(--accent)" },
              { label: "In-progress", color: "var(--cyan)" },
              { label: "Warning", color: "#f59e0b" },
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
                <span
                  style={{
                    color: "var(--text-3)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                >
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

      {/* Throughput Chart */}
      <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2
            style={{
              color: "var(--text-1)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            Throughput — Last 24h
          </h2>
          <span className="tag-badge">TASKS / HOUR</span>
        </div>
        <ThroughputChart />
      </div>

      {/* Task History */}
      <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
        <h2
          style={{
            color: "var(--text-1)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            marginBottom: 16,
          }}
        >
          Recent Executions
        </h2>

        <div className="space-y-2">
          {taskHistory.map((t, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "10px 14px",
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  color: "var(--text-2)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.desc}
              </div>
              <div style={{ color: "var(--text-3)", fontSize: 11, whiteSpace: "nowrap" }}>
                {t.agent}
              </div>
              <div
                style={{
                  color: "var(--text-4)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                }}
              >
                {t.subAgents} sub-agents
              </div>
              <div
                style={{
                  color: "var(--text-3)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                }}
              >
                depth {t.depth}
              </div>
              <div
                style={{
                  color: "var(--accent)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {t.time}
              </div>
              <div>
                {t.status === "success" ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      background: "rgba(0,255,128,0.1)",
                      color: "var(--accent)",
                      border: "1px solid rgba(0,255,128,0.3)",
                      borderRadius: "var(--radius)",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ✓ OK
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      background: "rgba(245,158,11,0.1)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: "var(--radius)",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ⚠ WARN
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
