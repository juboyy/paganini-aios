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

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [pollInterval, setPollInterval] = useState(30);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Settings</h1>
        <p className="text-sm" style={{ color: "var(--text-4)" }}>Dashboard configuration</p>
      </div>

      {/* Appearance */}
      <section className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text-4)" }}>Appearance</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-2)" }}>Theme</label>
            <div className="flex gap-2">
              {(["system", "light", "dark"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="px-4 py-2 rounded-lg text-sm capitalize"
                  style={{
                    background: theme === t ? "var(--accent-bg)" : "transparent",
                    color: theme === t ? "var(--accent)" : "var(--text-3)",
                    border: `1px solid ${theme === t ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {t === "system" ? "⚙ System" : t === "light" ? "☀ Light" : "◑ Dark"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "var(--text-2)" }}>Brand color</label>
            <div className="flex gap-2">
              {["#7C3AED", "#3B82F6", "#14B8A6", "#EF4444", "#EAB308"].map((c) => (
                <div key={c} className="w-8 h-8 rounded-lg cursor-pointer border-2" style={{ background: c, borderColor: c === "#7C3AED" ? "var(--text-1)" : "transparent" }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Symphony Config */}
      <section className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text-4)" }}>Symphony Daemon</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Status</div>
              <div className="text-xs" style={{ color: "var(--text-4)" }}>PID 89563 · uptime 4h32m</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="pulse-dot w-2 h-2 rounded-full inline-block" style={{ background: "var(--green)" }} />
              <span className="text-sm" style={{ color: "var(--green)" }}>Running</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "var(--text-2)" }}>Poll Interval (seconds)</label>
            <input
              type="number"
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm w-24"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "var(--text-2)" }}>Linear Team</label>
            <div className="text-sm font-mono" style={{ color: "var(--text-3)" }}>VIV (Vivaldi)</div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text-4)" }}>Integrations</h2>
        <div className="space-y-2">
          {INTEGRATIONS.map((int) => (
            <div key={int.name} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: int.status === "connected" ? "var(--green)" : "var(--red)" }}
                />
                <span className="text-sm" style={{ color: "var(--text-1)" }}>{int.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px]" style={{ color: "var(--text-4)" }}>{int.lastSync}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: int.status === "connected" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    color: int.status === "connected" ? "var(--green)" : "var(--red)",
                  }}
                >
                  {int.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Info */}
      <section className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text-4)" }}>System</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span style={{ color: "var(--text-4)" }}>Version</span><div style={{ color: "var(--text-1)" }}>v2.0.0</div></div>
          <div><span style={{ color: "var(--text-4)" }}>Agents</span><div style={{ color: "var(--text-1)" }}>19 total · 16 online</div></div>
          <div><span style={{ color: "var(--text-4)" }}>Model (OraCLI)</span><div className="font-mono text-xs" style={{ color: "var(--text-1)" }}>claude-opus-4-6-thinking</div></div>
          <div><span style={{ color: "var(--text-4)" }}>Model (Agents)</span><div className="font-mono text-xs" style={{ color: "var(--text-1)" }}>claude-sonnet-4-6</div></div>
          <div><span style={{ color: "var(--text-4)" }}>Model (Codex)</span><div className="font-mono text-xs" style={{ color: "var(--text-1)" }}>gpt-5.3-codex</div></div>
          <div><span style={{ color: "var(--text-4)" }}>Infrastructure</span><div className="font-mono text-xs" style={{ color: "var(--text-1)" }}>EC2 sa-east-1</div></div>
        </div>
      </section>
    </div>
  );
}
