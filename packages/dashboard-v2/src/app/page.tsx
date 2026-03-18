"use client";

import { useEffect, useState, useRef } from "react";

// ── Dados de execução — tema dev ──────────────────────────────────────────────
const EXECUTION_LINES = [
  { ts: "13:04:12", text: 'Orchestrator recebeu: "implementar módulo de PDD aging"', color: "var(--text-2)" },
  { ts: "13:04:12", text: "→ spawn Agent:Pricing (depth=1)", color: "var(--accent)" },
  { ts: "13:04:13", text: "  → gerando pricing/pdd_aging.py (7 buckets BACEN 2682/99)", color: "var(--accent)" },
  { ts: "13:04:14", text: "  → 142 linhas geradas, 12 testes unitários", color: "var(--text-2)" },
  { ts: "13:04:15", text: "  → pytest: 12/12 passando ✓", color: "var(--accent)" },
  { ts: "13:04:15", text: "← Agent:Pricing: módulo entregue", color: "var(--cyan)" },
  { ts: "13:04:16", text: "→ spawn Agent:Auditor (depth=1)", color: "var(--accent)" },
  { ts: "13:04:16", text: "  → code review: 0 issues, score 94/100", color: "var(--cyan)" },
  { ts: "13:04:17", text: "→ spawn Agent:Compliance (depth=1)", color: "var(--accent)" },
  { ts: "13:04:17", text: "  → validação CVM 175: APROVADO", color: "var(--cyan)" },
  { ts: "13:04:18", text: "  → deploy preview: paganini-preview-7a2f.vercel.app", color: "var(--text-2)" },
  { ts: "13:04:19", text: "✓ COMPLETO | 3 agentes, 142 LOC, 12 testes, 7.2s", color: "var(--accent)" },
];

// Commits por hora (24h)
const COMMITS_PER_HOUR = [2, 1, 0, 1, 3, 5, 8, 12, 15, 18, 22, 19, 17, 21, 24, 20, 16, 13, 10, 8, 6, 5, 4, 3];

const AGENTS = [
  { name: "orchestrator",       task: "Coordenando sprint #47 — 3 módulos",        loc: "—",  tests: "—",  cost: "$0.021", active: true },
  { name: "pricing",            task: "Gerando pricing/yield_calculator.py",        loc: "89", tests: "8",  cost: "$0.013", active: true },
  { name: "compliance",         task: "Review: compliance/gates.py",                loc: "—",  tests: "—",  cost: "$0.010", active: true },
  { name: "auditor",            task: "Code review lote #12 — 4 PRs",              loc: "—",  tests: "—",  cost: "$0.008", active: true },
  { name: "risk",               task: "Gerando risk/pdd_aging.py",                  loc: "142",tests: "12", cost: "$0.019", active: true },
  { name: "treasury",           task: "Calculando curvas de yield — 3 fundos",     loc: "67", tests: "5",  cost: "$0.009", active: true },
  { name: "due-diligence",      task: "Gerando due_diligence/scoring.py",           loc: "203",tests: "18", cost: "$0.027", active: true },
  { name: "knowledge-graph",    task: "Ingerindo circular CVM 3.822/2025",         loc: "—",  tests: "—",  cost: "$0.031", active: true },
  { name: "reporting",          task: "Gerando reporting/monthly_nav.py",           loc: "98", tests: "7",  cost: "$0.012", active: true },
  { name: "admin",              task: "Aguardando — sem tarefas ativas",            loc: "—",  tests: "—",  cost: "$0.001", active: false },
  { name: "investor-relations", task: "Gerando ir/investor_report.py",              loc: "55", tests: "4",  cost: "$0.007", active: true },
  { name: "regulatory-watch",   task: "Monitorando publicações BACEN/CVM",         loc: "—",  tests: "—",  cost: "$0.004", active: true },
  { name: "metaclaw",           task: "Avaliando 3 padrões candidatos de skill",   loc: "—",  tests: "—",  cost: "$0.006", active: true },
  { name: "ingest",             task: "Aguardando — em standby",                    loc: "—",  tests: "—",  cost: "$0.001", active: false },
];

const GATES = ["LINT", "TYPES", "TESTES", "SECURITY", "COMPLIANCE", "DEPLOY"];

