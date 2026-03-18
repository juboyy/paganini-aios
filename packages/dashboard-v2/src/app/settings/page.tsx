"use client";

const LLM_CONFIG = {
  model: "gemini-2.5-flash",
  api_key_status: "configured",
  fallback_model: "gemini-pro",
  temperature: 0.1,
  max_tokens: 8192,
};

const RAG_CONFIG = {
  chunk_size: 1024,
  overlap: 128,
  top_k: 8,
  embedding_model: "gemini-embedding-001",
  vector_store: "ChromaDB",
  collection: "fidc_paganini",
};

const GUARDRAILS = [
  { name: "Hallucination Guard", key: "hallucination_guard", enabled: true, threshold: 0.85, unit: "confidence" },
  { name: "Topic Scope Filter", key: "topic_scope_filter", enabled: true, threshold: 0.90, unit: "relevance" },
  { name: "Regulatory Citation Check", key: "regulatory_citation", enabled: true, threshold: null, unit: null },
  { name: "PII Redaction", key: "pii_redaction", enabled: true, threshold: null, unit: null },
  { name: "Token Budget Guard", key: "token_budget_guard", enabled: true, threshold: 4096, unit: "tokens" },
  { name: "Adversarial Prompt Filter", key: "adversarial_filter", enabled: false, threshold: 0.95, unit: "score" },
];

const INTEGRATIONS = [
  { name: "Slack", status: "connected", meta: "webhook active", color: "var(--accent)" },
  { name: "CLI", status: "active", meta: "v1.4.2", color: "var(--accent)" },
  { name: "Dashboard", status: "active", meta: "v2.0.0", color: "var(--accent)" },
  { name: "API", status: "active", meta: "port 8000", color: "var(--accent)" },
];

const FUND_CONFIG = {
  fund_name: "FIDC Paganini I",
  cnpj: "00.000.000/0001-00",
  administrator: "Vivaldi DTVM",
  custodiante: "Oliveira Trust",
  regulatory: "CVM",
  min_subordination: "20%",
  class_senior: "Série A",
  class_sub: "Subordinada",
  inception_date: "2024-01-15",
};

const LABEL_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.5625rem",
  letterSpacing: "0.12em",
  color: "var(--text-4)",
  textTransform: "uppercase" as const,
};

const VALUE_STYLE = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--text-1)",
  letterSpacing: "-0.02em",
};

const SECTION_TITLE = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.625rem",
  letterSpacing: "0.15em",
  color: "var(--text-4)",
  textTransform: "uppercase" as const,
  marginBottom: "0.75rem",
};

function ConfigRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.5rem 0.75rem",
      background: "hsl(220 20% 4% / 0.5)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius)",
    }}>
      <span style={LABEL_STYLE}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.5625rem",
        color: accent || "var(--text-2)",
        letterSpacing: "0.05em",
      }}>
        {value}
      </span>
    </div>
  );
}

