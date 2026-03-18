"use client";

import { useState } from "react";

// ─── TIER 1 — EQUIPE DE DESENVOLVIMENTO (12 agentes reais do Supabase) ───────
const DEV_AGENTS = [
  {
    slug: "oracli",
    name: "OraCLI",
    emoji: "🧠",
    model: "claude-opus-4-6-thinking",
    tier: "chief",
    status: "active",
    role: "Chief Orchestrator — orquestra todos os agentes, gerencia BMAD-CE, memória de longo prazo, decisões estratégicas",
    domains: ["orquestração", "estratégia", "memória"],
    capabilities: ["orchestrate_agents()", "run_bmad_pipeline()", "manage_memory()", "spawn_subagent()", "resolve_conflicts()"],
    tasks: 3847,
    avgLatency: "4.2s",
    tokens: "8.4M",
  },
  {
    slug: "code-agent",
    name: "Code Agent",
    emoji: "💻",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "CTO / Codex Supervisor — specs técnicas, implementação, revisão de código, QA, supervisiona Codex",
    domains: ["código", "arquitetura", "review"],
    capabilities: ["write_spec()", "invoke_codex()", "review_pr()", "run_qa()", "validate_implementation()"],
    tasks: 2134,
    avgLatency: "6.8s",
    tokens: "5.2M",
  },
  {
    slug: "docs-agent",
    name: "Docs Agent",
    emoji: "📝",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "Docs Lead — documentação técnica, Confluence, knowledge management, QMD, changelogs",
    domains: ["documentação", "confluence", "wiki"],
    capabilities: ["write_docs()", "update_confluence()", "generate_qmd()", "write_changelog()", "document_api()"],
    tasks: 891,
    avgLatency: "5.6s",
    tokens: "1.9M",
  },
  {
    slug: "infra-agent",
    name: "Infra & DevOps Agent",
    emoji: "🏗️",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "Infra Lead — deploy, Docker, CI/CD pipelines, monitoramento, infraestrutura cloud",
    domains: ["deploy", "ci/cd", "infra"],
    capabilities: ["deploy_preview()", "deploy_prod()", "build_docker()", "setup_ci()", "monitor_health()"],
    tasks: 647,
    avgLatency: "11.3s",
    tokens: "1.1M",
  },
  {
    slug: "general-agent",
    name: "General Agent",
    emoji: "🤖",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "Generalist — Slack, revisão UX, triagem, pesquisa técnica, tasks sem dono definido",
    domains: ["slack", "ux", "pesquisa"],
    capabilities: ["send_slack()", "review_ux()", "triage_task()", "research_topic()", "draft_comms()"],
    tasks: 1203,
    avgLatency: "3.1s",
    tokens: "2.7M",
  },
  {
    slug: "architect-agent",
    name: "Architect Agent",
    emoji: "🏗️",
    model: "claude-opus-4-6-thinking",
    tier: "lead",
    status: "active",
    role: "Architect — design de sistema, contratos de API, modelos de dados, ADRs de arquitetura",
    domains: ["arquitetura", "api", "design"],
    capabilities: ["design_system()", "define_api()", "create_adr()", "review_architecture()", "model_data()"],
    tasks: 412,
    avgLatency: "9.7s",
    tokens: "2.1M",
  },
  {
    slug: "pm-agent",
    name: "PM Agent",
    emoji: "📋",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "Project Manager — planejamento de sprint, stories, priorização de backlog, decomposição de épicos",
    domains: ["planejamento", "sprint", "backlog"],
    capabilities: ["create_sprint()", "write_story()", "prioritize_backlog()", "decompose_epic()", "estimate_effort()"],
    tasks: 567,
    avgLatency: "2.8s",
    tokens: "890K",
  },
  {
    slug: "data-agent",
    name: "Data Agent",
    emoji: "📊",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "Data Agent — schemas de DB, migrações, analytics, qualidade de dados, SQL, Supabase",
    domains: ["database", "analytics", "sql"],
    capabilities: ["design_schema()", "write_migration()", "run_analytics()", "validate_data()", "query_supabase()"],
    tasks: 378,
    avgLatency: "4.4s",
    tokens: "780K",
  },
  {
    slug: "qa-agent",
    name: "QA Agent",
    emoji: "🧪",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "QA Agent — estratégia de testes, execução, cobertura, regressão, E2E, relatórios de qualidade",
    domains: ["testes", "qualidade", "e2e"],
    capabilities: ["write_test()", "run_suite()", "check_coverage()", "regression_test()", "e2e_test()"],
    tasks: 734,
    avgLatency: "5.2s",
    tokens: "1.3M",
  },
  {
    slug: "security-agent",
    name: "Security Agent",
    emoji: "🛡️",
    model: "claude-sonnet-4-6",
    tier: "lead",
    status: "active",
    role: "Security Agent — scan de vulnerabilidades, gestão de secrets, controle de acesso, auditoria",
    domains: ["segurança", "secrets", "acesso"],
    capabilities: ["scan_vulns()", "rotate_secrets()", "audit_access()", "check_deps()", "security_gate()"],
    tasks: 289,
    avgLatency: "8.9s",
    tokens: "620K",
  },
  {
    slug: "codex",
    name: "Codex",
    emoji: "⚡",
    model: "gpt-5.3-codex",
    tier: "engine",
    status: "active",
    role: "Code Execution Engine — implementa código a partir de spec.md, sandboxed, sem acesso externo",
    domains: ["execução", "sandbox", "código"],
    capabilities: ["implement_spec()", "generate_module()", "write_function()", "refactor_code()", "fix_bug()"],
    tasks: 4821,
    avgLatency: "18.4s",
    tokens: "12.7M",
  },
  {
    slug: "joao-ceo",
    name: "João CEO",
    emoji: "👔",
    model: "human",
    tier: "human",
    status: "active",
    role: "Founder — aprovações de produção (Linear), decisões estratégicas, direção de produto, visão",
    domains: ["decisão", "produto", "visão"],
    capabilities: ["approve_prod()", "set_direction()", "review_sprint()", "define_vision()", "unblock_team()"],
    tasks: 0,
    avgLatency: "∞",
    tokens: "∞",
  },
];

