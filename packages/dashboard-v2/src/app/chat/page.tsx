"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ── Types ── */
interface Vec { x: number; y: number }
interface TileData {
  id: string;
  type: "agent" | "chat" | "data" | "guardrail" | "metric" | "action";
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  title: string;
  agent?: string;
  status?: string;
  emoji?: string;
  content?: string;
  minimized?: boolean;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface TimelineEvent {
  id: string;
  created_at: string;
  event_type: string;
  agent_id: string;
  title: string;
}

interface DailyCost {
  date: string;
  total: number;
  openai?: number;
  anthropic?: number;
  google?: number;
}

interface ActiveTask {
  id: string;
  name: string;
  status: string;
  agent_id?: string;
  priority?: string;
  created_at: string;
}

interface PipelineRun {
  id: string;
  title?: string;
  status: string;
  current_stage?: string;
  total_tokens?: number;
  total_cost?: number;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  emoji?: string;
}

/* ── Constants ── */
const GRID = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.5;
const snap = (v: number) => Math.round(v / GRID) * GRID;

/* ── Initial Tiles ── */
function createInitialTiles(): TileData[] {
  const agents = [
    { id: "compliance", emoji: "🛡", title: "Compliance Agent", status: "active", x: 100, y: 80 },
    { id: "risk", emoji: "⚡", title: "Risk Agent", status: "active", x: 560, y: 80 },
    { id: "pricing", emoji: "💰", title: "Pricing Agent", status: "active", x: 1020, y: 80 },
    { id: "custodia", emoji: "🔐", title: "Custódia Agent", status: "active", x: 100, y: 440 },
    { id: "duediligence", emoji: "🔍", title: "Due Diligence", status: "active", x: 560, y: 440 },
    { id: "gestor", emoji: "📊", title: "Gestor Agent", status: "active", x: 1020, y: 440 },
    { id: "ir", emoji: "📈", title: "IR Agent", status: "idle", x: 100, y: 800 },
    { id: "regwatch", emoji: "👁", title: "Reg Watch", status: "watching", x: 560, y: 800 },
    { id: "reporting", emoji: "📋", title: "Reporting Agent", status: "active", x: 1020, y: 800 },
  ];

  const tiles: TileData[] = agents.map((a, i) => ({
    id: `agent-${a.id}`,
    type: "agent" as const,
    x: a.x, y: a.y,
    width: 420, height: 320,
    zIndex: i + 1,
    title: a.title,
    agent: a.id,
    status: a.status,
    emoji: a.emoji,
  }));

  // Central orchestrator
  tiles.push({
    id: "oracli",
    type: "chat" as const,
    x: 1500, y: 300,
    width: 480, height: 500,
    zIndex: 20,
    title: "OraCLI — Kernel",
    agent: "OraCLI",
    emoji: "🧠",
  });

  // Static data tiles
  tiles.push({
    id: "guardrails",
    type: "guardrail" as const,
    x: 1500, y: 80,
    width: 400, height: 180,
    zIndex: 15,
    title: "6 Guardrail Gates",
    content: "Eligibility ✅ | Concentration ✅ | Covenant ✅\nPLD/AML ✅ | Compliance ✅ | Risk ✅\n\nTaxa aprovação: 95.9% | Tempo médio: 47s",
  });

  tiles.push({
    id: "metrics",
    type: "metric" as const,
    x: 1500, y: 860,
    width: 400, height: 160,
    zIndex: 16,
    title: "Métricas do Sistema",
    content: "21 agentes online | 99.7% uptime\n47s/operação | 6.993 chunks RAG\nModelo: Qwen3.5-27B (SFT+GRPO)",
  });

  // Live data tiles
  tiles.push({
    id: "timeline-live",
    type: "data" as const,
    x: 2000, y: 80,
    width: 450, height: 400,
    zIndex: 17,
    title: "Timeline Live",
    emoji: "📡",
  });

  tiles.push({
    id: "costs-7d",
    type: "data" as const,
    x: 2000, y: 520,
    width: 450, height: 280,
    zIndex: 18,
    title: "Custos · 7 Dias",
    emoji: "💰",
  });

  tiles.push({
    id: "hyperagent-evo",
    type: "data" as const,
    x: 2000, y: 840,
    width: 450, height: 300,
    zIndex: 19,
    title: "HyperAgent Evolution",
    emoji: "🧬",
  });

  // New: Nova Tarefa action tile
  tiles.push({
    id: "new-task",
    type: "action" as const,
    x: 2000, y: 1180,
    width: 450, height: 280,
    zIndex: 21,
    title: "Nova Tarefa",
    emoji: "➕",
  });

  // New: Tasks Ativas data tile
  tiles.push({
    id: "active-tasks",
    type: "data" as const,
    x: 2460, y: 80,
    width: 400, height: 400,
    zIndex: 22,
    title: "Tasks Ativas",
    emoji: "⚡",
  });

  return tiles;
}

/* ── Dot Grid Background ── */
function DotGrid({ zoom }: { zoom: number }) {
  const spacing = GRID;
  const majorEvery = 4;
  const s = spacing * zoom;
  if (s < 8) return null;

  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        <pattern id="dotMinor" x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
          <circle cx={s / 2} cy={s / 2} r={0.8} fill="var(--border-subtle)" opacity="0.3" />
        </pattern>
        <pattern id="dotMajor" x="0" y="0" width={s * majorEvery} height={s * majorEvery} patternUnits="userSpaceOnUse">
          <circle cx={s / 2} cy={s / 2} r={1.5} fill="var(--border)" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotMinor)" />
      <rect width="100%" height="100%" fill="url(#dotMajor)" />
    </svg>
  );
}