function ToggleDisplay({ enabled }: { enabled: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      padding: "0.15rem 0.5rem",
      background: enabled ? "hsl(120 80% 10% / 0.5)" : "hsl(0 60% 10% / 0.5)",
      border: `1px solid ${enabled ? "var(--accent)" : "var(--red)"}`,
      borderRadius: "var(--radius)",
    }}>
      <div style={{
        width: "0.375rem",
        height: "0.375rem",
        borderRadius: "50%",
        background: enabled ? "var(--accent)" : "var(--red)",
      }} />
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.4375rem",
        color: enabled ? "var(--accent)" : "var(--red)",
        letterSpacing: "0.1em",
      }}>
        {enabled ? "ENABLED" : "DISABLED"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
          SETTINGS
        </h1>
        <span style={{ ...LABEL_STYLE, fontSize: "0.5rem" }}>SYSTEM CONFIGURATION — READ ONLY</span>
        <div style={{ marginLeft: "auto" }}>
          <span className="tag-badge-cyan">read-only mode</span>
        </div>
      </div>

      {/* Main grid: 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>

        {/* LLM Provider */}
        <div className="glass-card p-4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={SECTION_TITLE}>LLM PROVIDER</div>
            <span className="tag-badge">gemini</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <ConfigRow label="MODEL" value={LLM_CONFIG.model} accent="var(--accent)" />
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 0.75rem",
              background: "hsl(220 20% 4% / 0.5)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
            }}>
              <span style={LABEL_STYLE}>API KEY</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)", letterSpacing: "0.05em" }}>••••••••••••••••</span>
                <span className="tag-badge">configured ✓</span>
              </div>
            </div>
            <ConfigRow label="FALLBACK MODEL" value={LLM_CONFIG.fallback_model} accent="var(--cyan)" />
            <ConfigRow label="TEMPERATURE" value={LLM_CONFIG.temperature} />
            <ConfigRow label="MAX TOKENS" value={LLM_CONFIG.max_tokens.toLocaleString()} />
          </div>
        </div>

        {/* RAG Config */}
        <div className="glass-card p-4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={SECTION_TITLE}>RAG CONFIGURATION</div>
            <span className="tag-badge-cyan">chromadb</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <ConfigRow label="CHUNK SIZE" value={`${RAG_CONFIG.chunk_size} tokens`} accent="var(--cyan)" />
            <ConfigRow label="OVERLAP" value={`${RAG_CONFIG.overlap} tokens`} />
            <ConfigRow label="TOP K" value={RAG_CONFIG.top_k} accent="var(--accent)" />
            <ConfigRow label="EMBEDDING MODEL" value={RAG_CONFIG.embedding_model} accent="var(--text-2)" />
            <ConfigRow label="VECTOR STORE" value={RAG_CONFIG.vector_store} accent="var(--cyan)" />
            <ConfigRow label="COLLECTION" value={RAG_CONFIG.collection} />
          </div>
        </div>

        {/* Guardrails */}
        <div className="glass-card p-4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={SECTION_TITLE}>GUARDRAILS — 6 GATES</div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--accent)", letterSpacing: "0.1em" }}>5/6 ACTIVE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {GUARDRAILS.map((g) => (
              <div key={g.key} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0.75rem",
                background: "hsl(220 20% 4% / 0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius)",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-2)", letterSpacing: "0.04em" }}>{g.name}</div>
                  {g.threshold !== null && (
                    <div style={{ ...LABEL_STYLE, fontSize: "0.4375rem", marginTop: "0.15rem" }}>
                      threshold: {g.threshold} {g.unit}
                    </div>
                  )}
                </div>
                <ToggleDisplay enabled={g.enabled} />
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Integrations + Fund Config stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* Integrations */}
          <div className="glass-card p-4">
            <div style={SECTION_TITLE}>INTEGRATIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {INTEGRATIONS.map((intg) => (
                <div key={intg.name} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 0.75rem",
                  background: "hsl(220 20% 4% / 0.5)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius)",
                }}>
                  <span className="pulse-dot" style={{ background: intg.color }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-2)", letterSpacing: "0.04em" }}>{intg.name}</div>
                    <div style={{ ...LABEL_STYLE, fontSize: "0.4375rem", marginTop: "0.1rem" }}>{intg.meta}</div>
                  </div>
                  <span className="tag-badge" style={{ marginLeft: "auto" }}>{intg.status} ✓</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fund Config */}
          <div className="glass-card p-4" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={SECTION_TITLE}>FUND CONFIGURATION</div>
              <span className="tag-badge-cyan">CVM</span>
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={LABEL_STYLE}>FUND NAME</div>
              <div style={{ ...VALUE_STYLE, fontSize: "1.125rem", marginTop: "0.2rem", color: "var(--accent)" }}>{FUND_CONFIG.fund_name}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <ConfigRow label="CNPJ" value={FUND_CONFIG.cnpj} />
              <ConfigRow label="ADMINISTRATOR" value={FUND_CONFIG.administrator} accent="var(--cyan)" />
              <ConfigRow label="CUSTODIANTE" value={FUND_CONFIG.custodiante} accent="var(--cyan)" />
              <ConfigRow label="REGULATORY" value={FUND_CONFIG.regulatory} accent="var(--amber)" />
              <ConfigRow label="MIN SUBORDINATION" value={FUND_CONFIG.min_subordination} accent="var(--accent)" />
              <ConfigRow label="INCEPTION DATE" value={FUND_CONFIG.inception_date} />
            </div>
          </div>

        </div>
      </div>

      {/* Footer note */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 0.75rem",
        background: "hsl(220 20% 4% / 0.5)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
      }}>
        <span className="pulse-dot" style={{ background: "var(--amber)" }} />
        <span style={{ ...LABEL_STYLE, fontSize: "0.5rem" }}>
          CONFIGURATION IS READ-ONLY — EDIT VIA{" "}
          <span style={{ color: "var(--accent)" }}>config/settings.yaml</span>
          {" "}AND REDEPLOY THE AGENT CONTAINER
        </span>
        <span style={{ marginLeft: "auto" }}>
          <span className="tag-badge-cyan">config v1.4.0</span>
        </span>
      </div>

    </div>
  );
}
