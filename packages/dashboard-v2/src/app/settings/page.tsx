"use client";

import { useState } from "react";

type Theme = "system" | "light" | "dark";

const INTEGRATIONS = [
  { name: "Jira", status: "connected", lastSync: "2m ago" },
  { name: "Confluence", status: "connected", lastSync: "15m ago" },
  { name: "Supabase", status: "connected", lastSync: "1m ago" },
  { name: "Vercel", status: "connected", lastSync: "30m ago" },
  { name: "GitHub", status: "connected", lastSync: "5m ago" },
  { name: "Stripe", status: "connected", lastSync: "1h ago" },
  { name: "Slack", status: "connected", lastSync: "1m ago" },
  { name: "LinkedIn", status: "error", lastSync: "2d ago" },
  { name: "Linear", status: "connected", lastSync: "30s ago" },
  { name: "OpenAI", status: "connected", lastSync: "1m ago" },
  { name: "Google AI", status: "connected", lastSync: "5m ago" },
  { name: "Mem0", status: "connected", lastSync: "1h ago" },
];

const SYSTEM_INFO = [
  { label: "Version", value: "v2.0.0", mono: false },
  { label: "Agents", value: "19 total · 16 online", mono: false },
  { label: "Model (OraCLI)", value: "claude-opus-4-6-thinking", mono: true },
  { label: "Model (Agents)", value: "claude-sonnet-4-6", mono: true },
  { label: "Model (Codex)", value: "gpt-5.3-codex", mono: true },
  { label: "Infrastructure", value: "EC2 sa-east-1", mono: true },
  { label: "DB", value: "Supabase · apkflemx", mono: true },
  { label: "Deploy", value: "Vercel Edge Network", mono: false },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "⚙️" },
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <h2
        style={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--text-4)",
          margin: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [pollInterval, setPollInterval] = useState(30);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "16px",
        maxWidth: 720,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-1)", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Settings</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4 }}>Dashboard configuration</p>
      </div>

      {/* Appearance */}
      <SectionCard title="Appearance">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Theme</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {THEME_OPTIONS.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "20px 12px",
                    borderRadius: 14,
                    border: isSelected ? "2px solid var(--accent)" : "2px solid var(--border)",
                    background: isSelected ? "var(--accent-bg)" : "var(--bg)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    minHeight: 80,
                    minWidth: 44,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{opt.icon}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isSelected ? "var(--accent)" : "var(--text-3)",
                      textTransform: "capitalize",
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Symphony */}
      <SectionCard title="Symphony Daemon">
        {/* Status row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: 12,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: 12,
            minHeight: 44,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Daemon Status</div>
            <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 3 }}>PID 89563 · uptime 4h 32m</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "var(--green)",
                boxShadow: "0 0 8px var(--green)",
                animation: "pulse-dot 2s infinite",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>Running</span>
          </div>
        </div>

        {/* Poll interval */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Poll Interval</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "monospace",
                color: "var(--accent)",
                background: "var(--accent-bg)",
                padding: "4px 10px",
                borderRadius: 8,
              }}
            >
              {pollInterval}s
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={pollInterval}
            onChange={(e) => setPollInterval(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: "var(--accent)",
              height: 6,
              cursor: "pointer",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>10s</span>
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>120s</span>
          </div>
        </div>

        {/* Linear team */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: 12,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Linear Team</span>
          <span style={{ fontSize: 13, fontFamily: "monospace", color: "var(--text-3)" }}>VIV (Vivaldi)</span>
        </div>
      </SectionCard>

      {/* Integrations */}
      <SectionCard title="Integrations">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {INTEGRATIONS.map((int, i) => (
            <div
              key={int.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 4px",
                borderBottom:
                  i < INTEGRATIONS.length - 1 ? "1px solid var(--border)" : "none",
                minHeight: 52,
                flexWrap: "wrap",
              }}
            >
              {/* Large status dot */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: int.status === "connected" ? "var(--green)" : "var(--red)",
                  flexShrink: 0,
                  boxShadow:
                    int.status === "connected"
                      ? "0 0 6px var(--green)"
                      : "0 0 6px var(--red)",
                }}
              />

              {/* Name */}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {int.name}
              </span>

              {/* Last sync */}
              <span style={{ fontSize: 11, color: "var(--text-4)", flexShrink: 0 }}>{int.lastSync}</span>

              {/* Status badge */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background:
                    int.status === "connected"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(239,68,68,0.12)",
                  color: int.status === "connected" ? "var(--green)" : "var(--red)",
                  flexShrink: 0,
                }}
              >
                {int.status}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* System info */}
      <SectionCard title="System">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
          }}
        >
          {SYSTEM_INFO.map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: "12px 8px",
                borderBottom:
                  i < SYSTEM_INFO.length - 2 ? "1px solid var(--border)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-4)",
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: item.mono ? 11 : 13,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  fontFamily: item.mono ? "monospace" : "inherit",
                  wordBreak: "break-all",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
