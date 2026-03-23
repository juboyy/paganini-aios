"use client";

import { useState } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────

const TOP_CLUSTERS = [
  { name: "Agent Orchestration", symbols: 216, cohesion: 0.61, domain: "code", key_files: ["kernel/engine.py", "kernel/router.py", "agents/framework.py"] },
  { name: "Guardrail Pipeline", symbols: 89, cohesion: 0.79, domain: "fidc", key_files: ["shared/guardrails.py", "agents/capabilities/compliance.py"] },
  { name: "RAG Pipeline", symbols: 67, cohesion: 0.72, domain: "code", key_files: ["kernel/memory.py", "rag/pipeline.py", "rag/embeddings.py"] },
  { name: "MetaClaw Engine", symbols: 54, cohesion: 0.68, domain: "code", key_files: ["kernel/metaclaw.py", "kernel/pack.py"] },
  { name: "FIDC Agents", symbols: 91, cohesion: 0.74, domain: "fidc", key_files: ["agents/capabilities/gestor.py", "agents/capabilities/compliance.py", "agents/capabilities/pricing.py"] },
  { name: "Dashboard API", symbols: 45, cohesion: 0.65, domain: "code", key_files: ["dashboard/app.py", "dashboard-v2/src/app/api/"] },
  { name: "Ontology & Schema", symbols: 38, cohesion: 0.71, domain: "fidc", key_files: ["ontology/schema.py", "ontology/builder.py"] },
  { name: "CLI & Config", symbols: 42, cohesion: 0.66, domain: "code", key_files: ["kernel/cli.py", "kernel/daemons.py"] },
];

const RECENT_PLANS = [
  {
    id: "PLAN-047",
    title: "Implementar Covenant Monitor Real-Time",
    status: "executed",
    domain: "fidc",
    date: "2026-03-23",
    source: "Jira SCRUM-234",
    stages_used: [1, 4, 10, 11, 12, 13, 14],
    blast_radius: { files: 8, functions: 23, tests: 12 },
    context_score: 0.94,
    agent: "Gestor + Code Agent",
    summary: "Monitoramento em tempo real de índice de subordinação, razão de garantia e limites de concentração. Context Scout identificou 3 módulos afetados e 2 edge cases não cobertos por testes.",
  },
  {
    id: "PLAN-046",
    title: "Migrar RAG para Hybrid BM25+Dense+Graph",
    status: "executed",
    domain: "code",
    date: "2026-03-22",
    source: "Linear VIV-92",
    stages_used: [1, 2, 4, 8, 10, 11, 12, 13],
    blast_radius: { files: 12, functions: 34, tests: 18 },
    context_score: 0.91,
    agent: "Architect + Code Agent",
    summary: "Migração do pipeline RAG de dense-only para híbrido com BM25, dense vectors e graph traversal. GitNexus impact analysis revelou 34 funções dependentes e 5 clusters afetados.",
  },
  {
    id: "PLAN-045",
    title: "GRPO Training Pipeline Tinker API",
    status: "executed",
    domain: "code",
    date: "2026-03-23",
    source: "Manual",
    stages_used: [1, 10, 11, 13, 17],
    blast_radius: { files: 4, functions: 12, tests: 3 },
    context_score: 0.88,
    agent: "Code Agent + Codex",
    summary: "Pipeline completo de RL training: geração de dataset dual-domain (13.7K samples), configuração GRPO com reward function, treinamento via Tinker API, upload HuggingFace.",
  },
  {
    id: "PLAN-044",
    title: "Detectar Padrões PLD/AML em Queries Adversariais",
    status: "executed",
    domain: "fidc",
    date: "2026-03-21",
    source: "Jira SCRUM-221",
    stages_used: [1, 4, 10, 11, 12, 13],
    blast_radius: { files: 3, functions: 8, tests: 15 },
    context_score: 0.96,
    agent: "Security + Compliance",
    summary: "Guardrail gate PLD/AML aprimorado com detecção de prompt injection tentando evadir controles. 23 patterns adversariais catalogados. Context Scout identificou 2 bypass paths.",
  },
  {
    id: "PLAN-043",
    title: "Dashboard v2 Enterprise Rebuild",
    status: "executed",
    domain: "code",
    date: "2026-03-18",
    source: "Linear VIV-88",
    stages_used: [1, 2, 4, 5, 8, 10, 11, 12, 13, 14],
    blast_radius: { files: 22, functions: 0, tests: 0 },
    context_score: 0.82,
    agent: "Code Agent + Docs",
    summary: "Rebuild completo do dashboard: 10 páginas, design system enterprise (Space Grotesk + IBM Plex Mono, neon green, glass cards), mobile-first, circuit patterns.",
  },
];