// ─── TIER 2 — DOMÍNIO FIDC (14 agentes existentes) ──────────────────────────
const FIDC_AGENTS = [
  {
    slug: "orchestrator",
    name: "orchestrator",
    emoji: "🎯",
    model: "claude-opus-4-6",
    tier: "fidc",
    status: "active",
    role: "Coordenador central — decompõe tarefas, executa fluxos (Purchase/Report/Onboard), resolve conflitos",
    domains: ["orquestração", "roteamento"],
    capabilities: ["decompose_task()", "execute_flow()", "aggregate_results()", "resolve_conflicts()"],
    tasks: 1284,
    avgLatency: "1.2s",
    tokens: "2.1M",
  },
  {
    slug: "administrador",
    name: "administrador",
    emoji: "📊",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Cálculo de NAV (PL), gestão de cotas sênior/subordinada, relatórios ANBIMA",
    domains: ["nav", "cotas", "relatórios"],
    capabilities: ["calculate_nav()", "calculate_quota_price()", "issue_quotas()", "process_redemption()", "generate_daily_report()"],
    tasks: 847,
    avgLatency: "4.8s",
    tokens: "890K",
  },
  {
    slug: "compliance",
    name: "compliance",
    emoji: "🛡️",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Pipeline de 6 portões: Elegibilidade → Concentração → Covenant → PLD/AML → CVM 175 → Risco",
    domains: ["compliance", "aml", "regulação"],
    capabilities: ["check_eligibility()", "check_concentration()", "check_covenant()", "check_pld_aml()", "run_pipeline()"],
    tasks: 1847,
    avgLatency: "3.1s",
    tokens: "1.4M",
  },
  {
    slug: "custodia",
    name: "custodia",
    emoji: "🔐",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Registro de títulos, verificação de lastro, reconciliação D+2, liquidação",
    domains: ["custódia", "lastro", "liquidação"],
    capabilities: ["register_title()", "verify_collateral()", "reconcile_portfolio()", "process_settlement()"],
    tasks: 622,
    avgLatency: "2.2s",
    tokens: "520K",
  },
  {
    slug: "due-diligence",
    name: "due-diligence",
    emoji: "🔍",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Scoring de cedentes (5 critérios), validação CNPJ mod-11, análise financeira",
    domains: ["dd", "cnpj", "scoring"],
    capabilities: ["score_cedente()", "validate_cnpj()", "check_pep()", "analyze_financials()", "run_onboarding_pipeline()"],
    tasks: 413,
    avgLatency: "7.2s",
    tokens: "670K",
  },
  {
    slug: "gestor",
    name: "gestor",
    emoji: "📈",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Alocação de carteira, limites de concentração (HHI), rebalanceamento, stress test",
    domains: ["portfolio", "concentração", "risco"],
    capabilities: ["calculate_portfolio_allocation()", "check_concentration_limits()", "rebalance_portfolio()", "stress_test()"],
    tasks: 534,
    avgLatency: "4.2s",
    tokens: "780K",
  },
  {
    slug: "pricing",
    name: "pricing",
    emoji: "💰",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "PDD BACEN 2682/99 (7 buckets), mark-to-market (DCF), yield anualizado",
    domains: ["pricing", "pdd", "mtm"],
    capabilities: ["calculate_pdd_aging()", "mark_to_market()", "calculate_discount_rate()", "calculate_yield()"],
    tasks: 956,
    avgLatency: "3.8s",
    tokens: "1.1M",
  },
  {
    slug: "risk",
    name: "risk",
    emoji: "⚡",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "VaR histórico e paramétrico, Expected/Unexpected Loss (Basel II), concentração HHI",
    domains: ["risco", "var", "stress"],
    capabilities: ["calculate_var()", "stress_test()", "calculate_expected_loss()", "concentration_risk()", "risk_rating()"],
    tasks: 478,
    avgLatency: "5.1s",
    tokens: "890K",
  },
  {
    slug: "treasury",
    name: "treasury",
    emoji: "🏦",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Projeção de fluxo de caixa 90d, índice LCR, duration gap, aprovação de resgates",
    domains: ["tesouraria", "liquidez", "caixa"],
    capabilities: ["project_cash_flow()", "calculate_liquidity_ratio()", "duration_gap()", "process_redemption_request()"],
    tasks: 312,
    avgLatency: "3.4s",
    tokens: "440K",
  },
  {
    slug: "auditor",
    name: "auditor",
    emoji: "🔬",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Validação aritmética de NAV, detecção de anomalias (2σ), auditoria cruzada entre agentes",
    domains: ["auditoria", "qa", "anomalias"],
    capabilities: ["validate_nav()", "cross_validate_agents()", "detect_anomalies()", "audit_execution_trace()"],
    tasks: 267,
    avgLatency: "6.3s",
    tokens: "520K",
  },
  {
    slug: "reporting",
    name: "reporting",
    emoji: "📋",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Informes CVM 175, cartas ao investidor, relatórios por cedente, formatação BRL",
    domains: ["relatórios", "cvm", "documentos"],
    capabilities: ["generate_monthly_report()", "generate_cvm_filing()", "generate_investor_letter()"],
    tasks: 196,
    avgLatency: "15.2s",
    tokens: "440K",
  },
  {
    slug: "investor-relations",
    name: "investor-relations",
    emoji: "🤝",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "active",
    role: "Performance MTD/YTD, Sharpe vs CDI, max drawdown, distribuição de rendimentos",
    domains: ["ir", "performance", "investidor"],
    capabilities: ["calculate_performance()", "calculate_sharpe_ratio()", "generate_factsheet()", "calculate_distribution()"],
    tasks: 178,
    avgLatency: "4.5s",
    tokens: "380K",
  },
  {
    slug: "regulatory-watch",
    name: "regulatory-watch",
    emoji: "📡",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "watching",
    role: "Monitoramento CVM/BACEN, calendário de obrigações (CADOC 3040, AGO), alertas",
    domains: ["regulatório", "cvm", "bacen"],
    capabilities: ["check_cvm_publications()", "assess_impact()", "check_compliance_calendar()"],
    tasks: 89,
    avgLatency: "8.1s",
    tokens: "280K",
  },
  {
    slug: "knowledge-graph",
    name: "knowledge-graph",
    emoji: "🧠",
    model: "claude-sonnet-4-6",
    tier: "fidc",
    status: "watching",
    role: "Extração de entidades, grafo de relacionamentos, resolução de entidades, ChromaDB",
    domains: ["kg", "rag", "embeddings"],
    capabilities: ["extract_entities()", "build_relationships()", "query_graph()", "entity_resolution()"],
    tasks: 284,
    avgLatency: "12.3s",
    tokens: "3.2M",
  },
];

