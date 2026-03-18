"use client";

import { useState, useEffect } from "react";

// ─── CODE DEVELOPMENT SKILLS (8) ─────────────────────────────────────────────
const CODE_SKILLS = [
  {
    name: "code-review",
    agent: "Code Agent",
    deps: [] as string[],
    description: "Review automatizado de PRs com análise de complexidade, segurança e padrões",
  },
  {
    name: "spec-generator",
    agent: "Code Agent",
    deps: ["code-review"],
    description: "Gera specs técnicas completas para Codex a partir de requisitos em linguagem natural",
  },
  {
    name: "test-generator",
    agent: "QA Agent",
    deps: ["code-review"],
    description: "Cria testes E2E e unitários automaticamente a partir do código implementado",
  },
  {
    name: "deploy-pipeline",
    agent: "Infra Agent",
    deps: [] as string[],
    description: "Pipeline de deploy automatizado: build → preview → aprovação → produção",
  },
  {
    name: "security-scan",
    agent: "Security Agent",
    deps: [] as string[],
    description: "Scan de vulnerabilidades, secrets expostos e dependências desatualizadas",
  },
  {
    name: "doc-generator",
    agent: "Docs Agent",
    deps: ["code-review"],
    description: "Gera documentação técnica automaticamente a partir do código-fonte",
  },
  {
    name: "context-scout",
    agent: "OraCLI",
    deps: [] as string[],
    description: "Busca contexto em memória, pgvector e code graph antes de cada tarefa",
  },
  {
    name: "git-intelligence",
    agent: "Code Agent",
    deps: ["context-scout"],
    description: "Análise de impacto, blast radius e dependências via GitNexus",
  },
];

// ─── FIDC DOMAIN SKILLS (7) ───────────────────────────────────────────────────
const FIDC_SKILLS = [
  {
    name: "fidc-rules-base",
    agent: "compliance",
    deps: [] as string[],
    description: "Base regulatória: CVM 175, BACEN 3.978, Lei 14.430, IFRS 9",
  },
  {
    name: "covenant-monitor",
    agent: "gestor",
    deps: ["fidc-rules-base"],
    description: "Monitora índices de subordinação, concentração e garantias em tempo real",
  },
  {
    name: "pdd-calculator",
    agent: "pricing",
    deps: ["fidc-rules-base"],
    description: "Calcula PDD com aging buckets e interpolação de curva",
  },
  {
    name: "cvm-ingester",
    agent: "regwatch",
    deps: [] as string[],
    description: "Ingere e indexa publicações CVM/BACEN automaticamente",
  },
  {
    name: "pld-aml-guard",
    agent: "compliance",
    deps: ["fidc-rules-base"],
    description: "Bloqueia queries adversariais de evasão PLD/AML",
  },
  {
    name: "onboard-auto",
    agent: "admin",
    deps: ["fidc-rules-base", "cvm-ingester"],
    description: "Onboarding zero-touch: CNPJ → dados CVM → fundo operacional",
  },
  {
    name: "stress-test",
    agent: "pricing",
    deps: ["pdd-calculator"],
    description: "Cenários de stress sobre carteira com impacto no IS e PL",
  },
];

// ─── CAPABILITIES GRAPH ───────────────────────────────────────────────────────
const CAPABILITY_KINDS = [
  { kind: "integration", count: 14, color: "#f59e0b",            desc: "Composio + APIs diretas (Stripe, Linear, GitHub...)" },
  { kind: "tool",        count: 8,  color: "hsl(150,100%,50%)",  desc: "GitNexus, Codex CLI, PinchTab, Playwright..." },
  { kind: "skill",       count: 15, color: "hsl(180,100%,50%)",  desc: "8 Code Dev + 7 FIDC Domain" },
  { kind: "native",      count: 6,  color: "#a78bfa",            desc: "Memory search, orchestration, routing..." },
  { kind: "script",      count: 5,  color: "#fb923c",            desc: "Pipeline, ROI calculator, standup reporter..." },
  { kind: "api",         count: 4,  color: "#34d399",            desc: "Supabase, Linear GraphQL, OpenAI, Google AI" },
];
const TOTAL_CAPS = CAPABILITY_KINDS.reduce((a, c) => a + c.count, 0); // 52

// ─── STATS ────────────────────────────────────────────────────────────────────
const STATS = [
  { label: "Total de Capacidades", value: "52",  color: "var(--accent)" },
  { label: "Skills",               value: "15",  color: "hsl(180,100%,50%)" },
  { label: "Integrações",          value: "14",  color: "#f59e0b" },
  { label: "Ferramentas",          value: "8",   color: "hsl(150,100%,55%)" },
];

// ─── ECONOMIA ────────────────────────────────────────────────────────────────
const BUDGET_ATUAL  = 4_320;
const BUDGET_SEM    = 28_000;
const ECONOMIA_PCT  = Math.round((1 - BUDGET_ATUAL / BUDGET_SEM) * 100);

