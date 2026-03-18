"use client";

export default function IntegrationsPage() {
  const stats = [
    { label: "Integrações Ativas", value: "14", unit: "" },
    { label: "Mensagens Hoje", value: "847", unit: "" },
    { label: "Webhooks Disparados", value: "234", unit: "" },
    { label: "APIs Chamadas", value: "1.247", unit: "" },
  ];

  const canais = [
    {
      icon: "💬",
      name: "Telegram",
      status: "CONECTADO",
      connected: true,
      meta1: "última atividade: 2min",
      meta2: "342 msgs hoje",
      desc: "Canal principal de interação. Recebe comandos, envia alertas, relatórios e notificações em tempo real.",
    },
    {
      icon: "💼",
      name: "Slack",
      status: "CONECTADO",
      connected: true,
      meta1: "última atividade: 8min",
      meta2: "187 msgs hoje",
      desc: "Notificações de pipeline, alertas de covenant breach, standups diários, deploy notifications.",
    },
    {
      icon: "📋",
      name: "Linear",
      status: "CONECTADO",
      connected: true,
      meta1: "última atividade: 15min",
      meta2: "47 issues hoje",
      desc: "Hub de review e production gate. Issues com dossiê completo, aprovação humana para deploy prod.",
    },
    {
      icon: "📱",
      name: "WhatsApp",
      status: "DISPONÍVEL",
      connected: false,
      meta1: "não configurado",
      meta2: "",
      desc: "Canal de backup para alertas críticos e comunicação com investidores.",
    },
  ];

  const dev = [
    {
      icon: "🐙",
      name: "GitHub",
      status: "CONECTADO",
      connected: true,
      meta1: "47 commits hoje",
      meta2: "3 PRs abertos",
      desc: "Repos, branches, PRs, CI/CD. Auto-commit dos agentes, review automatizado.",
    },
    {
      icon: "▲",
      name: "Vercel",
      status: "CONECTADO",
      connected: true,
      meta1: "8 deploys hoje",
      meta2: "último: 2min",
      desc: "Deploy de dashboard e landing page. Preview + prod com approval gate.",
    },
    {
      icon: "🔧",
      name: "Supabase",
      status: "CONECTADO",
      connected: true,
      meta1: "52 capabilities indexadas",
      meta2: "27 tabelas",
      desc: "Banco principal: agentes, capabilities, métricas, memória. pgvector para busca semântica.",
    },
    {
      icon: "⚡",
      name: "Codex CLI",
      status: "CONECTADO",
      connected: true,
      meta1: "gpt-5.3-codex",
      meta2: "12 tasks hoje",
      desc: "Motor de execução de código. Multi-agent parallelism, MCP nativo.",
    },
  ];

  const financeiro = [
    {
      icon: "💳",
      name: "Stripe",
      status: "CONECTADO",
      connected: true,
      meta1: "R$ 247K processados",
      meta2: "",
      desc: "Pagamentos, webhooks, gestão de produtos e preços para o modelo SaaS.",
    },
    {
      icon: "📊",
      name: "Jira",
      status: "CONECTADO",
      connected: true,
      meta1: "Sprint #47 ativo",
      meta2: "24 stories",
      desc: "Source de requisitos. Sprints, stories, backlog. Synced com Linear.",
    },
    {
      icon: "📖",
      name: "Confluence",
      status: "CONECTADO",
      connected: true,
      meta1: "89 páginas",
      meta2: "última atualização: 1h",
      desc: "Wiki de documentação técnica. Specs, ADRs, runbooks, knowledge base.",
    },
  ];

  const ia = [
    {
      icon: "🧠",
      name: "Mem0",
      status: "CONECTADO",
      connected: true,
      meta1: "53 memórias",
      meta2: "score médio: 0.605",
      desc: "Terceira camada de memória. Qdrant local + filesystem + pgvector.",
    },
    {
      icon: "🔍",
      name: "Exa Search",
      status: "CONECTADO",
      connected: true,
      meta1: "34 buscas hoje",
      meta2: "",
      desc: "Busca semântica na web. Research autônomo para agentes.",
    },
    {
      icon: "🤖",
      name: "Google AI",
      status: "CONECTADO",
      connected: true,
      meta1: "Gemini 3 Flash",
      meta2: "Imagen 4",
      desc: "Embeddings (gemini-embedding-001), vision, imagens. Pay-per-use.",
    },
    {
      icon: "🔑",
      name: "OpenAI",
      status: "CONECTADO",
      connected: true,
      meta1: "gpt-5.3-codex + embeddings",
      meta2: "",
      desc: "Codex CLI, chat models, admin API. ChatGPT Team subscription.",
    },
  ];

  const webhookLog = [
    { time: "15:42", src: "Slack", dest: "#paganini-alerts", msg: "Deploy preview: dashboard-v2-abc.vercel.app" },
    { time: "15:38", src: "Linear", dest: "VIV-107", msg: "Issue criada: Módulo de reconciliação bancária" },
    { time: "15:35", src: "GitHub", dest: "PR #142", msg: "Merged: PDD aging com interpolação de curva" },
    { time: "15:30", src: "Telegram", dest: "João", msg: "Sprint #47: 67% concluído, 5 stories em andamento" },
    { time: "15:22", src: "Stripe", dest: "webhook", msg: "payment_intent.succeeded — R$ 8.000,00" },
  ];

  function IntegrationCard({
    icon, name, status, connected, meta1, meta2, desc,
  }: {
    icon: string; name: string; status: string; connected: boolean;
    meta1: string; meta2: string; desc: string;
  }) {
    return (
      <div
        className="glass-card"
        style={{
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          transition: "border-color 0.2s",
          cursor: "default",
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{icon}</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.875rem",
              color: "var(--text-1)",
              letterSpacing: "-0.01em",
              flex: 1,
            }}
          >
            {name}
          </span>
          {/* Status badge */}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              color: connected ? "var(--accent)" : "hsl(190 100% 60%)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "var(--accent)" : "hsl(190 100% 60%)",
                boxShadow: connected
                  ? "0 0 6px var(--accent)"
                  : "0 0 6px hsl(190 100% 60%)",
                display: "inline-block",
              }}
            />
            {status}
          </span>
        </div>

        {/* Meta */}
        {(meta1 || meta2) && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {meta1 && (
              <span className="mono-label" style={{ fontSize: "0.8125rem", color: "var(--text-3)" }}>
                {meta1}
              </span>
            )}
            {meta2 && (
              <span className="mono-label" style={{ fontSize: "0.8125rem", color: "hsl(190 100% 65%)" }}>
                {meta2}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <p
          className="section-help"
          style={{ fontSize: "0.8125rem", margin: 0, lineHeight: 1.5 }}
        >
          {desc}
        </p>
      </div>
    );
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          letterSpacing: "0.18em",
          color: "var(--text-4)",
          margin: "0 0 0.75rem 0",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--border)",
          textTransform: "uppercase",
        }}
      >
        {children}
      </h2>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.75rem",
              color: "var(--text-1)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Integrações &amp; Canais
          </h1>
          <span className="tag-badge">14 CONEXÕES</span>
          <span className="tag-badge-cyan">OPERACIONAL</span>
        </div>
        <p className="section-help" style={{ margin: 0, fontSize: "0.8125rem" }}>
          Todas as integrações externas que o PAGANINI AIOS conecta — canais, desenvolvimento, financeiro e IA.
        </p>
      </div>

      {/* ── Stats ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        {stats.map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <div className="stat-value">{s.value}</div>
            <div className="mono-label" style={{ marginTop: "0.25rem", fontSize: "0.75rem" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Canais de Comunicação ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Canais de Comunicação</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {canais.map((c) => (
            <IntegrationCard key={c.name} {...c} />
          ))}
        </div>
      </div>

      {/* ── Desenvolvimento ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Integrações de Desenvolvimento</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {dev.map((c) => (
            <IntegrationCard key={c.name} {...c} />
          ))}
        </div>
      </div>

      {/* ── Financeiro ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Integrações Financeiras</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {financeiro.map((c) => (
            <IntegrationCard key={c.name} {...c} />
          ))}
        </div>
      </div>

      {/* ── IA ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Integrações de IA</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {ia.map((c) => (
            <IntegrationCard key={c.name} {...c} />
          ))}
        </div>
      </div>

      {/* ── Data Flow SVG ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Fluxo de Dados em Tempo Real</SectionTitle>
        <div
          className="glass-card"
          style={{ padding: "1.5rem", overflowX: "auto" }}
        >
          <svg
            viewBox="0 0 900 180"
            style={{ width: "100%", minWidth: "600px", height: "auto" }}
            aria-label="Fluxo de dados entre integrações"
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="hsl(150 100% 50% / 0.6)" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Background grid lines */}
            {[30, 60, 90, 120, 150].map((y) => (
              <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="hsl(150 100% 50% / 0.04)" strokeWidth="1" />
            ))}

            {/* Nodes */}
            {/* Telegram/Slack */}
            <g transform="translate(20, 65)">
              <rect x="0" y="0" width="110" height="50" rx="6"
                fill="hsl(220 20% 10%)" stroke="hsl(150 100% 50% / 0.35)" strokeWidth="1" />
              <text x="55" y="18" textAnchor="middle" fill="hsl(150 100% 70%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600">💬 Telegram</text>
              <text x="55" y="34" textAnchor="middle" fill="hsl(190 80% 65%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12">💼 Slack</text>
            </g>

            {/* Arrow 1 */}
            <line x1="130" y1="90" x2="175" y2="90"
              stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* OraCLI */}
            <g transform="translate(175, 60)">
              <rect x="0" y="0" width="95" height="60" rx="6"
                fill="hsl(150 100% 8%)" stroke="var(--accent)" strokeWidth="1.5" filter="url(#glow)" />
              <text x="47" y="24" textAnchor="middle" fill="var(--accent)"
                fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="700">OraCLI</text>
              <text x="47" y="40" textAnchor="middle" fill="hsl(150 80% 50%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12">ORQUESTRADOR</text>
            </g>

            {/* Arrow 2 */}
            <line x1="270" y1="90" x2="315" y2="90"
              stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* Codex + GitHub + Supabase group */}
            <g transform="translate(315, 45)">
              <rect x="0" y="0" width="130" height="90" rx="6"
                fill="hsl(220 20% 8%)" stroke="hsl(190 100% 50% / 0.3)" strokeWidth="1" />
              <text x="65" y="20" textAnchor="middle" fill="hsl(190 100% 70%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">⚡ Codex CLI</text>
              <line x1="10" y1="28" x2="120" y2="28" stroke="hsl(190 100% 50% / 0.15)" strokeWidth="1" />
              <text x="65" y="46" textAnchor="middle" fill="hsl(190 100% 70%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">🐙 GitHub</text>
              <line x1="10" y1="56" x2="120" y2="56" stroke="hsl(190 100% 50% / 0.15)" strokeWidth="1" />
              <text x="65" y="74" textAnchor="middle" fill="hsl(190 100% 70%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">🔧 Supabase</text>
            </g>

            {/* Arrow 3 */}
            <line x1="445" y1="90" x2="490" y2="90"
              stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* Linear */}
            <g transform="translate(490, 62)">
              <rect x="0" y="0" width="90" height="55" rx="6"
                fill="hsl(220 20% 10%)" stroke="hsl(150 100% 50% / 0.35)" strokeWidth="1" />
              <text x="45" y="20" textAnchor="middle" fill="hsl(150 100% 70%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600">📋 Linear</text>
              <text x="45" y="38" textAnchor="middle" fill="hsl(150 60% 50%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12">prod gate</text>
            </g>

            {/* Arrow 4 */}
            <line x1="580" y1="90" x2="625" y2="90"
              stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* João */}
            <g transform="translate(625, 65)">
              <rect x="0" y="0" width="80" height="50" rx="6"
                fill="hsl(40 80% 10%)" stroke="hsl(40 100% 55% / 0.5)" strokeWidth="1" />
              <text x="40" y="20" textAnchor="middle" fill="hsl(40 100% 70%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">👤 João</text>
              <text x="40" y="36" textAnchor="middle" fill="hsl(40 80% 55%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12">aprovação</text>
            </g>

            {/* Arrow 5 */}
            <line x1="705" y1="90" x2="750" y2="90"
              stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* Vercel */}
            <g transform="translate(750, 62)">
              <rect x="0" y="0" width="110" height="55" rx="6"
                fill="hsl(150 100% 5%)" stroke="var(--accent)" strokeWidth="1.5" filter="url(#glow)" />
              <text x="55" y="22" textAnchor="middle" fill="var(--accent)"
                fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="700">▲ Vercel</text>
              <text x="55" y="38" textAnchor="middle" fill="hsl(150 80% 50%)"
                fontFamily="IBM Plex Mono, monospace" fontSize="12">DEPLOY</text>
            </g>

            {/* Labels below */}
            <text x="75" y="155" textAnchor="middle" fill="hsl(150 30% 45%)"
              fontFamily="IBM Plex Mono, monospace" fontSize="12">entrada</text>
            <text x="222" y="155" textAnchor="middle" fill="hsl(150 30% 45%)"
              fontFamily="IBM Plex Mono, monospace" fontSize="12">orquestração</text>
            <text x="380" y="155" textAnchor="middle" fill="hsl(190 30% 45%)"
              fontFamily="IBM Plex Mono, monospace" fontSize="12">execução</text>
            <text x="535" y="155" textAnchor="middle" fill="hsl(150 30% 45%)"
              fontFamily="IBM Plex Mono, monospace" fontSize="12">gate</text>
            <text x="665" y="155" textAnchor="middle" fill="hsl(40 40% 45%)"
              fontFamily="IBM Plex Mono, monospace" fontSize="12">humano</text>
            <text x="805" y="155" textAnchor="middle" fill="hsl(150 30% 45%)"
              fontFamily="IBM Plex Mono, monospace" fontSize="12">entrega</text>
          </svg>
        </div>
      </div>

      {/* ── Webhook Log ── */}
      <div>
        <SectionTitle>Webhook Log — Últimos Eventos</SectionTitle>
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          {webhookLog.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1.25rem",
                borderBottom: i < webhookLog.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background 0.15s",
              }}
            >
              {/* Time */}
              <span
                className="mono-label"
                style={{
                  minWidth: "3.5rem",
                  fontSize: "0.8125rem",
                  color: "var(--accent)",
                  opacity: 0.8,
                }}
              >
                {e.time}
              </span>
              {/* Source */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-2)",
                  minWidth: "4.5rem",
                }}
              >
                {e.src}
              </span>
              {/* Arrow */}
              <span style={{ color: "var(--text-4)", fontSize: "0.8125rem" }}>→</span>
              {/* Destination */}
              <span className="tag-badge-cyan" style={{ fontSize: "0.75rem" }}>{e.dest}</span>
              {/* Message */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  color: "var(--text-3)",
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {e.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
