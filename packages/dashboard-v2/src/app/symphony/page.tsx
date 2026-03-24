"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface InteractionPair {
  from_agent: string;
  to_agent: string;
  count: number;
  types: Record<string, number>;
  total_tokens: number;
}

interface Agent {
  id: string;
  name: string;
  emoji?: string;
  status?: string;
  model?: string;
}

interface SymphonyData {
  pairs: InteractionPair[];
  agents: Agent[];
  totalInteractions: number;
}

// ── Static flows (kept for visual richness) ───────────────────────────────────
type FlowNode = { name: string; agent: string; time: string; status: "ok" | "warn" | "pending" };
type Flow = { name: string; color: string; colorVar: string; nodes: FlowNode[] };

const flows: Flow[] = [
  {
    name: "COMPRA", color: "#00ff80", colorVar: "var(--accent)",
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
    name: "RELATÓRIO", color: "#00ffff", colorVar: "var(--cyan)",
    nodes: [
      { name: "NAV Admin", agent: "Agente Admin", time: "0.3s", status: "ok" },
      { name: "PDD Pricing", agent: "Agente Pricing", time: "1.2s", status: "ok" },
      { name: "Status Compliance", agent: "Compliance", time: "0.8s", status: "ok" },
      { name: "Compilação Relatório", agent: "Agente Relatório", time: "2.4s", status: "ok" },
      { name: "Distribuição IR", agent: "Agente IR", time: "0.5s", status: "ok" },
    ],
  },
];