const ALERTS = [
  { type: "warn", time: "13:02:44", msg: "Build falhou: pricing/yield_v2.py — timeout em 30s" },
  { type: "ok",   time: "13:01:11", msg: "Deploy prod: administrador.py v1.4.2 — smoke tests OK" },
  { type: "err",  time: "12:58:30", msg: "2 testes falharam: risk/stress_test.py — AssertionError linha 87" },
  { type: "ok",   time: "12:55:18", msg: "Cobertura subiu para 87.3% (+0.8% vs ontem)" },
  { type: "warn", time: "12:44:03", msg: "Agente auditor: latência elevada 8.2s (limite: 6s)" },
];

// ── Componentes auxiliares ────────────────────────────────────────────────────
function Sparkline({ data, w = 80, h = 28, color = "var(--accent)" }: { data: number[]; w?: number; h?: number; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `${pts} ${w},${h} 0,${h}`;
  const uid = color.replace(/[^a-z0-9]/gi, "");
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: active ? "var(--accent)" : "var(--text-4)",
        boxShadow: active ? "0 0 6px var(--accent)" : "none",
        flexShrink: 0,
      }}
    />
  );
}

// Heatmap SVG — 7 dias × 24 horas de commits
function GitHeatmap() {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const cellW = 18, cellH = 14, gapX = 2, gapY = 2;
  const intensity = (d: number, h: number) => {
    const base = [2, 5, 7, 6, 8, 4, 1][d];
    const hourBoost = h >= 9 && h <= 18 ? 1.4 : h >= 19 && h <= 22 ? 0.8 : 0.2;
    const val = base * hourBoost * (0.5 + Math.random() * 0.5);
    return Math.min(1, val / 10);
  };
  // deterministic-ish seed
  const seed = (d: number, h: number) => {
    const n = d * 100 + h;
    return ((Math.sin(n * 9301 + 49297) + 1) / 2);
  };
  return (
    <svg
      width={24 * (cellW + gapX)}
      height={7 * (cellH + gapY) + 20}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Hour labels */}
      {[0, 6, 12, 18, 23].map(h => (
        <text key={h} x={h * (cellW + gapX) + cellW / 2} y={10} fontSize="8" fill="rgba(255,255,255,0.2)" textAnchor="middle">
          {h}h
        </text>
      ))}
      {days.map((day, d) =>
        hours.map(h => {
          const alpha = 0.05 + seed(d, h) * 0.85;
          return (
            <rect
              key={`${d}-${h}`}
              x={h * (cellW + gapX)}
              y={d * (cellH + gapY) + 14}
              width={cellW}
              height={cellH}
              rx={2}
              fill={`hsl(150 100% 50% / ${alpha.toFixed(2)})`}
            />
          );
        })
      )}
      {/* Day labels */}
      {days.map((day, d) => (
        <text key={day} x={-2} y={d * (cellH + gapY) + 14 + cellH / 2 + 3} fontSize="8" fill="rgba(255,255,255,0.2)" textAnchor="end">
          {day}
        </text>
      ))}
    </svg>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function OverviewPage() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const traceRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines(v => {
        if (v >= EXECUTION_LINES.length) {
          setTimeout(() => {
            setVisibleLines(0);
            setLoopCount(c => c + 1);
          }, 2800);
          clearInterval(interval);
          return v;
        }
        return v + 1;
      });
    }, 340);
    return () => clearInterval(interval);
  }, [loopCount]);

  useEffect(() => {
    if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight;
  }, [visibleLines]);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const STATS = [
    {
      label: "COMMITS HOJE",
      value: "47",
      sub: "+12 vs ontem",
      color: "var(--accent)",
      sparkData: [2, 1, 0, 1, 3, 5, 8, 12, 15, 18, 22, 19, 17, 21, 24, 20, 16, 13, 10, 8, 6, 5, 4, 3],
    },
    {
      label: "LINHAS DE CÓDIGO",
      value: "12.4K",
      sub: "geradas por agentes",
      color: "var(--cyan)",
      sparkData: [200, 300, 280, 400, 520, 640, 810, 920, 1100, 1050, 900, 780, 820, 950, 1020, 880, 760, 640, 580, 490, 420, 380, 310, 280],
    },
    {
      label: "BUILDS",
      value: "23",
      sub: "18 ✓  3 ⚠  2 ✗",
      color: "var(--accent)",
      sparkData: [0, 1, 0, 2, 3, 4, 5, 6, 5, 7, 8, 7, 6, 7, 8, 9, 8, 7, 6, 5, 4, 4, 3, 2],
    },
    {
      label: "COBERTURA DE TESTES",
      value: "87.3%",
      sub: "+0.8% vs ontem",
      color: "var(--accent)",
      sparkData: [84, 84.2, 84.5, 84.8, 85.1, 85.5, 85.9, 86.2, 86.4, 86.7, 86.9, 87.0, 87.1, 87.2, 87.2, 87.3, 87.3, 87.3, 87.3, 87.3, 87.3, 87.3, 87.3, 87.3],
    },
    {
      label: "DEPLOYS",
      value: "8",
      sub: "7 prod · 1 preview",
      color: "var(--cyan)",
      sparkData: [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8],
    },
    {
      label: "AGENTES ATIVOS",
      value: "12/14",
      sub: "2 em standby",
      color: "var(--accent)",
      sparkData: [8, 8, 9, 10, 11, 12, 13, 13, 13, 14, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Cabeçalho ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
            PAGANINI AIOS · DEV PLATFORM
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            Central de Comando
            <span style={{ color: "var(--accent)", textShadow: "0 0 20px hsl(150 100% 50% / 0.4)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>v2.4.1</span>
          </h1>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <span className="tag-badge">AIOS</span>
            <span className="tag-badge-cyan">DEV PLATFORM</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <StatusDot />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)" }}>{timeStr}</span>
          <span className="tag-badge">AO VIVO</span>
        </div>
      </div>

      {/* ── 6 Cards de Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }} className="stats-grid">
        {STATS.map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
              {s.label}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.5rem" }}>
              <div>
                <div className="stat-value" style={{ fontSize: "2rem", fontWeight: 700, color: s.color, lineHeight: 1, fontFamily: "var(--font-mono)" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: "0.25rem" }}>{s.sub}</div>
              </div>
              <Sparkline data={s.sparkData} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Terminal + coluna direita ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1rem", alignItems: "start" }} className="main-grid">

        {/* Terminal de Execução */}
        <div className="glass-card scanline" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
                TERMINAL DE EXECUÇÃO AO VIVO
              </div>
              <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: "0.875rem", marginTop: "2px" }}>
                Geração de Código por Agentes
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <StatusDot />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--accent)" }}>TRANSMITINDO</span>
            </div>
          </div>

          <div
            ref={traceRef}
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1rem",
              height: 260,
              overflowY: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              lineHeight: 1.75,
            }}
          >
            {EXECUTION_LINES.slice(0, visibleLines).map((line, i) => (
              <div key={`${loopCount}-${i}`} style={{ display: "flex", gap: "0.75rem", opacity: i < visibleLines - 1 ? 0.85 : 1 }}>
                <span style={{ color: "var(--text-4)", flexShrink: 0 }}>[{line.ts}]</span>
                <span style={{ color: line.color }}>{line.text}</span>
              </div>
            ))}
            {visibleLines > 0 && visibleLines < EXECUTION_LINES.length && (
              <span style={{ color: "var(--accent)" }}>█</span>
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Guardrail Strip */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
              GATES DE QUALIDADE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {GATES.map((gate, i) => (
                <div key={gate} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width={16} height={16} style={{ flexShrink: 0 }}>
                    <circle cx={8} cy={8} r={7} fill="hsl(150 100% 50% / 0.12)" stroke="hsl(150 100% 50% / 0.4)" strokeWidth={1} />
                    <text x={8} y={11.5} fontSize="8" fill="var(--accent)" textAnchor="middle">✓</text>
                  </svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-2)", flex: 1 }}>{gate}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)" }}>OK</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: "1rem",
              padding: "6px 10px",
              background: "hsl(150 100% 50% / 0.08)",
              border: "1px solid hsl(150 100% 50% / 0.3)",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.625rem",
              color: "var(--accent)",
              textAlign: "center",
              fontWeight: 700,
            }}>
              ✓ TODOS OS GATES APROVADOS
            </div>
          </div>

          {/* Alertas Recentes */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.75rem" }}>
              ALERTAS RECENTES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {ALERTS.map((a, i) => {
                const col = a.type === "ok" ? "var(--accent)" : a.type === "warn" ? "#f59e0b" : "#ef4444";
                const icon = a.type === "ok" ? "✓" : a.type === "warn" ? "⚠" : "✗";
                return (
                  <div key={i} style={{
                    display: "flex", gap: "8px", alignItems: "flex-start",
                    padding: "6px 8px",
                    background: `${col.startsWith("#") ? col : "hsl(150 100% 50%)"}10`,
                    border: `1px solid ${col.startsWith("#") ? col : "hsl(150 100% 50%)"}30`,
                    borderRadius: "var(--radius)",
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: col, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-3)" }}>{a.time}</div>
                      <div style={{ fontSize: "0.5625rem", color: "var(--text-2)", marginTop: "2px", lineHeight: 1.4 }}>{a.msg}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sparkline de Commits por Hora ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
              COMMITS POR HORA — ÚLTIMAS 24H
            </div>
            <div style={{ color: "var(--text-1)", fontWeight: 600, fontSize: "0.8125rem", marginTop: "2px" }}>
              Atividade de Geração de Código
            </div>
          </div>
          <span className="tag-badge">47 hoje</span>
        </div>
        <svg viewBox={`0 0 800 60`} style={{ width: "100%", height: 60, display: "block" }}>
          <defs>
            <linearGradient id="commitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(150 100% 50%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(150 100% 50%)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {COMMITS_PER_HOUR.map((v, i) => {
            const max = Math.max(...COMMITS_PER_HOUR);
            const barH = (v / max) * 50;
            const barW = 800 / 24 - 3;
            return (
              <rect
                key={i}
                x={i * (800 / 24) + 1}
                y={58 - barH}
                width={barW}
                height={barH}
                rx={2}
                fill={`hsl(150 100% 50% / ${0.15 + (v / max) * 0.7})`}
              />
            );
          })}
          {[0, 6, 12, 18, 23].map(h => (
            <text key={h} x={(h / 23) * 800} y={60} fontSize="8" fill="rgba(255,255,255,0.2)" textAnchor="middle">{h}h</text>
          ))}
        </svg>
      </div>

      {/* ── Tabela de Atividade dos Agentes ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          ATIVIDADE DOS AGENTES · {AGENTS.filter(a => a.active).length}/{AGENTS.length} ATIVOS
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["AGENTE", "STATUS", "TAREFA ATUAL", "LOC", "TESTES", "CUSTO"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--text-4)", fontSize: "0.5625rem", letterSpacing: "0.12em", fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((agent, i) => (
                <tr key={agent.name} style={{ borderBottom: "1px solid hsl(150 100% 50% / 0.04)", background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--accent)" }}>{agent.name}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <StatusDot active={agent.active} />
                      <span style={{ color: agent.active ? "var(--text-2)" : "var(--text-4)", fontSize: "0.5625rem" }}>
                        {agent.active ? "ATIVO" : "STANDBY"}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: agent.active ? "var(--text-2)" : "var(--text-4)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.625rem" }}>
                    {agent.task}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--cyan)" }}>{agent.loc}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>{agent.tests}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-2)" }}>{agent.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-4)" }}>
            TOTAL HOJE:{" "}
            <span style={{ color: "var(--accent)" }}>12.4K LOC</span> ·{" "}
            <span style={{ color: "var(--accent)" }}>347 testes</span> ·{" "}
            <span style={{ color: "var(--accent)" }}>$0.19</span>
          </div>
        </div>
      </div>

      {/* ── Git Activity Heatmap ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
          MAPA DE CALOR DE COMMITS — 7 DIAS × 24 HORAS
        </div>
        <div style={{ overflowX: "auto", paddingLeft: "28px" }}>
          <GitHeatmap />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "0.75rem", justifyContent: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)" }}>menos</span>
          {[0.08, 0.25, 0.45, 0.65, 0.85].map((a, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "2px", background: `hsl(150 100% 50% / ${a})` }} />
          ))}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)" }}>mais</span>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(6, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