const PATH_RULES = [
  {
    pattern: "packages/agents/capabilities/*.py",
    domain: "fidc",
    rules: ["Enforce guardrail compliance em toda resposta", "Citar fonte regulatória (CVM/BACEN)", "Validar contra SOUL do agente", "Score mínimo de confiança: 0.85"],
    enforced: 234,
    violations: 12,
  },
  {
    pattern: "packages/kernel/*.py",
    domain: "code",
    rules: ["Engine patterns: singleton, factory, strategy", "Type hints obrigatórias", "Docstrings em português", "Max complexity: 15"],
    enforced: 189,
    violations: 8,
  },
  {
    pattern: "packages/shared/guardrails.py",
    domain: "fidc",
    rules: ["6 gates obrigatórios na pipeline", "Hard-stop em qualquer falha", "Log de auditoria em cada gate", "Teste adversarial para cada pattern"],
    enforced: 156,
    violations: 3,
  },
  {
    pattern: "packages/rag/*.py",
    domain: "code",
    rules: ["Hybrid search: BM25 + dense + graph", "Chunk size: 1024 tokens", "Overlap: 128 tokens", "Reranking obrigatório"],
    enforced: 112,
    violations: 5,
  },
  {
    pattern: "tests/*.py",
    domain: "code",
    rules: ["Cobertura mínima: 80% por módulo", "Testes adversariais para guardrails", "Mock de LLM obrigatório", "Fixtures compartilhadas via conftest"],
    enforced: 198,
    violations: 15,
  },
  {
    pattern: "packages/ontology/*.py",
    domain: "fidc",
    rules: ["Schema FIDC validado contra CVM 175", "Entidades: Fundo, Cedente, Sacado, Operação", "Relações tipadas", "Versionamento de schema"],
    enforced: 67,
    violations: 2,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cohesionColor(v: number): string {
  if (v >= 0.75) return "var(--accent)";
  if (v >= 0.65) return "var(--cyan)";
  return "#f59e0b";
}

function DomainBadge({ domain }: { domain: string }) {
  const isFidc = domain === "fidc";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.65rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: "4px",
        background: isFidc ? "rgba(0,210,255,0.12)" : "rgba(0,255,136,0.10)",
        color: isFidc ? "var(--cyan)" : "var(--accent)",
        border: `1px solid ${isFidc ? "rgba(0,210,255,0.25)" : "rgba(0,255,136,0.22)"}`,
        whiteSpace: "nowrap" as const,
      }}
    >
      {isFidc ? "FIDC" : "CODE"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.65rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: "4px",
        background: "rgba(0,255,136,0.10)",
        color: "var(--accent)",
        border: "1px solid rgba(0,255,136,0.22)",
      }}
    >
      ✓ {status}
    </span>
  );
}

