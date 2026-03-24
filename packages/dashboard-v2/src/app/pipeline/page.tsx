"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineRun {
  id: string;
  title: string | null;
  status: string;
  current_stage: number | null;
  total_tokens: number | null;
  total_cost: number | null;
  duration_ms: number | null;
  created_at: string;
}

interface Task {
  id: string;
  name: string;
  status: string;
  agent_id: string | null;
  cost: number | null;
  tokens: number | null;
  duration: number | null;
  bmad_stage: number | null;
  priority: string | null;
  created_at: string;
}

interface PipelineData {
  pipeline_runs: PipelineRun[];
  tasks_by_stage: Record<string, Task[]>;
  tasks_total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_NAMES: Record<number, string> = {
  1: "Context Scout", 2: "Product Owner", 3: "Researcher", 4: "Architect",
  5: "UX Designer", 6: "Business Analyst", 7: "Scrum Master", 8: "Create Story",
  9: "Review Checklist", 10: "Specifier", 11: "Dev Senior", 12: "Code Review",
  13: "QA Tester", 14: "Deploy", 15: "Stakeholder Review", 16: "Retrospective",
  17: "Knowledge Writer", 18: "Metrics Logger",
};

const STATUS_COLOR: Record<string, string> = {
  active: "var(--accent)",
  completed: "hsl(180,100%,50%)",
  running: "#f59e0b",
  failed: "#ef4444",
  pending: "var(--text-3)",
};

function statusColor(s: string) { return STATUS_COLOR[s] ?? "var(--text-3)"; }

function fmtMs(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ stage, tasks }: { stage: number; tasks: Task[] }) {
  const name = STAGE_NAMES[stage] ?? `Stage ${stage}`;
  const done = tasks.filter((t) => t.status === "completed" || t.status === "done");
  const pct = tasks.length > 0 ? (done.length / tasks.length) * 100 : 0;
  const color = stage <= 5 ? "var(--accent)" : stage <= 10 ? "hsl(180,100%,50%)" : stage <= 14 ? "#f59e0b" : "#a78bfa";

  return (
    <div style={{ padding: "1rem", borderRadius: "var(--radius)", border: `1px solid ${color}30`, background: `${color}06`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color, fontWeight: 700 }}>
          {String(stage).padStart(2, "0")}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
          {tasks.length} tasks
        </span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color, fontWeight: 600 }}>
        {name}
      </div>
      {tasks.length > 0 && (
        <>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
            {done.length}/{tasks.length} concluídos
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Erro ao carregar pipeline"); setLoading(false); });
  }, []);

  const runs = data?.pipeline_runs ?? [];
  const byStage = data?.tasks_by_stage ?? {};
  const stageNums = Object.keys(byStage).map(Number).sort((a, b) => a - b);

  const totalTokens = runs.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const totalCost = runs.reduce((s, r) => s + (r.total_cost ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
            <span className="tag-badge">PIPELINE</span>
            <span className="tag-badge-cyan">MOTOR RECURSIVO</span>
            {!loading && <span className="tag-badge" style={{ color: "var(--accent)", background: "rgba(0,255,128,0.08)" }}>🟢 LIVE</span>}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.03em" }}>
            Pipeline de Execução
          </h1>
          <p className="section-help" style={{ marginTop: 4 }}>
            Runs do pipeline BMAD-CE com tarefas por estágio — dados em tempo real do Supabase
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ color: "var(--accent)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>AO VIVO</span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.875rem" }}>
        {[
          { label: "PIPELINE RUNS",   value: loading ? "—" : runs.length.toString(),                            color: "var(--accent)" },
          { label: "TASKS TOTAL",     value: loading ? "—" : (data?.tasks_total ?? 0).toString(),               color: "hsl(180,100%,50%)" },
          { label: "TOKENS TOTAL",    value: loading ? "—" : `${(totalTokens / 1000).toFixed(1)}K`,             color: "#a78bfa" },
          { label: "CUSTO TOTAL",     value: loading ? "—" : `$${totalCost.toFixed(4)}`,                        color: "#f59e0b" },
          { label: "ESTÁGIOS ATIVOS", value: loading ? "—" : stageNums.length.toString(),                       color: "#34d399" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3">
            <div className="mono-label" style={{ marginBottom: 4, fontSize: "0.75rem" }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Carregando pipeline do Supabase...
          </div>
        </div>
      )}
      {error && (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
        </div>
      )}

      {/* ── Pipeline Runs ── */}
      {!loading && runs.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="mono-label" style={{ marginBottom: 16 }}>PIPELINE RUNS</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {runs.map((run) => {
              const color = statusColor(run.status);
              const expanded = expandedRun === run.id;
              return (
                <div key={run.id}>
                  <div
                    onClick={() => setExpandedRun(expanded ? null : run.id)}
                    style={{ background: "var(--bg)", border: `1px solid ${color}30`, borderRadius: expanded ? "var(--radius) var(--radius) 0 0" : "var(--radius)", padding: "12px 16px", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {run.title ?? run.id}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginTop: 2 }}>
                          stage {run.current_stage ?? "?"} · {fmtDate(run.created_at)}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0, flexWrap: "wrap" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>TOKENS</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-2)" }}>
                            {run.total_tokens?.toLocaleString() ?? "—"}
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>CUSTO</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--cyan)" }}>
                            ${run.total_cost?.toFixed(4) ?? "—"}
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>DURAÇÃO</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-2)" }}>
                            {fmtMs(run.duration_ms)}
                          </div>
                        </div>
                        <span style={{ padding: "3px 10px", borderRadius: "var(--radius)", background: `${color}15`, border: `1px solid ${color}30`, color, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                          {run.status}
                        </span>
                        <span style={{ color: "var(--text-4)", fontSize: "0.75rem" }}>{expanded ? "▼" : "▶"}</span>
                      </div>
                    </div>
                  </div>
                  {expanded && (
                    <div style={{ background: "var(--bg)", border: `1px solid ${color}20`, borderTop: "none", borderRadius: "0 0 var(--radius) var(--radius)", padding: "16px" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", marginBottom: "0.5rem" }}>
                        ID: {run.id}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-3)" }}>
                        Stage atual: <span style={{ color }}>{run.current_stage ?? "—"} · {STAGE_NAMES[run.current_stage ?? 0] ?? "?"}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Nenhum pipeline run encontrado no Supabase.
          </div>
        </div>
      )}

      {/* ── Tasks by Stage (BMAD) ── */}
      {!loading && stageNums.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="mono-label" style={{ marginBottom: 16 }}>TAREFAS POR ESTÁGIO BMAD-CE</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {stageNums.map((s) => (
              <StageCard key={s} stage={s} tasks={byStage[s] ?? []} />
            ))}
          </div>
        </div>
      )}

      {!loading && stageNums.length === 0 && runs.length === 0 && (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>
            Pipeline sem dados de estágios no momento.
          </div>
        </div>
      )}
    </div>
  );
}
