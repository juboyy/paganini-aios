"use client";

import { useState } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type FlowNode = {
  name: string;
  agent: string;
  time: string;
  status: "ok" | "warn" | "pending";
};

type Flow = {
  name: string;
  color: string;
  colorVar: string;
  nodes: FlowNode[];
};

// ── Fluxos de orquestração ───────────────────────────────────────────────────
const flows: Flow[] = [
  {
    name: "COMPRA",
    color: "#00ff80",
    colorVar: "var(--accent)",
    nodes: [
      { name: "Envio Cedente", agent: "API Gateway", time: "0.1s", status: "ok" },
      { name: "Pontuação DD", agent: "Agente DD", time: "3.1s", status: "ok" },
      { name: "6 Guardrails", agent: "Compliance", time: "1.8s", status: "ok" },
      { name: "Pricing", agent: "Agente Pricing", time: "0.6s", status: "ok" },
      { name: "Admin", agent: "Agente Admin", time: "0.4s", status: "ok" },
      { name: "Custódia", agent: "Agente Custódia", time: "0.2s", status: "ok" },
    ],
  },
  {
    name: "RELATÓRIO",
    color: "#00ffff",
    colorVar: "var(--cyan)",
    nodes: [
      { name: "NAV Admin", agent: "Agente Admin", time: "0.3s", status: "ok" },
      { name: "PDD Pricing", agent: "Agente Pricing", time: "1.2s", status: "ok" },
      { name: "Status Compliance", agent: "Compliance", time: "0.8s", status: "ok" },
      { name: "Compilação Relatório", agent: "Agente Relatório", time: "2.4s", status: "ok" },
      { name: "Distribuição IR", agent: "Agente IR", time: "0.5s", status: "ok" },
    ],
  },
  {
    name: "ONBOARD",
    color: "#f59e0b",
    colorVar: "#f59e0b",
    nodes: [
      { name: "Análise DD", agent: "Agente DD", time: "3.1s", status: "ok" },
      { name: "Triagem PLD/AML", agent: "Compliance", time: "0.8s", status: "ok" },
      { name: "Classificação Risco", agent: "Agente Risco", time: "1.1s", status: "ok" },
      { name: "Registro Admin", agent: "Agente Admin", time: "0.3s", status: "ok" },
    ],
  },
];

// ── Nomes dos agentes para matriz de delegação ────────────────────────────────
const agents = ["DD", "Compliance", "Pricing", "Risco", "Admin", "Custódia", "Relatório", "IR", "KG"];

// Pares de delegação [de, para, motivo]
const delegations: [number, number, string][] = [
  [0, 1, "DD → Compliance: envia pontuação para validação no gate"],
  [0, 8, "DD → KG: extrai entidades para o grafo de conhecimento"],
  [1, 4, "Compliance → Admin: cedente liberado para registro"],
  [2, 3, "Pricing → Risco: solicita classificação de risco para PDD"],
  [3, 2, "Risco → Pricing: retorna fator de risco para curva"],
  [4, 5, "Admin → Custódia: aciona registro de custódia"],
  [4, 7, "Admin → IR: envia requisição de distribuição ao investidor"],
  [6, 2, "Relatório → Pricing: solicita cálculo de provisão PDD"],
  [6, 1, "Relatório → Compliance: solicita status de compliance"],
  [7, 4, "IR → Admin: confirma execução da distribuição"],
  [0, 1, ""],
  [1, 0, "Compliance → DD: solicita nova execução por flag"],
  [2, 4, "Pricing → Admin: envia resultado do cálculo de NAV"],
  [5, 4, "Custódia → Admin: confirma status de custódia"],
];

const delegationSet = new Set(delegations.map(([f, t]) => `${f}-${t}`));
const delegationReason: Record<string, string> = {};
delegations.forEach(([f, t, r]) => {
  if (r) delegationReason[`${f}-${t}`] = r;
});

