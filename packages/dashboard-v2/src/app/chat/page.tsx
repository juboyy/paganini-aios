"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/* ── Types ── */
interface Vec { x: number; y: number }
interface TileData {
  id: string;
  type: "agent" | "chat" | "data" | "guardrail" | "metric";
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

  // Data tiles
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
function AgentTile({ tile, onChat }: { tile: TileData; onChat: (agent: string) => void }) {
  const statusColor = tile.status === "active" ? "var(--accent)" : tile.status === "watching" ? "var(--cyan)" : "var(--text-4)";

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
              {tile.status?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "0.5rem",
        fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--accent)",
        lineHeight: 1.6, overflow: "auto",
      }}>
        <div style={{ color: "var(--text-4)" }}>$ paganini agent status {tile.agent}</div>
        <div>● PID 4{Math.floor(Math.random() * 900 + 100)} | mem 128MB</div>
        <div>● Last heartbeat: {Math.floor(Math.random() * 30)}s ago</div>
        <div>● Tasks today: {Math.floor(Math.random() * 20 + 5)}</div>
        <div>● Queue: {Math.floor(Math.random() * 3)} pending</div>
        <div style={{ color: "var(--text-4)", marginTop: "0.5rem" }}>$ _</div>
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: ChatMsg = { role: "user", content: text };
    const assistantMsg: ChatMsg = { role: "assistant", content: "" };
    setMsgs((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const apiMsgs = [...msgs, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMsgs, agent: tile.agent || "auto" }),
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
            if (p.content) {
              full += p.content;
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
  }, [input, msgs, streaming, tile.agent]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0.5rem" }}>
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
          placeholder={`→ ${tile.agent || "kernel"}...`}
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
            background: streaming ? "var(--red)" : "var(--accent)",
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

/* ── Data Tile ── */
function DataTile({ tile }: { tile: TileData }) {
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
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Zoom toward cursor
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
                  : "1px solid var(--border)",
            }}
          >
            {/* Title bar */}
            <div
              onMouseDown={(e) => { e.preventDefault(); startDrag(tile.id, e); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.3rem 0.5rem",
                background: "rgba(0,0,0,0.3)",
                borderBottom: "1px solid var(--border-subtle)",
                cursor: "grab", flexShrink: 0,
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                fontFamily: "var(--font-mono)", fontSize: "0.6rem",
                letterSpacing: "0.12em", color: "var(--text-3)",
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
                {tile.type === "agent" && <AgentTile tile={tile} onChat={openAgentChat} />}
                {tile.type === "chat" && <ChatTile tile={tile} />}
                {(tile.type === "guardrail" || tile.type === "data" || tile.type === "metric") && <DataTile tile={tile} />}
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
