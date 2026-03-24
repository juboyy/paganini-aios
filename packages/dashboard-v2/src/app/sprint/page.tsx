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

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, boxShadow: `0 0 6px ${color}55`, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── Burndown Chart ───────────────────────────────────────────────────────────

function BurndownChart({ daily }: { daily: DailyEntry[] }) {
  if (!daily || daily.length === 0) return null;

  const W = 560, H = 180, PAD = { top: 16, right: 20, bottom: 36, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const maxTotal = Math.max(...daily.map((d) => d.total), 1);
  const xScale = (i: number) => PAD.left + (i / Math.max(daily.length - 1, 1)) * iW;
  const yScale = (v: number) => PAD.top + iH - (v / maxTotal) * iH;

  const completedPts = daily.map((d, i) => ({ x: xScale(i), y: yScale(d.completed) }));
  const totalPts = daily.map((d, i) => ({ x: xScale(i), y: yScale(d.total) }));

  const cPath = completedPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const tPath = totalPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const aFill = cPath + ` L${completedPts[completedPts.length - 1].x},${yScale(0)} L${xScale(0)},${yScale(0)} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", maxWidth: "100%", overflow: "visible" }}>
      <defs>
        <linearGradient id="bdFill2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(150 100% 50%)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(150 100% 50%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.left} y1={PAD.top + iH * (1 - f)} x2={W - PAD.right} y2={PAD.top + iH * (1 - f)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={PAD.left - 6} y={PAD.top + iH * (1 - f) + 4} textAnchor="end" style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fill: "var(--text-4)" }}>
            {Math.round(maxTotal * f)}
          </text>
        </g>
      ))}
      {daily.filter((_, i) => i % 3 === 0 || i === daily.length - 1).map((d, _, arr) => {
        const origIndex = daily.findIndex((x) => x.date === d.date);
        return (
          <text key={d.date} x={xScale(origIndex)} y={H - PAD.bottom + 14} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fill: "var(--text-4)" }}>
            {d.date.slice(5)}
          </text>
        );
      })}
      <path d={tPath} fill="none" stroke="rgba(0,255,255,0.3)" strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={aFill} fill="url(#bdFill2)" />
      <path d={cPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {completedPts.length > 0 && (
        <circle cx={completedPts[completedPts.length - 1].x} cy={completedPts[completedPts.length - 1].y} r={4} fill="var(--accent)" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
      )}
    </svg>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, color }: { task: Task; color: string }) {
  return (
    <div style={{ padding: "0.75rem", borderRadius: "var(--radius)", background: `${color}04`, border: `1px solid ${color}15`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ fontSize: "0.8125rem", color: "var(--text-2)", lineHeight: 1.4 }}>
        {task.name}
      </div>
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
        {task.agent_id && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--cyan)", background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.18)", padding: "1px 5px", borderRadius: "var(--radius)", whiteSpace: "nowrap" }}>
            {task.agent_id}
          </span>
        )}
        {task.priority && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: priorityColor(task.priority), background: `${priorityColor(task.priority)}15`, border: `1px solid ${priorityColor(task.priority)}30`, padding: "1px 5px", borderRadius: "var(--radius)", whiteSpace: "nowrap" }}>
            {task.priority}
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {task.cost != null && task.cost > 0 ? (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>
            ${task.cost.toFixed(4)}
          </span>
        ) : <span />}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-4)" }}>
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
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color, padding: "4px 10px", border: `1px solid ${color}25`, borderRadius: "var(--radius)", background: `${color}07`, marginBottom: "0.75rem", display: "inline-block" }}>
        {title} ({tasks.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {shown.map((t) => <TaskCard key={t.id} task={t} color={color} />)}
      </div>
      {!expanded && tasks.length > limit && (
        <button onClick={() => setExpanded(true)} style={{ marginTop: "0.5rem", padding: "4px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer", letterSpacing: "0.08em", width: "100%" }}>
          + {tasks.length - limit} MAIS
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

  useEffect(() => {
    fetch("/api/sprint")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Erro ao carregar sprint"); setLoading(false); });
  }, []);

  const stats = data?.stats ?? { total: 0, pending: 0, in_progress: 0, done: 0, total_cost: 0, total_tokens: 0 };
  const donePct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header ── */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
          PAGANINI AIOS · GESTÃO DE TAREFAS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            Sprint Board
          </h1>
          <span className="tag-badge">TASKS SUPABASE</span>
          {!loading && <span className="tag-badge" style={{ color: "var(--accent)", background: "rgba(0,255,128,0.08)" }}>🟢 LIVE</span>}
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          Kanban com dados reais de tasks — pendentes, em andamento, concluídas
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
        {[
          { label: "TOTAL TASKS",    value: loading ? "—" : stats.total.toString(),              color: "var(--text-1)", sub: `${stats.pending} pendentes` },
          { label: "CONCLUÍDAS",     value: loading ? "—" : stats.done.toString(),              color: "var(--accent)", sub: `${donePct}% completo` },
          { label: "EM ANDAMENTO",   value: loading ? "—" : stats.in_progress.toString(),       color: "var(--cyan)",   sub: "em progresso" },
          { label: "PENDENTES",      value: loading ? "—" : stats.pending.toString(),           color: "#f59e0b",       sub: "aguardando" },
          { label: "CUSTO TOTAL",    value: loading ? "—" : `$${stats.total_cost.toFixed(2)}`, color: "#a78bfa",       sub: "todas as tasks" },
          { label: "TOKENS TOTAL",   value: loading ? "—" : `${(stats.total_tokens / 1000).toFixed(1)}K`, color: "hsl(180,100%,50%)", sub: "tokens consumidos" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.25rem" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-4)", marginTop: "2px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Overall Progress ── */}
      {!loading && stats.total > 0 && (
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>PROGRESSO GERAL</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>{donePct}%</span>
          </div>
          <ProgressBar pct={donePct} />
        </div>
      )}

      {/* ── Burndown ── */}
      {!loading && data?.daily && data.daily.length > 0 && (
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "0.75rem" }}>
            ATIVIDADE DIÁRIA (ÚLTIMOS 14 DIAS)
          </div>
          <div style={{ overflowX: "auto" }}>
            <BurndownChart daily={data.daily} />
          </div>
          <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 2, background: "var(--accent)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>CONCLUÍDAS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 2, borderTop: "2px dashed rgba(0,255,255,0.4)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)" }}>TOTAL CRIADAS</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-4)" }}>Carregando tasks do Supabase...</div>
        </div>
      )}
      {error && (
        <div className="glass-card" style={{ padding: "2rem", textAlign: "center", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#ef4444" }}>{error}</div>
        </div>
      )}

      {/* ── Kanban Board ── */}
      {!loading && data && (
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: "1rem" }}>
            KANBAN · TASKS REAIS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", alignItems: "start" }}>
            <KanbanCol title="PENDENTES" tasks={data.pending} color="#f59e0b" />
            <KanbanCol title="EM ANDAMENTO" tasks={data.in_progress} color="var(--cyan)" />
            <KanbanCol title="CONCLUÍDAS" tasks={data.done} color="var(--accent)" limit={15} />
          </div>
        </div>
      )}
    </div>
  );
}