function CohesionBar({ value }: { value: number }) {
  const color = cohesionColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          flex: 1,
          height: "4px",
          borderRadius: "2px",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value * 100}%`,
            height: "100%",
            background: color,
            borderRadius: "2px",
            boxShadow: `0 0 6px ${color}80`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          color,
          minWidth: "32px",
        }}
      >
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function ContextScoreBar({ value }: { value: number }) {
  const color = value >= 0.9 ? "var(--accent)" : value >= 0.85 ? "var(--cyan)" : "#f59e0b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          flex: 1,
          height: "6px",
          borderRadius: "3px",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            borderRadius: "3px",
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          color,
          fontWeight: 700,
          minWidth: "36px",
        }}
      >
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── Tab: Context Scout ─────────────────────────────────────────────────────────

function TabContextScout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }}>
        {[
          { label: "NODES INDEXADOS", value: "17.319", sub: "Symbols, funções, classes no grafo de código" },
          { label: "EDGES", value: "45.978", sub: "Relações entre componentes" },
          { label: "CLUSTERS", value: "734", sub: "Agrupamentos de alta coesão" },
          { label: "FLOWS", value: "300", sub: "Fluxos de dados end-to-end" },
        ].map((s) => (
          <div className="glass-card p-4" key={s.label}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                color: "var(--text-4)",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              {s.label}
            </div>
            <div className="stat-value">{s.value}</div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-3)",
                marginTop: "4px",
              }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Help */}
      <p className="section-help">
        Context Scout mantém um grafo semântico vivo do codebase. Antes de cada tarefa, GitNexus consulta esse grafo para identificar clusters impactados, calcular blast radius e gerar planos contextualizados.
      </p>

      {/* Clusters Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}>
        {TOP_CLUSTERS.map((c) => (
          <div className="glass-card p-4" key={c.name} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--text-1)", fontWeight: 600 }}>
                {c.name}
              </div>
              <DomainBadge domain={c.domain} />
            </div>

            {/* Symbol count */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="var(--text-4)" strokeWidth="1.2" />
                <circle cx="6" cy="6" r="2" fill="var(--accent)" />
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-3)" }}>
                <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{c.symbols}</span> symbols
              </span>
            </div>

            {/* Cohesion */}
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "4px", textTransform: "uppercase" }}>
                Cohesion
              </div>
              <CohesionBar value={c.cohesion} />
            </div>

            {/* Key files */}
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "6px", textTransform: "uppercase" }}>
                Key Files
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {c.key_files.map((f) => (
                  <div key={f} style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--cyan)", opacity: 0.85 }}>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Planning ──────────────────────────────────────────────────────────────

function BlastRadiusViz({ blast }: { blast: { files: number; functions: number; tests: number } }) {
  const maxVal = Math.max(blast.files, blast.functions, blast.tests, 1);
  const items = [
    { label: "Files", value: blast.files, color: "var(--accent)" },
    { label: "Funcs", value: blast.functions, color: "var(--cyan)" },
    { label: "Tests", value: blast.tests, color: "#a78bfa" },
  ];
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      {items.map((item) => {
        const r = Math.max(10, (item.value / maxVal) * 22);
        return (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r={r}
                fill={`${item.color}18`}
                stroke={item.color}
                strokeWidth="1.5"
                strokeOpacity="0.7"
              />
              <text
                x="24"
                y="24"
                textAnchor="middle"
                dominantBaseline="central"
                fill={item.color}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight="700"
              >
                {item.value}
              </text>
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
              {item.label.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PlanCard({ plan }: { plan: typeof RECENT_PLANS[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="glass-card p-4"
      style={{ display: "flex", flexDirection: "column", gap: "12px", cursor: "pointer" }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" as const }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700 }}>
              {plan.id}
            </span>
            <StatusBadge status={plan.status} />
            <DomainBadge domain={plan.domain} />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--text-1)", fontWeight: 600 }}>
            {plan.title}
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)", whiteSpace: "nowrap" as const }}>
          {plan.date}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" as const }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-3)" }}>
          <span style={{ color: "var(--text-4)" }}>source </span>{plan.source}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-3)" }}>
          <span style={{ color: "var(--text-4)" }}>agent </span>{plan.agent}
        </span>
      </div>

      {/* Context score */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "4px", textTransform: "uppercase" }}>
          Context Score
        </div>
        <ContextScoreBar value={plan.context_score} />
      </div>

      {/* Blast radius */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "6px", textTransform: "uppercase" }}>
          Blast Radius
        </div>
        <BlastRadiusViz blast={plan.blast_radius} />
      </div>

      {/* Expand indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
          {expanded ? "▲ RECOLHER" : "▼ VER DETALHES"}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Summary */}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
            {plan.summary}
          </p>

          {/* Stages */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "6px", textTransform: "uppercase" }}>
              Stages Utilizadas
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
              {plan.stages_used.map((s) => (
                <span
                  key={s}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.65rem",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(0,255,136,0.08)",
                    color: "var(--accent)",
                    border: "1px solid rgba(0,255,136,0.18)",
                    letterSpacing: "0.05em",
                  }}
                >
                  S{s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabPlanning() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <p className="section-help">
        Cada tarefa gera um plano codebase-aware: Context Scout analisa o grafo, GitNexus calcula blast radius, e os agentes recebem contexto cirúrgico antes de qualquer mudança. Planos são rastreados e auditáveis.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {RECENT_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

// ── Tab: Path Rules ────────────────────────────────────────────────────────────

function EnforcementBar({ enforced, violations }: { enforced: number; violations: number }) {
  const total = enforced + violations;
  const okPct = total > 0 ? (enforced / total) * 100 : 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.08)", overflow: "hidden", position: "relative" as const }}>
        <div style={{ width: `${okPct}%`, height: "100%", background: "var(--accent)", borderRadius: "3px" }} />
        <div style={{ position: "absolute" as const, right: 0, top: 0, width: `${(violations / total) * 100}%`, height: "100%", background: "#ef4444", borderRadius: "3px" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--accent)" }}>
          {enforced} enforced
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "#ef4444" }}>
          {violations} violations
        </span>
      </div>
    </div>
  );
}

function PathRuleCard({ rule }: { rule: typeof PATH_RULES[0] }) {
  return (
    <div className="glass-card p-4" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            color: "var(--cyan)",
            flex: 1,
            wordBreak: "break-all" as const,
          }}
        >
          {rule.pattern}
        </span>
        <DomainBadge domain={rule.domain} />
      </div>

      {/* Rules list */}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "5px" }}>
        {rule.rules.map((r) => (
          <li key={r} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }}>›</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-2)", lineHeight: 1.5 }}>
              {r}
            </span>
          </li>
        ))}
      </ul>

      {/* Enforcement stats */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "6px", textTransform: "uppercase" }}>
          Enforcement
        </div>
        <EnforcementBar enforced={rule.enforced} violations={rule.violations} />
      </div>
    </div>
  );
}

function TabPathRules() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <p className="section-help">
        Path-based instructions são injetadas automaticamente no contexto dos agentes baseado no glob pattern dos arquivos modificados. Garantem conformidade regulatória e padrões de código por camada do sistema.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}>
        {PATH_RULES.map((rule) => (
          <PathRuleCard key={rule.pattern} rule={rule} />
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "scout", label: "🔍 Context Scout" },
  { id: "planning", label: "📋 Planning" },
  { id: "pathrules", label: "🛤️ Path Rules" },
];

export default function PlanningPage() {
  const [activeTab, setActiveTab] = useState("scout");

  return (
    <div style={{ padding: "32px", maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Page Header */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--text-1)",
            margin: 0,
            marginBottom: "8px",
          }}
        >
          Codebase Planning & Context Intelligence
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            color: "var(--text-3)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Context Scout + GitNexus analisam o codebase antes de cada tarefa — gerando planos inteligentes
          fundamentados na estrutura real do código e nos padrões regulatórios FIDC.
        </p>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "0",
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                letterSpacing: "0.05em",
                color: active ? "var(--accent)" : "var(--text-3)",
                padding: "10px 20px",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "scout" && <TabContextScout />}
      {activeTab === "planning" && <TabPlanning />}
      {activeTab === "pathrules" && <TabPathRules />}
    </div>
  );
}