/* ── Agent Tile ── */
function AgentTile({ tile, onChat, liveData }: { tile: TileData; onChat: (agent: string) => void; liveData?: Record<string, unknown> }) {
  const statusColor = tile.status === "active" || tile.status === "online" ? "var(--accent)" : tile.status === "watching" ? "var(--cyan)" : "var(--text-4)";
  const d = liveData || {};

  return (
    <div style={{ padding: "0.75rem", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{tile.emoji}</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-1)" }}>
            {tile.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>
              {(d.status as string || tile.status || "unknown").toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "0.5rem",
        fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--accent)",
        lineHeight: 1.7, overflow: "auto",
      }}>
        <div style={{ color: "var(--text-4)" }}>$ paganini agent status {tile.agent}</div>
        {d.model && <div>● model: <span style={{ color: "var(--cyan)" }}>{d.model as string}</span></div>}
        <div>● tasks: <span style={{ color: "var(--text-1)" }}>{d.tasks_completed as number ?? "—"}</span></div>
        <div>● avg time: {d.avg_time as string ?? "—"}</div>
        <div>● error rate: {typeof d.error_rate === "number" ? `${(d.error_rate as number).toFixed(1)}%` : "—"}</div>
        <div>● cost: <span style={{ color: "var(--cyan)" }}>${typeof d.total_cost === "number" ? (d.total_cost as number).toFixed(2) : "0"}</span></div>
        {d.role && <div>● role: {d.role as string}</div>}
        <div style={{ color: "var(--text-4)", marginTop: "0.25rem" }}>$ _</div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onChat(tile.agent || ""); }}
        style={{
          marginTop: "0.5rem", padding: "0.35rem 0.75rem",
          background: "transparent", border: "1px solid var(--accent)",
          borderRadius: "var(--radius)", color: "var(--accent)",
          fontFamily: "var(--font-mono)", fontSize: "0.65rem",
          cursor: "pointer", letterSpacing: "0.08em",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--bg)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
      >
        ABRIR CHAT ▶
      </button>
    </div>
  );
}

