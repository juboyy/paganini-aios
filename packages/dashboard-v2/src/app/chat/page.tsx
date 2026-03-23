"use client";

import { useState, useRef, useEffect } from "react";

/* ── Types ── */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  agent?: string;
  tokens?: number;
  thinking?: boolean;
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
            background: "var(--accent)",
            opacity: 0.5,
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
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: "0.75rem",
    }}>
      {/* Agent label */}
      {!isUser && msg.agent && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.12em",
          color: "var(--accent)", marginBottom: "0.2rem", paddingLeft: "0.25rem",
        }}>
          {msg.agent}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: "80%",
        padding: "0.75rem 1rem",
        borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        background: isUser ? "var(--accent-bg)" : "var(--bg-card)",
        border: `1px solid ${isUser ? "var(--accent)" : "var(--border)"}`,
        color: "var(--text-1)",
        fontSize: "0.88rem",
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {msg.content}
      </div>

      {/* Meta */}
      <div style={{
        display: "flex", gap: "0.5rem", alignItems: "center",
        marginTop: "0.15rem", paddingLeft: isUser ? 0 : "0.25rem", paddingRight: isUser ? "0.25rem" : 0,
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)" }}>
          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
        {msg.tokens && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-4)" }}>
            {msg.tokens > 1000 ? `${(msg.tokens / 1000).toFixed(1)}K` : msg.tokens} tok
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Suggested prompts ── */
const SUGGESTIONS = [
  "Status dos agentes FIDC",
  "Último relatório de guardrails",
  "Resumo do sprint atual",
  "Quantas operações passaram nos gates hoje?",
  "Analise o risco do cedente ACME Corp",
  "Gere um relatório CADOC para o fundo Alpha",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "sys1",
      role: "system",
      content: "PAGANINI AIOS · KERNEL v3.2 · 21 AGENTES ONLINE",
      timestamp: new Date(),
    },
    {
      id: "welcome",
      role: "assistant",
      agent: "OraCLI",
      content: "Sistema operacional. 9 agentes FIDC + 12 agentes de código ativos.\n\nPosso executar análises de risco, gerar relatórios regulatórios, verificar status de guardrails, ou coordenar qualquer operação do pipeline.\n\nO que precisa?",
      timestamp: new Date(),
      tokens: 450,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // Demo response
  const simulateResponse = (userMsg: string) => {
    setIsTyping(true);
    const agent = selectedAgent === "auto" ? detectAgent(userMsg) : selectedAgent;

    setTimeout(() => {
      const response = generateResponse(userMsg, agent);
      setMessages((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          role: "assistant",
          agent,
          content: response.text,
          timestamp: new Date(),
          tokens: response.tokens,
        },
      ]);
      setIsTyping(false);
    }, 1200 + Math.random() * 1800);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `u${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    simulateResponse(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (s: string) => {
    setInput(s);
    inputRef.current?.focus();
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
              <option value="OraCLI">OraCLI</option>
              <option value="Compliance Agent">Compliance</option>
              <option value="Risk Agent">Risk</option>
              <option value="Pricing Agent">Pricing</option>
              <option value="Due Diligence Agent">Due Diligence</option>
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
        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "0.25rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--accent)" }}>
              {selectedAgent === "auto" ? "Processando" : selectedAgent}
            </span>
            <TypingDots />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (show when few messages) */}
      {messages.length <= 3 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem 0", flexShrink: 0 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
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
          style={{
            flex: 1, resize: "none", background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", color: "var(--text-1)", padding: "0.65rem 0.85rem",
            fontFamily: "var(--font-display)", fontSize: "0.88rem", lineHeight: 1.5,
            outline: "none", transition: "border-color 0.15s", maxHeight: 120,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          style={{
            background: input.trim() && !isTyping ? "var(--accent)" : "var(--bg-card)",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            color: input.trim() && !isTyping ? "var(--bg)" : "var(--text-4)",
            padding: "0.65rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem",
            fontWeight: 600, cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
            transition: "all 0.15s", letterSpacing: "0.08em",
          }}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

/* ── Demo logic ── */
function detectAgent(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("risco") || lower.includes("risk")) return "Risk Agent";
  if (lower.includes("compliance") || lower.includes("pld") || lower.includes("aml") || lower.includes("regulat")) return "Compliance Agent";
  if (lower.includes("preç") || lower.includes("pricing") || lower.includes("taxa")) return "Pricing Agent";
  if (lower.includes("due diligence") || lower.includes("cedente") || lower.includes("sacado")) return "Due Diligence Agent";
  if (lower.includes("código") || lower.includes("code") || lower.includes("deploy") || lower.includes("bug")) return "Code Agent";
  if (lower.includes("cadoc") || lower.includes("relatório")) return "Reporting Agent";
  return "OraCLI";
}

function generateResponse(msg: string, agent: string): { text: string; tokens: number } {
  const lower = msg.toLowerCase();

  if (lower.includes("status") && lower.includes("agent")) {
    return {
      text: `┌─ STATUS DOS AGENTES FIDC ─────────────────┐
│                                           │
│  ✅ Admin Agent         — online (idle)   │
│  ✅ Compliance Agent    — online (idle)   │
│  ✅ Custódia Agent      — online (idle)   │
│  ✅ Due Diligence Agent — online (idle)   │
│  ✅ Gestor Agent        — online (idle)   │
│  ✅ IR Agent            — online (idle)   │
│  ✅ Pricing Agent       — online (idle)   │
│  ✅ Reg Watch Agent     — online (active) │
│  ✅ Reporting Agent     — online (idle)   │
│                                           │
│  9/9 agentes operacionais                 │
│  Último health check: há 12 min           │
│  Uptime: 99.7% (30d)                     │
└───────────────────────────────────────────┘`,
      tokens: 2800,
    };
  }

  if (lower.includes("guardrail")) {
    return {
      text: `6 gates operacionais. Últimas 24h:

Gate 1 — Eligibility:  47 passed, 2 rejected
Gate 2 — Concentration: 49 passed, 0 warnings
Gate 3 — Covenant:     49 passed, 0 breach
Gate 4 — PLD/AML:      48 passed, 1 flagged (fracionamento R$ 49.9K — override aprovado)
Gate 5 — Compliance:   49 passed
Gate 6 — Risk:         49 passed

Taxa de aprovação: 95.9%
Tempo médio por operação: 47s
Flags PLD revisados por humano: 1/1 (100%)`,
      tokens: 3400,
    };
  }

  if (lower.includes("sprint")) {
    return {
      text: `Sprint 12 — "Compliance Engine v2"
Período: 17/03 → 28/03/2026

Progresso: ████████░░ 78%

Concluído (7):
  ✅ SPEAR report — 4 seções investidor
  ✅ Monitor UFLA + relatório
  ✅ Monitor Terceirizados + relatório
  ✅ CI green (ruff + security)
  ✅ HuggingFace model card GRPO
  ✅ README paganini-aios
  ✅ Dashboard v2 — 3 novas páginas

Em andamento (2):
  🔄 Extrato + Chat interface
  🔄 CodeRabbit features absorção

Pendente (1):
  ⏳ Backend paganini-aios — 6 features CodeRabbit

Velocity: 9.2 pontos/dia`,
      tokens: 4200,
    };
  }

  if (lower.includes("cadoc")) {
    return {
      text: `Gerando relatório CADOC...

Fundo: Alpha FIDC
Referência: Março 2026
Tipo: CADOC 4010 — Demonstrativo de Composição e Diversificação

⏳ Coletando dados de lastro... (237 operações)
⏳ Calculando concentração por cedente...
⏳ Verificando limites regulatórios...
✅ Relatório gerado

Resumo:
• PL: R$ 42.3M
• Operações: 237 ativas
• Concentração máxima: 8.2% (cedente ACME — dentro do limite de 10%)
• Inadimplência: 2.1% (dentro do covenant de 5%)
• Prazo médio: 47 dias

📄 Arquivo: cadoc-4010-alpha-mar2026.pdf
Pronto para envio ao administrador.`,
      tokens: 5100,
    };
  }

  if (lower.includes("cedente") || lower.includes("acme")) {
    return {
      text: `Due Diligence — Cedente ACME Corp

┌─ PERFIL ──────────────────────────────────┐
│ CNPJ: 12.345.678/0001-90                  │
│ Setor: Indústria — Autopeças              │
│ Faturamento: R$ 180M/ano                  │
│ Rating interno: B+ (estável)              │
│ Histórico: 14 cessões, 0 defaults         │
└───────────────────────────────────────────┘

Análise de risco:
• Score PLD/AML: 72/100 (baixo risco)
• Concentração no fundo: 6.4% (limite: 10%)
• Inadimplência sacados: 1.8%
• Prazo médio recebíveis: 52 dias
• Último covenant check: PASS (há 3 dias)

⚠️ Observação: 3 notas de R$ 49.9K para mesmo sacado
   detectadas no último lote — padrão de fracionamento.
   Recomendação: solicitar justificativa ao cedente.`,
      tokens: 4800,
    };
  }

  if (lower.includes("operaç") && lower.includes("gate")) {
    return {
      text: `Operações processadas hoje (23/03/2026):

Total: 49 operações
Volume: R$ 12.7M

Por resultado:
  ✅ Aprovadas diretas:     45 (91.8%)
  ⚠️ Aprovadas com flag:    2 (4.1%)
  ❌ Rejeitadas:             2 (4.1%)

Rejeições:
  1. Cedente XYZ — Gate 1 (Eligibility): inadimplência > 5%
  2. Cedente QRS — Gate 2 (Concentration): excederia 10% do PL

Tempo médio: 47 segundos/operação
Gate mais lento: PLD/AML (avg 12s)`,
      tokens: 3600,
    };
  }

  // Default
  return {
    text: `Processando: "${msg.slice(0, 60)}${msg.length > 60 ? "..." : ""}"

Roteado para: ${agent}
Contexto carregado: 6.993 chunks regulatórios + histórico do fundo

Resposta em desenvolvimento. Em produção, essa interface conectará diretamente ao kernel Paganini para execução em tempo real.`,
    tokens: 1800,
  };
}
