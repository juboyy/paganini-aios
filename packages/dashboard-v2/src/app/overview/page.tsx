"use client";

import { useEffect, useState, useRef } from "react";

/* ── Animated counter hook ── */
function useCounter(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setValue(0);
    const steps = 60;
    const step = target / steps;
    let current = 0;
    ref.current = setInterval(() => {
      current += step;
      if (current >= target) {
        setValue(target);
        if (ref.current) clearInterval(ref.current);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [target, duration]);

  return value;
}

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const v = useCounter(target);
  return <>{v}{suffix}</>;
}

/* ── Terminal line component ── */
function TermLine({
  text,
  isCmd,
  delay,
}: {
  text: string;
  isCmd?: boolean;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        lineHeight: 1.7,
        color: isCmd ? "var(--accent)" : "hsl(150 40% 65%)",
        whiteSpace: "pre",
      }}
    >
      {text}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface StatCard {
  label: string;
  value: string;
  delta: string;
  color: string;
}

interface ActivityItem {
  time: string;
  agent: string;
  action: string;
  type: string;
}

export default function OverviewPage() {
  // ── API state ────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [agentCount, setAgentCount] = useState(12);
  const [guardrailCount, setGuardrailCount] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/activity"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
          setAgentCount(data.totalAgents || 12);
          setGuardrailCount(data.guardrails || 6);
        }

        if (activityRes.ok) {
          const data = await activityRes.json();
          setActivity(data);
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const agents = useCounter(loading ? 0 : agentCount, 1500);
  const caps = useCounter(52, 1500);
  const guards = useCounter(loading ? 0 : guardrailCount, 1500);

  // Parse total lines for the counter (M for millions, k for thousands)
  const formatLines = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const metrics = [
    { 
      value: stats ? `${stats.efficiency}×` : "—", 
      label: "ROI vs equipe humana", 
      sub: stats ? `$${stats.realMonthlyCost}/mês real → ${stats.humanCost} equivalente humano` : "calculando..." 
    },
    { 
      value: stats ? formatLines(stats.totalLines) : "—", 
      label: "Linhas de código geradas", 
      sub: "Revenue-OS + Paganini + Workspace" 
    },
    { 
      value: stats ? `${stats.successRate}%` : "—", 
      label: "Taxa de sucesso", 
      sub: "execuções do pipeline" 
    },
    { 
      value: stats ? `$${stats.costPerLine}` : "—", 
      label: "Custo por linha de código", 
      sub: "gerada pelos agentes" 
    },
  ];

  const layers = [
    {
      label: "CANAIS",
      desc: "Telegram · Slack · Linear · CLI",
      color: "hsl(190 100% 55%)",
      bg: "hsl(190 100% 10% / 0.35)",
      border: "hsl(190 100% 55% / 0.3)",
      icon: "📡",
    },
    {
      label: "ORQUESTRAÇÃO",
      desc: "OraCLI · Pipeline 5 estágios · BMAD-CE",
      color: "var(--accent)",
      bg: "hsl(150 100% 8% / 0.5)",
      border: "hsl(150 100% 50% / 0.4)",
      icon: "🧭",
    },
    {
      label: "AGENTES",
      desc: `${loading ? "..." : agentCount} Dev Team · 9 FIDC Specialists · Codex`,
      color: "hsl(270 80% 70%)",
      bg: "hsl(270 80% 10% / 0.35)",
      border: "hsl(270 80% 70% / 0.3)",
      icon: "🤖",
    },
    {
      label: "INTELIGÊNCIA",
      desc: "RAG Híbrido · MetaClaw · AutoResearch",
      color: "hsl(40 100% 60%)",
      bg: "hsl(40 100% 8% / 0.4)",
      border: "hsl(40 100% 60% / 0.3)",
      icon: "🧠",
    },
    {
      label: "INFRAESTRUTURA",
      desc: "Supabase · ChromaDB · GitHub · Vercel",
      color: "hsl(210 80% 65%)",
      bg: "hsl(210 80% 8% / 0.35)",
      border: "hsl(210 80% 65% / 0.3)",
      icon: "🏗",
    },
    {
      label: "GUARDRAILS",
      desc: `${loading ? "..." : guardrailCount} Guardrails de segurança · Approval humana · Audit trail`,
      color: "hsl(0 80% 60%)",
      bg: "hsl(0 80% 8% / 0.4)",
      border: "hsl(0 80% 60% / 0.3)",
      icon: "🔒",
    },
  ];

  const roadmap = [
    {
      quarter: "Q2 2026",
      title: "API REST pública + SDK Python",
      desc: "Exposição das capacidades via API para integrações externas e desenvolvimento comunitário.",
      icon: "🔌",
      color: "hsl(190 100% 55%)",
    },
    {
      quarter: "Q3 2026",
      title: "Marketplace de skills + packs verticais",
      desc: "Ecossistema de skills desenvolvidos pela comunidade, com distribuição e monetização integradas.",
      icon: "🛒",
      color: "var(--accent)",
    },
    {
      quarter: "Q4 2026",
      title: "Multi-tenant SaaS + onboarding self-service",
      desc: "Fundos FIDC independentes com ambientes isolados, onboarding automatizado e billing por uso.",
      icon: "🚀",
      color: "hsl(270 80% 70%)",
    },
  ];

  const termLines = [
    { text: '$ paganini query "Qual a PDD atual do fundo?"', isCmd: true, delay: 300 },
    { text: '→ [Pricing Agent] PDD Total: R$ 12.4M (5.0% do PL)', isCmd: false, delay: 900 },
    { text: '  Aging: 0-30d: R$ 200M (0.5%), 31-60d: R$ 30M (1.0%)...', isCmd: false, delay: 1100 },
    { text: "", isCmd: false, delay: 1300 },
    { text: "$ paganini up", isCmd: true, delay: 1500 },
    { text: `→ ✓ Kernel iniciado (${loading ? "..." : agentCount} agentes, ${loading ? "..." : guardrailCount} guardrails)`, isCmd: false, delay: 2000 },
    { text: "→ ✓ ChromaDB: 5,640 documentos indexados", isCmd: false, delay: 2200 },
    { text: "→ ✓ RTK: compressão 85% ativa", isCmd: false, delay: 2400 },
    { text: "", isCmd: false, delay: 2600 },
    { text: "$ paganini doctor", isCmd: true, delay: 2800 },
    { text: "→ [1/14] ✓ Kernel MOLTIS... OK", isCmd: false, delay: 3200 },
    { text: "→ [2/14] ✓ ChromaDB... 5,640 docs", isCmd: false, delay: 3350 },
    { text: "→ ...", isCmd: false, delay: 3500 },
    { text: "→ [14/14] ✓ RTK... 85% savings", isCmd: false, delay: 3650 },
    { text: "→ Resultado: 14/14 verificações passaram ✓", isCmd: false, delay: 3900 },
  ];

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          letterSpacing: "0.18em",
          color: "var(--text-4)",
          margin: "0 0 0.75rem 0",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--border)",
          textTransform: "uppercase",
        }}
      >
        {children}
      </h2>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

      {/* ── HERO ── */}
      <div
        className="glass-card"
        style={{
          padding: "3rem 2.5rem",
          marginBottom: "2.5rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 60% at 50% 30%, hsl(150 100% 50% / 0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Main title */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              color: "var(--accent)",
              letterSpacing: "-0.04em",
              margin: "0 0 0.5rem 0",
              textShadow: "0 0 40px hsl(150 100% 50% / 0.35)",
              lineHeight: 1,
            }}
          >
            PAGANINI AIOS
          </h1>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              color: "var(--text-3)",
              letterSpacing: "0.04em",
              margin: "0 0 2.5rem 0",
            }}
          >
            Plataforma de Agentes Autônomos que Escrevem, Testam e Deployam Código para o Mercado Financeiro
          </p>

          {/* Animated counters */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "3rem",
              flexWrap: "wrap",
              marginBottom: "2rem",
            }}
          >
            {[
              { value: agents, label: "Agentes de Código", suffix: "" },
              { value: caps, label: "Capacidades", suffix: "" },
              { value: guards, label: "Guardrails", suffix: "" },
            ].map((c) => (
              <div key={c.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "3rem",
                    color: "var(--accent)",
                    lineHeight: 1,
                    textShadow: "0 0 20px hsl(150 100% 50% / 0.4)",
                  }}
                >
                  {c.value}
                </div>
                <div
                  className="mono-label"
                  style={{ marginTop: "0.25rem", fontSize: "0.8125rem", color: "var(--text-3)" }}
                >
                  {c.label}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              color: "hsl(190 100% 70%)",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            "Agentes de IA que escrevem, testam e deployam software para fundos FIDC — autonomamente."
          </p>
        </div>
      </div>

      {/* ── Como Funciona ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Como Funciona</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr auto 1fr",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          {[
            {
              step: "01",
              label: "COMANDO",
              desc: "Diga o que precisa em linguagem natural via Telegram, Slack ou CLI",
              icon: "💬",
              color: "hsl(190 100% 55%)",
            },
            {
              step: "02",
              label: "ORQUESTRAÇÃO",
              desc: "O OraCLI decompõe a tarefa e delega para os agentes especializados",
              icon: "🧭",
              color: "var(--accent)",
            },
            {
              step: "03",
              label: "ENTREGA",
              desc: "Código gerado, testado, revisado e deployado automaticamente",
              icon: "🚀",
              color: "hsl(270 80% 70%)",
            },
          ].flatMap((s, i, arr) => {
            const card = (
              <div
                key={s.step}
                className="glass-card"
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  borderTop: `2px solid ${s.color}`,
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{s.icon}</div>
                <div
                  className="mono-label"
                  style={{
                    fontSize: "0.75rem",
                    color: s.color,
                    marginBottom: "0.5rem",
                    letterSpacing: "0.2em",
                  }}
                >
                  PASSO {s.step}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "var(--text-1)",
                    marginBottom: "0.5rem",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.label}
                </div>
                <p className="section-help" style={{ margin: 0, fontSize: "0.75rem" }}>
                  {s.desc}
                </p>
              </div>
            );

            if (i < arr.length - 1) {
              return [
                card,
                <div
                  key={`arrow-${i}`}
                  style={{
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.25rem",
                    color: "hsl(150 100% 50% / 0.4)",
                  }}
                >
                  →
                </div>,
              ];
            }
            return [card];
          })}
        </div>
      </div>

      {/* ── Números que Importam ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Números que Importam</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
            gap: "1rem",
          }}
        >
          {metrics.map((m, idx) => (
            <div
              key={m.label}
              className="glass-card"
              style={{ padding: "1.25rem", textAlign: "center" }}
            >
              <div className="stat-value" style={{ fontSize: "2rem" }}>{m.value}</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  color: "var(--text-2)",
                  marginTop: "0.25rem",
                  marginBottom: "0.25rem",
                }}
              >
                {m.label}
              </div>
              <div className="mono-label" style={{ fontSize: "0.75rem", color: "var(--text-4)" }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Arquitetura em Camadas ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Arquitetura em Camadas</SectionTitle>
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {layers.map((l, i) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                background: l.bg,
                border: `1px solid ${l.border}`,
                transition: "opacity 0.2s",
                opacity: 1 - i * 0.07,
              }}
            >
              {/* Icon + label */}
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{l.icon}</span>
              <span
                className="mono-label"
                style={{
                  fontSize: "0.8125rem",
                  color: l.color,
                  letterSpacing: "0.16em",
                  minWidth: "7rem",
                  flexShrink: 0,
                }}
              >
                {l.label}
              </span>
              {/* Separator */}
              <div
                style={{
                  width: "1px",
                  height: "20px",
                  background: l.border,
                  flexShrink: 0,
                }}
              />
              {/* Description */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  color: "var(--text-3)",
                }}
              >
                {l.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CLI Demo ── */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Demonstração CLI</SectionTitle>
        <div
          className="glass-card"
          style={{
            padding: 0,
            overflow: "hidden",
            background: "hsl(220 25% 5%)",
            border: "1px solid hsl(150 100% 50% / 0.2)",
          }}
        >
          {/* Terminal titlebar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              borderBottom: "1px solid hsl(150 100% 50% / 0.1)",
              background: "hsl(220 25% 7%)",
            }}
          >
            {["hsl(0 70% 55%)", "hsl(40 80% 55%)", "hsl(120 60% 50%)"].map((c, i) => (
              <span
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: c,
                  display: "inline-block",
                  opacity: 0.8,
                }}
              />
            ))}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--text-4)",
                marginLeft: "0.5rem",
                letterSpacing: "0.1em",
              }}
            >
              paganini — terminal
            </span>
          </div>

          {/* Terminal body */}
          <div style={{ padding: "1.25rem 1.5rem", minHeight: "280px" }}>
            {termLines.map((line, i) => (
              <TermLine key={i} {...line} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Atividade Recente ── */}
      {activity.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <SectionTitle>Atividade Recente</SectionTitle>
          <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "6px" }}>
            {activity.slice(0, 6).map((item, i) => {
              const col = item.type === "pass" || item.type === "info" ? "var(--accent)"
                : item.type === "warn" || item.type === "alert" ? "#f59e0b"
                : "#ef4444";
              const icon = item.type === "pass" || item.type === "info" ? "✓"
                : item.type === "warn" || item.type === "alert" ? "⚠"
                : "✗";
              return (
                <div key={i} style={{
                  display: "flex", gap: "0.75rem", alignItems: "flex-start",
                  padding: "0.5rem 0.75rem",
                  background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
                  borderRadius: "var(--radius)",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: col, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-4)", flexShrink: 0, minWidth: 40 }}>{item.time}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--cyan)", flexShrink: 0, minWidth: 100 }}>{item.agent}</span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-2)", lineHeight: 1.4 }}>{item.action}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Roadmap ── */}
      <div>
        <SectionTitle>Próximos Passos — Roadmap</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {roadmap.map((r) => (
            <div
              key={r.quarter}
              className="glass-card"
              style={{
                padding: "1.5rem",
                borderTop: `2px solid ${r.color}`,
              }}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>{r.icon}</div>
              <div
                className="mono-label"
                style={{
                  fontSize: "0.75rem",
                  color: r.color,
                  marginBottom: "0.375rem",
                  letterSpacing: "0.18em",
                }}
              >
                {r.quarter}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "var(--text-1)",
                  marginBottom: "0.5rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {r.title}
              </div>
              <p className="section-help" style={{ margin: 0, fontSize: "0.75rem" }}>
                {r.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
