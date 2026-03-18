"use client";

import { useState } from "react";

// ── Data ─────────────────────────────────────────────────────────────────────

const KERNEL = {
  runtime: "Moltis",
  runtimeVersion: "v2.4.1",
  python: "3.12.3",
  node: "v24.14.0",
  platform: "Linux 6.14.0-aws (x64)",
  uptime: "14d 7h 22m",
  status: "NOMINAL",
};

const LLM_PROVIDERS = [
  {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    model: "gemini-2.5-flash",
    status: "active",
    contextWindow: "1M tokens",
    rateLimit: "2000 RPM",
    note: "Primary — lowest latency",
  },
  {
    name: "OpenAI GPT-4o",
    provider: "OpenAI",
    model: "gpt-4o",
    status: "inactive",
    contextWindow: "128K tokens",
    rateLimit: "—",
    note: "No billing configured",
  },
  {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    model: "claude-3-5-sonnet-20241022",
    status: "available",
    contextWindow: "200K tokens",
    rateLimit: "1000 RPM",
    note: "Fallback — complex reasoning",
  },
];

const RAG_CONFIG = [
  { key: "embedding_model", value: "gemini-embedding-001" },
  { key: "chunk_size",      value: "1024" },
  { key: "overlap",         value: "128" },
  { key: "top_k",           value: "8" },
  { key: "vector_store",    value: "pgvector (Supabase)" },
  { key: "index_type",      value: "ivfflat (lists=100)" },
];

const AGENTS = [
  { name: "Administrador", slug: "administrador", soul: "skills/fidc-core/agents/administrador/SOUL.md", status: "active" },
  { name: "Compliance",    slug: "compliance",    soul: "skills/fidc-core/agents/compliance/SOUL.md",    status: "active" },
  { name: "Custódia",      slug: "custodia",      soul: "skills/fidc-core/agents/custodia/SOUL.md",      status: "active" },
  { name: "Due Diligence", slug: "due-diligence", soul: "skills/fidc-core/agents/due-diligence/SOUL.md", status: "active" },
  { name: "Gestor",        slug: "gestor",        soul: "skills/fidc-core/agents/gestor/SOUL.md",        status: "active" },
  { name: "IR",            slug: "ir",            soul: "skills/fidc-core/agents/ir/SOUL.md",            status: "idle" },
  { name: "Pricing",       slug: "pricing",       soul: "skills/fidc-core/agents/pricing/SOUL.md",       status: "active" },
  { name: "Reg Watch",     slug: "reg-watch",     soul: "skills/fidc-core/agents/reg-watch/SOUL.md",     status: "watching" },
  { name: "Reporting",     slug: "reporting",     soul: "skills/fidc-core/agents/reporting/SOUL.md",     status: "active" },
];

const SKILLS_CONFIG = [
  { key: "installed_packs", value: "fidc-core@1.4.2" },
  { key: "auto_update",     value: "true (patch only)" },
  { key: "marketplace_url", value: "https://marketplace.paganini.ai" },
  { key: "registry",        value: "registry.paganini.ai (private)" },
  { key: "integrity_check", value: "enabled — skill.lock enforced" },
];

const RTK_CONFIG = [
  { key: "status",        value: "RUNNING", highlight: true },
  { key: "version",       value: "v0.30.0" },
  { key: "proxy_port",    value: "9001" },
  { key: "avg_savings",   value: "88%" },
  { key: "compression",   value: "token-aware (lossless)" },
  { key: "cache_backend", value: "Redis 7.2" },
];

const HEALTH_CHECKS = [
  { name: "Moltis runtime",        pass: true },
  { name: "LLM provider (primary)",pass: true },
  { name: "RAG / pgvector",        pass: true },
  { name: "RTK proxy",             pass: true },
  { name: "Skills integrity",      pass: true },
  { name: "Agent SOUL files",      pass: true },
  { name: "Guardrails engine",     pass: true },
  { name: "Memory store",          pass: true },
  { name: "Marketplace reachable", pass: true },
  { name: "Telemetry pipeline",    pass: true },
  { name: "System clock sync",     pass: true },
];

// ── Components ────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-1)", letterSpacing: "0.04em" }}>
      {children}
    </h2>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:    "var(--accent)",
    idle:      "hsl(45 100% 50%)",
    watching:  "var(--cyan)",
    inactive:  "hsl(0 84% 60%)",
    available: "hsl(210 100% 60%)",
    RUNNING:   "var(--accent)",
    NOMINAL:   "var(--accent)",
  };
  const c = colors[status] ?? "var(--text-4)";
  return (
    <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
  );
}