/* ── Chat Tile ── */
function ChatTile({ tile }: { tile: TileData }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: `${tile.emoji} ${tile.agent} online. Pronto para comandos.` },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<"ai" | "bridge">("bridge");
  const [sessionId] = useState(() => `canvas-${tile.id}-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastPollRef = useRef<string>("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Poll for bridge responses
  useEffect(() => {
    if (mode !== "bridge") return;
    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams({ sessionId, limit: "50" });
        if (lastPollRef.current) params.set("after", lastPollRef.current);
        const res = await fetch(`/api/chat?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.length > 0) {
          const newMsgs = data
            .filter((m: { role: string; status?: string }) =>
              m.role === "assistant" && m.status === "delivered"
            )
            .map((m: { content: string }) => ({ role: "assistant" as const, content: m.content }));
          if (newMsgs.length > 0) {
            setMsgs(prev => [...prev, ...newMsgs]);
          }
          lastPollRef.current = data[data.length - 1].created_at;
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [mode, sessionId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: ChatMsg = { role: "user", content: text };
    setMsgs((prev) => [...prev, userMsg]);

    if (mode === "bridge") {
      setMsgs(prev => [...prev, { role: "assistant", content: "⏳ Enviando ao OraCLI..." }]);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: text }],
            mode: "bridge",
            tileId: tile.id,
            sessionId,
          }),
        });
        if (res.ok) {
          setMsgs(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: "📡 Mensagem enviada. Aguardando resposta do OraCLI..." };
            return copy;
          });
        }
      } catch {
        setMsgs(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: "❌ Erro ao enviar." };
          return copy;
        });
      }
      return;
    }

    // AI mode — streaming Gemini response
    const assistantMsg: ChatMsg = { role: "assistant", content: "" };
    setMsgs((prev) => [...prev, assistantMsg]);
    setStreaming(true);

    const apiMsgs = [...msgs, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMsgs, agent: tile.agent || "auto", mode: "ai", tileId: tile.id, sessionId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        setMsgs((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `Erro ${res.status}` };
          return copy;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setStreaming(false); return; }

      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t || !t.startsWith("data: ")) continue;
          const d = t.slice(6);
          if (d === "[DONE]") continue;
          try {
            const p = JSON.parse(d);
            if (p.content || p.text) {
              full += p.content || p.text;
              setMsgs((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: full };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        setMsgs((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: "Erro de conexão." };
          return copy;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, msgs, streaming, tile.agent, tile.id, mode, sessionId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0.5rem" }}>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "0.4rem" }}>
        <button
          onClick={() => setMode("bridge")}
          style={{
            flex: 1, padding: "3px 0", border: "1px solid var(--border)", borderRadius: 3,
            background: mode === "bridge" ? "var(--accent)" : "transparent",
            color: mode === "bridge" ? "var(--bg)" : "var(--text-4)",
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 600, cursor: "pointer",
            letterSpacing: "0.08em",
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          ORACLI
        </button>
        <button
          onClick={() => setMode("ai")}
          style={{
            flex: 1, padding: "3px 0", border: "1px solid var(--border)", borderRadius: 3,
            background: mode === "ai" ? "var(--cyan)" : "transparent",
            color: mode === "ai" ? "var(--bg)" : "var(--text-4)",
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 600, cursor: "pointer",
            letterSpacing: "0.08em",
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          GEMINI
        </button>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", marginBottom: "0.5rem",
        scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent",
      }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            marginBottom: "0.5rem",
            textAlign: m.role === "user" ? "right" : "left",
          }}>
            <div style={{
              display: "inline-block", maxWidth: "85%",
              padding: "0.4rem 0.65rem",
              borderRadius: m.role === "user" ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
              background: m.role === "user" ? "var(--accent-bg)" : "rgba(0,0,0,0.3)",
              border: `1px solid ${m.role === "user" ? "var(--accent)" : "var(--border-subtle)"}`,
              color: "var(--text-1)", fontSize: "0.78rem", lineHeight: 1.5,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontFamily: m.role === "assistant" ? "var(--font-mono)" : "var(--font-display)",
            }}>
              {m.content || "▊"}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: "0.35rem" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
          placeholder={mode === "bridge" ? "→ OraCLI..." : `→ ${tile.agent || "gemini"}...`}
          disabled={streaming}
          style={{
            flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)",
            borderRadius: 4, color: "var(--text-1)", padding: "0.4rem 0.6rem",
            fontFamily: "var(--font-mono)", fontSize: "0.75rem", outline: "none",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button
          onClick={streaming ? () => { abortRef.current?.abort(); setStreaming(false); } : send}
          style={{
            padding: "0.4rem 0.6rem", border: "1px solid var(--border)", borderRadius: 4,
            background: streaming ? "var(--red)" : mode === "bridge" ? "var(--accent)" : "var(--cyan)",
            color: streaming ? "#fff" : "var(--bg)",
            fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {streaming ? "■" : "▶"}
        </button>
      </div>
    </div>
  );
}

/* ── New Task Tile ── */
function NewTaskTile() {
  const [taskName, setTaskName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data: Agent[]) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const dispatch = useCallback(async () => {
    if (!taskName.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: taskName.trim(), agent_id: agentId || null, priority }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const task = await res.json();
      setLastTaskId(task.id);
      setStatus("success");
      setTaskName("");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro desconhecido");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [taskName, agentId, priority, status]);

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid var(--border)",
    borderRadius: 4, color: "var(--text-1)", padding: "0.35rem 0.5rem",
    fontFamily: "var(--font-mono)", fontSize: "0.7rem", outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "0.75rem", height: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>
        DESPACHAR TAREFA → SUPABASE
      </div>

      <input
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") dispatch(); }}
        placeholder="Descrição da tarefa..."
        style={inputStyle}
        onMouseDown={(e) => e.stopPropagation()}
      />

      <select
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        style={selectStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <option value="">— Selecionar agente —</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.emoji ? `${a.emoji} ` : ""}{a.name}
          </option>
        ))}
      </select>

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        style={selectStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <option value="low">🟢 Low</option>
        <option value="medium">🟡 Medium</option>
        <option value="high">🟠 High</option>
        <option value="critical">🔴 Critical</option>
      </select>

      <button
        onClick={dispatch}
        disabled={!taskName.trim() || status === "loading"}
        style={{
          padding: "0.45rem", border: "1px solid var(--accent)", borderRadius: 4,
          background: status === "loading" ? "rgba(0,255,136,0.1)" : status === "success" ? "var(--accent)" : "transparent",
          color: status === "success" ? "var(--bg)" : "var(--accent)",
          fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700,
          cursor: status === "loading" || !taskName.trim() ? "not-allowed" : "pointer",
          letterSpacing: "0.1em", transition: "all 0.2s",
          opacity: !taskName.trim() ? 0.5 : 1,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {status === "loading" ? "DESPACHANDO..." : status === "success" ? "✓ DESPACHADO" : "DESPACHAR ▶"}
      </button>

      {status === "success" && lastTaskId && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--accent)",
          background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)",
          borderRadius: 4, padding: "0.35rem 0.5rem",
        }}>
          ✓ Task criada: <span style={{ color: "var(--cyan)" }}>{lastTaskId.slice(0, 12)}...</span>
        </div>
      )}

      {status === "error" && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "#ff4444",
          background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.2)",
          borderRadius: 4, padding: "0.35rem 0.5rem",
        }}>
          ❌ {errorMsg}
        </div>
      )}
    </div>
  );
}

