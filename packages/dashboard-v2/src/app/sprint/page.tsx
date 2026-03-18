"use client";

import { useState } from "react";

// ─── DADOS DO SPRINT ─────────────────────────────────────────────────────────
const SPRINT_STATS = [
  { label: "DURAÇÃO",      value: "2 semanas",  sub: "Dia 8/10",  color: "var(--text-1)" },
  { label: "STORIES TOTAL", value: "24",         sub: "neste sprint", color: "var(--text-1)" },
  { label: "CONCLUÍDAS",   value: "16",          sub: "67% completo", color: "var(--accent)" },
  { label: "EM ANDAMENTO", value: "5",           sub: "em progresso", color: "var(--cyan)" },
  { label: "BACKLOG",      value: "3",           sub: "não iniciadas", color: "#f59e0b" },
  { label: "VELOCIDADE",   value: "34 pts",      sub: "pontos/sprint", color: "#a78bfa" },
];

// Burndown data: actual story points remaining per day
const BURNDOWN_ACTUAL   = [48, 44, 40, 35, 31, 28, 22, 16];
const BURNDOWN_DAYS     = 10;
const BURNDOWN_START    = 48;
const CURRENT_DAY       = 8; // progresso atual

// Velocity data (últimos 5 sprints)
const VELOCITY_DATA = [
  { sprint: "#43", pts: 28 },
  { sprint: "#44", pts: 31 },
  { sprint: "#45", pts: 29 },
  { sprint: "#46", pts: 34 },
  { sprint: "#47", pts: 34, current: true },
];

// Kanban cards
const KANBAN_BACKLOG = [
  { id: "B-001", title: "Integração com B3 via API",               agents: ["engineer"],           pts: 5, domain: "infra" },
  { id: "B-002", title: "Dashboard de risco em tempo real",         agents: ["architect","engineer"], pts: 8, domain: "risco" },
  { id: "B-003", title: "Notificações Slack para covenant breach",  agents: ["devops"],              pts: 3, domain: "devops" },
];

const KANBAN_INPROGRESS = [
  { id: "I-001", title: "Módulo de reconciliação bancária",         agents: ["engineer"],           pts: 5,  pct: 60,  domain: "fidc" },
  { id: "I-002", title: "Testes E2E do pipeline de compliance",     agents: ["qa-agent"],           pts: 3,  pct: 40,  domain: "qa" },
  { id: "I-003", title: "Otimização do RAG chunking",               agents: ["architect-agent"],    pts: 5,  pct: 75,  domain: "kg" },
  { id: "I-004", title: "API REST para consultas externas",         agents: ["engineer"],           pts: 8,  pct: 30,  domain: "api" },
  { id: "I-005", title: "Scan de segurança automatizado",           agents: ["security-agent"],     pts: 3,  pct: 50,  domain: "sec" },
];

const KANBAN_REVIEW = [
  { id: "R-001", title: "PDD aging com interpolação de curva",      pr: "PR #142", domain: "Pricing" },
  { id: "R-002", title: "Validação CNPJ mod-11 otimizada",          pr: "PR #141", domain: "DD" },
  { id: "R-003", title: "Cache de embeddings ChromaDB",             pr: "PR #140", domain: "KG" },
];

const KANBAN_DONE = [
  "Setup inicial do monorepo turborepo",
  "Schema Supabase v2 com RLS",
  "Pipeline BMAD-CE stages 1-4",
  "Skill fidc-rules-base (ABSTRACT)",
  "Skill compliance-agent com 6 portões",
  "Skill pricing-agent BACEN 2682/99",
  "Embedding ChromaDB v1",
  "Dashboard telemetria v1",
  "Autenticação JWT + RLS Supabase",
  "Informe CVM 175 automatizado",
  "Guardrail engine — 6 gates",
  "Skill knowledge-graph NER",
  "Testes unitários compliance (94% cov.)",
  "CI/CD pipeline GitHub Actions",
  "Documentação API REST v1",
  "Deploy preview Vercel automatizado",
];

// Distribuição por agente no sprint
const AGENT_DIST = [
  { agent: "engineer",        emoji: "💻", stories: 7, pts: 29, color: "var(--accent)" },
  { agent: "qa-agent",        emoji: "🧪", stories: 4, pts: 12, color: "var(--cyan)" },
  { agent: "architect-agent", emoji: "🏗️", stories: 3, pts: 18, color: "#a78bfa" },
  { agent: "security-agent",  emoji: "🛡️", stories: 2, pts:  6, color: "#f59e0b" },
  { agent: "pm-agent",        emoji: "📋", stories: 3, pts:  9, color: "#34d399" },
  { agent: "docs-agent",      emoji: "📝", stories: 2, pts:  5, color: "#60a5fa" },
  { agent: "devops",          emoji: "🚀", stories: 2, pts:  8, color: "#fb923c" },
  { agent: "data-agent",      emoji: "📊", stories: 1, pts:  3, color: "#c084fc" },
];

