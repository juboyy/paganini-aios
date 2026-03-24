"use client";

import { useState, useEffect } from "react";

interface Capability {
  id?: string;
  name: string;
  description?: string;
  kind: string;
  status?: string;
  agents?: string[];
  created_at?: string;
}

interface IntegrationsData {
  integrations: Capability[];
}

// Static fallback/supplement data for the data-flow diagram and webhook log
const webhookLog = [
  { time: "15:42", src: "Slack", dest: "#paganini-alerts", msg: "Deploy preview: dashboard-v2-abc.vercel.app" },
  { time: "15:38", src: "Linear", dest: "VIV-107", msg: "Issue criada: Módulo de reconciliação bancária" },
  { time: "15:35", src: "GitHub", dest: "PR #142", msg: "Merged: PDD aging com interpolação de curva" },
  { time: "15:30", src: "Telegram", dest: "João", msg: "Sprint #47: 67% concluído, 5 stories em andamento" },
  { time: "15:22", src: "Stripe", dest: "webhook", msg: "payment_intent.succeeded — R$ 8.000,00" },
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

function IntegrationCard({
  name, description, status, agents,
}: {
  name: string;
  description?: string;
  status?: string;
  agents?: string[];
}) {
  const connected = status === "active" || status === "connected" || !status;
  const statusLabel = connected ? "CONECTADO" : (status?.toUpperCase() ?? "INATIVO");

  return (
    <div
      className="glass-card"
      style={{
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        cursor: "default",
        overflow: "visible",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.875rem",
            color: "var(--text-1)",
            letterSpacing: "-0.01em",
            flex: 1,
          }}
        >
          {name}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.1em",
            color: connected ? "var(--accent)" : "hsl(190 100% 60%)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: connected ? "var(--accent)" : "hsl(190 100% 60%)",
              boxShadow: connected ? "0 0 6px var(--accent)" : "0 0 6px hsl(190 100% 60%)",
              display: "inline-block",
            }}
          />
          {statusLabel}
        </span>
      </div>

      {description && (
        <p className="section-help" style={{ fontSize: "0.8125rem", margin: 0, lineHeight: 1.5, overflow: "visible", whiteSpace: "normal", display: "block" }}>
          {description}
        </p>
      )}

      {agents && agents.length > 0 && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {agents.slice(0, 4).map((a) => (
            <span
              key={a}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                padding: "1px 6px",
                borderRadius: "var(--radius)",
                background: "rgba(0,229,255,0.08)",
                color: "var(--cyan)",
                border: "1px solid rgba(0,229,255,0.2)",
              }}
            >
              {a}
            </span>
          ))}
          {agents.length > 4 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-4)" }}>
              +{agents.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Falha ao conectar com a API"))
      .finally(() => setLoading(false));
  }, []);

  const integrations = data?.integrations ?? [];

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.75rem",
              color: "var(--text-1)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Integrações &amp; Canais
          </h1>
          <span className="tag-badge">{loading ? "..." : `${integrations.length} CONEXÕES`}</span>
          <span className="tag-badge-cyan">OPERACIONAL</span>
        </div>
        <p className="section-help" style={{ margin: 0, fontSize: "0.8125rem" }}>
          Todas as integrações externas que o PAGANINI AIOS conecta — dados reais do Supabase (capabilities kind=integration).
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: "0.75rem 1rem", marginBottom: "1.5rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#ef4444" }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.1em" }}>
          CARREGANDO...
        </div>
      )}

      {/* Real integrations from Supabase */}
      {!loading && integrations.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <SectionTitle>Integrações — Supabase (capabilities)</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {integrations.map((cap) => (
              <IntegrationCard
                key={cap.id ?? cap.name}
                name={cap.name}
                description={cap.description}
                status={cap.status}
                agents={cap.agents}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && integrations.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-4)", marginBottom: "2rem" }}>
          Nenhuma capability com kind=&apos;integration&apos; encontrada no Supabase.
        </div>
      )}

      {/* Data Flow SVG */}
      <div style={{ marginBottom: "2.5rem" }}>
        <SectionTitle>Fluxo de Dados em Tempo Real</SectionTitle>
        <div className="glass-card" style={{ padding: "1.5rem", overflowX: "auto" }}>
          <svg
            viewBox="0 0 900 180"
            style={{ width: "100%", minWidth: "600px", height: "auto" }}
            aria-label="Fluxo de dados entre integrações"
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="hsl(150 100% 50% / 0.6)" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {[30, 60, 90, 120, 150].map((y) => (
              <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="hsl(150 100% 50% / 0.04)" strokeWidth="1" />
            ))}
            <g transform="translate(20, 65)">
              <rect x="0" y="0" width="110" height="50" rx="6" fill="hsl(220 20% 10%)" stroke="hsl(150 100% 50% / 0.35)" strokeWidth="1" />
              <text x="55" y="18" textAnchor="middle" fill="hsl(150 100% 70%)" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600">💬 Telegram</text>
              <text x="55" y="34" textAnchor="middle" fill="hsl(190 80% 65%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">💼 Slack</text>
            </g>
            <line x1="130" y1="90" x2="175" y2="90" stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <g transform="translate(175, 60)">
              <rect x="0" y="0" width="95" height="60" rx="6" fill="hsl(150 100% 8%)" stroke="var(--accent)" strokeWidth="1.5" filter="url(#glow)" />
              <text x="47" y="24" textAnchor="middle" fill="var(--accent)" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="700">OraCLI</text>
              <text x="47" y="40" textAnchor="middle" fill="hsl(150 80% 50%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">ORQUESTRADOR</text>
            </g>
            <line x1="270" y1="90" x2="315" y2="90" stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <g transform="translate(315, 45)">
              <rect x="0" y="0" width="130" height="90" rx="6" fill="hsl(220 20% 8%)" stroke="hsl(190 100% 50% / 0.3)" strokeWidth="1" />
              <text x="65" y="20" textAnchor="middle" fill="hsl(190 100% 70%)" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">⚡ Codex CLI</text>
              <line x1="10" y1="28" x2="120" y2="28" stroke="hsl(190 100% 50% / 0.15)" strokeWidth="1" />
              <text x="65" y="46" textAnchor="middle" fill="hsl(190 100% 70%)" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">🐙 GitHub</text>
              <line x1="10" y1="56" x2="120" y2="56" stroke="hsl(190 100% 50% / 0.15)" strokeWidth="1" />
              <text x="65" y="74" textAnchor="middle" fill="hsl(190 100% 70%)" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">🔧 Supabase</text>
            </g>
            <line x1="445" y1="90" x2="490" y2="90" stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <g transform="translate(490, 62)">
              <rect x="0" y="0" width="90" height="55" rx="6" fill="hsl(220 20% 10%)" stroke="hsl(150 100% 50% / 0.35)" strokeWidth="1" />
              <text x="45" y="20" textAnchor="middle" fill="hsl(150 100% 70%)" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600">📋 Linear</text>
              <text x="45" y="38" textAnchor="middle" fill="hsl(150 60% 50%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">prod gate</text>
            </g>
            <line x1="580" y1="90" x2="625" y2="90" stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <g transform="translate(625, 65)">
              <rect x="0" y="0" width="80" height="50" rx="6" fill="hsl(40 80% 10%)" stroke="hsl(40 100% 55% / 0.5)" strokeWidth="1" />
              <text x="40" y="20" textAnchor="middle" fill="hsl(40 100% 70%)" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600">👤 João</text>
              <text x="40" y="36" textAnchor="middle" fill="hsl(40 80% 55%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">aprovação</text>
            </g>
            <line x1="705" y1="90" x2="750" y2="90" stroke="hsl(150 100% 50% / 0.5)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <g transform="translate(750, 62)">
              <rect x="0" y="0" width="110" height="55" rx="6" fill="hsl(150 100% 5%)" stroke="var(--accent)" strokeWidth="1.5" filter="url(#glow)" />
              <text x="55" y="22" textAnchor="middle" fill="var(--accent)" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="700">▲ Vercel</text>
              <text x="55" y="38" textAnchor="middle" fill="hsl(150 80% 50%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">DEPLOY</text>
            </g>
            <text x="75" y="155" textAnchor="middle" fill="hsl(150 30% 45%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">entrada</text>
            <text x="222" y="155" textAnchor="middle" fill="hsl(150 30% 45%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">orquestração</text>
            <text x="380" y="155" textAnchor="middle" fill="hsl(190 30% 45%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">execução</text>
            <text x="535" y="155" textAnchor="middle" fill="hsl(150 30% 45%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">gate</text>
            <text x="665" y="155" textAnchor="middle" fill="hsl(40 40% 45%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">humano</text>
            <text x="805" y="155" textAnchor="middle" fill="hsl(150 30% 45%)" fontFamily="IBM Plex Mono, monospace" fontSize="12">entrega</text>
          </svg>
        </div>
      </div>

      {/* Webhook Log */}
      <div>
        <SectionTitle>Webhook Log — Últimos Eventos</SectionTitle>
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          {webhookLog.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1.25rem",
                borderBottom: i < webhookLog.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span className="mono-label" style={{ minWidth: "3.5rem", fontSize: "0.8125rem", color: "var(--accent)", opacity: 0.8 }}>
                {e.time}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-2)", minWidth: "4.5rem" }}>
                {e.src}
              </span>
              <span style={{ color: "var(--text-4)", fontSize: "0.8125rem" }}>→</span>
              <span className="tag-badge-cyan" style={{ fontSize: "0.75rem" }}>{e.dest}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-3)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
