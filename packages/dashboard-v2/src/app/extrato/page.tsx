"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ── */
interface ExtratoDetail {
  // task
  bmad_stage?: string | null;
  github_commit?: string | null;
  jira_key?: string | null;
  source?: string | null;
  priority?: string | null;
  mission_id?: string | null;
  sprint_id?: string | null;
  completed_at?: string | null;
  // interaction
  from_agent?: string | null;
  to_agent?: string | null;
  interaction_type?: string | null;
  message?: string | null;
  latency?: number | null;
  estimated_cost?: boolean;
  // trace
  spans?: unknown;
  error?: string | null;
  // event
  description?: string | null;
  event_type?: string | null;
  metadata?: unknown;
}

interface ExtratoEntry {
  id: string;
  timestamp: string;
  type: "task" | "interaction" | "event" | "trace";
  agent_id: string;
  title: string;
  status: string;
  cost?: number;
  tokens?: number;
  duration?: number | string | null;
  detail?: ExtratoDetail;
}

interface ExtratoStats {
  total: number;
  tasks: number;
  interactions: number;
  events: number;
  traces: number;
  totalCost: number;
  totalTokens: number;
  agents: string[];
}

interface ExtratoResponse {
  entries: ExtratoEntry[];
  stats: ExtratoStats | null;
  date: string;
  error?: string;
}

/* ── Constants ── */
const AGENT_EMOJIS: Record<string, string> = {
  code: "💻", infra: "🏗", docs: "📝", general: "🔧", architect: "🧠",
  pm: "📋", data: "📊", qa: "🧪", security: "🔒", oracli: "💡",
  unknown: "•", system: "⚙️",
};

const TYPE_CONFIG = {
  task:        { label: "TASK",        color: "var(--accent)",          bg: "color-mix(in srgb, var(--accent) 12%, transparent)",        glow: "var(--accent)" },
  interaction: { label: "INTERACTION", color: "var(--cyan)",            bg: "color-mix(in srgb, var(--cyan) 12%, transparent)",          glow: "var(--cyan)" },
  event:       { label: "EVENT",       color: "var(--amber)",           bg: "color-mix(in srgb, var(--amber) 12%, transparent)",         glow: "var(--amber)" },
  trace:       { label: "TRACE",       color: "hsl(270 80% 70%)",       bg: "color-mix(in srgb, hsl(270 80% 70%) 12%, transparent)",     glow: "hsl(270 80% 70%)" },
} as const;

const STATUS_DOT: Record<string, string> = {
  success:   "var(--accent)",
  completed: "var(--accent)",
  done:      "var(--accent)",
  error:     "var(--red, #ef4444)",
  failed:    "var(--red, #ef4444)",
  warning:   "var(--amber)",
  pending:   "var(--text-4)",
  running:   "var(--cyan)",
  info:      "var(--text-3)",
  unknown:   "var(--text-4)",
};

/* ── Helpers ── */
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
  } catch { return "??:??:??"; }
}

function formatTokens(n?: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(d?: number | string | null): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  if (typeof d === "number") {
    if (d >= 60000) return `${Math.round(d / 60000)}m`;
    if (d >= 1000) return `${(d / 1000).toFixed(1)}s`;
    return `${d}ms`;
  }
  return "";
}

function agentEmoji(agent: string): string {
  const key = agent.toLowerCase();
  for (const k of Object.keys(AGENT_EMOJIS)) {
    if (key.includes(k)) return AGENT_EMOJIS[k];
  }
  return "•";
}

function dotColor(status: string): string {
  const s = status.toLowerCase();
  return STATUS_DOT[s] || "var(--text-4)";
}

/* ── Sub-components ── */