const ALL_AGENTS = [...DEV_AGENTS, ...FIDC_AGENTS];

// ─── MODEL BADGE STYLING ─────────────────────────────────────────────────────
const MODEL_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  "claude-opus-4-6-thinking": { color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.28)" },
  "claude-sonnet-4-6":        { color: "hsl(180 100% 50%)", bg: "rgba(0,255,255,0.07)", border: "rgba(0,255,255,0.22)" },
  "gpt-5.3-codex":            { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)" },
  "claude-opus-4-6":          { color: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.25)" },
  "human":                    { color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.28)" },
};

// ─── TIER ACCENT ─────────────────────────────────────────────────────────────
const TIER_ACCENT: Record<string, string> = {
  chief:  "hsl(150 100% 55%)",
  lead:   "hsl(150 100% 50%)",
  engine: "hsl(45 100% 55%)",
  human:  "#fb923c",
  fidc:   "hsl(150 100% 50%)",
};

// ─── SPAWN HISTORY ───────────────────────────────────────────────────────────
const SPAWN_HISTORY = [
  { ts: "14:14:52", parent: "oracli",         child: "code-agent",       depth: 1, duration: "6.8s",  status: "OK" },
  { ts: "14:14:38", parent: "code-agent",      child: "codex",            depth: 2, duration: "18.4s", status: "OK" },
  { ts: "14:14:12", parent: "codex",           child: "qa-agent",         depth: 3, duration: "5.2s",  status: "OK" },
  { ts: "14:13:54", parent: "oracli",         child: "pm-agent",         depth: 1, duration: "2.8s",  status: "OK" },
  { ts: "14:13:41", parent: "pm-agent",        child: "architect-agent",  depth: 2, duration: "9.7s",  status: "OK" },
  { ts: "14:13:25", parent: "architect-agent", child: "code-agent",       depth: 3, duration: "6.8s",  status: "OK" },
  { ts: "14:13:08", parent: "oracli",         child: "infra-agent",      depth: 1, duration: "11.3s", status: "OK" },
  { ts: "14:12:51", parent: "infra-agent",     child: "security-agent",   depth: 2, duration: "8.9s",  status: "WARN" },
  { ts: "14:12:33", parent: "security-agent",  child: "compliance",       depth: 3, duration: "3.1s",  status: "OK" },
  { ts: "14:12:14", parent: "oracli",         child: "general-agent",    depth: 1, duration: "3.1s",  status: "OK" },
  { ts: "14:11:58", parent: "general-agent",   child: "data-agent",       depth: 2, duration: "4.4s",  status: "OK" },
  { ts: "14:11:40", parent: "oracli",         child: "orchestrator",     depth: 1, duration: "1.2s",  status: "OK" },
  { ts: "14:11:28", parent: "orchestrator",    child: "compliance",       depth: 2, duration: "3.1s",  status: "OK" },
  { ts: "14:11:14", parent: "compliance",      child: "auditor",          depth: 3, duration: "6.3s",  status: "OK" },
  { ts: "14:10:57", parent: "orchestrator",    child: "pricing",          depth: 2, duration: "3.8s",  status: "OK" },
  { ts: "14:10:42", parent: "pricing",         child: "risk",             depth: 3, duration: "5.1s",  status: "OK" },
  { ts: "14:10:25", parent: "joao-ceo",        child: "oracli",          depth: 0, duration: "—",     status: "APRV" },
];

