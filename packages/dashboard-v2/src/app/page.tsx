"use client";

import { STATS, ACTIVITY, GUARDRAIL_GATES, NAV_HISTORY } from "@/lib/mock-data";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  success: "var(--green)",
  info: "var(--blue)",
  warning: "var(--amber)",
  error: "var(--red)",
};

const GATE_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  pass: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", color: "var(--green)", icon: "✓" },
  warn: { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.2)", color: "var(--amber)", icon: "⚠" },
  block: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "var(--red)", icon: "✗" },
};

function HeroCard({ icon, label, value, sub, subColor, accent }: {
  icon: string; label: string; value: string; sub: string; subColor?: string; accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 lg:p-5 relative overflow-hidden"
      style={{
        background: accent ? "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(124,58,237,0.04))" : "var(--bg-card)",
        border: `1px solid ${accent ? "rgba(124,58,237,0.2)" : "var(--border)"}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] mb-1.5" style={{ color: "var(--text-4)" }}>{label}</div>
          <div className="text-xl lg:text-2xl font-bold tracking-tight" style={{ color: accent ? "var(--accent)" : "var(--text-1)" }}>{value}</div>
          <div className="text-[11px] mt-1 font-medium" style={{ color: subColor || "var(--text-4)" }}>{sub}</div>
        </div>
        <span className="text-2xl opacity-60">{icon}</span>
      </div>
    </div>
  );
}

function MiniChart() {
  return (
    <div className="rounded-2xl p-4 lg:p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] uppercase tracking-[0.15em]" style={{ color: "var(--text-4)" }}>NAV · 12 months</div>
        <div className="text-sm font-bold" style={{ color: "var(--green)" }}>+34.8%</div>
      </div>
      <div className="h-24 lg:h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={NAV_HISTORY}>
            <defs>
              <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11 }}
              labelStyle={{ color: "var(--text-4)" }}
              formatter={(v: number) => [`R$ ${v}M`, "NAV"]}
            />
            <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#navGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="space-y-5">
      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HeroCard icon="💰" label="Fund AUM" value={STATS.fundAum} sub={STATS.fundAumDelta} subColor="var(--green)" accent />
        <HeroCard icon="🤖" label="Agents" value={STATS.agentsOnline} sub="3 idle" subColor="var(--amber)" />
        <HeroCard icon="📚" label="RAG Chunks" value={STATS.ragChunks} sub="indexed" />
        <HeroCard icon="⏱" label="ROI" value={STATS.roiHours} sub={STATS.roiCostPerHour} subColor="var(--green)" />
      </div>

      {/* NAV Chart + Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MiniChart />

        {/* Guardrail strip */}
        <div className="rounded-2xl p-4 lg:p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-[9px] uppercase tracking-[0.15em] mb-3" style={{ color: "var(--text-4)" }}>Guardrail Gates</div>
          <div className="grid grid-cols-3 gap-2">
            {GUARDRAIL_GATES.map((g) => {
              const s = GATE_STYLES[g.status];
              return (
                <div key={g.gate} className="text-center p-2.5 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div className="text-lg mb-0.5">{g.icon}</div>
                  <div className="text-[10px] font-semibold" style={{ color: "var(--text-1)" }}>{g.label}</div>
                  <div className="text-[9px] font-mono font-bold mt-0.5" style={{ color: s.color }}>{s.icon}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-2xl p-4 lg:p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-[9px] uppercase tracking-[0.15em] mb-3" style={{ color: "var(--text-4)" }}>Activity</div>
          <div className="space-y-0.5">
            {ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 text-[13px]" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[item.type] }} />
                <span className="flex-1 truncate" style={{ color: "var(--text-2)" }}>{item.message}</span>
                <span className="text-[9px] shrink-0 tabular-nums" style={{ color: "var(--text-4)" }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4 lg:p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-[9px] uppercase tracking-[0.15em] mb-3" style={{ color: "var(--text-4)" }}>Alerts</div>
          <div className="space-y-2">
            <div className="p-3 rounded-xl text-[12px] leading-relaxed" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.12)", color: "var(--text-2)" }}>
              ⚠ Concentration nearing limit — Cedent ABC at <strong>14.2%</strong> (limit 15%)
            </div>
            <div className="p-3 rounded-xl text-[12px] leading-relaxed" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", color: "var(--text-2)" }}>
              ℹ Codex token tracking: 0 tokens — parser bug
            </div>
            <div className="p-3 rounded-xl text-[12px] leading-relaxed" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)", color: "var(--text-2)" }}>
              ✓ All 47 tests passing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