function DetailPanel({ entry }: { entry: ExtratoEntry }) {
  const d = entry.detail || {};
  const rows: Array<[string, string | number | null | undefined]> = [];

  if (entry.type === "task") {
    if (d.bmad_stage) rows.push(["BMAD Stage", d.bmad_stage]);
    if (d.github_commit) rows.push(["Commit", d.github_commit]);
    if (d.jira_key) rows.push(["Jira", d.jira_key]);
    if (d.source) rows.push(["Source", d.source]);
    if (d.priority) rows.push(["Priority", d.priority]);
    if (d.mission_id) rows.push(["Mission", d.mission_id]);
    if (d.sprint_id) rows.push(["Sprint", d.sprint_id]);
    if (entry.cost != null) rows.push(["Cost", `$${entry.cost.toFixed(4)}`]);
    if (entry.tokens) rows.push(["Tokens", formatTokens(entry.tokens)]);
    if (entry.duration != null) rows.push(["Duration", formatDuration(entry.duration)]);
    rows.push(["Status", entry.status]);
    if (d.completed_at) rows.push(["Completed", formatTime(d.completed_at)]);
  }

  if (entry.type === "interaction") {
    if (d.from_agent) rows.push(["From", d.from_agent]);
    if (d.to_agent) rows.push(["To", d.to_agent]);
    if (d.interaction_type) rows.push(["Sub-type", d.interaction_type]);
    if (entry.tokens) rows.push(["Tokens", formatTokens(entry.tokens)]);
    if (entry.cost != null) rows.push(["Cost", `$${entry.cost.toFixed(4)}${d.estimated_cost ? " (est.)" : ""}`]);
    if (d.latency != null) rows.push(["Latency", `${d.latency}ms`]);
    if (d.mission_id) rows.push(["Mission", d.mission_id]);
    if (d.message) {
      // Render full message with proper formatting
      const msg = d.message;
      rows.push(["Message", msg.length > 500 ? msg.slice(0, 500) + "…" : msg]);
    }
  }

  if (entry.type === "trace") {
    if (entry.duration != null) rows.push(["Duration", formatDuration(entry.duration)]);
    rows.push(["Status", entry.status]);
    if (d.error) rows.push(["Error", d.error]);
    if (d.spans != null) rows.push(["Spans", typeof d.spans === "number" ? String(d.spans) : JSON.stringify(d.spans).slice(0, 120)]);
  }

  if (entry.type === "event") {
    if (d.event_type) rows.push(["Sub-type", d.event_type]);
    if (d.mission_id) rows.push(["Mission", d.mission_id]);
    if (d.sprint_id) rows.push(["Sprint", d.sprint_id]);
    if (d.description) rows.push(["Description", d.description.length > 200 ? d.description.slice(0, 200) + "…" : d.description]);
    if (d.metadata && typeof d.metadata === "object") {
      rows.push(["Metadata", JSON.stringify(d.metadata).slice(0, 150)]);
    }
  }

  if (rows.length === 0) return null;

  return (
    <div style={{
      marginTop: "0.5rem",
      borderTop: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
      paddingTop: "0.5rem",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "0.4rem 1.5rem",
    }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            letterSpacing: "0.1em",
            color: "var(--text-4)",
            whiteSpace: "nowrap",
            paddingTop: "0.1rem",
            minWidth: 70,
          }}>
            {k}
          </span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            color: "var(--text-2)",
            wordBreak: "break-all",
          }}>
            {v ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function EntryRow({ entry, index, total }: { entry: ExtratoEntry; index: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.event;

  return (
    <div
      style={{
        padding: "0.7rem 1.25rem",
        borderBottom: index < total - 1 ? "1px solid var(--border-subtle, rgba(255,255,255,0.05))" : "none",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onClick={() => setExpanded((p) => !p)}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover, rgba(255,255,255,0.03))")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Main row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "70px 90px 1fr auto",
        gap: "0.75rem",
        alignItems: "start",
      }}>
        {/* Timestamp */}
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.72rem",
          color: "var(--text-3)",
          paddingTop: "0.15rem",
          whiteSpace: "nowrap",
        }}>
          {formatTime(entry.timestamp)}
        </div>

        {/* Type badge */}
        <div>
          <span style={{
            display: "inline-block",
            fontFamily: "var(--font-mono)",
            fontSize: "0.58rem",
            letterSpacing: "0.12em",
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`,
            padding: "0.1rem 0.45rem",
            borderRadius: "4px",
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Content */}
        <div>
          {/* Agent + title */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--text-4)",
            }}>
              {agentEmoji(entry.agent_id)} {entry.agent_id}
            </span>
          </div>
          <div style={{
            fontSize: "0.84rem",
            color: "var(--text-1)",
            lineHeight: 1.45,
          }}>
            {entry.title}
          </div>

          {/* Expanded detail */}
          <div style={{
            overflow: "hidden",
            maxHeight: expanded ? "600px" : "0px",
            transition: "max-height 0.25s ease",
          }}>
            <DetailPanel entry={entry} />
          </div>
        </div>

        {/* Meta (right column) */}
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
          {/* Status dot */}
          <div style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: dotColor(entry.status),
            boxShadow: ["success","completed","done"].includes(entry.status.toLowerCase())
              ? `0 0 6px ${dotColor(entry.status)}`
              : "none",
          }} />
          {entry.tokens && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-4)" }}>
              {formatTokens(entry.tokens)} tok
            </div>
          )}
          {entry.duration != null && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-4)" }}>
              {formatDuration(entry.duration)}
            </div>
          )}
          {entry.cost != null && entry.cost > 0 && (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600,
              color: "var(--amber, #f59e0b)",
              background: "color-mix(in srgb, var(--amber, #f59e0b) 10%, transparent)",
              padding: "0.05rem 0.3rem",
              borderRadius: "3px",
              border: "1px solid color-mix(in srgb, var(--amber, #f59e0b) 20%, transparent)",
            }}>
              ${entry.cost.toFixed(4)}
            </div>
          )}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-4)", opacity: 0.5, marginTop: "0.15rem" }}>
            {expanded ? "▲" : "▼"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ExtratoPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ExtratoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (date: string, agent: string, type: string, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, limit: "200" });
      if (agent && agent !== "all") params.set("agent", agent);
      if (type && type !== "all") params.set("type", type);
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/extrato?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData({ entries: [], stats: null, date, error: "Falha ao carregar dados" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate, filterAgent, filterType, filterStatus);

    // Auto-refresh every 60s
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchData(selectedDate, filterAgent, filterType, filterStatus);
    }, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedDate, filterAgent, filterType, filterStatus, fetchData]);

  const goDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const entries = data?.entries || [];
  const stats = data?.stats;

  // Build filter options from available data
  const availableAgents = stats?.agents || [];
  const availableTypes = ["task", "interaction", "event", "trace"];

  const statCards = [
    { label: "OPERAÇÕES", value: loading ? "..." : String(stats?.total ?? 0), color: "var(--text-1)" },
    { label: "TASKS", value: loading ? "..." : String(stats?.tasks ?? 0), color: "var(--accent)" },
    { label: "INTERAÇÕES", value: loading ? "..." : String(stats?.interactions ?? 0), color: "var(--cyan)" },
    { label: "EVENTS", value: loading ? "..." : String(stats?.events ?? 0), color: "var(--amber)" },
    { label: "TRACES", value: loading ? "..." : String(stats?.traces ?? 0), color: "hsl(270 80% 70%)" },
    {
      label: "TOKENS",
      value: loading ? "..." : formatTokens(stats?.totalTokens),
      color: "var(--cyan)",
    },
    {
      label: "CUSTO",
      value: loading ? "..." : (stats?.totalCost ? `$${stats.totalCost >= 1 ? stats.totalCost.toFixed(2) : stats.totalCost.toFixed(4)}` : "$0.00"),
      color: "var(--amber)",
    },
  ];

  const selectStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text-2)",
    padding: "0.35rem 0.6rem",
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    cursor: "pointer",
    outline: "none",
  };

  const btnStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text-2)",
    padding: "0.35rem 0.75rem",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          color: "var(--text-4)",
          marginBottom: "0.25rem",
        }}>
          EXTRATO DE OPERAÇÕES
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text-1)",
            margin: 0,
          }}>
            Registro Diário
          </h1>
          {loading && (
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--text-4)",
              letterSpacing: "0.1em",
            }}>
              carregando...
            </span>
          )}
        </div>
      </div>

      {/* Date nav + filters */}
      <div className="glass-card" style={{
        padding: "1rem 1.25rem",
        marginBottom: "1rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "1rem",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Date picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={() => goDay(-1)} style={btnStyle}>←</button>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--text-1)",
              textTransform: "capitalize",
            }}>
              {dateLabel}
            </div>
            {isToday && (
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6rem",
                letterSpacing: "0.15em",
                color: "var(--accent)",
                background: "var(--accent-bg)",
                padding: "0.1rem 0.5rem",
                borderRadius: "var(--radius)",
              }}>
                HOJE
              </span>
            )}
          </div>
          <button onClick={() => goDay(1)} style={btnStyle}>→</button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); }}
            style={selectStyle}
          >
            <option value="all">Todos os tipos</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={filterAgent}
            onChange={(e) => { setFilterAgent(e.target.value); }}
            style={selectStyle}
          >
            <option value="all">Todos os agentes</option>
            {availableAgents.map((a) => (
              <option key={a} value={a}>{agentEmoji(a)} {a}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); }}
            style={selectStyle}
          >
            <option value="all">Todos os status</option>
            {["success", "completed", "error", "failed", "pending", "running"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => fetchData(selectedDate, filterAgent, filterType, filterStatus)}
            style={{ ...btnStyle, color: "var(--accent)" }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "0.6rem",
        marginBottom: "1.25rem",
      }}>
        {statCards.map((c) => (
          <div key={c.label} className="glass-card" style={{ padding: "0.7rem 0.9rem", textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.4rem",
              fontWeight: 700,
              color: c.color,
            }}>
              {c.value}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.55rem",
              letterSpacing: "0.15em",
              color: "var(--text-4)",
              marginTop: "0.1rem",
            }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {data?.error && (
        <div style={{
          background: "color-mix(in srgb, var(--red, #ef4444) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--red, #ef4444) 30%, transparent)",
          borderRadius: "var(--radius)",
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          color: "var(--red, #ef4444)",
        }}>
          ⚠ {data.error}
        </div>
      )}

      {/* Entry list */}
      <div className="glass-card" style={{ padding: "0.25rem 0", overflow: "hidden" }}>
        {loading && entries.length === 0 ? (
          <div style={{
            padding: "3rem",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--text-4)",
            letterSpacing: "0.1em",
          }}>
            CARREGANDO...
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            padding: "3rem",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--text-4)",
            letterSpacing: "0.1em",
          }}>
            NENHUMA OPERAÇÃO REGISTRADA PARA {selectedDate}
          </div>
        ) : (
          entries.map((entry, i) => (
            <EntryRow key={entry.id} entry={entry} index={i} total={entries.length} />
          ))
        )}
      </div>

      {/* Footer */}
      {entries.length > 0 && (
        <div style={{
          marginTop: "0.75rem",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "0.6rem",
          color: "var(--text-4)",
          letterSpacing: "0.1em",
        }}>
          {entries.length} ENTRIES · AUTO-REFRESH 60s · CLICK ENTRY TO EXPAND
        </div>
      )}
    </div>
  );
}
