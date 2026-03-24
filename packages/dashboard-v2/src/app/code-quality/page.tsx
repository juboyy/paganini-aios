"use client";

import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TraceError {
  id?: string;
  name: string;
  agent_id: string;
  status: string;
  error?: string;
  duration?: string;
  created_at: string;
}

interface GateRun {
  id?: string;
  name?: string;
  status?: string;
  passed?: boolean;
  score?: number;
  created_at: string;
}

interface ReviewTask {
  id?: string;
  name: string;
  status: string;
  agent_id: string;
  bmad_stage?: number;
  created_at: string;
}

interface QualityData {
  qualityScore: number;
  totalTraces: number;
  errorTraces: number;
  recentErrors: TraceError[];
  gateRuns: GateRun[];
  reviewTasks: ReviewTask[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score > 90) return "var(--accent)";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="glass-card" style={{ flex: 1, minWidth: 200, padding: "1.25rem" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900, color: color || "var(--text-1)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginTop: "0.25rem" }}>
        {sub}
      </div>
    </div>
  );
}

function TableHeader({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--text-4)", marginBottom: "1rem", textTransform: "uppercase" }}>
      {label}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CodeQualityPage() {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchData() {
    fetch("/api/code-quality")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        console.error("fetch quality error:", e);
        setError("Erro ao carregar qualidade");
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="glass-card" style={{ padding: "4rem", textAlign: "center", margin: "2rem auto", maxWidth: 600 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--accent)" }}>
          CARREGANDO MÉTRICAS DE QUALIDADE...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card" style={{ padding: "3rem", textAlign: "center", margin: "2rem auto", maxWidth: 600, border: "1px solid #ef444430" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
      </div>
    );
  }

  const score = data?.qualityScore || 0;
  const errorRate = data ? ((data.errorTraces / Math.max(data.totalTraces, 1)) * 100).toFixed(1) : "0.0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: "1.5rem", borderTop: "2px solid var(--accent)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
          Code Quality Analytics
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-4)", marginTop: 6, marginBottom: 0 }}>
          Métricas de qualidade de código em tempo real — traces, gate runs e review status
        </p>
      </div>

      {/* Main Stats */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <StatCard 
          label="Quality Score" 
          value={`${score}%`} 
          sub={data ? `${data.totalTraces.toLocaleString()} traces · ${data.errorTraces} erros · ${data.gateRuns?.length || 0} gates` : "calculando..."} 
          color={scoreColor(score)} 
        />
        <StatCard 
          label="Total Traces" 
          value={data?.totalTraces.toLocaleString() || "0"} 
          sub="Registradas no Supabase" 
        />
        <StatCard 
          label="Error Count" 
          value={data?.errorTraces.toLocaleString() || "0"} 
          sub="Traces com status=error" 
          color="#ef4444"
        />
        <StatCard 
          label="Error Rate" 
          value={`${errorRate}%`} 
          sub="Frequência de falhas" 
          color={parseFloat(errorRate) > 10 ? "#ef4444" : "#f59e0b"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        {/* Gate Runs Table */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <TableHeader label="✓ Quality Gate Runs" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {data?.gateRuns && data.gateRuns.length > 0 ? (
              data.gateRuns.slice(0, 10).map((run, i) => {
                const passed = run.passed ?? run.status === "passed" ?? run.status === "ok";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ 
                      fontFamily: "var(--font-mono)", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "3px", 
                      background: passed ? "rgba(0,255,136,0.12)" : "rgba(239,68,68,0.12)", 
                      color: passed ? "var(--accent)" : "#ef4444", 
                      border: `1px solid ${passed ? "rgba(0,255,136,0.3)" : "rgba(239,68,68,0.3)"}`,
                      fontWeight: 700
                    }}>
                      {passed ? "PASSED" : "FAILED"}
                    </div>
                    <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {run.name || run.id || "Gate Run"}
                    </div>
                    {run.score != null && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 700 }}>
                        {run.score}
                      </div>
                    )}
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>
                      {fmtDate(run.created_at)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-4)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                Sem execuções registradas.
              </div>
            )}
          </div>
        </div>

        {/* Recent Errors Table */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <TableHeader label="⚠ Recent Errors (Traces)" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {data?.recentErrors && data.recentErrors.length > 0 ? (
              data.recentErrors.slice(0, 10).map((trace, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.375rem", padding: "0.75rem", borderRadius: "4px", background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-1)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {trace.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>
                      {fmtDate(trace.created_at)}
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#ef4444", opacity: 0.9, background: "#ef444408", padding: "4px 8px", borderRadius: "2px", border: "1px solid #ef444415" }}>
                    {trace.error || "Unknown error"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-4)" }}>
                      Agent: <span style={{ color: "var(--accent)" }}>{trace.agent_id}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-4)" }}>
                      Status: <span style={{ color: "#ef4444" }}>{trace.status}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "1rem", textAlign: "center", color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                ✓ Nenhuma falha recente. Sistema operando nominalmente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