/* ── Active Tasks Tile ── */
function ActiveTasksTile() {
  const [tasks, setTasks] = useState<ActiveTask[]>([]);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?status=pending,in_progress");
      if (!res.ok) return;
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
      setLastFetch(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    fetchTasks();
    const iv = setInterval(fetchTasks, 10000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  const elapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h${mins % 60}m`;
    if (mins > 0) return `${mins}m`;
    return "agora";
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      pending:     { bg: "rgba(255,170,0,0.15)", color: "#ffaa00" },
      in_progress: { bg: "rgba(0,255,136,0.15)", color: "var(--accent)" },
      done:        { bg: "rgba(0,229,204,0.15)", color: "var(--cyan)" },
    };
    const c = colors[s] || { bg: "rgba(255,255,255,0.1)", color: "var(--text-4)" };
    return (
      <span style={{
        background: c.bg, color: c.color,
        borderRadius: 3, padding: "1px 5px",
        fontFamily: "var(--font-mono)", fontSize: "0.52rem", fontWeight: 700,
        letterSpacing: "0.08em", whiteSpace: "nowrap",
      }}>
        {s.toUpperCase().replace("_", " ")}
      </span>
    );
  };

  return (
    <div style={{ padding: "0.6rem", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>
          PENDING + IN PROGRESS · {tasks.length} TASKS
        </div>
        {lastFetch && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.52rem", color: "var(--text-4)" }}>
            {lastFetch.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        )}
      </div>

      <div style={{
        flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.3rem",
        scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent",
      }}>
        {tasks.length === 0 && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)", textAlign: "center", marginTop: "2rem" }}>
            nenhuma task ativa
          </div>
        )}
        {tasks.map((t) => (
          <div key={t.id} style={{
            background: "rgba(0,0,0,0.3)", borderRadius: 4, padding: "0.4rem 0.5rem",
            border: "1px solid var(--border-subtle)",
            display: "flex", flexDirection: "column", gap: "0.2rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
              {statusBadge(t.status)}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--text-4)" }}>
                {elapsed(t.created_at)}
              </span>
            </div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-1)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {t.name}
            </div>
            {(t.agent_id || t.priority) && (
              <div style={{ display: "flex", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--text-4)" }}>
                {t.agent_id && <span style={{ color: "var(--cyan)" }}>{t.agent_id.slice(0, 14)}</span>}
                {t.priority && <span>· {t.priority}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Data Tile ── */
function DataTile({ tile, liveTimeline, liveCosts, livePipelineRuns }: {
  tile: TileData;
  liveTimeline?: TimelineEvent[];
  liveCosts?: DailyCost[];
  livePipelineRuns?: PipelineRun[];
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll timeline to bottom
  useEffect(() => {
    if (tile.id === "timeline-live" && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [liveTimeline, tile.id]);

  if (tile.id === "timeline-live") {
    const events = liveTimeline || [];
    const typeColor = (t: string | undefined) => {
      const s = (t || "").toLowerCase();
      if (s.includes("error") || s.includes("fail")) return "#ff4444";
      if (s.includes("warn")) return "#ffaa00";
      if (s.includes("complete") || s.includes("success")) return "var(--accent)";
      return "var(--cyan)";
    };
    return (
      <div style={{ padding: "0.6rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)", marginBottom: "0.4rem", letterSpacing: "0.08em" }}>
          LIVE · {events.length} EVENTS · AUTO-SCROLL
        </div>
        <div
          ref={listRef}
          style={{
            flex: 1, overflowY: "auto", background: "rgba(0,0,0,0.3)", borderRadius: 4,
            padding: "0.4rem", display: "flex", flexDirection: "column", gap: "0.3rem",
            scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent",
          }}
        >
          {events.length === 0 && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)", textAlign: "center", marginTop: "2rem" }}>
              aguardando eventos...
            </div>
          )}
          {events.map((ev) => {
            const d = new Date(ev.created_at);
            const ts = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}`;
            return (
              <div key={ev.id} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", fontFamily: "var(--font-mono)", fontSize: "0.62rem" }}>
                <span style={{ color: "var(--text-4)", flexShrink: 0, paddingTop: 1 }}>{ts}</span>
                <span style={{
                  background: typeColor(ev.event_type), color: "#000",
                  borderRadius: 3, padding: "0 4px", fontSize: "0.55rem",
                  fontWeight: 700, flexShrink: 0, paddingTop: 2,
                }}>
                  {ev.event_type?.slice(0, 10).toUpperCase()}
                </span>
                <span style={{ color: "var(--cyan)", flexShrink: 0 }}>{(ev.agent_id || "—").slice(0, 10)}</span>
                <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.title || "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tile.id === "costs-7d") {
    const costs = (liveCosts || []).slice().reverse(); // oldest → newest for display
    const max = Math.max(...costs.map((c) => c.total), 0.01);
    const total = costs.reduce((s, c) => s + c.total, 0);
    return (
      <div style={{ padding: "0.75rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)", marginBottom: "0.3rem", letterSpacing: "0.08em" }}>
          ÚLTIMOS 7 DIAS · REAL DATA
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.75rem" }}>
          ${total.toFixed(4)} total
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem", justifyContent: "center" }}>
          {costs.length === 0 && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-4)", textAlign: "center" }}>
              sem dados de custo
            </div>
          )}
          {costs.map((c) => {
            const pct = (c.total / max) * 100;
            const label = c.date?.slice(5) || "—";
            return (
              <div key={c.date} style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontFamily: "var(--font-mono)", fontSize: "0.62rem" }}>
                <span style={{ color: "var(--text-4)", width: 36, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 2, height: 10, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: "linear-gradient(90deg, var(--accent) 0%, var(--cyan) 100%)",
                    borderRadius: 2, transition: "width 0.5s ease",
                  }} />
                </div>
                <span style={{ color: "var(--text-2)", width: 60, textAlign: "right", flexShrink: 0 }}>
                  ${c.total.toFixed(4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tile.id === "hyperagent-evo") {
    const runs = livePipelineRuns || [];
    // Group by day and compute a "score" (success proxy)
    const byDay: Record<string, { total: number; ok: number; tokens: number }> = {};
    for (const r of runs) {
      const day = r.created_at?.slice(0, 10) || "?";
      if (!byDay[day]) byDay[day] = { total: 0, ok: 0, tokens: 0 };
      byDay[day].total += 1;
      if (r.status === "done" || r.status === "completed" || r.status === "success") byDay[day].ok += 1;
      byDay[day].tokens += r.total_tokens || 0;
    }

    const gens = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-5)
      .map(([day, d], i) => ({
        gen: i,
        target: day,
        score: d.total > 0 ? +(d.ok / d.total).toFixed(2) : 0,
        tokens: d.tokens,
        delta: i > 0 ? null : null, // computed below
      }));

    // Compute deltas
    for (let i = 1; i < gens.length; i++) {
      (gens[i] as typeof gens[0] & { delta: number | null }).delta = +(gens[i].score - gens[i - 1].score).toFixed(2);
    }

    const hasData = gens.length > 0;
    const totalDelta = gens.length > 1 ? gens[gens.length - 1].score - gens[0].score : 0;

    // Fallback to demo if no pipeline runs
    const displayGens = hasData ? gens : [
      { gen: 0, target: "sem dados", score: 0, tokens: 0, delta: null },
    ];

    return (
      <div style={{ padding: "0.75rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)", marginBottom: "0.2rem", letterSpacing: "0.08em" }}>
          PIPELINE RUNS · {hasData ? "REAL DATA" : "AGUARDANDO DADOS"}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.6rem" }}>
          {hasData ? "Evolutionary Self-Improvement Loop" : "Aguardando pipeline_runs..."}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {displayGens.map((g) => (
            <div key={g.gen} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)", width: 32, flexShrink: 0 }}>
                {hasData ? g.target.slice(5) : "Gen0"}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--cyan)", width: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
                {g.tokens > 0 ? `${(g.tokens / 1000).toFixed(1)}k tok` : "—"}
              </span>
              <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 2, height: 12, overflow: "hidden" }}>
                <div style={{
                  width: `${g.score * 100}%`, height: "100%",
                  background: `linear-gradient(90deg, #00ff88 0%, #00e5cc ${g.score * 100}%)`,
                  borderRadius: 2,
                }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-1)", width: 36, textAlign: "right", flexShrink: 0 }}>
                {g.score.toFixed(2)}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", width: 40, textAlign: "right", flexShrink: 0, color: (g.delta ?? 0) > 0 ? "var(--accent)" : (g.delta ?? 0) < 0 ? "#ff4444" : "var(--text-4)" }}>
                {g.delta !== null && g.delta !== undefined ? (g.delta > 0 ? `+${g.delta.toFixed(2)}` : g.delta.toFixed(2)) : "base"}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-4)", marginTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.35rem" }}>
          {hasData
            ? `${gens.length} dias · Δ score: ${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(2)} · ${runs.length} runs`
            : "Aguardando pipeline_runs no Supabase..."}
        </div>
      </div>
    );
  }

  if (tile.id === "active-tasks") {
    return <ActiveTasksTile />;
  }

  // Default
  return (
    <div style={{
      padding: "0.75rem", height: "100%",
      fontFamily: "var(--font-mono)", fontSize: "0.7rem",
      color: "var(--text-2)", lineHeight: 1.7,
      whiteSpace: "pre-wrap",
    }}>
      {tile.content}
    </div>
  );
}