// ─── SVG: BURNDOWN ────────────────────────────────────────────────────────────
function BurndownChart() {
  const W = 560, H = 200, PAD = { top: 16, right: 20, bottom: 40, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const xScale = (day: number) => PAD.left + (day / (BURNDOWN_DAYS - 1)) * iW;
  const yScale = (pts: number) => PAD.top + iH - (pts / BURNDOWN_START) * iH;

  // Ideal line: day 0 → BURNDOWN_START, day 9 → 0
  const idealPts = [0, BURNDOWN_DAYS - 1].map((d) => ({
    x: xScale(d),
    y: yScale(BURNDOWN_START - (BURNDOWN_START / (BURNDOWN_DAYS - 1)) * d),
  }));

  // Actual line points
  const actualPts = BURNDOWN_ACTUAL.map((v, i) => ({ x: xScale(i), y: yScale(v) }));

  const actualPath = actualPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const actualFill =
    actualPath + ` L${actualPts[actualPts.length - 1].x},${yScale(0)} L${xScale(0)},${yScale(0)} Z`;

  // Y grid lines
  const yTicks = [0, 12, 24, 36, 48];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", maxWidth: "100%", overflow: "visible" }}>
      <defs>
        <linearGradient id="bdFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(150 100% 50%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(150 100% 50%)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left} y1={yScale(t)} x2={W - PAD.right} y2={yScale(t)}
            stroke="hsl(150 100% 50% / 0.07)" strokeWidth="1"
          />
          <text
            x={PAD.left - 6} y={yScale(t) + 4}
            textAnchor="end"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: "var(--text-4)" }}
          >
            {t}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {Array.from({ length: BURNDOWN_DAYS }, (_, i) => (
        <text
          key={i}
          x={xScale(i)} y={H - PAD.bottom + 14}
          textAnchor="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: "var(--text-4)" }}
        >
          D{i + 1}
        </text>
      ))}

      {/* Axis lines */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom}
        stroke="hsl(150 100% 50% / 0.15)" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
        stroke="hsl(150 100% 50% / 0.15)" strokeWidth="1" />

      {/* Ideal line */}
      <line
        x1={idealPts[0].x} y1={idealPts[0].y} x2={idealPts[1].x} y2={idealPts[1].y}
        stroke="hsl(180 100% 50% / 0.4)" strokeWidth="1.5" strokeDasharray="6 4"
      />
      <text
        x={idealPts[1].x + 4} y={idealPts[1].y - 4}
        style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: "hsl(180 100% 50% / 0.6)" }}
      >
        IDEAL
      </text>

      {/* Actual fill */}
      <path d={actualFill} fill="url(#bdFill)" />

      {/* Actual line */}
      <path d={actualPath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Actual dots */}
      {actualPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === actualPts.length - 1 ? 4 : 3}
          fill={i === actualPts.length - 1 ? "var(--accent)" : "hsl(220 18% 9%)"}
          stroke="var(--accent)" strokeWidth="1.5"
        />
      ))}

      {/* "À frente" label */}
      <text
        x={actualPts[actualPts.length - 1].x + 6}
        y={actualPts[actualPts.length - 1].y - 6}
        style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: "var(--accent)", fontWeight: 700 }}
      >
        +AHEAD
      </text>

      {/* Today line */}
      <line
        x1={xScale(CURRENT_DAY - 1)} y1={PAD.top}
        x2={xScale(CURRENT_DAY - 1)} y2={H - PAD.bottom}
        stroke="hsl(150 100% 50% / 0.25)" strokeWidth="1" strokeDasharray="3 3"
      />
    </svg>
  );
}