// ─── SVG TOPOLOGY ────────────────────────────────────────────────────────────
const CX = 390, CY = 290;
const innerR  = 100;  // dev team ring
const outerR  = 210;  // FIDC ring

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: Math.round(cx + r * Math.cos(rad)), y: Math.round(cy + r * Math.sin(rad)) };
}

const DEV_SLUGS  = DEV_AGENTS.map((a) => a.slug);
const FIDC_SLUGS = FIDC_AGENTS.map((a) => a.slug);

const SHORT: Record<string, string> = {
  "oracli": "ORA", "code-agent": "CODE", "docs-agent": "DOCS", "infra-agent": "INFRA",
  "general-agent": "GEN", "architect-agent": "ARCH", "pm-agent": "PM",
  "data-agent": "DATA", "qa-agent": "QA", "security-agent": "SEC",
  "codex": "CODEX", "joao-ceo": "CEO",
  "orchestrator": "ORCH", "administrador": "ADMN", "compliance": "COMP",
  "custodia": "CUST", "due-diligence": "DD", "gestor": "GEST",
  "pricing": "PRCE", "risk": "RISK", "treasury": "TRES",
  "auditor": "AUDT", "reporting": "RPT", "investor-relations": "IR",
  "regulatory-watch": "REGW", "knowledge-graph": "KG",
};

const TOPOLOGY_AGENTS = [
  // OraCLI at center
  { id: "oracli", label: "ORA", x: CX, y: CY, ring: "center" },
  // Other dev agents in inner ring (11 agents, skip oracli)
  ...DEV_AGENTS.filter((a) => a.slug !== "oracli").map((a, i) => {
    const angle = (360 / 11) * i;
    const pos = polarToCart(CX, CY, innerR, angle);
    return { id: a.slug, label: SHORT[a.slug] ?? a.slug.slice(0, 4).toUpperCase(), ...pos, ring: "dev" };
  }),
  // FIDC in outer ring
  ...FIDC_AGENTS.map((a, i) => {
    const angle = (360 / FIDC_AGENTS.length) * i;
    const pos = polarToCart(CX, CY, outerR, angle);
    return { id: a.slug, label: SHORT[a.slug] ?? a.slug.slice(0, 4).toUpperCase(), ...pos, ring: "fidc" };
  }),
];