/* ── Connection Lines ── */
function ConnectionLines({ tiles, pan, zoom }: { tiles: TileData[]; pan: Vec; zoom: number }) {
  const oracli = tiles.find((t) => t.id === "oracli");
  if (!oracli) return null;

  const agents = tiles.filter((t) => t.type === "agent");
  const dataTiles = tiles.filter((t) => ["timeline-live", "costs-7d", "hyperagent-evo", "new-task", "active-tasks"].includes(t.id));
  const cx = (t: TileData) => (t.x + t.width / 2) * zoom + pan.x;
  const cy = (t: TileData) => (t.y + t.height / 2) * zoom + pan.y;

  return (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="lineGradData" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.1" />
          <stop offset="50%" stopColor="var(--cyan)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {agents.map((a) => (
        <line
          key={a.id}
          x1={cx(a)} y1={cy(a)}
          x2={cx(oracli)} y2={cy(oracli)}
          stroke="url(#lineGrad)" strokeWidth={1}
          strokeDasharray="4 4"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-8" dur="2s" repeatCount="indefinite" />
        </line>
      ))}
      {dataTiles.map((dt) => (
        <line
          key={dt.id}
          x1={cx(dt)} y1={cy(dt)}
          x2={cx(oracli)} y2={cy(oracli)}
          stroke="url(#lineGradData)" strokeWidth={1}
          strokeDasharray="6 3"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-9" dur="3s" repeatCount="indefinite" />
        </line>
      ))}
    </svg>
  );
}

