"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemoryEntry {
  id: string;
  content: string;
  type: string | null;
  source_agent: string | null;
  tags?: string[] | null;
  confidence?: number | null;
  access_count?: number | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function catColor(cat: string | null) {
  const map: Record<string, string> = {
    decision:      "#f59e0b",
    context:       "hsl(180,100%,50%)",
    learning:      "#a78bfa",
    error_pattern: "#ef4444",
    fact:          "var(--accent)",
    preference:    "#f472b6",
    preference: "var(--accent)",
    task:       "#34d399",
    error:      "#ef4444",
  };
  return map[cat ?? ""] ?? "var(--text-3)";
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

function MemCard({ entry }: { entry: MemoryEntry }) {
  const color = catColor(entry.type);
  const preview = entry.content.length > 300 ? entry.content.slice(0, 300) + "…" : entry.content;
  return (
    <div style={{ padding: "1rem 1.125rem", borderRadius: "var(--radius)", border: `1px solid ${color}25`, background: `${color}05`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {entry.type && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: `${color}15`, border: `1px solid ${color}30`, color }}>
              {entry.type}
            </span>
          )}
          {entry.source_agent && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.2)", color: "hsl(180,100%,50%)" }}>
              {entry.source_agent}
            </span>
          )}
          {entry.confidence != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
              {(entry.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
          {fmtDate(entry.created_at)}
        </span>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-2)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {preview}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbAgents, setDbAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  function fetchData(cat?: string, agent?: string) {
    const params = new URLSearchParams();
    if (cat && cat !== "all") params.set("category", cat);
    if (agent && agent !== "all") params.set("agent_id", agent);
    fetch(`/api/memory${params.toString() ? "?" + params.toString() : ""}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        // Support both old array format and new object format
        if (Array.isArray(data)) {
          setEntries(data);
          setTotalCount(data.length);
        } else {
          setEntries(data.entries ?? []);
          setTotalCount(data.total ?? (data.entries ?? []).length);
          if (data.categories) setDbCategories(data.categories);
          if (data.agents) setDbAgents(data.agents);
        }
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar memória");
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(filterCat, filterAgent), 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = dbCategories.length > 0 ? dbCategories : Array.from(new Set(entries.map((e) => e.type).filter(Boolean))) as string[];
  const agents = dbAgents.length > 0 ? dbAgents : Array.from(new Set(entries.map((e) => e.source_agent).filter(Boolean))) as string[];

  const displayed = entries.filter((e) => {
    if (filterCat !== "all" && e.type !== filterCat) return false;
    if (filterAgent !== "all" && e.source_agent !== filterAgent) return false;
    if (search && !e.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleCatFilter(c: string) {
    setFilterCat(c);
    setLoading(true);
    fetchData(c, filterAgent);
  }
  function handleAgentFilter(a: string) {
    setFilterAgent(a);
    setLoading(true);
    fetchData(filterCat, a);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header ── */}
      <div className="glass-card" style={{ padding: "2rem 2rem 1.5rem", position: "relative", overflow: "hidden", borderTop: "2px solid rgba(0,255,255,0.5)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 70% at 50% 0%, rgba(0,255,255,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.15em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
            PAGANINI AIOS · MEMÓRIA DO SISTEMA
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 900, color: "var(--text-1)", letterSpacing: "-0.03em", margin: "0 0 0.75rem", lineHeight: 1.1 }}>
            Memória{" "}
            <span style={{ color: "hsl(180,100%,50%)", textShadow: "0 0 30px hsl(180,100%,50% / 0.3)" }}>
              · Knowledge Store
            </span>
          </h1>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "4px 14px", borderRadius: "var(--radius)", background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.25)", color: "hsl(180,100%,50%)", fontWeight: 700 }}>
              {loading ? "..." : `${displayed.length} / ${totalCount} ENTRADAS`}
            </span>
            {!loading && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "4px 14px", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.08)", border: "1px solid rgba(0,255,128,0.15)", color: "var(--accent)" }}>
                🟢 SUPABASE LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Entradas",   value: totalCount,               color: "var(--accent)" },
          { label: "Categorias", value: cats.length,             color: "hsl(180,100%,50%)" },
          { label: "Agentes",    value: agents.length,           color: "#a78bfa" },
          { label: "Exibindo",   value: displayed.length,        color: "var(--text-2)" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: "0.25rem" }}>
              {loading ? "—" : s.value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>
              {s.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Carregando memória do Supabase...
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && entries.length === 0 && (
        <div className="glass-card" style={{ padding: "4rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-2)", marginBottom: "0.5rem" }}>
            Nenhuma memória armazenada
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-4)", lineHeight: 1.6 }}>
            A tabela <span style={{ color: "hsl(180,100%,50%)" }}>memory_entries</span> está vazia.
            <br />As memórias aparecerão aqui conforme os agentes aprenderem.
          </div>
        </div>
      )}

      {/* ── Filters (only when there is data) ── */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar por conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: "var(--font-mono)", fontSize: "0.875rem",
              padding: "0.625rem 1rem", borderRadius: "var(--radius)",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)", color: "var(--text-1)",
              outline: "none",
            }}
          />

          {/* Category filter */}
          {cats.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>CATEGORIA:</span>
              {["all", ...cats].map((c) => {
                const active = filterCat === c;
                const color = c === "all" ? "var(--accent)" : catColor(c);
                return (
                  <button key={c} onClick={() => handleCatFilter(c)} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "3px 10px", borderRadius: "var(--radius)", border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.1)", background: active ? `rgba(0,255,128,0.1)` : "transparent", color: active ? color : "var(--text-3)", cursor: "pointer" }}>
                    {c === "all" ? "TODAS" : c}
                  </button>
                );
              })}
            </div>
          )}

          {/* Agent filter */}
          {agents.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>AGENTE:</span>
              {["all", ...agents.slice(0, 10)].map((a) => {
                const active = filterAgent === a;
                return (
                  <button key={a} onClick={() => handleAgentFilter(a)} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "3px 10px", borderRadius: "var(--radius)", border: active ? "1px solid hsl(180,100%,50%)" : "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(0,255,255,0.1)" : "transparent", color: active ? "hsl(180,100%,50%)" : "var(--text-3)", cursor: "pointer" }}>
                    {a === "all" ? "TODOS" : a}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Entries ── */}
      {!loading && !error && displayed.length === 0 && entries.length > 0 && (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Nenhuma entrada encontrada para os filtros selecionados.
          </div>
        </div>
      )}

      {!loading && !error && displayed.length > 0 && (
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.15em", color: "var(--text-4)", marginBottom: "1rem" }}>
            ENTRADAS DE MEMÓRIA — {displayed.length} RESULTADOS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {displayed.map((e) => (
              <MemCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