// ─── SVG: VELOCITY ───────────────────────────────────────────────────────────
function VelocityChart() {
  const W = 300, H = 140, PAD = { top: 12, right: 16, bottom: 32, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const maxPts = Math.max(...VELOCITY_DATA.map((d) => d.pts)) + 8;
  const barW = (iW / VELOCITY_DATA.length) * 0.55;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", maxWidth: "100%", overflow: "visible" }}>
      <defs>
        <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="velGradCurrent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(150 100% 60%)" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(150 100% 60%)" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Y grid */}
      {[0, 10, 20, 30, 40].map((t) => {
        const y = PAD.top + iH - (t / maxPts) * iH;
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="hsl(150 100% 50% / 0.07)" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: "var(--text-4)" }}>
              {t}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {VELOCITY_DATA.map((d, i) => {
        const slotW = iW / VELOCITY_DATA.length;
        const x = PAD.left + i * slotW + (slotW - barW) / 2;
        const barH = (d.pts / maxPts) * iH;
        const y = PAD.top + iH - barH;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH}
              fill={d.current ? "url(#velGradCurrent)" : "url(#velGrad)"}
              rx="2"
              style={{ filter: d.current ? "drop-shadow(0 0 6px hsl(150 100% 55% / 0.5))" : "none" }}
            />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: d.current ? "var(--accent)" : "var(--text-3)", fontWeight: d.current ? 700 : 400 }}>
              {d.pts}
            </text>
            <text x={x + barW / 2} y={H - PAD.bottom + 12} textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fill: d.current ? "var(--accent)" : "var(--text-4)" }}>
              {d.sprint}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom}
        stroke="hsl(150 100% 50% / 0.15)" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
        stroke="hsl(150 100% 50% / 0.15)" strokeWidth="1" />
    </svg>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function ProgressBar({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`, height: "100%",
          background: color,
          boxShadow: `0 0 6px ${color}55`,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

function AgentTag({ agent }: { agent: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)", fontSize: "0.75rem",
        color: "var(--cyan)", background: "rgba(0,255,255,0.08)",
        border: "1px solid rgba(0,255,255,0.18)", padding: "1px 5px",
        borderRadius: "var(--radius)", whiteSpace: "nowrap",
      }}
    >
      {agent}
    </span>
  );
}

function PtsBadge({ pts }: { pts: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)", fontSize: "0.75rem",
        color: "#a78bfa", background: "rgba(167,139,250,0.10)",
        border: "1px solid rgba(167,139,250,0.22)", padding: "1px 6px",
        borderRadius: "var(--radius)", whiteSpace: "nowrap",
      }}
    >
      {pts}pts
    </span>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function SprintPage() {
  const [doneExpanded, setDoneExpanded] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Cabeçalho ── */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.75rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem",
          }}
        >
          PAGANINI AIOS · GESTÃO DE SPRINT
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            Visualização de Sprint
          </h1>
          <span className="tag-badge">SPRINT #47</span>
          <span className="tag-badge-cyan">EM ANDAMENTO</span>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          Burndown, Kanban e distribuição por agente — progresso em tempo real
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
        {SPRINT_STATS.map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: "1.75rem", fontWeight: 700, color: s.color,
                fontFamily: "var(--font-mono)", lineHeight: 1.1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-4)", marginTop: "2px" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Burndown + Velocity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1rem" }}>

        {/* Burndown */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.75rem",
              letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.75rem",
            }}
          >
            BURNDOWN CHART · SPRINT #47 · DIA {CURRENT_DAY}/{BURNDOWN_DAYS}
          </div>
          <div style={{ overflowX: "auto" }}>
            <BurndownChart />
          </div>
          <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            {[
              { color: "var(--accent)",            dash: false, label: "PROGRESSO REAL" },
              { color: "hsl(180 100% 50% / 0.5)",  dash: true,  label: "LINHA IDEAL" },
              { color: "hsl(150 100% 50% / 0.3)",  dash: true,  label: "DIA ATUAL" },
            ].map(({ color, dash, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 18, height: 2,
                    background: dash ? "transparent" : color,
                    borderTop: dash ? `2px dashed ${color}` : "none",
                  }}
                />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Velocity */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.75rem",
              letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.75rem",
            }}
          >
            VELOCIDADE POR SPRINT · ÚLTIMOS 5
          </div>
          <VelocityChart />
          <div
            style={{
              marginTop: "1rem", padding: "0.625rem 0.875rem",
              border: "1px solid hsl(150 100% 50% / 0.18)",
              borderRadius: "var(--radius)", background: "hsl(150 100% 50% / 0.04)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "2px" }}>
              MÉDIA (5 SPRINTS)
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 700, color: "var(--accent)" }}>
              31.2 pts/sprint
            </div>
          </div>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.75rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
          }}
        >
          KANBAN · SPRINT #47
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          {/* BACKLOG */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                letterSpacing: "0.12em", color: "#f59e0b",
                padding: "4px 10px", border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "var(--radius)", background: "rgba(245,158,11,0.07)",
                marginBottom: "0.75rem", display: "inline-block",
              }}
            >
              BACKLOG ({KANBAN_BACKLOG.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {KANBAN_BACKLOG.map((card) => (
                <div
                  key={card.id}
                  style={{
                    padding: "0.75rem", borderRadius: "var(--radius)",
                    background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.14)",
                  }}
                >
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-2)", lineHeight: 1.4, marginBottom: "0.5rem" }}>
                    {card.title}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: "0.375rem" }}>
                    {card.agents.map((a) => <AgentTag key={a} agent={a} />)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <PtsBadge pts={card.pts} />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                        color: "var(--text-4)", letterSpacing: "0.08em",
                      }}
                    >
                      {card.domain}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EM ANDAMENTO */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                letterSpacing: "0.12em", color: "var(--cyan)",
                padding: "4px 10px", border: "1px solid rgba(0,255,255,0.22)",
                borderRadius: "var(--radius)", background: "rgba(0,255,255,0.06)",
                marginBottom: "0.75rem", display: "inline-block",
              }}
            >
              EM ANDAMENTO ({KANBAN_INPROGRESS.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {KANBAN_INPROGRESS.map((card) => (
                <div
                  key={card.id}
                  style={{
                    padding: "0.75rem", borderRadius: "var(--radius)",
                    background: "rgba(0,255,255,0.03)", border: "1px solid rgba(0,255,255,0.12)",
                  }}
                >
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-2)", lineHeight: 1.4, marginBottom: "0.5rem" }}>
                    {card.title}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    {card.agents.map((a) => <AgentTag key={a} agent={a} />)}
                  </div>
                  <ProgressBar pct={card.pct} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.375rem" }}>
                    <PtsBadge pts={card.pts} />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                        color: card.pct >= 70 ? "var(--accent)" : card.pct >= 40 ? "var(--cyan)" : "var(--text-3)",
                        fontWeight: 600,
                      }}
                    >
                      {card.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REVIEW */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                letterSpacing: "0.12em", color: "#a78bfa",
                padding: "4px 10px", border: "1px solid rgba(167,139,250,0.25)",
                borderRadius: "var(--radius)", background: "rgba(167,139,250,0.07)",
                marginBottom: "0.75rem", display: "inline-block",
              }}
            >
              REVIEW ({KANBAN_REVIEW.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {KANBAN_REVIEW.map((card) => (
                <div
                  key={card.id}
                  style={{
                    padding: "0.75rem", borderRadius: "var(--radius)",
                    background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.14)",
                  }}
                >
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-2)", lineHeight: 1.4, marginBottom: "0.5rem" }}>
                    {card.title}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                        color: "#a78bfa", background: "rgba(167,139,250,0.10)",
                        border: "1px solid rgba(167,139,250,0.22)", padding: "1px 6px",
                        borderRadius: "var(--radius)",
                      }}
                    >
                      {card.pr}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
                      {card.domain}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CONCLUÍDO */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                letterSpacing: "0.12em", color: "var(--accent)",
                padding: "4px 10px", border: "1px solid hsl(150 100% 50% / 0.25)",
                borderRadius: "var(--radius)", background: "hsl(150 100% 50% / 0.07)",
                marginBottom: "0.75rem", display: "inline-block",
              }}
            >
              CONCLUÍDO ({KANBAN_DONE.length})
            </div>

            {/* Progress summary */}
            <div
              style={{
                padding: "0.625rem 0.75rem", marginBottom: "0.625rem",
                border: "1px solid hsl(150 100% 50% / 0.15)",
                borderRadius: "var(--radius)", background: "hsl(150 100% 50% / 0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
                  COMPLETADO
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>
                  67%
                </span>
              </div>
              <ProgressBar pct={67} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {(doneExpanded ? KANBAN_DONE : KANBAN_DONE.slice(0, 5)).map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "6px",
                    padding: "4px 6px", borderRadius: "var(--radius)",
                    background: i % 2 === 0 ? "rgba(0,255,128,0.03)" : "transparent",
                  }}
                >
                  <span style={{ color: "var(--accent)", fontSize: "0.8125rem", flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", lineHeight: 1.4 }}>
                    {item}
                  </span>
                </div>
              ))}
              {!doneExpanded && KANBAN_DONE.length > 5 && (
                <button
                  onClick={() => setDoneExpanded(true)}
                  style={{
                    marginTop: "4px", padding: "4px",
                    fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                    color: "var(--text-4)", background: "transparent",
                    border: "1px solid var(--border)", borderRadius: "var(--radius)",
                    cursor: "pointer", letterSpacing: "0.08em",
                  }}
                >
                  + {KANBAN_DONE.length - 5} MAIS
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Distribuição por Agente ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.75rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
          }}
        >
          DISTRIBUIÇÃO POR AGENTE · SPRINT #47
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {AGENT_DIST.map((a) => {
            const maxPts = Math.max(...AGENT_DIST.map((d) => d.pts));
            const pct = Math.round((a.pts / maxPts) * 100);
            return (
              <div
                key={a.agent}
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>{a.emoji}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
                        color: a.color, fontWeight: 600,
                      }}
                    >
                      {a.agent}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                        color: "var(--text-4)", background: "rgba(0,0,0,0.3)",
                        padding: "1px 5px", borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {a.stories} stories
                    </span>
                    <PtsBadge pts={a.pts} />
                  </div>
                </div>
                <ProgressBar pct={pct} color={a.color} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
