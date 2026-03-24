"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Capability {
  id: string;
  name: string;
  description: string;
  kind: string;
  status: string;
  agents: string[] | null;
}

// ─── Colors by kind ───────────────────────────────────────────────────────────

const KIND_COLOR: Record<string, string> = {
  integration: "#f59e0b",
  tool:        "hsl(150,100%,50%)",
  skill:       "hsl(180,100%,50%)",
  native:      "#a78bfa",
  script:      "#fb923c",
  api:         "#34d399",
};

function kindColor(kind: string) {
  return KIND_COLOR[kind] ?? "var(--text-3)";
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function CapabilitiesBarChart({ groups }: { groups: Record<string, Capability[]> }) {
  const entries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  const max = entries[0]?.[1].length ?? 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {entries.map(([kind, caps]) => {
        const color = kindColor(kind);
        const pct = (caps.length / max) * 100;
        return (
          <div key={kind} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color, fontWeight: 700, minWidth: 90 }}>
              {kind}
            </div>
            <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, boxShadow: `0 0 8px ${color}50` }} />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color, fontWeight: 700, minWidth: 28, textAlign: "right" }}>
              {caps.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Capability Card ──────────────────────────────────────────────────────────

function CapCard({ cap }: { cap: Capability }) {
  const color = kindColor(cap.kind);
  return (
    <div style={{ padding: "1rem 1.125rem", borderRadius: "var(--radius)", border: `1px solid ${color}30`, background: `${color}06`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, color, letterSpacing: "-0.01em" }}>
          {cap.name}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius)", background: `${color}12`, border: `1px solid ${color}30`, color, whiteSpace: "nowrap", flexShrink: 0 }}>
          {cap.kind}
        </span>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>
        {cap.description || "—"}
      </p>
      {cap.agents && cap.agents.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {cap.agents.map((a) => (
            <span key={a} style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "1px 7px", borderRadius: "var(--radius)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-3)" }}>
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<string>("all");

  function fetchData() {
    fetch("/api/capabilities")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Capability[]) => {
        setCaps(Array.isArray(data) ? data : []);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar capacidades");
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const groups: Record<string, Capability[]> = {};
  for (const c of caps) {
    if (!groups[c.kind]) groups[c.kind] = [];
    groups[c.kind].push(c);
  }

  const kinds = Object.keys(groups).sort();
  const displayed = selectedKind === "all" ? caps : (groups[selectedKind] ?? []);

  const STATS = [
    { label: "Total de Capacidades", value: caps.length.toString(),        color: "var(--accent)" },
    { label: "Skills",               value: (groups.skill?.length ?? 0).toString(),       color: "hsl(180,100%,50%)" },
    { label: "Integrações",          value: (groups.integration?.length ?? 0).toString(), color: "#f59e0b" },
    { label: "Ferramentas",          value: (groups.tool?.length ?? 0).toString(),        color: "hsl(150,100%,55%)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ── Header ── */}
      <div className="glass-card" style={{ padding: "2rem 2rem 1.5rem", position: "relative", overflow: "hidden", borderTop: "2px solid hsl(180,100%,50% / 0.6)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 80% at 50% 0%, hsl(180,100%,50% / 0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.15em", color: "var(--text-4)", marginBottom: "0.5rem" }}>
            PAGANINI AIOS · CAPACIDADES & SKILLS
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 900, color: "var(--text-1)", letterSpacing: "-0.03em", margin: "0 0 0.75rem", lineHeight: 1.1 }}>
            Capacidades & Skills{" "}
            <span style={{ color: "hsl(180,100%,50%)", textShadow: "0 0 30px hsl(180,100%,50% / 0.4)" }}>
              · Live
            </span>
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "4px 14px", borderRadius: "var(--radius)", background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.25)", color: "hsl(180,100%,50%)", fontWeight: 700, letterSpacing: "0.05em" }}>
              {loading ? "..." : `${caps.length} CAPACIDADES`}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "4px 14px", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.08)", border: "1px solid rgba(0,255,128,0.25)", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em" }}>
              {loading ? "..." : `${kinds.length} TIPOS`}
            </span>
            {!loading && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", padding: "4px 14px", borderRadius: "var(--radius)", background: "rgba(0,255,128,0.08)", border: "1px solid rgba(0,255,128,0.15)", color: "var(--accent)", fontWeight: 500, letterSpacing: "0.05em" }}>
                🟢 SUPABASE LIVE
              </span>
            )}
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)", margin: 0, lineHeight: 1.6 }}>
            Capacidades indexadas em pgvector com busca semântica — dados em tempo real do Supabase.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        {STATS.map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1.25rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: "0.375rem" }}>
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
            Carregando capacidades do Supabase...
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
        </div>
      )}

      {/* ── Bar Chart ── */}
      {!loading && !error && Object.keys(groups).length > 0 && (
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.15em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
            DISTRIBUIÇÃO POR TIPO
          </div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", margin: "0 0 1.25rem" }}>
            Capacidades por Categoria
          </h2>
          <CapabilitiesBarChart groups={groups} />
        </div>
      )}

      {/* ── Filter ── */}
      {!loading && !error && kinds.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>FILTRAR:</span>
          {["all", ...kinds].map((k) => {
            const active = selectedKind === k;
            const color = k === "all" ? "var(--accent)" : kindColor(k);
            return (
              <button
                key={k}
                onClick={() => setSelectedKind(k)}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.8125rem", letterSpacing: "0.08em",
                  padding: "4px 12px", borderRadius: "var(--radius)",
                  border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
                  background: active ? `${color}18` : "transparent",
                  color: active ? color : "var(--text-3)", cursor: "pointer",
                }}
              >
                {k === "all" ? "TODOS" : k.toUpperCase()}
                {k !== "all" && ` (${groups[k]?.length ?? 0})`}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && caps.length === 0 && (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Nenhuma capacidade registrada
          </div>
        </div>
      )}

      {/* ── Capability Cards ── */}
      {!loading && !error && displayed.length > 0 && (
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.15em", color: "var(--text-4)", marginBottom: "1rem" }}>
            {selectedKind === "all" ? "TODAS AS CAPACIDADES" : selectedKind.toUpperCase()} — {displayed.length} ENTRADAS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {displayed.map((cap) => (
              <CapCard key={cap.id} cap={cap} />
            ))}
          </div>
        </div>
      )}

      {/* ── pgvector note ── */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div style={{ marginTop: "0", padding: "0.875rem 1rem", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "var(--radius)", background: "rgba(167,139,250,0.05)" }}>
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
    </div>
  );
}