function ConfigTable({ rows }: { rows: { key: string; value: string; highlight?: boolean }[] }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
      {rows.map((row, i) => (
        <div
          key={row.key}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "7px 0",
            borderBottom: i < rows.length - 1 ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <span style={{ color: "var(--text-4)", fontSize: "0.5625rem", letterSpacing: "0.08em" }}>{row.key}</span>
          <span style={{ color: row.highlight ? "var(--accent)" : "var(--text-2)", fontWeight: row.highlight ? 600 : 400 }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SECTIONS = ["kernel", "llm", "rag", "agents", "skills", "rtk", "health"] as const;
type Section = typeof SECTIONS[number];

const SECTION_LABELS: Record<Section, string> = {
  kernel: "KERNEL",
  llm:    "LLM",
  rag:    "RAG",
  agents: "AGENTS",
  skills: "SKILLS",
  rtk:    "RTK",
  health: "HEALTH",
};

export default function SettingsPage() {
  const [active, setActive] = useState<Section>("kernel");

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            AIOS Configuration
          </h1>
          <Label>KERNEL · PROVIDERS · AGENTS · SKILLS · RTK</Label>
        </div>
        <span className="tag-badge">11/11 HEALTHY</span>
      </div>

      {/* ── Nav tabs ── */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.1em",
              padding: "5px 12px", borderRadius: "var(--radius)", border: "1px solid",
              borderColor: active === s ? "var(--accent)" : "var(--border-subtle)",
              background: active === s ? "var(--accent-bg)" : "transparent",
              color: active === s ? "var(--accent)" : "var(--text-4)",
              cursor: "pointer", textTransform: "uppercase" as const,
              transition: "all 0.15s",
            }}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {/* ── Kernel ── */}
      {active === "kernel" && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <SectionTitle>Kernel Configuration</SectionTitle>
            <StatusDot status="NOMINAL" />
            <span className="tag-badge">{KERNEL.status}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <ConfigTable rows={[
                { key: "runtime",          value: `${KERNEL.runtime} ${KERNEL.runtimeVersion}`, highlight: true },
                { key: "python",           value: KERNEL.python },
                { key: "node",             value: KERNEL.node },
                { key: "platform",         value: KERNEL.platform },
                { key: "uptime",           value: KERNEL.uptime },
              ]} />
            </div>
            <div style={{
              background: "hsl(150 100% 50% / 0.04)", border: "1px solid hsl(150 100% 50% / 0.1)",
              borderRadius: "var(--radius)", padding: "14px",
            }}>
              <Label>RUNTIME STATUS</Label>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", lineHeight: 2, color: "var(--text-3)", marginTop: "8px" }}>
                <div><span style={{ color: "var(--accent)" }}>✓</span> Moltis kernel booted</div>
                <div><span style={{ color: "var(--accent)" }}>✓</span> SOUL files loaded (9/9)</div>
                <div><span style={{ color: "var(--accent)" }}>✓</span> Skills mounted (5 packages)</div>
                <div><span style={{ color: "var(--accent)" }}>✓</span> Guardrails engine online</div>
                <div><span style={{ color: "var(--accent)" }}>✓</span> RTK proxy connected</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LLM Providers ── */}
      {active === "llm" && (
        <div className="space-y-3">
          {LLM_PROVIDERS.map((p) => (
            <div key={p.name} className="glass-card p-5">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <StatusDot status={p.status} />
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-1)" }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)" }}>{p.provider}</span>
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.5625rem",
                  color: p.status === "active" ? "var(--accent)" : p.status === "available" ? "hsl(210 100% 60%)" : "hsl(0 84% 60%)",
                  background: p.status === "active" ? "var(--accent-bg)" : p.status === "available" ? "hsl(210 100% 60% / 0.08)" : "hsl(0 84% 60% / 0.08)",
                  border: `1px solid ${p.status === "active" ? "hsl(150 100% 50% / 0.2)" : p.status === "available" ? "hsl(210 100% 60% / 0.2)" : "hsl(0 84% 60% / 0.2)"}`,
                  borderRadius: "var(--radius)", padding: "3px 8px", textTransform: "uppercase" as const,
                }}>
                  {p.status}
                </span>
              </div>
              <ConfigTable rows={[
                { key: "model",          value: p.model },
                { key: "context_window", value: p.contextWindow },
                { key: "rate_limit",     value: p.rateLimit },
                { key: "note",           value: p.note },
              ]} />
            </div>
          ))}
        </div>
      )}

      {/* ── RAG ── */}
      {active === "rag" && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <SectionTitle>RAG Configuration</SectionTitle>
            <span className="tag-badge-cyan">pgvector</span>
          </div>
          <ConfigTable rows={RAG_CONFIG} />
          <div style={{ marginTop: "16px", padding: "12px", background: "hsl(220 20% 5%)", borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)" }}>
            <Label>RETRIEVAL PIPELINE</Label>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-3)", lineHeight: 2, marginTop: "6px" }}>
              <div>query → <span style={{ color: "var(--accent)" }}>gemini-embedding-001</span> → 3072d vector</div>
              <div>ivfflat search → top_k=8 → <span style={{ color: "var(--cyan)" }}>rerank</span> → context injection</div>
              <div>chunk_size=1024 / overlap=128 → <span style={{ color: "var(--text-4)" }}>~90% recall @ 8 results</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Agents ── */}
      {active === "agents" && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <SectionTitle>Agent Configuration</SectionTitle>
            <span className="tag-badge">{AGENTS.filter(a => a.status === "active").length} ACTIVE</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["AGENT", "SLUG", "STATUS", "SOUL FILE"].map((h) => (
                    <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.1em", color: "var(--text-4)", padding: "6px 14px 6px 0", textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AGENTS.map((a, i) => (
                  <tr key={a.slug} style={{ borderBottom: i < AGENTS.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <td style={{ fontFamily: "var(--font-display)", fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-1)", padding: "10px 14px 10px 0", whiteSpace: "nowrap" as const }}>{a.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-4)", padding: "10px 14px 10px 0" }}>{a.slug}</td>
                    <td style={{ padding: "10px 14px 10px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <StatusDot status={a.status} />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-3)", textTransform: "uppercase" as const }}>{a.status}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-3)", padding: "10px 0" }}>{a.soul}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Skills ── */}
      {active === "skills" && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <SectionTitle>Skills Configuration</SectionTitle>
            <span className="tag-badge-cyan">REGISTRY</span>
          </div>
          <ConfigTable rows={SKILLS_CONFIG} />
        </div>
      )}

      {/* ── RTK ── */}
      {active === "rtk" && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <SectionTitle>RTK Compression Proxy</SectionTitle>
            <StatusDot status="RUNNING" />
            <span className="tag-badge">ACTIVE</span>
          </div>
          <ConfigTable rows={RTK_CONFIG.map(r => ({ ...r, highlight: r.key === "status" || r.key === "avg_savings" }))} />
          <div style={{ marginTop: "16px", padding: "12px", background: "var(--accent-bg)", border: "1px solid hsl(150 100% 50% / 0.15)", borderRadius: "var(--radius)" }}>
            <Label>COMPRESSION SUMMARY</Label>
            <div style={{ display: "flex", gap: "24px", marginTop: "8px", flexWrap: "wrap" }}>
              {[
                { label: "Raw tokens/day",      value: "4.73M" },
                { label: "Compressed",          value: "568K" },
                { label: "Saving",              value: "88%", accent: true },
                { label: "Estimated saving/mo", value: "~$748" },
              ].map((item) => (
                <div key={item.label}>
                  <Label>{item.label}</Label>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, color: item.accent ? "var(--accent)" : "var(--text-1)", marginTop: "2px" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Health ── */}
      {active === "health" && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <SectionTitle>System Health</SectionTitle>
            <span className="tag-badge">paganini doctor</span>
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6875rem",
            background: "hsl(220 20% 4%)", borderRadius: "var(--radius)",
            border: "1px solid var(--border-subtle)", padding: "16px",
          }}>
            <div style={{ color: "var(--text-4)", marginBottom: "8px" }}>$ paganini doctor</div>
            <div style={{ color: "var(--text-3)", marginBottom: "12px" }}>Running 11 checks...</div>
            {HEALTH_CHECKS.map((check) => (
              <div key={check.name} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ color: check.pass ? "var(--accent)" : "hsl(0 84% 60%)" }}>
                  {check.pass ? "✓" : "✗"}
                </span>
                <span style={{ color: check.pass ? "var(--text-2)" : "hsl(0 84% 60%)" }}>{check.name}</span>
                <span style={{ color: check.pass ? "var(--text-4)" : "hsl(0 84% 60% / 0.6)", marginLeft: "auto" }}>
                  {check.pass ? "OK" : "FAIL"}
                </span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "12px", paddingTop: "12px", color: "var(--accent)", fontWeight: 600 }}>
              ✓ All checks passed. Paganini is healthy (11/11)
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
