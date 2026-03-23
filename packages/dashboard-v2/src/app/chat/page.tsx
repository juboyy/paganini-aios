"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ── Types ── */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  agent?: string;
  tokens?: number;
}

/* ── Typing indicator ── */
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "0.5rem 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--accent)", opacity: 0.5,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1.1)} }`}</style>
    </div>
  );
}

/* ── Chat bubble ── */
function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";

  if (isSystem) {
    return (
      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.12em",
          color: "var(--text-4)", background: "var(--bg-card)", padding: "0.2rem 0.75rem",
          borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)",
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: "0.75rem",
    }}>
      {!isUser && msg.agent && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.12em",
          color: "var(--accent)", marginBottom: "0.2rem", paddingLeft: "0.25rem",
        }}>
          {msg.agent}
        </div>
      )}

      <div style={{
        maxWidth: "85%", padding: "0.75rem 1rem",
        borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        background: isUser ? "var(--accent-bg)" : "var(--bg-card)",
        border: `1px solid ${isUser ? "var(--accent)" : "var(--border)"}`,
        color: "var(--text-1)", fontSize: "0.88rem", lineHeight: 1.55,
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {msg.content}
        {!isUser && msg.content === "" && <TypingDots />}
      </div>

      <div style={{
        display: "flex", gap: "0.5rem", alignItems: "center",
        marginTop: "0.15rem",
        paddingLeft: isUser ? 0 : "0.25rem",
        paddingRight: isUser ? "0.25rem" : 0,
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)" }}>
          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

/* ── Suggestions ── */
const SUGGESTIONS = [
  "Status dos 9 agentes FIDC",
  "Último relatório de guardrails",
  "Resumo do sprint atual",
  "Quantas operações passaram nos gates hoje?",
  "Analise o risco do cedente ACME Corp",
  "Gere um relatório CADOC para o fundo Alpha",
  "Explique como funciona o gate PLD/AML",
  "Qual o custo anual de operação do sistema?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "sys1", role: "system",
      content: "PAGANINI AIOS · KERNEL v3.2 · 21 AGENTES ONLINE",
      timestamp: new Date(),
    },
    {
      id: "welcome", role: "assistant", agent: "Kernel",
      content: "Sistema operacional. 9 agentes FIDC + 12 agentes de código ativos.\n\nPosso executar análises de risco, gerar relatórios regulatórios, verificar status de guardrails, ou coordenar qualquer operação do pipeline.\n\nO que precisa?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const detectAgent = (msg: string): string => {
    const l = msg.toLowerCase();
    if (l.includes("risco") || l.includes("risk")) return "Risk Agent";
    if (l.includes("compliance") || l.includes("pld") || l.includes("aml")) return "Compliance Agent";
    if (l.includes("preç") || l.includes("pricing") || l.includes("taxa")) return "Pricing Agent";
    if (l.includes("due diligence") || l.includes("cedente") || l.includes("sacado")) return "Due Diligence Agent";
    if (l.includes("cadoc") || l.includes("relatório")) return "Reporting Agent";
    if (l.includes("código") || l.includes("code") || l.includes("deploy")) return "Code Agent";
    return "Kernel";
  };

  const sendMessage = useCallback(async (text: string) => {
    const agent = selectedAgent === "auto" ? detectAgent(text) : selectedAgent;

    const userMsg: Message = {
      id: `u${Date.now()}`, role: "user", content: text, timestamp: new Date(),
    };
    const assistantMsg: Message = {
      id: `a${Date.now()}`, role: "assistant", agent, content: "", timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    // Build API messages (exclude system UI messages)
    const apiMessages = [...messages, userMsg]
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `Erro ${res.status}: ${errText}` }
              : m
          )
        );
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setIsStreaming(false);
        return;
      }

      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // user cancelled
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Erro de conexão. Tente novamente." }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, selectedAgent]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 1rem)", maxWidth: 800, margin: "0 auto", padding: "0.5rem 1rem" }}>
      {/* Header */}
      <div style={{ padding: "1rem 0 0.75rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "0.5rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-4)" }}>
              INTERFACE DE COMANDO
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
              Chat
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                color: "var(--text-2)", padding: "0.3rem 0.5rem", fontFamily: "var(--font-mono)", fontSize: "0.7rem", cursor: "pointer",
              }}
            >
              <option value="auto">Auto-route</option>
              <option value="Kernel">Kernel</option>
              <option value="Compliance Agent">Compliance</option>
              <option value="Risk Agent">Risk</option>
              <option value="Pricing Agent">Pricing</option>
              <option value="Due Diligence Agent">Due Diligence</option>
              <option value="Reporting Agent">Reporting</option>
              <option value="Code Agent">Code Agent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 3 && !isStreaming && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem 0", flexShrink: 0 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setInput(""); sendMessage(s); }}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                color: "var(--text-3)", padding: "0.35rem 0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-3)"; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: "flex", gap: "0.5rem", padding: "0.75rem 0", borderTop: "1px solid var(--border-subtle)",
        flexShrink: 0, alignItems: "flex-end",
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem para o Paganini AIOS..."
          rows={1}
          disabled={isStreaming}
          style={{
            flex: 1, resize: "none", background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", color: "var(--text-1)", padding: "0.65rem 0.85rem",
            fontFamily: "var(--font-display)", fontSize: "0.88rem", lineHeight: 1.5,
            outline: "none", transition: "border-color 0.15s", maxHeight: 120,
            opacity: isStreaming ? 0.5 : 1,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        {isStreaming ? (
          <button
            onClick={handleStop}
            style={{
              background: "var(--red)", border: "1px solid var(--red)", borderRadius: "var(--radius)",
              color: "#fff", padding: "0.65rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem",
              fontWeight: 600, cursor: "pointer", letterSpacing: "0.08em",
            }}
          >
            ■
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? "var(--accent)" : "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: "var(--radius)",
              color: input.trim() ? "var(--bg)" : "var(--text-4)",
              padding: "0.65rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem",
              fontWeight: 600, cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s", letterSpacing: "0.08em",
            }}
          >
            ▶
          </button>
        )}
      </div>
    </div>
  );
}