/* ── Main Canvas ── */
export default function CanvasPage() {
  const [tiles, setTiles] = useState<TileData[]>(createInitialTiles);
  const [pan, setPan] = useState<Vec>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.7);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<Vec | null>(null);
  const [maxZ, setMaxZ] = useState(25);
  const [liveAgents, setLiveAgents] = useState<Record<string, Record<string, unknown>>>({});
  const [liveTimeline, setLiveTimeline] = useState<TimelineEvent[]>([]);
  const [liveCosts, setLiveCosts] = useState<DailyCost[]>([]);
  const [livePipelineRuns, setLivePipelineRuns] = useState<PipelineRun[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch live data from Supabase
  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch("/api/canvas-data");
        if (!res.ok) return;
        const data = await res.json();
        const agentMap: Record<string, Record<string, unknown>> = {};
        for (const a of (data.agents || [])) {
          agentMap[a.id] = a;
          if (a.name) {
            agentMap[a.name.toLowerCase()] = a;
            const n = a.name.toLowerCase();
            if (n.includes("compliance") || n.includes("security")) agentMap["compliance"] = a;
            if (n.includes("risk") || n.includes("qa")) agentMap["risk"] = a;
            if (n.includes("pricing") || n.includes("data")) agentMap["pricing"] = a;
            if (n.includes("infra") || n.includes("devops")) agentMap["custodia"] = a;
            if (n.includes("general")) agentMap["duediligence"] = a;
            if (n.includes("architect") || n.includes("gestor")) agentMap["gestor"] = a;
            if (n.includes("pm") || n.includes("ir")) agentMap["ir"] = a;
            if (n.includes("docs") || n.includes("reg")) agentMap["regwatch"] = a;
            if (n.includes("code") && !n.includes("codex")) agentMap["reporting"] = a;
          }
        }
        setLiveAgents(agentMap);

        // Timeline events
        const timeline: TimelineEvent[] = (data.timeline || []).slice(-10);
        setLiveTimeline(timeline);

        // Daily costs — real data first, synthetic fallback
        if (data.daily_costs && Array.isArray(data.daily_costs) && data.daily_costs.length > 0) {
          setLiveCosts(data.daily_costs.slice(0, 7)); // already ordered desc, we reverse in render
        } else {
          // Synthetic fallback from tasks
          const tasksByDay: Record<string, number> = {};
          for (const task of (data.tasks || [])) {
            const day = (task.created_at || "").slice(0, 10);
            if (!day) continue;
            tasksByDay[day] = (tasksByDay[day] || 0) + (task.cost || 0);
          }
          const sorted = Object.entries(tasksByDay)
            .sort(([a], [b]) => b.localeCompare(a)) // desc like daily_costs
            .slice(0, 7)
            .map(([date, total]) => ({ date, total: +total.toFixed(6) }));
          if (sorted.length > 0) setLiveCosts(sorted);
        }

        // Pipeline runs for HyperAgent Evolution
        if (data.pipeline_runs && Array.isArray(data.pipeline_runs)) {
          setLivePipelineRuns(data.pipeline_runs);
        }
      } catch {}
    }
    fetchLive();
    const iv = setInterval(fetchLive, 30000);
    return () => clearInterval(iv);
  }, []);

  // Pan on middle click or space+drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.target === containerRef.current)) {
      setPanning({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      setPan({ x: e.clientX - panning.x, y: e.clientY - panning.y });
    }
    if (dragging) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wx = (e.clientX - rect.left - pan.x) / zoom;
      const wy = (e.clientY - rect.top - pan.y) / zoom;
      setTiles((prev) =>
        prev.map((t) =>
          t.id === dragging.id
            ? { ...t, x: snap(wx - dragging.offsetX), y: snap(wy - dragging.offsetY) }
            : t
        )
      );
    }
  }, [panning, dragging, pan, zoom]);

  const handleMouseUp = useCallback(() => {
    setPanning(null);
    setDragging(null);
  }, []);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta));

    const scale = newZoom / zoom;
    setPan({
      x: mx - (mx - pan.x) * scale,
      y: my - (my - pan.y) * scale,
    });
    setZoom(newZoom);
  }, [zoom, pan]);

  // Double-click → new chat tile
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const wx = (e.clientX - rect.left - pan.x) / zoom;
    const wy = (e.clientY - rect.top - pan.y) / zoom;

    const newZ = maxZ + 1;
    setMaxZ(newZ);

    setTiles((prev) => [
      ...prev,
      {
        id: `chat-${Date.now()}`,
        type: "chat",
        x: snap(wx - 200),
        y: snap(wy - 150),
        width: 420,
        height: 360,
        zIndex: newZ,
        title: "Terminal — Kernel",
        agent: "Kernel",
        emoji: "🧠",
      },
    ]);
  }, [pan, zoom, maxZ]);

  // Tile drag start
  const startDrag = useCallback((tileId: string, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tile = tiles.find((t) => t.id === tileId);
    if (!tile) return;

    const wx = (e.clientX - rect.left - pan.x) / zoom;
    const wy = (e.clientY - rect.top - pan.y) / zoom;

    const newZ = maxZ + 1;
    setMaxZ(newZ);
    setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, zIndex: newZ } : t)));
    setDragging({ id: tileId, offsetX: wx - tile.x, offsetY: wy - tile.y });
  }, [tiles, pan, zoom, maxZ]);

  // Close tile
  const closeTile = useCallback((id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Open chat for agent
  const openAgentChat = useCallback((agent: string) => {
    const existing = tiles.find((t) => t.type === "chat" && t.agent === agent);
    if (existing) {
      const newZ = maxZ + 1;
      setMaxZ(newZ);
      setTiles((prev) => prev.map((t) => (t.id === existing.id ? { ...t, zIndex: newZ } : t)));
      return;
    }

    const agentTile = tiles.find((t) => t.type === "agent" && t.agent === agent);
    const newZ = maxZ + 1;
    setMaxZ(newZ);

    setTiles((prev) => [
      ...prev,
      {
        id: `chat-${agent}-${Date.now()}`,
        type: "chat",
        x: (agentTile?.x || 400) + (agentTile?.width || 0) + 40,
        y: agentTile?.y || 200,
        width: 420,
        height: 360,
        zIndex: newZ,
        title: `Chat — ${agent}`,
        agent,
        emoji: agentTile?.emoji || "💬",
      },
    ]);
  }, [tiles, maxZ]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      style={{
        position: "fixed", inset: 0, left: 240,
        overflow: "hidden", cursor: panning ? "grabbing" : "default",
        background: "var(--bg)",
        userSelect: "none",
      }}
    >
      <DotGrid zoom={zoom} />
      <ConnectionLines tiles={tiles} pan={pan} zoom={zoom} />

      {/* Tiles */}
      {tiles.map((tile) => (
        <div
          key={tile.id}
          style={{
            position: "absolute",
            left: tile.x * zoom + pan.x,
            top: tile.y * zoom + pan.y,
            width: tile.width * zoom,
            height: tile.minimized ? 32 * zoom : tile.height * zoom,
            zIndex: tile.zIndex,
            transform: `scale(1)`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: tile.width,
              height: tile.minimized ? 32 : tile.height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: tile.type === "chat"
                ? "1px solid var(--accent)"
                : tile.type === "agent"
                  ? `1px solid ${tile.status === "active" ? "rgba(0,255,136,0.3)" : "var(--border)"}`
                  : tile.type === "action"
                    ? "1px solid rgba(0,229,204,0.4)"
                    : "1px solid var(--border)",
            }}
          >
            {/* Title bar */}
            <div
              onMouseDown={(e) => { e.preventDefault(); startDrag(tile.id, e); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.3rem 0.5rem",
                background: tile.type === "action" ? "rgba(0,229,204,0.08)" : "rgba(0,0,0,0.3)",
                borderBottom: "1px solid var(--border-subtle)",
                cursor: "grab", flexShrink: 0,
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                fontFamily: "var(--font-mono)", fontSize: "0.6rem",
                letterSpacing: "0.12em", color: tile.type === "action" ? "var(--cyan)" : "var(--text-3)",
              }}>
                <span style={{ fontSize: "0.85rem" }}>{tile.emoji || "◇"}</span>
                {tile.title}
              </div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, minimized: !t.minimized } : t));
                  }}
                  style={{
                    width: 14, height: 14, borderRadius: "50%", border: "none",
                    background: "var(--text-4)", cursor: "pointer", fontSize: "0.5rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--bg)",
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  —
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTile(tile.id); }}
                  style={{
                    width: 14, height: 14, borderRadius: "50%", border: "none",
                    background: "var(--red, #e53e3e)", cursor: "pointer", fontSize: "0.55rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff",
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            {!tile.minimized && (
              <div style={{ flex: 1, overflow: "hidden" }}>
                {tile.type === "agent" && <AgentTile tile={tile} onChat={openAgentChat} liveData={liveAgents[tile.agent || ""] || {}} />}
                {tile.type === "chat" && <ChatTile tile={tile} />}
                {tile.type === "action" && tile.id === "new-task" && <NewTaskTile />}
                {(tile.type === "guardrail" || tile.type === "data" || tile.type === "metric") && (
                  <DataTile
                    tile={tile}
                    liveTimeline={liveTimeline}
                    liveCosts={liveCosts}
                    livePipelineRuns={livePipelineRuns}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Zoom indicator */}
      <div style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        display: "flex", alignItems: "center", gap: "0.5rem",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "0.3rem 0.6rem",
      }}>
        <button
          onClick={() => { setZoom(0.7); setPan({ x: 0, y: 0 }); }}
          style={{
            background: "none", border: "none", color: "var(--text-4)",
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", cursor: "pointer",
          }}
        >
          RESET
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-3)" }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Help hint */}
      <div style={{
        position: "fixed", bottom: 16, left: 260, zIndex: 9999,
        fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--text-4)",
        letterSpacing: "0.08em",
      }}>
        SCROLL=ZOOM · DRAG=PAN · DOUBLE-CLICK=NOVO TERMINAL · ARRASTAR TÍTULO=MOVER
      </div>
    </div>
  );
}