// ── Linha do tempo de orquestração ────────────────────────────────────────────
const timeline = [
  {
    flow: "COMPRA",
    color: "#00ff80",
    badge: "tag-badge",
    agents: [0, 1, 2, 3, 4, 5],
    duration: "6.2s",
    status: "ok",
    detail: "DD(3.1s) → Compliance(1.8s) → Pricing(0.6s) → Admin(0.4s) → Custódia(0.2s)",
  },
  {
    flow: "RELATÓRIO",
    color: "#00ffff",
    badge: "tag-badge-cyan",
    agents: [4, 2, 1, 6, 7],
    duration: "5.2s",
    status: "ok",
    detail: "Admin(0.3s) → Pricing(1.2s) → Compliance(0.8s) → Relatório(2.4s) → IR(0.5s)",
  },
  {
    flow: "ONBOARD",
    color: "#f59e0b",
    badge: "",
    agents: [0, 1, 3, 4],
    duration: "5.3s",
    status: "ok",
    detail: "DD(3.1s) → Compliance(0.8s) → Risco(1.1s) → Admin(0.3s)",
  },
  {
    flow: "COMPRA",
    color: "#00ff80",
    badge: "tag-badge",
    agents: [0, 1, 2, 3, 4, 5],
    duration: "5.9s",
    status: "ok",
    detail: "DD(2.8s) → Compliance(1.7s) → Pricing(0.7s) → Admin(0.4s) → Custódia(0.2s)",
  },
  {
    flow: "ONBOARD",
    color: "#f59e0b",
    badge: "",
    agents: [0, 1, 3, 4],
    duration: "6.1s",
    status: "warn",
    detail: "DD(3.4s) → Compliance(1.2s) ⚠ flag PLD → Risco(1.1s) → Admin(0.4s)",
  },
  {
    flow: "RELATÓRIO",
    color: "#00ffff",
    badge: "tag-badge-cyan",
    agents: [4, 2, 1, 6, 7],
    duration: "4.9s",
    status: "ok",
    detail: "Admin(0.2s) → Pricing(1.1s) → Compliance(0.7s) → Relatório(2.3s) → IR(0.6s)",
  },
];

// ── Dados do mapa de calor de colaboração ─────────────────────────────────────
type CollabPair = { a: number; b: number; freq: number; label: string };
const collabPairs: CollabPair[] = [
  { a: 0, b: 1, freq: 312, label: "DD ↔ Compliance" },
  { a: 2, b: 3, freq: 289, label: "Pricing ↔ Risco" },
  { a: 4, b: 5, freq: 264, label: "Admin ↔ Custódia" },
  { a: 6, b: 1, freq: 187, label: "Relatório ↔ Compliance" },
  { a: 0, b: 8, freq: 156, label: "DD ↔ KG" },
  { a: 7, b: 4, freq: 134, label: "IR ↔ Admin" },
  { a: 2, b: 4, freq: 118, label: "Pricing ↔ Admin" },
];
const maxFreq = Math.max(...collabPairs.map((p) => p.freq));

const agentColors = [
  "var(--accent)",
  "var(--cyan)",
  "var(--accent)",
  "#f59e0b",
  "var(--accent)",
  "var(--cyan)",
  "var(--accent)",
  "var(--cyan)",
  "#f59e0b",
];