// ─── SKILL CARD ──────────────────────────────────────────────────────────────
function SkillCard({
  skill,
  accent,
  agentColor,
  depColor,
}: {
  skill: { name: string; agent: string; deps: string[]; description: string };
  accent: string;
  agentColor: string;
  depColor: string;
}) {
  return (
    <div
      style={{
        padding: "1rem 1.125rem",
        borderRadius: "var(--radius)",
        border: `1px solid ${accent}30`,
        background: `${accent}06`,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Name + Agent */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: accent,
            letterSpacing: "-0.01em",
          }}
        >
          {skill.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            padding: "2px 8px",
            borderRadius: "var(--radius)",
            background: `${agentColor}12`,
            border: `1px solid ${agentColor}30`,
            color: agentColor,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {skill.agent}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.875rem",
          color: "var(--text-3)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {skill.description}
      </p>

      {/* Deps */}
      {skill.deps.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
            deps:
          </span>
          {skill.deps.map((d) => (
            <span
              key={d}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                padding: "1px 7px",
                borderRadius: "var(--radius)",
                background: `${depColor}0d`,
                border: `1px solid ${depColor}25`,
                color: depColor,
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}
      {skill.deps.length === 0 && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
          sem dependências
        </span>
      )}
    </div>
  );
}

// ─── BAR CHART ───────────────────────────────────────────────────────────────
function CapabilitiesBarChart() {
  const maxCount = Math.max(...CAPABILITY_KINDS.map((k) => k.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {CAPABILITY_KINDS.map((k) => {
        const pct = (k.count / maxCount) * 100;
        return (
          <div key={k.kind} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Label */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: k.color,
                fontWeight: 700,
                minWidth: 90,
              }}
            >
              {k.kind}
            </div>
            {/* Bar */}
            <div
              style={{
                flex: 1,
                height: 20,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${k.color}80, ${k.color})`,
                  borderRadius: 3,
                  boxShadow: `0 0 8px ${k.color}50`,
                }}
              />
            </div>
            {/* Count */}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "1rem",
                color: k.color,
                fontWeight: 700,
                minWidth: 28,
                textAlign: "right",
              }}
            >
              {k.count}
            </span>
            {/* Desc */}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--text-4)",
                minWidth: 240,
                display: "none",
              }}
              className="cap-desc"
            >
              {k.desc}
            </span>
          </div>
        );
      })}
      {/* Legend below bars */}
      <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem 1.25rem" }}>
        {CAPABILITY_KINDS.map((k) => (
          <div key={k.kind} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: k.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-3)" }}>
              {k.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function CapabilitiesPage() {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── 1. Header ── */}
      <div
        className="glass-card"
        style={{
          padding: "2rem 2rem 1.5rem",
          position: "relative",
          overflow: "hidden",
          borderTop: "2px solid hsl(180,100%,50% / 0.6)",
        }}
      >
        <div
          style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 70% 80% at 50% 0%, hsl(180,100%,50% / 0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              letterSpacing: "0.15em",
              color: "var(--text-4)",
              marginBottom: "0.5rem",
            }}
          >
            PAGANINI AIOS · CAPACIDADES & SKILLS
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              fontWeight: 900,
              color: "var(--text-1)",
              letterSpacing: "-0.03em",
              margin: "0 0 0.75rem",
              lineHeight: 1.1,
            }}
          >
            Capacidades & Skills{" "}
            <span style={{ color: "hsl(180,100%,50%)", textShadow: "0 0 30px hsl(180,100%,50% / 0.4)" }}>
              · Code Factory
            </span>
          </h1>

          {/* Headline badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                padding: "4px 14px",
                borderRadius: "var(--radius)",
                background: "rgba(0,255,255,0.08)",
                border: "1px solid rgba(0,255,255,0.25)",
                color: "hsl(180,100%,50%)",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              52 CAPACIDADES
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                padding: "4px 14px",
                borderRadius: "var(--radius)",
                background: "rgba(0,255,128,0.08)",
                border: "1px solid rgba(0,255,128,0.25)",
                color: "var(--accent)",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              15 SKILLS
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                padding: "4px 14px",
                borderRadius: "var(--radius)",
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.25)",
                color: "#a78bfa",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              6 TIPOS
            </span>
          </div>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)", margin: 0, lineHeight: 1.6 }}>
            8 skills de desenvolvimento de código + 7 skills de domínio FIDC. Todas indexadas em pgvector com busca semântica.
          </p>
        </div>
      </div>

      {/* ── 2. Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        {STATS.map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1.25rem 1.5rem", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2rem",
                fontWeight: 900,
                color: s.color,
                lineHeight: 1,
                marginBottom: "0.375rem",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-4)",
                letterSpacing: "0.1em",
              }}
            >
              {s.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Skills de Desenvolvimento ── */}
      <div>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(0,255,128,0.4), transparent)" }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              letterSpacing: "0.15em",
              color: "var(--accent)",
              padding: "4px 14px",
              border: "1px solid rgba(0,255,128,0.3)",
              borderRadius: "var(--radius)",
              background: "rgba(0,255,128,0.06)",
              whiteSpace: "nowrap",
            }}
          >
            SKILLS DE DESENVOLVIMENTO
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,255,128,0.4))" }} />
        </div>

        <div className="glass-card" style={{ padding: "1.25rem", borderTop: "2px solid rgba(0,255,128,0.35)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
            8 skills que automatizam o ciclo de desenvolvimento: review, spec, testes, deploy, segurança e documentação.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {CODE_SKILLS.map((sk) => (
              <SkillCard
                key={sk.name}
                skill={sk}
                accent="var(--accent)"
                agentColor="hsl(150,100%,55%)"
                depColor="var(--accent)"
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Skills de Domínio FIDC ── */}
      <div>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(0,255,255,0.4), transparent)" }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              letterSpacing: "0.15em",
              color: "hsl(180,100%,50%)",
              padding: "4px 14px",
              border: "1px solid rgba(0,255,255,0.3)",
              borderRadius: "var(--radius)",
              background: "rgba(0,255,255,0.06)",
              whiteSpace: "nowrap",
            }}
          >
            SKILLS DE DOMÍNIO FIDC
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,255,255,0.4))" }} />
        </div>

        <div className="glass-card" style={{ padding: "1.25rem", borderTop: "2px solid rgba(0,255,255,0.35)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)", margin: "0 0 1rem", lineHeight: 1.5 }}>
            7 skills do domínio FIDC: base regulatória CVM/BACEN, monitoramento de covenants, PDD, AML e onboarding.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {FIDC_SKILLS.map((sk) => (
              <SkillCard
                key={sk.name}
                skill={sk}
                accent="hsl(180,100%,50%)"
                agentColor="hsl(180,100%,60%)"
                depColor="hsl(180,100%,50%)"
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Grafo de Capacidades ── */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            color: "var(--text-4)",
            marginBottom: "0.25rem",
          }}
        >
          GRAFO DE CAPACIDADES — {TOTAL_CAPS} ENTRADAS · 6 TIPOS · pgvector
        </div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 1.25rem" }}>
          Distribuição por Tipo
        </h2>
        <CapabilitiesBarChart />

        {/* pgvector note */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.875rem 1rem",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: "var(--radius)",
            background: "rgba(167,139,250,0.05)",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "4px", letterSpacing: "0.08em" }}>
            BUSCA SEMÂNTICA (pgvector · gemini-embedding-001 · 3072d)
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "#a78bfa" }}>
            POST /rest/v1/rpc/search_capabilities
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginTop: "4px" }}>
            {`{"query_embedding": <vector>, "match_count": 5}`}
          </div>
        </div>
      </div>

      {/* ── 6. Economia Gerada ── */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            color: "var(--text-4)",
            marginBottom: "0.25rem",
          }}
        >
          ECONOMIA GERADA — PROGRESSIVE LOADING DE SKILLS
        </div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 1rem" }}>
          Impacto no Budget de Contexto
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem" }}>
          {/* Sem Progressive Loading */}
          <div
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid rgba(239,68,68,0.22)",
              borderRadius: "var(--radius)",
              background: "rgba(239,68,68,0.05)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#ef4444", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
              SEM PROGRESSIVE LOADING
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900, color: "#ef4444" }}>
              ~{BUDGET_SEM.toLocaleString("pt-BR")}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)", marginTop: "4px" }}>
              tokens por chamada
            </div>
          </div>

          {/* Com Progressive Loading */}
          <div
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid rgba(0,255,128,0.2)",
              borderRadius: "var(--radius)",
              background: "rgba(0,255,128,0.05)",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
              COM PROGRESSIVE LOADING
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900, color: "var(--accent)" }}>
              ~{BUDGET_ATUAL.toLocaleString("pt-BR")}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)", marginTop: "4px" }}>
              tokens por chamada
            </div>
          </div>

          {/* Economia */}
          <div
            style={{
              padding: "1rem 1.5rem",
              border: "1px solid rgba(0,255,128,0.25)",
              borderRadius: "var(--radius)",
              background: "rgba(0,255,128,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                ECONOMIA
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 900, color: "var(--accent)" }}>
                {ECONOMIA_PCT}%
              </div>
            </div>
          </div>
        </div>

        {/* Stacked bar */}
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "0.5rem", letterSpacing: "0.08em" }}>
            BUDGET ATUAL POR TIPO DE SKILL
          </div>
          <div style={{ display: "flex", height: 16, borderRadius: 3, overflow: "hidden", marginBottom: "0.625rem" }}>
            {CAPABILITY_KINDS.map((k) => (
              <div
                key={k.kind}
                title={`${k.kind}: ${k.count}`}
                style={{ width: `${(k.count / TOTAL_CAPS) * 100}%`, background: k.color }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
            {CAPABILITY_KINDS.map((k) => (
              <div key={k.kind} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: k.color }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-3)" }}>
                  {k.kind} ({k.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