const ACTIVE_EDGES: [string, string][] = [
  // OraCLI → dev leads
  ["oracli", "code-agent"],
  ["oracli", "pm-agent"],
  ["oracli", "architect-agent"],
  ["oracli", "infra-agent"],
  ["oracli", "general-agent"],
  ["oracli", "docs-agent"],
  ["oracli", "data-agent"],
  // OraCLI → FIDC orchestrator
  ["oracli", "orchestrator"],
  // code-agent → codex
  ["code-agent", "codex"],
  // code-agent → qa-agent
  ["code-agent", "qa-agent"],
  // infra-agent → security-agent
  ["infra-agent", "security-agent"],
  // security-agent → compliance
  ["security-agent", "compliance"],
  // code-agent → fidc systems
  ["code-agent", "compliance"],
  ["code-agent", "pricing"],
  ["code-agent", "reporting"],
  // data-agent → fidc data
  ["data-agent", "knowledge-graph"],
  ["data-agent", "risk"],
  // joao-ceo → oracli
  ["joao-ceo", "oracli"],
  // FIDC internal
  ["orchestrator", "administrador"],
  ["orchestrator", "compliance"],
  ["orchestrator", "due-diligence"],
  ["orchestrator", "pricing"],
  ["orchestrator", "gestor"],
  ["orchestrator", "treasury"],
  ["orchestrator", "knowledge-graph"],
  ["orchestrator", "reporting"],
  ["due-diligence", "compliance"],
  ["due-diligence", "knowledge-graph"],
  ["compliance", "auditor"],
  ["pricing", "risk"],
  ["administrador", "custodia"],
  ["reporting", "investor-relations"],
  ["regulatory-watch", "compliance"],
  ["risk", "gestor"],
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active"   ? "var(--accent)"
    : status === "watching" ? "var(--cyan)"
    : "var(--text-4)";
  const bg =
    status === "active"   ? "hsl(150 100% 50% / 0.1)"
    : status === "watching" ? "hsl(180 100% 50% / 0.1)"
    : "transparent";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 8px", borderRadius: "var(--radius)",
        background: bg, border: `1px solid ${color}`,
        fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
        color, letterSpacing: "0.1em", whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5, height: 5, borderRadius: "50%", background: color,
          boxShadow: status === "active" ? `0 0 6px ${color}` : "none",
          animation: status === "active" ? "pulse-neon 2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {status === "active" ? "ATIVO" : status === "watching" ? "MONIT." : status.toUpperCase()}
    </span>
  );
}

function ModelBadge({ model }: { model: string }) {
  const s = MODEL_STYLE[model] ?? { color: "var(--text-3)", bg: "transparent", border: "var(--border)" };
  return (
    <span
      style={{
        display: "inline-block", padding: "1px 7px",
        borderRadius: "var(--radius)", border: `1px solid ${s.border}`,
        background: s.bg, fontFamily: "var(--font-mono)",
        fontSize: "0.5rem", color: s.color, letterSpacing: "0.08em",
        whiteSpace: "nowrap",
      }}
    >
      {model}
    </span>
  );
}

function TierDivider({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "0.25rem 0" }}>
      <div
        style={{
          flex: 1, height: 1,
          background: "linear-gradient(90deg, transparent, hsl(150 100% 50% / 0.25), transparent)",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
          letterSpacing: "0.18em", color: "var(--accent)",
          padding: "4px 14px", border: "1px solid hsl(150 100% 50% / 0.25)",
          borderRadius: "var(--radius)", background: "hsl(150 100% 50% / 0.06)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
        <span style={{ color: "var(--text-4)", marginLeft: 8 }}>·</span>
        <span style={{ color: "var(--cyan)", marginLeft: 8 }}>{count} AGENTES</span>
      </span>
      <div
        style={{
          flex: 1, height: 1,
          background: "linear-gradient(90deg, transparent, hsl(150 100% 50% / 0.25), transparent)",
        }}
      />
    </div>
  );
}

type AnyAgent = typeof DEV_AGENTS[0] | typeof FIDC_AGENTS[0];

function AgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: AnyAgent;
  selected: boolean;
  onSelect: () => void;
}) {
  const accentColor = TIER_ACCENT[agent.tier] ?? "var(--accent)";
  const isHuman = agent.model === "human";

  return (
    <div
      className="glass-card"
      style={{
        padding: "1.25rem",
        cursor: "pointer",
        border: selected ? `1px solid ${accentColor}` : undefined,
        boxShadow: selected ? `0 0 22px ${accentColor}33` : undefined,
        position: "relative",
        overflow: "hidden",
      }}
      onClick={onSelect}
    >
      {/* Tier accent bar */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${accentColor}00, ${accentColor}, ${accentColor}00)`,
          opacity: selected ? 1 : 0.4,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", marginBottom: "0.75rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1rem" }}>{agent.emoji}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.875rem",
                color: accentColor, fontWeight: 600,
              }}
            >
              {"name" in agent ? agent.name : agent.slug}
            </span>
            <ModelBadge model={agent.model} />
          </div>
          <div
            style={{
              fontSize: "0.6875rem", color: "var(--text-3)",
              lineHeight: 1.4,
            }}
          >
            {agent.role}
          </div>
        </div>
        <div style={{ marginLeft: "0.75rem", flexShrink: 0 }}>
          <StatusBadge status={agent.status} />
        </div>
      </div>

      {/* Domains */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "0.75rem" }}>
        {agent.domains.map((d) => (
          <span key={d} className="tag-badge-cyan">{d}</span>
        ))}
      </div>

      {/* Capabilities */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "4px",
          }}
        >
          CAPACIDADES
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                color: "var(--text-3)", background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border)", padding: "1px 6px",
                borderRadius: "var(--radius)",
              }}
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Footer metrics */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem",
          paddingTop: "0.75rem", borderTop: "1px solid var(--border)",
        }}
      >
        {[
          { label: "TAREFAS",      value: isHuman ? "—" : agent.tasks.toLocaleString("pt-BR") },
          { label: "LATÊNCIA MÉD.", value: agent.avgLatency },
          { label: "TOKENS",       value: agent.tokens === "∞" ? "∞" : agent.tokens },
        ].map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.4375rem",
                letterSpacing: "0.1em", color: "var(--text-4)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                color: "var(--text-1)", fontWeight: 600, marginTop: "2px",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const getNodePos = (id: string) =>
    TOPOLOGY_AGENTS.find((a) => a.id === id) ?? { x: CX, y: CY };

  const totalTasks = ALL_AGENTS.reduce((acc, a) => acc + (typeof a.tasks === "number" ? a.tasks : 0), 0);
  const activeCount  = ALL_AGENTS.filter((a) => a.status === "active").length;
  const watchingCount = ALL_AGENTS.filter((a) => a.status === "watching").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Cabeçalho ── */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem",
          }}
        >
          PAGANINI AIOS · FROTA COMPLETA DE AGENTES
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          26 Agentes{" "}
          <span style={{ color: "var(--accent)" }}>+ Topologia de Delegação</span>
        </h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          12 agentes de desenvolvimento (Supabase) + 14 agentes FIDC — dois níveis hierárquicos, 52 capacidades indexadas
        </p>
      </div>

      {/* ── Métricas principais ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {[
          { label: "TOTAL DE AGENTES",   value: "26",                               color: "var(--text-1)" },
          { label: "ATIVOS",             value: String(activeCount),                color: "var(--accent)" },
          { label: "MONITORANDO",        value: String(watchingCount),              color: "var(--cyan)" },
          { label: "CAPACIDADES GRAPH",  value: "52",                               color: "#a78bfa" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: "2rem", fontWeight: 700, color: s.color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── TIER 1 — EQUIPE DE DESENVOLVIMENTO ── */}
      <TierDivider label="TIER 1 — EQUIPE DE DESENVOLVIMENTO" count={12} />

      {/* Legenda de modelos */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "-0.5rem" }}>
        {Object.entries(MODEL_STYLE).map(([model, s]) => (
          <div key={model} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 1, background: s.color, opacity: 0.8 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
              {model}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "1rem",
        }}
      >
        {DEV_AGENTS.map((agent) => (
          <AgentCard
            key={agent.slug}
            agent={agent}
            selected={selectedAgent === agent.slug}
            onSelect={() => setSelectedAgent(selectedAgent === agent.slug ? null : agent.slug)}
          />
        ))}
      </div>

      {/* ── TIER 2 — DOMÍNIO FIDC ── */}
      <TierDivider label="TIER 2 — DOMÍNIO FIDC" count={14} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "1rem",
        }}
      >
        {FIDC_AGENTS.map((agent) => (
          <AgentCard
            key={agent.slug}
            agent={agent}
            selected={selectedAgent === agent.slug}
            onSelect={() => setSelectedAgent(selectedAgent === agent.slug ? null : agent.slug)}
          />
        ))}
      </div>

      {/* ── SVG Topologia ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.5rem",
          }}
        >
          TOPOLOGIA DE DELEGAÇÃO · 26 NÓS · OraCLI → ANEL DEV → ANEL FIDC
        </div>
        <p style={{ color: "var(--text-4)", fontSize: 11, marginBottom: "1rem" }}>
          Clique num agente para destacar suas conexões
        </p>
        <div style={{ overflowX: "auto" }}>
          <svg
            width="780"
            height="580"
            viewBox="0 0 780 580"
            style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
          >
            <defs>
              <marker id="arr-active" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="hsl(150 100% 50% / 0.85)" />
              </marker>
              <marker id="arr-dim" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="hsl(150 100% 50% / 0.07)" />
              </marker>
              <marker id="arr-ceo" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="rgba(251,146,60,0.9)" />
              </marker>
              <marker id="arr-codex" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="rgba(245,158,11,0.9)" />
              </marker>
              {/* Glows */}
              <radialGradient id="glow-ora" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(150 100% 55% / 0.45)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="glow-dev" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(150 100% 50% / 0.22)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="glow-fidc" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(180 100% 50% / 0.18)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="glow-codex" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(45 100% 55% / 0.28)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="glow-human" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(251,146,60,0.25)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Ring guides */}
            <circle cx={CX} cy={CY} r={innerR}
              fill="none" stroke="hsl(150 100% 50% / 0.07)" strokeWidth="1" strokeDasharray="4 7" />
            <circle cx={CX} cy={CY} r={outerR}
              fill="none" stroke="hsl(180 100% 50% / 0.07)" strokeWidth="1" strokeDasharray="4 7" />

            {/* Edges */}
            {ACTIVE_EDGES.map(([from, to]) => {
              const f = getNodePos(from);
              const t = getNodePos(to);
              const highlighted =
                selectedAgent === null || selectedAgent === from || selectedAgent === to;
              const isCeo   = from === "joao-ceo";
              const isCodex = from === "code-agent" && to === "codex";
              const isDevToFidc = DEV_SLUGS.includes(from) && FIDC_SLUGS.includes(to);

              let stroke = "hsl(150 100% 50% / 0.05)";
              let width  = 0.8;
              let dash: string | undefined;
              let marker = "url(#arr-dim)";

              if (highlighted) {
                if (isCeo) {
                  stroke = "rgba(251,146,60,0.7)"; width = 1.6; marker = "url(#arr-ceo)";
                } else if (isCodex) {
                  stroke = "rgba(245,158,11,0.65)"; width = 1.6; dash = "5 3"; marker = "url(#arr-codex)";
                } else if (isDevToFidc) {
                  stroke = "hsl(150 100% 58% / 0.55)"; width = 1.4; dash = "4 4"; marker = "url(#arr-active)";
                } else {
                  stroke = "hsl(150 100% 50% / 0.45)"; width = 1.2; marker = "url(#arr-active)";
                }
              }

              return (
                <line
                  key={`${from}-${to}`}
                  x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                  stroke={stroke} strokeWidth={width}
                  strokeDasharray={dash}
                  markerEnd={marker}
                  style={{ transition: "stroke 0.18s" }}
                />
              );
            })}

            {/* Nodes */}
            {TOPOLOGY_AGENTS.map((node) => {
              const agent    = ALL_AGENTS.find((a) => a.slug === node.id);
              const isCenter = node.ring === "center";
              const isDev    = node.ring === "dev";
              const isFidc   = node.ring === "fidc";
              const isCodex  = node.id === "codex";
              const isHuman  = node.id === "joao-ceo";
              const isWatch  = agent?.status === "watching";
              const isSel    = selectedAgent === node.id;
              const isDimmed =
                selectedAgent !== null && !isSel &&
                !ACTIVE_EDGES.some(
                  ([f, t]) =>
                    (f === selectedAgent && t === node.id) ||
                    (t === selectedAgent && f === node.id)
                );

              const r = isCenter ? 24 : isDev ? 17 : 14;
              const glowId = isCenter ? "glow-ora" : isCodex ? "glow-codex" : isHuman ? "glow-human" : isDev ? "glow-dev" : "glow-fidc";
              const strokeColor = isCenter
                ? "hsl(150 100% 55%)"
                : isHuman
                ? "#fb923c"
                : isCodex
                ? "#f59e0b"
                : isDev
                ? "hsl(150 100% 50% / 0.85)"
                : isWatch
                ? "hsl(180 100% 50% / 0.6)"
                : "hsl(150 100% 50% / 0.7)";
              const textColor = isCenter
                ? "hsl(150 100% 60%)"
                : isHuman
                ? "#fb923c"
                : isCodex
                ? "#f59e0b"
                : isDev
                ? "hsl(150 100% 52%)"
                : isWatch
                ? "hsl(180 100% 52%)"
                : "hsl(150 100% 50%)";

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedAgent(isSel ? null : node.id)}
                  style={{ cursor: "pointer", opacity: isDimmed ? 0.2 : 1, transition: "opacity 0.2s" }}
                >
                  <circle cx={node.x} cy={node.y} r={r + (isCenter ? 18 : 12)} fill={`url(#${glowId})`} />
                  <circle
                    cx={node.x} cy={node.y}
                    r={isSel ? r + 4 : r}
                    fill={isSel ? `${strokeColor}22` : "hsl(222 18% 8%)"}
                    stroke={strokeColor}
                    strokeWidth={isSel ? 2.5 : isCenter ? 1.8 : 1.2}
                  />
                  <text
                    x={node.x} y={node.y + 3.5}
                    textAnchor="middle"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: isCenter ? "0.44rem" : isDev ? "0.38rem" : "0.35rem",
                      fill: textColor, fontWeight: 700, pointerEvents: "none",
                    }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex", gap: "1.25rem", justifyContent: "center",
            marginTop: "0.75rem", flexWrap: "wrap",
          }}
        >
          {[
            { dot: "hsl(150 100% 55%)",  label: "OraCLI (centro)" },
            { dot: "hsl(150 100% 50%)",  label: "Equipe Dev (anel interno)" },
            { dot: "#f59e0b",             label: "Codex (engine)" },
            { dot: "#fb923c",             label: "CEO (humano)" },
            { dot: "hsl(180 100% 50%)",  label: "FIDC (anel externo)" },
          ].map(({ dot, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  border: `1.5px solid ${dot}`, background: `${dot}18`,
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Histórico de Spawn ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
            letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem",
          }}
        >
          HISTÓRICO DE SPAWN · CHAMADAS RECURSIVAS RECENTES
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%", borderCollapse: "collapse",
              fontFamily: "var(--font-mono)", fontSize: "0.6875rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["HORÁRIO", "PAI", "FILHO", "PROFUNDIDADE", "DURAÇÃO", "RESULTADO"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left", padding: "0.5rem 0.75rem",
                      color: "var(--text-4)", fontSize: "0.5625rem",
                      letterSpacing: "0.1em", fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPAWN_HISTORY.map((row, i) => {
                const parentColor =
                  row.parent === "joao-ceo" ? "#fb923c"
                  : row.parent === "codex"   ? "#f59e0b"
                  : DEV_SLUGS.includes(row.parent) ? "var(--accent)"
                  : "hsl(180 100% 50%)";
                const statusColor =
                  row.status === "OK"   ? "var(--accent)"
                  : row.status === "APRV" ? "#fb923c"
                  : "#f59e0b";
                const statusBg =
                  row.status === "OK"   ? "hsl(150 100% 50% / 0.1)"
                  : row.status === "APRV" ? "rgba(251,146,60,0.1)"
                  : "hsl(45 100% 50% / 0.1)";
                const statusBorder =
                  row.status === "OK"   ? "hsl(150 100% 50% / 0.3)"
                  : row.status === "APRV" ? "rgba(251,146,60,0.35)"
                  : "hsl(45 100% 50% / 0.3)";

                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid hsl(150 100% 50% / 0.04)",
                      background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-4)" }}>{row.ts}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: parentColor }}>{row.parent}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--cyan)" }}>{row.child}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <span
                        style={{
                          display: "inline-block", padding: "1px 8px",
                          background: `hsl(150 100% 50% / ${Math.max(row.depth, 0) * 0.06})`,
                          border: "1px solid hsl(150 100% 50% / 0.2)",
                          borderRadius: "var(--radius)", color: "var(--accent)",
                        }}
                      >
                        depth={row.depth}
                      </span>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-3)" }}>{row.duration}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <span
                        style={{
                          padding: "1px 8px", borderRadius: "var(--radius)",
                          fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                          background: statusBg, color: statusColor,
                          border: `1px solid ${statusBorder}`,
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
