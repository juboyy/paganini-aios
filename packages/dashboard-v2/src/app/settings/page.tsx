"use client";

import { useState, useEffect } from "react";

type Tab = "KERNEL" | "LLM PROVIDERS" | "RAG CONFIG" | "AGENTS" | "SKILLS" | "RTK" | "HEALTH";

const CSS_VARS = {
  "--bg": "#06060c",
  "--bg-card": "#0a0a14",
  "--border": "rgba(0,255,128,0.08)",
  "--border-subtle": "rgba(0,255,128,0.04)",
  "--text-1": "#e8f0e8",
  "--text-2": "#8fa88f",
  "--text-3": "#4a5e4a",
  "--text-4": "#344038",
  "--accent": "hsl(150 100% 50%)",
  "--cyan": "hsl(180 100% 50%)",
  "--accent-bg": "rgba(0,255,128,0.06)",
  "--font-mono": "'IBM Plex Mono', monospace",
  "--font-display": "'Space Grotesk', sans-serif",
  "--radius": "2px",
} as React.CSSProperties;

const TABS: Tab[] = ["KERNEL", "LLM PROVIDERS", "RAG CONFIG", "AGENTS", "SKILLS", "RTK", "HEALTH"];

const AGENTS_DATA = [
  { slug: "fidc-orchestrator", soul: "agents/fidc-orchestrator/SOUL.md",  domains: ["orchestration","routing"],         status: "ACTIVE",  last: "2s ago" },
  { slug: "compliance-agent",  soul: "agents/compliance-agent/SOUL.md",    domains: ["compliance","regulation"],         status: "ACTIVE",  last: "4s ago" },
  { slug: "pricing-agent",     soul: "agents/pricing-agent/SOUL.md",       domains: ["pricing","valuation"],             status: "ACTIVE",  last: "12s ago" },
  { slug: "risk-agent",        soul: "agents/risk-agent/SOUL.md",          domains: ["risk","portfolio"],                status: "ACTIVE",  last: "8s ago" },
  { slug: "due-diligence",     soul: "agents/due-diligence/SOUL.md",       domains: ["due-diligence","cedente"],         status: "ACTIVE",  last: "31s ago" },
  { slug: "custody-agent",     soul: "agents/custody-agent/SOUL.md",       domains: ["custody","settlement"],            status: "IDLE",    last: "2m ago" },
  { slug: "reporting-agent",   soul: "agents/reporting-agent/SOUL.md",     domains: ["reporting","cvm","bacen"],         status: "IDLE",    last: "5m ago" },
  { slug: "admin-agent",       soul: "agents/admin-agent/SOUL.md",         domains: ["admin","configuration"],           status: "IDLE",    last: "8m ago" },
  { slug: "ir-agent",          soul: "agents/ir-agent/SOUL.md",            domains: ["investor-relations","reporting"],  status: "IDLE",    last: "12m ago" },
];

const RAG_CONFIG = [
  { key: "embedding_model",      value: "gemini-embedding-001" },
  { key: "dimensions",           value: "3072" },
  { key: "chunk_size",           value: "1024" },
  { key: "chunk_overlap",        value: "128" },
  { key: "top_k",                value: "8" },
  { key: "similarity_threshold", value: "0.75" },
  { key: "index_type",           value: "hnsw" },
  { key: "ef_search",            value: "128" },
  { key: "vector_store",         value: "chromadb" },
  { key: "collection",           value: "paganini_v2" },
];

const DOCTOR_OUTPUT = [
  { check: "Python 3.12",    result: "✓", detail: "3.12.3",        ok: true },
  { check: "Moltis binary",  result: "✓", detail: "v2.4.1",        ok: true },
  { check: "ChromaDB",       result: "✓", detail: "connected",     ok: true },
  { check: "RTK proxy",      result: "✓", detail: "v0.30.0",       ok: true },
  { check: "Config",         result: "✓", detail: "valid",         ok: true },
  { check: "Agents (9/9)",   result: "✓", detail: "all online",    ok: true },
  { check: "Skills (11/11)", result: "✓", detail: "loaded",        ok: true },
  { check: "Guardrails (6/6)", result: "✓", detail: "enforced",   ok: true },
  { check: "Memory store",   result: "✓", detail: "healthy",       ok: true },
  { check: "Daemons",        result: "✓", detail: "3/3 running",   ok: true },
  { check: "Network",        result: "✓", detail: "reachable",     ok: true },
];