// ── Mapa de Calor de Colaboração SVG ─────────────────────────────────────────
function CollabHeatmap() {
  const W = 520;
  const H = 260;
  const cx = W / 2;
  const cy = H / 2;
  const R = 100;

  const agentPos = agents.map((_, i) => {
    const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + R * Math.cos(angle),
      y: cy + R * Math.sin(angle),
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
      <defs>
        {collabPairs.slice(0, 3).map((pair, i) => (
          <linearGradient
            key={i}
            id={`collab-grad-${i}`}
            x1={agentPos[pair.a].x}
            y1={agentPos[pair.a].y}
            x2={agentPos[pair.b].x}
            y2={agentPos[pair.b].y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={agentColors[pair.a]} stopOpacity="0.9" />
            <stop offset="100%" stopColor={agentColors[pair.b]} stopOpacity="0.9" />
          </linearGradient>
        ))}
      </defs>

      {/* Linhas de conexão */}
      {collabPairs.map((pair, i) => {
        const strokeW = 1 + (pair.freq / maxFreq) * 6;
        const isTop3 = i < 3;
        return (
          <line
            key={i}
            x1={agentPos[pair.a].x}
            y1={agentPos[pair.a].y}
            x2={agentPos[pair.b].x}
            y2={agentPos[pair.b].y}
            stroke={isTop3 ? `url(#collab-grad-${i})` : "var(--border)"}
            strokeWidth={strokeW}
            strokeOpacity={isTop3 ? 0.9 : 0.4}
            style={isTop3 ? { filter: `drop-shadow(0 0 3px ${agentColors[pair.a]}60)` } : {}}
          />
        );
      })}

      {/* Nós */}
      {agents.map((name, i) => (
        <g key={name}>
          <circle
            cx={agentPos[i].x}
            cy={agentPos[i].y}
            r={16}
            fill="var(--bg-card)"
            stroke={agentColors[i]}
            strokeWidth={1.5}
            style={{ filter: `drop-shadow(0 0 4px ${agentColors[i]}60)` }}
          />
          <text
            x={agentPos[i].x}
            y={agentPos[i].y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fontWeight={700}
            fill={agentColors[i]}
            fontFamily="var(--font-mono)"
          >
            {name}
          </text>
        </g>
      ))}

      {/* Rótulos dos top 3 */}
      {collabPairs.slice(0, 3).map((pair, i) => {
        const mx = (agentPos[pair.a].x + agentPos[pair.b].x) / 2;
        const my = (agentPos[pair.a].y + agentPos[pair.b].y) / 2;
        return (
          <g key={i}>
            <rect
              x={mx - 32}
              y={my - 9}
              width={64}
              height={16}
              fill="var(--bg)"
              rx={1}
              opacity={0.85}
            />
            <text
              x={mx}
              y={my}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7.5}
              fill="var(--text-2)"
              fontFamily="var(--font-mono)"
            >
              #{i + 1} · {pair.freq}×
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function SymphonyPage() {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen p-4 md:p-6 space-y-6"
      style={{ background: "var(--bg)", fontFamily: "var(--font-display)" }}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="tag-badge">SYMPHONY</span>
            <span className="tag-badge-cyan">ORQUESTRA DE AGENTES</span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}
          >
            Orquestração Multi-Agente
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>
            Fluxos de delegação, padrões de coordenação e mapas de calor de colaboração
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
            AO VIVO
          </span>
        </div>
      </div>

      {/* 3 Fluxos de Orquestração */}
      <div className="space-y-4">
        {flows.map((flow) => (
          <div
            key={flow.name}
            className="glass-card p-4"
            style={{ borderRadius: "var(--radius)", borderColor: `${flow.color}20` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  background: `${flow.color}14`,
                  color: flow.color,
                  border: `1px solid ${flow.color}40`,
                  borderRadius: "var(--radius)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                FLUXO {flow.name}
              </span>
              <div
                style={{
                  height: 1,
                  flex: 1,
                  background: `linear-gradient(90deg, ${flow.color}40, transparent)`,
                }}
              />
            </div>

            {/* Nós do fluxo */}
            <div className="flex flex-wrap items-center gap-1">
              {flow.nodes.map((node, ni) => (
                <div key={ni} className="flex items-center gap-1">
                  {/* Card do nó */}
                  <div
                    style={{
                      background: "var(--bg)",
                      border: `1px solid ${flow.color}30`,
                      borderRadius: "var(--radius)",
                      padding: "8px 12px",
                      position: "relative",
                    }}
                  >
                    {/* Ponto de status */}
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          node.status === "ok"
                            ? flow.color
                            : node.status === "warn"
                            ? "#f59e0b"
                            : "var(--text-4)",
                        boxShadow:
                          node.status === "ok"
                            ? `0 0 4px ${flow.color}`
                            : undefined,
                      }}
                    />
                    <div
                      style={{
                        color: flow.color,
                        fontSize: 11,
                        fontWeight: 600,
                        marginBottom: 2,
                      }}
                    >
                      {node.name}
                    </div>
                    <div
                      style={{
                        color: "var(--text-3)",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {node.agent}
                    </div>
                    <div
                      style={{
                        color: "var(--text-4)",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        marginTop: 2,
                      }}
                    >
                      {node.time}
                    </div>
                  </div>

                  {/* Seta */}
                  {ni < flow.nodes.length - 1 && (
                    <span
                      style={{
                        color: flow.color,
                        fontSize: 14,
                        opacity: 0.4,
                        flexShrink: 0,
                      }}
                    >
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Matriz de Delegação + Mapa de Calor de Colaboração */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Matriz de Delegação */}
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <h2
            style={{
              color: "var(--text-1)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
              marginBottom: 12,
            }}
          >
            Matriz de Delegação
          </h2>
          <p style={{ color: "var(--text-4)", fontSize: 11, marginBottom: 12 }}>
            Passe o mouse sobre as células para ver o motivo da delegação
          </p>

          {/* Tooltip */}
          {hoveredCell && (
            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius)",
                padding: "6px 10px",
                marginBottom: 8,
                fontSize: 11,
                color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {hoveredCell}
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      width: 32,
                      height: 28,
                      fontSize: 9,
                      color: "var(--text-4)",
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                      paddingRight: 6,
                    }}
                  >
                    DE→
                  </th>
                  {agents.map((a) => (
                    <th
                      key={a}
                      style={{
                        width: 34,
                        fontSize: 8,
                        color: "var(--text-3)",
                        fontFamily: "var(--font-mono)",
                        textAlign: "center",
                        paddingBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      {a.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((fromAgent, fi) => (
                  <tr key={fromAgent}>
                    <td
                      style={{
                        fontSize: 8,
                        color: "var(--text-3)",
                        fontFamily: "var(--font-mono)",
                        textAlign: "right",
                        paddingRight: 6,
                        paddingTop: 2,
                        fontWeight: 600,
                      }}
                    >
                      {fromAgent.slice(0, 3)}
                    </td>
                    {agents.map((_, ti) => {
                      const key = `${fi}-${ti}`;
                      const hasDelegation = delegationSet.has(key);
                      const isSelf = fi === ti;
                      return (
                        <td key={ti} style={{ padding: 2 }}>
                          <div
                            onMouseEnter={() =>
                              hasDelegation &&
                              setHoveredCell(delegationReason[key] || `${fromAgent} → ${agents[ti]}`)
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "var(--radius)",
                              background: isSelf
                                ? "rgba(255,255,255,0.03)"
                                : hasDelegation
                                ? "rgba(0,255,128,0.12)"
                                : "var(--bg)",
                              border: hasDelegation
                                ? "1px solid rgba(0,255,128,0.35)"
                                : "1px solid var(--border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: hasDelegation ? "pointer" : "default",
                              transition: "background 0.15s",
                              fontSize: 10,
                              color: "var(--accent)",
                            }}
                          >
                            {isSelf ? (
                              <span style={{ color: "var(--text-4)", fontSize: 8 }}>—</span>
                            ) : hasDelegation ? (
                              "→"
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mapa de Calor de Colaboração */}
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <h2
            style={{
              color: "var(--text-1)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
              marginBottom: 4,
            }}
          >
            Grafo de Colaboração entre Agentes
          </h2>
          <p style={{ color: "var(--text-4)", fontSize: 11, marginBottom: 12 }}>
            Espessura da linha = frequência. Top 3 pares em destaque.
          </p>
          <CollabHeatmap />

          {/* Legenda */}
          <div className="flex flex-col gap-1 mt-2">
            {collabPairs.slice(0, 3).map((pair, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 6px",
                      background: "rgba(0,255,128,0.08)",
                      color: "var(--accent)",
                      border: "1px solid rgba(0,255,128,0.2)",
                      borderRadius: "var(--radius)",
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span style={{ color: "var(--text-2)", fontSize: 11 }}>{pair.label}</span>
                </div>
                <span
                  style={{
                    color: "var(--accent)",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                  }}
                >
                  {pair.freq}×
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Linha do Tempo de Orquestração */}
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
          Linha do Tempo de Orquestração
        </h2>

        <div className="space-y-2">
          {timeline.map((row, i) => (
            <div key={i}>
              <div
                className="flex items-center gap-4"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "10px 14px",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                  borderColor: expandedRow === i ? `${row.color}40` : "var(--border)",
                }}
                onClick={() => setExpandedRow(expandedRow === i ? null : i)}
              >
                {/* Badge do fluxo */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    background: `${row.color}14`,
                    color: row.color,
                    border: `1px solid ${row.color}40`,
                    borderRadius: "var(--radius)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    minWidth: 80,
                    textAlign: "center",
                  }}
                >
                  {row.flow}
                </span>

                {/* Pontos dos agentes */}
                <div className="flex items-center gap-1 flex-1">
                  {row.agents.map((ai) => (
                    <div
                      key={ai}
                      title={agents[ai]}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--bg-card)",
                        border: `1px solid ${agentColors[ai]}60`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 7,
                        fontFamily: "var(--font-mono)",
                        color: agentColors[ai],
                        fontWeight: 700,
                      }}
                    >
                      {agents[ai].slice(0, 2)}
                    </div>
                  ))}
                </div>

                {/* Duração */}
                <span
                  style={{
                    color: "var(--accent)",
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    minWidth: 48,
                    textAlign: "right",
                  }}
                >
                  {row.duration}
                </span>

                {/* Status */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    background:
                      row.status === "ok"
                        ? "rgba(0,255,128,0.1)"
                        : "rgba(245,158,11,0.1)",
                    color: row.status === "ok" ? "var(--accent)" : "#f59e0b",
                    border: `1px solid ${row.status === "ok" ? "rgba(0,255,128,0.3)" : "rgba(245,158,11,0.3)"}`,
                    borderRadius: "var(--radius)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    minWidth: 60,
                    textAlign: "center",
                  }}
                >
                  {row.status === "ok" ? "✓ OK" : "⚠ ALERTA"}
                </span>

                {/* Indicador de expansão */}
                <span
                  style={{
                    color: "var(--text-4)",
                    fontSize: 11,
                    transition: "transform 0.15s",
                    transform: expandedRow === i ? "rotate(90deg)" : "none",
                  }}
                >
                  ›
                </span>
              </div>

              {/* Detalhe expandido */}
              {expandedRow === i && (
                <div
                  style={{
                    background: "var(--bg)",
                    borderLeft: `2px solid ${row.color}60`,
                    padding: "8px 14px 8px 16px",
                    marginTop: -1,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-3)",
                  }}
                >
                  {row.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
