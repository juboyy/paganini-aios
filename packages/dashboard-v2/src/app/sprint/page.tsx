"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  name: string;
  status: string;
  agent_id: string | null;
  cost: number | null;
  tokens: number | null;
  duration: number | null;
  priority: string | null;
  created_at: string;
  completed_at: string | null;
  bmad_stage: number | null;
}

interface DailyEntry {
  date: string;
  completed: number;
  total: number;
}

interface SprintStats {
  total: number;
  pending: number;
  in_progress: number;
  done: number;
  total_cost: number;
  total_tokens: number;
}

interface SprintData {
  pending: Task[];
  in_progress: Task[];
  done: Task[];
  daily: DailyEntry[];
  stats: SprintStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  high:   "#ef4444",
  medium: "#f59e0b",
  low:    "var(--text-3)",
  urgent: "#ef4444",
};

function priorityColor(p: string | null) { return PRIORITY_COLOR[p ?? ""] ?? "var(--text-4)"; }

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

function formatCost(cost: number | null) {
  if (cost == null || cost === 0) return "$0.00";
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens: number | null) {
  if (tokens == null || tokens === 0) return "0";
  if (tokens >= 1000000) return (tokens / 1000000).toFixed(1) + "M";
  if (tokens >= 1000) return (tokens / 1000).toFixed(1) + "K";
  return tokens.toString();
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, color }: { task: Task; color: string }) {
  const truncatedName = task.name.length > 60 ? task.name.slice(0, 57) + "..." : task.name;
  return (
    <div style={{ padding: "0.75rem", borderRadius: "var(--radius)", background: `${color}04`, border: `1px solid ${color}15`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-1)", lineHeight: 1.4, fontWeight: 500 }}>
        {truncatedName}
      </div>
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
        {task.agent_id && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "hsl(180,100%,50%)", background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.18)", padding: "1px 5px", borderRadius: "var(--radius)", whiteSpace: "nowrap" }}>
            {task.agent_id}
          </span>
        )}
        {task.priority && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: priorityColor(task.priority), background: `${priorityColor(task.priority)}15`, border: `1px solid ${priorityColor(task.priority)}30`, padding: "1px 5px", borderRadius: "var(--radius)", whiteSpace: "nowrap", fontWeight: 700 }}>
            {task.priority.toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "4px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--accent)", fontWeight: 700 }}>
            {formatCost(task.cost)}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-4)" }}>
            {formatTokens(task.tokens)}
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)" }}>
          {fmtDate(task.created_at)}
        </span>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanCol({ title, tasks, color, limit = 20 }: { title: string; tasks: Task[]; color: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tasks : tasks.slice(0, limit);
  return (
    <div style={{ minWidth: 280, flex: 1 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color, padding: "6px 12px", border: `1px solid ${color}25`, borderRadius: "var(--radius)", background: `${color}07`, marginBottom: "1rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
        <span>{title}</span>
        <span>{tasks.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {shown.map((t) => <TaskCard key={t.id} task={t} color={color} />)}
      </div>
      {!expanded && tasks.length > limit && (
        <button onClick={() => setExpanded(true)} style={{ marginTop: "1rem", padding: "8px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius)", cursor: "pointer", width: "100%", transition: "all 0.2s" }}>
          + {tasks.length - limit} MAIS TAREFAS
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SprintPage() {
  const [data, setData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchData() {
    fetch("/api/sprint")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        console.error("fetch sprint error:", e);
        setError("Erro ao carregar sprint");
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats ?? { total: 0, pending: 0, in_progress: 0, done: 0, total_cost: 0, total_tokens: 0 };
  const donePct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: "1.5rem", borderTop: "2px solid var(--accent)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
              PAGANINI AIOS · GESTÃO DE TAREFAS
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
              Sprint Board
            </h1>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>COMPLETION</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 900, color: "var(--accent)" }}>{donePct}%</div>
            </div>
            {!loading && <div style={{ height: 40, width: 2, background: "rgba(255,255,255,0.08)" }} />}
            {!loading && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>TOTAL COST</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 900, color: "#a78bfa" }}>{formatCost(stats.total_cost)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        {[
          { label: "TOTAL TASKS",    value: stats.total.toString(),              color: "var(--text-1)" },
          { label: "PENDENTE",       value: stats.pending.toString(),           color: "#f59e0b" },
          { label: "EM ANDAMENTO",   value: stats.in_progress.toString(),       color: "hsl(180,100%,50%)" },
          { label: "CONCLUÍDO",      value: stats.done.toString(),              color: "var(--accent)" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>
              {loading && !data ? "—" : s.value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Loading & Error States */}
      {loading && !data && (
        <div className="glass-card" style={{ padding: "4rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--accent)" }}>
            CARREGANDO TASKS...
          </div>
        </div>
      )}

      {error && !data && (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center", border: "1px solid #ef444430" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
        </div>
      )}

      {/* Kanban Board */}
      {data && (
        <div style={{ display: "flex", gap: "1.5rem", overflowX: "auto", paddingBottom: "1rem", alignItems: "flex-start" }}>
          <KanbanCol title="PENDENTE" tasks={data.pending} color="#f59e0b" />
          <KanbanCol title="EM ANDAMENTO" tasks={data.in_progress} color="hsl(180,100%,50%)" />
          <KanbanCol title="CONCLUÍDO" tasks={data.done} color="var(--accent)" limit={15} />
        </div>
      )}
    </div>
  );
}