// ── Collab graph from real data ────────────────────────────────────────────────
function RealCollabGraph({ pairs }: { pairs: InteractionPair[] }) {
  const top = pairs.slice(0, 9);
  const nodes = Array.from(new Set(top.flatMap(p => [p.from_agent, p.to_agent])));
  const W = 520, H = 260;
  const cx = W / 2, cy = H / 2;
  const R = 100;

  if (nodes.length === 0) return null;

  const nodePos = nodes.map((_, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });
  const nodeIndex = Object.fromEntries(nodes.map((n, i) => [n, i]));
  const maxCount = Math.max(...top.map(p => p.count), 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
      {top.map((pair, i) => {
        const ai = nodeIndex[pair.from_agent];
        const bi = nodeIndex[pair.to_agent];
        if (ai == null || bi == null) return null;
        const strokeW = 1 + (pair.count / maxCount) * 5;
        return (
          <line
            key={i}
            x1={nodePos[ai].x} y1={nodePos[ai].y}
            x2={nodePos[bi].x} y2={nodePos[bi].y}
            stroke={i < 3 ? "var(--accent)" : "var(--border)"}
            strokeWidth={strokeW}
            strokeOpacity={i < 3 ? 0.8 : 0.4}
          />
        );
      })}
      {nodes.map((name, i) => (
        <g key={name}>
          <circle
            cx={nodePos[i].x} cy={nodePos[i].y} r={16}
            fill="var(--bg-card)"
            stroke={i < 3 ? "var(--accent)" : "var(--cyan)"}
            strokeWidth={1.5}
          />
          <text
            x={nodePos[i].x} y={nodePos[i].y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={7} fontWeight={700}
            fill={i < 3 ? "var(--accent)" : "var(--cyan)"}
            fontFamily="var(--font-mono)"
          >
            {name.slice(0, 5)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SymphonyPage() {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [data, setData] = useState<SymphonyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/symphony")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Falha ao conectar com a API"))
      .finally(() => setLoading(false));
  }, []);

  const pairs = data?.pairs ?? [];
  const agents = data?.agents ?? [];
  const topPairs = pairs.slice(0, 7);

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
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>
            Orquestração Multi-Agente
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>
            Fluxos de delegação, padrões de coordenação e grafo de comunicação entre agentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} />
          <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "var(--font-mono)" }}>AO VIVO</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#ef4444" }}>
          ⚠ {error}
        </div>
      )}

      {/* Real data: stats */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
          {[
            { label: "TOTAL INTERACTIONS", value: data ? String(data.totalInteractions) : "—", sub: "Registradas no Supabase" },
            { label: "PARES ÚNICOS", value: String(pairs.length), sub: "from_agent → to_agent" },
            { label: "AGENTES", value: String(agents.length), sub: "Agentes registrados" },
          ].map((s) => (
            <div key={s.label} className="glass-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-3)", marginTop: "0.25rem", wordBreak: "break-word", whiteSpace: "normal" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.1em" }}>
          CARREGANDO...
        </div>
      )}

      {/* Real interaction pairs */}
      {topPairs.length > 0 && (
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <h2 style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
            Top Pares de Comunicação — Supabase
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {topPairs.map((pair, i) => {
              const maxCount = topPairs[0].count;
              const pct = (pair.count / maxCount) * 100;
              const typeStr = Object.entries(pair.types).map(([t, c]) => `${t}(${c})`).join(", ") || "—";
              return (
                <div key={i} style={{ padding: "0.75rem 1rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.375rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "2px 6px", borderRadius: "var(--radius)", background: "rgba(0,255,136,0.08)", color: "var(--accent)", border: "1px solid rgba(0,255,136,0.2)", whiteSpace: "nowrap" }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-1)", flex: 1 }}>
                      {pair.from_agent} <span style={{ color: "var(--accent)" }}>→</span> {pair.to_agent}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
                      {pair.count}×
                    </span>
                    {pair.total_tokens > 0 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-4)" }}>
                        {pair.total_tokens.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                  <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", marginBottom: "0.375rem" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: "2px" }} />
                  </div>
                  {Object.keys(pair.types).length > 0 && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-4)" }}>
                      Tipos: {typeStr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && pairs.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-4)" }}>
          Nenhuma interação registrada ainda.
        </div>
      )}

      {/* Agent list */}
      {agents.length > 0 && (
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <h2 style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
            Agentes ({agents.length})
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {agents.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.375rem 0.75rem",
                  background: "var(--bg)",
                  border: a.status === "active" ? "1px solid rgba(0,255,136,0.3)" : "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              >
                {a.emoji && <span style={{ fontSize: "0.875rem" }}>{a.emoji}</span>}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: a.status === "active" ? "var(--accent)" : "var(--text-2)" }}>
                  {a.name}
                </span>
                {a.status && (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: a.status === "active" ? "var(--accent)" : "var(--text-4)", display: "inline-block" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collab graph */}
      {pairs.length > 0 && (
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <h2 style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
            Grafo de Colaboração
          </h2>
          <p style={{ color: "var(--text-4)", fontSize: 11, marginBottom: 12 }}>
            Espessura = frequência. Top 3 em destaque.
          </p>
          <RealCollabGraph pairs={pairs} />
          <div className="flex flex-col gap-1 mt-2">
            {topPairs.slice(0, 3).map((pair, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ display: "inline-block", padding: "1px 6px", background: "rgba(0,255,128,0.08)", color: "var(--accent)", border: "1px solid rgba(0,255,128,0.2)", borderRadius: "var(--radius)", fontSize: 9, fontFamily: "var(--font-mono)" }}>
                    #{i + 1}
                  </span>
                  <span style={{ color: "var(--text-2)", fontSize: 11 }}>
                    {pair.from_agent} ↔ {pair.to_agent}
                  </span>
                </div>
                <span style={{ color: "var(--accent)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  {pair.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Static orchestration flows */}
      <div className="space-y-4">
        <h2 style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
          Fluxos de Orquestração — FIDC
        </h2>
        {flows.map((flow) => (
          <div
            key={flow.name}
            className="glass-card p-4"
            style={{ borderRadius: "var(--radius)", borderColor: `${flow.color}20` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span style={{
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
              }}>
                FLUXO {flow.name}
              </span>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${flow.color}40, transparent)` }} />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {flow.nodes.map((node, ni) => (
                <div key={ni} className="flex items-center gap-1">
                  <div style={{
                    background: "var(--bg)",
                    border: `1px solid ${flow.color}30`,
                    borderRadius: "var(--radius)",
                    padding: "8px 12px",
                    position: "relative",
                  }}>
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      width: 6, height: 6, borderRadius: "50%",
                      background: node.status === "ok" ? flow.color : node.status === "warn" ? "#f59e0b" : "var(--text-4)",
                      boxShadow: node.status === "ok" ? `0 0 4px ${flow.color}` : undefined,
                    }} />
                    <div style={{ color: flow.color, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{node.name}</div>
                    <div style={{ color: "var(--text-3)", fontSize: 10, fontFamily: "var(--font-mono)" }}>{node.agent}</div>
                    <div style={{ color: "var(--text-4)", fontSize: 10, fontFamily: "var(--font-mono)", marginTop: 2 }}>{node.time}</div>
                  </div>
                  {ni < flow.nodes.length - 1 && (
                    <span style={{ color: flow.color, fontSize: 14, opacity: 0.4, flexShrink: 0 }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Orchestration timeline (expandable rows) */}
      <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
        <h2 style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
          Linha do Tempo de Orquestração
        </h2>
        <div className="space-y-2">
          {[
            { flow: "COMPRA", color: "#00ff80", agents: ["DD","Compliance","Pricing","Admin","Custódia"], duration: "6.2s", status: "ok", detail: "DD(3.1s) → Compliance(1.8s) → Pricing(0.6s) → Admin(0.4s) → Custódia(0.2s)" },
            { flow: "RELATÓRIO", color: "#00ffff", agents: ["Admin","Pricing","Compliance","Relatório","IR"], duration: "5.2s", status: "ok", detail: "Admin(0.3s) → Pricing(1.2s) → Compliance(0.8s) → Relatório(2.4s) → IR(0.5s)" },
            { flow: "ONBOARD", color: "#f59e0b", agents: ["DD","Compliance","Risco","Admin"], duration: "5.3s", status: "warn", detail: "DD(3.4s) → Compliance(1.2s) ⚠ flag PLD → Risco(1.1s) → Admin(0.4s)" },
          ].map((row, i) => (
            <div key={i}>
              <div
                className="flex items-center gap-4"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderColor: expandedRow === i ? `${row.color}40` : "var(--border)",
                }}
                onClick={() => setExpandedRow(expandedRow === i ? null : i)}
              >
                <span style={{
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
                }}>
                  {row.flow}
                </span>
                <div className="flex items-center gap-1 flex-1">
                  {row.agents.map((a) => (
                    <div key={a} style={{
                      padding: "2px 6px",
                      borderRadius: "var(--radius)",
                      background: "var(--bg-card)",
                      border: `1px solid ${row.color}40`,
                      fontSize: 8,
                      fontFamily: "var(--font-mono)",
                      color: row.color,
                      fontWeight: 700,
                    }}>
                      {a.slice(0, 4)}
                    </div>
                  ))}
                </div>
                <span style={{ color: "var(--accent)", fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 700, minWidth: 48, textAlign: "right" }}>
                  {row.duration}
                </span>
                <span style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  background: row.status === "ok" ? "rgba(0,255,128,0.1)" : "rgba(245,158,11,0.1)",
                  color: row.status === "ok" ? "var(--accent)" : "#f59e0b",
                  border: `1px solid ${row.status === "ok" ? "rgba(0,255,128,0.3)" : "rgba(245,158,11,0.3)"}`,
                  borderRadius: "var(--radius)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  minWidth: 60,
                  textAlign: "center",
                }}>
                  {row.status === "ok" ? "✓ OK" : "⚠ ALERTA"}
                </span>
                <span style={{ color: "var(--text-4)", fontSize: 11, transition: "transform 0.15s", transform: expandedRow === i ? "rotate(90deg)" : "none" }}>›</span>
              </div>
              {expandedRow === i && (
                <div style={{
                  background: "var(--bg)",
                  borderLeft: `2px solid ${row.color}60`,
                  padding: "8px 14px 8px 16px",
                  marginTop: -1,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-3)",
                }}>
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