function ConfigRow({ k, v, highlight = false }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: "1px solid var(--border-subtle)", background: highlight ? "rgba(0,255,128,0.02)" : "transparent" }}>
      <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: 1 }}>{k}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-1)", fontWeight: 500 }}>{v}</span>
    </div>
  );
}

function TabKernel() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>MOLTIS RUNTIME</div>
        {[
          { k: "Engine",          v: "Moltis v2.4.1" },
          { k: "Python",          v: "3.12.3" },
          { k: "Uptime",          v: "14d 6h 23m" },
          { k: "PID",             v: "1842" },
          { k: "Mode",            v: "production" },
          { k: "Workers",         v: "4 / 4 active" },
          { k: "Queue depth",     v: "0 (idle)" },
          { k: "Avg task time",   v: "4.7s" },
        ].map((r, i) => <ConfigRow key={i} k={r.k} v={r.v} highlight={i % 2 === 0} />)}
      </div>
      <div>
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 14 }}>MEMORY USAGE</div>
          {[
            { label: "System RAM",   used: 62, total: "16 GB",  color: "var(--accent)" },
            { label: "Context pool", used: 31, total: "8 GB",   color: "var(--cyan)"   },
            { label: "Vector store", used: 48, total: "4 GB",   color: "#a78bfa"       },
          ].map((m, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "var(--text-2)" }}>{m.label}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: m.color }}>{m.used}%</span>
                  <span style={{ fontSize: 9, color: "var(--text-4)" }}>{m.total}</span>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ width: `${m.used}%`, height: "100%", background: m.color }} />
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card" style={{ padding: "16px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 10 }}>DAEMONS</div>
          {[
            { name: "moltis-core",      status: "RUNNING", pid: "1842" },
            { name: "rtk-proxy",        status: "RUNNING", pid: "1956" },
            { name: "metaclaw-watcher", status: "RUNNING", pid: "2104" },
          ].map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-2)", fontFamily: "'IBM Plex Mono', monospace" }}>{d.name}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 9, color: "var(--text-4)" }}>pid:{d.pid}</span>
                <span style={{ fontSize: 9, color: "var(--accent)", background: "rgba(0,255,128,0.08)", padding: "1px 6px", borderRadius: "var(--radius)" }}>{d.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabLLM() {
  const providers = [
    {
      name: "Gemini 2.5 Flash",
      provider: "Google DeepMind",
      model: "gemini-2.5-flash-preview",
      status: "ACTIVE",
      statusColor: "var(--accent)",
      statusBg: "rgba(0,255,128,0.1)",
      statusBorder: "rgba(0,255,128,0.25)",
      stats: [
        { k: "Requests today", v: "1,247" },
        { k: "Tokens in",      v: "1.82M" },
        { k: "Tokens out",     v: "584k" },
        { k: "Cost today",     v: "$3.42" },
        { k: "Avg latency",    v: "1.8s" },
        { k: "Context window", v: "1M tokens" },
      ],
    },
    {
      name: "OpenAI GPT-4o",
      provider: "OpenAI",
      model: "gpt-4o-2024-11-20",
      status: "INACTIVE",
      statusColor: "#ef4444",
      statusBg: "rgba(239,68,68,0.08)",
      statusBorder: "rgba(239,68,68,0.2)",
      note: "No billing configured",
      stats: [
        { k: "Requests today", v: "0" },
        { k: "Tokens in",      v: "—" },
        { k: "Tokens out",     v: "—" },
        { k: "Cost today",     v: "$0.00" },
        { k: "Avg latency",    v: "—" },
        { k: "Context window", v: "128k tokens" },
      ],
    },
    {
      name: "Anthropic Claude",
      provider: "Anthropic",
      model: "claude-3-5-sonnet-20241022",
      status: "AVAILABLE",
      statusColor: "#f59e0b",
      statusBg: "rgba(245,158,11,0.08)",
      statusBorder: "rgba(245,158,11,0.2)",
      note: "Ready to activate",
      stats: [
        { k: "Requests today", v: "0" },
        { k: "Tokens in",      v: "—" },
        { k: "Tokens out",     v: "—" },
        { k: "Cost today",     v: "$0.00" },
        { k: "Avg latency",    v: "—" },
        { k: "Context window", v: "200k tokens" },
      ],
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
      {providers.map((p, i) => (
        <div key={i} className="glass-card" style={{ padding: "20px 22px", border: `1px solid ${p.statusBorder}`, borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 9, color: "var(--text-4)", letterSpacing: 1 }}>{p.provider}</div>
            </div>
            <div style={{ padding: "3px 10px", borderRadius: "var(--radius)", border: `1px solid ${p.statusBorder}`, background: p.statusBg, fontSize: 9, color: p.statusColor, letterSpacing: 1, fontWeight: 600 }}>{p.status}</div>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--text-3)", marginBottom: 14, padding: "6px 10px", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)" }}>{p.model}</div>
          {p.note && (
            <div style={{ fontSize: 10, color: p.statusColor, marginBottom: 12, padding: "6px 10px", background: p.statusBg, borderRadius: "var(--radius)", border: `1px solid ${p.statusBorder}` }}>{p.note}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {p.stats.map((s, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: j < p.stats.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <span style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1 }}>{s.k}</span>
                <span style={{ fontSize: 10, color: s.v === "—" ? "var(--text-4)" : "var(--text-1)", fontWeight: 500 }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabRAG() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="glass-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 10, letterSpacing: 2, color: "var(--text-3)" }}>RAG CONFIGURATION</div>
        {RAG_CONFIG.map((r, i) => <ConfigRow key={i} k={r.key} v={r.value} highlight={i % 2 === 0} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 14 }}>RETRIEVAL PERFORMANCE</div>
          {[
            { k: "Avg query time",  v: "42ms",   color: "var(--accent)" },
            { k: "Cache hit rate",  v: "73%",    color: "var(--cyan)"   },
            { k: "Index size",      v: "128k vecs", color: "var(--text-1)" },
            { k: "Dimensions",      v: "3,072",  color: "var(--text-1)" },
            { k: "Precision@8",     v: "0.91",   color: "var(--accent)" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none" }}>
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>{r.k}</span>
              <span style={{ fontSize: 11, color: r.color, fontWeight: 600 }}>{r.v}</span>
            </div>
          ))}
        </div>
        <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid rgba(0,255,128,0.12)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.03)" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 10 }}>PIPELINE STATUS</div>
          {[
            { step: "Chunk → Embed",  ok: true },
            { step: "Store → Index",  ok: true },
            { step: "Query → Rank",   ok: true },
            { step: "Rerank (MMR)",   ok: true },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontSize: 10, color: "var(--text-2)" }}>{s.step}</span>
              <span style={{ fontSize: 10, color: "var(--accent)" }}>✓ OK</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabAgents() {
  return (
    <div className="glass-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 10, letterSpacing: 2, color: "var(--text-3)" }}>AGENT ROSTER — 9 / 9 ACTIVE</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["SLUG", "SOUL FILE", "DOMAINS", "STATUS", "LAST ACTIVE"].map(h => (
                <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 9, letterSpacing: 1.5, color: "var(--text-3)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AGENTS_DATA.map((a, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "rgba(0,255,128,0.01)" : "transparent" }}>
                <td style={{ padding: "10px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-1)" }}>{a.slug}</td>
                <td style={{ padding: "10px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--text-3)" }}>{a.soul}</td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {a.domains.map((d, j) => <span key={j} className="tag-badge" style={{ fontSize: 8, padding: "1px 5px" }}>{d}</span>)}
                  </div>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ fontSize: 9, color: a.status === "ACTIVE" ? "var(--accent)" : "var(--text-3)", background: a.status === "ACTIVE" ? "rgba(0,255,128,0.08)" : "rgba(255,255,255,0.03)", padding: "2px 8px", borderRadius: "var(--radius)", border: `1px solid ${a.status === "ACTIVE" ? "rgba(0,255,128,0.2)" : "rgba(255,255,255,0.06)"}` }}>{a.status}</span>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 10, color: "var(--text-3)" }}>{a.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabSkills() {
  const [autoUpdate, setAutoUpdate] = useState(true);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>INSTALLED PACKS</div>
        {[
          { name: "FIDC Core Pack",   version: "1.0.0", skills: 11, updated: "Mar 18" },
        ].map((p, i) => (
          <div key={i} style={{ padding: "14px 16px", border: "1px solid rgba(0,255,128,0.15)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.03)", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{p.name}</span>
              <span className="tag-badge">v{p.version}</span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 9, color: "var(--text-3)" }}>
              <span>{p.skills} skills</span>
              <span>Updated {p.updated}</span>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-2)" }}>Auto-update</span>
            <div
              onClick={() => setAutoUpdate(x => !x)}
              style={{ width: 40, height: 20, borderRadius: 10, background: autoUpdate ? "rgba(0,255,128,0.3)" : "rgba(255,255,255,0.08)", cursor: "pointer", position: "relative", border: `1px solid ${autoUpdate ? "rgba(0,255,128,0.4)" : "rgba(255,255,255,0.12)"}`, transition: "background 0.2s" }}
            >
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: autoUpdate ? "var(--accent)" : "var(--text-4)", position: "absolute", top: 2, left: autoUpdate ? 22 : 2, transition: "left 0.2s, background 0.2s" }} />
            </div>
          </div>
        </div>
      </div>
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>MARKETPLACE</div>
        <div style={{ padding: "12px 14px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "rgba(255,255,255,0.02)", marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 4 }}>MARKETPLACE URL</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-2)" }}>https://marketplace.paganini.ai</div>
          <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 4 }}>Coming Q3 2026</div>
        </div>
        <div style={{ padding: "12px 14px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 8 }}>ROADMAP</div>
          {[
            { name: "Banking Pack",      eta: "Q3 2026" },
            { name: "Asset Management",  eta: "Q4 2026" },
            { name: "Insurance Pack",    eta: "Q1 2027" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 2 ? "1px solid var(--border-subtle)" : "none" }}>
              <span style={{ fontSize: 10, color: "var(--text-2)" }}>{r.name}</span>
              <span style={{ fontSize: 9, color: "#f59e0b" }}>{r.eta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabRTK() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 16 }}>RTK COMPRESSION ENGINE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `conic-gradient(hsl(150,100%,50%) 0deg ${85*3.6}deg, rgba(255,255,255,0.06) ${85*3.6}deg 360deg)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 78, height: 78, borderRadius: "50%", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>85%</div>
              <div style={{ fontSize: 8, color: "var(--text-3)" }}>COMPRESSION</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {[
              { k: "VERSION",         v: "v0.30.0",  c: "var(--text-1)" },
              { k: "BINARY PATH",     v: "~/.local/bin/rtk", c: "var(--text-2)" },
              { k: "STATUS",          v: "ACTIVE",   c: "var(--accent)" },
              { k: "MODE",            v: "binary",   c: "var(--text-2)" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 3 ? "1px solid var(--border-subtle)" : "none" }}>
                <span style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1 }}>{r.k}</span>
                <span style={{ fontSize: 9, color: r.c, fontFamily: "'IBM Plex Mono', monospace" }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
        {[
          { k: "Raw tokens today",        v: "2.4M",  c: "#f59e0b" },
          { k: "Compressed tokens",        v: "360k",  c: "var(--accent)" },
          { k: "Tokens saved",             v: "2.04M", c: "var(--accent)" },
          { k: "Savings today",            v: "$24.58", c: "var(--accent)" },
          { k: "Monthly projection",       v: "$748",  c: "var(--accent)" },
          { k: "Annual projection",        v: "$8,976", c: "var(--accent)" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderBottom: i < 5 ? "1px solid var(--border-subtle)" : "none", background: i % 2 === 0 ? "rgba(0,255,128,0.015)" : "transparent", borderRadius: "var(--radius)" }}>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>{r.k}</span>
            <span style={{ fontSize: 11, color: r.c, fontWeight: 600 }}>{r.v}</span>
          </div>
        ))}
      </div>
      <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-3)", marginBottom: 14 }}>RTK PROTOCOL INFO</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-2)", lineHeight: 1.9, background: "rgba(0,255,128,0.02)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ color: "var(--accent)", marginBottom: 8 }}>$ rtk --version</div>
          <div style={{ color: "var(--text-2)" }}>RTK (Runtime Token Kompressor) v0.30.0</div>
          <div style={{ color: "var(--text-3)", marginTop: 12, marginBottom: 4 }}>$ rtk stats</div>
          <div>compression_ratio: 0.85</div>
          <div>tokens_in:  2,400,000</div>
          <div>tokens_out:   360,000</div>
          <div>savings_today: $24.58</div>
          <div>uptime: 14d 6h</div>
          <div style={{ color: "var(--text-3)", marginTop: 12, marginBottom: 4 }}>$ rtk config</div>
          <div>mode: binary</div>
          <div>target: moltis-core</div>
          <div>intercept: stdout+stderr</div>
          <div style={{ color: "var(--accent)", marginTop: 12 }}>Status: ● RUNNING</div>
        </div>
        <div style={{ marginTop: 14, padding: "12px 14px", border: "1px solid rgba(0,255,128,0.12)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.04)" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>Monthly Savings Projection</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>$748</div>
          <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>at current compression ratio × daily volume</div>
        </div>
      </div>
    </div>
  );
}

function TabHealth() {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<number>(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setRunning(true);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setLines(i);
      if (i >= DOCTOR_OUTPUT.length) {
        clearInterval(t);
        setDone(true);
        setRunning(false);
      }
    }, 120);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass-card" style={{ padding: "24px 28px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#060810" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-2)", lineHeight: 2 }}>
        <div style={{ color: "var(--accent)", marginBottom: 8, fontSize: 11 }}>$ paganini doctor</div>
        <div style={{ color: "var(--text-3)", marginBottom: 16, fontSize: 10 }}>Running system health checks...</div>
        <div style={{ fontSize: 11 }}>
          <div style={{ color: "var(--text-2)", marginBottom: 10 }}>🩺 PAGANINI AIOS — SYSTEM HEALTH</div>
          {DOCTOR_OUTPUT.slice(0, lines).map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span style={{ color: "var(--text-3)", minWidth: 220 }}>
                {"   " + c.check.padEnd(22)}
              </span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>{c.result}</span>
              <span style={{ color: "var(--text-4)", marginLeft: 8, fontSize: 9 }}>{c.detail}</span>
            </div>
          ))}
          {running && <div style={{ color: "var(--cyan)", animation: "blink 0.8s infinite" }}>▊</div>}
          {done && (
            <div style={{ marginTop: 20, padding: "12px 16px", border: "1px solid rgba(0,255,128,0.25)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.06)" }}>
              <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>✓ 11/11 checks passed</span>
              <span style={{ color: "var(--text-3)", fontSize: 10, marginLeft: 16 }}>All systems operational</span>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("KERNEL");
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ ...CSS_VARS, background: "var(--bg)", minHeight: "100vh", fontFamily: "var(--font-mono)", color: "var(--text-1)", padding: "24px 20px" }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>SETTINGS / KERNEL CONFIG</span>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 11, letterSpacing: 1 }}>AIOS CONFIGURATION · RUNTIME · HEALTH</p>
      </div>

      {/* SYSTEM HEALTH HEADER */}
      <div className="glass-card" style={{ padding: "20px 28px", border: "1px solid rgba(0,255,128,0.2)", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.03)", marginBottom: 20, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 16, height: 16, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", position: "absolute", top: 3, left: 3, boxShadow: "0 0 10px var(--accent)" }} />
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--accent)", position: "absolute", top: 0, left: 0, opacity: pulse ? 0.5 : 0, transition: "opacity 0.5s" }} />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--accent)", letterSpacing: 0.5 }}>ALL SYSTEMS OPERATIONAL</span>
        </div>
        <div style={{ width: 1, height: 28, background: "var(--border)" }} />
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[
            { k: "KERNEL",  v: "Moltis v2.4.1" },
            { k: "PYTHON",  v: "3.12.3" },
            { k: "UPTIME",  v: "14d 6h 23m" },
            { k: "AGENTS",  v: "9 / 9" },
            { k: "SKILLS",  v: "11 / 11" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 8, color: "var(--text-3)", letterSpacing: 1.5, marginBottom: 3 }}>{s.k}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius)",
              border: `1px solid ${activeTab === tab ? "rgba(0,255,128,0.25)" : "var(--border-subtle)"}`,
              background: activeTab === tab ? "rgba(0,255,128,0.08)" : "transparent",
              color: activeTab === tab ? "var(--accent)" : "var(--text-3)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: 1,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              fontWeight: activeTab === tab ? 700 : 400,
            }}
          >{tab}</button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div>
        {activeTab === "KERNEL"        && <TabKernel />}
        {activeTab === "LLM PROVIDERS" && <TabLLM />}
        {activeTab === "RAG CONFIG"    && <TabRAG />}
        {activeTab === "AGENTS"        && <TabAgents />}
        {activeTab === "SKILLS"        && <TabSkills />}
        {activeTab === "RTK"           && <TabRTK />}
        {activeTab === "HEALTH"        && <TabHealth />}
      </div>

      <style>{`
        .glass-card { backdrop-filter: blur(8px); }
        .tag-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 9px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1px;
          font-weight: 600;
          border: 1px solid rgba(0,255,128,0.2);
          background: rgba(0,255,128,0.08);
          color: hsl(150 100% 50%);
          text-transform: uppercase;
        }
        .tag-badge-cyan {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 9px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 1px;
          font-weight: 600;
          border: 1px solid rgba(0,255,255,0.2);
          background: rgba(0,255,255,0.08);
          color: hsl(180 100% 50%);
          text-transform: uppercase;
        }
        button:hover { opacity: 0.9; }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
