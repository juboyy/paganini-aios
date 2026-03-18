import { STATS, ACTIVITY, GUARDRAIL_GATES } from "@/lib/mock-data";

const STATUS_COLORS: Record<string, string> = {
  success: "var(--green)",
  info: "var(--blue)",
  warning: "var(--amber)",
  error: "var(--red)",
};

const GATE_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  pass: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", color: "var(--green)", label: "✓ PASS" },
  warn: { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", color: "var(--amber)", label: "⚠ WARN" },
  block: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: "var(--red)", label: "✗ BLOCK" },
};

function StatCard({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-4)" }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: subColor || "var(--text-4)" }}>{sub}</div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Fund AUM" value={STATS.fundAum} sub={STATS.fundAumDelta} subColor="var(--green)" />
        <StatCard label="Agents Online" value={STATS.agentsOnline} sub="3 idle" subColor="var(--amber)" />
        <StatCard label="RAG Chunks" value={STATS.ragChunks} sub="indexed" />
        <StatCard label="Guardrails" value={STATS.guardrails} sub="all passing" subColor="var(--green)" />
        <StatCard label="Symphony" value={`${STATS.symphonyTasks}`} sub="in progress" subColor="var(--blue)" />
        <StatCard label="ROI" value={STATS.roiHours} sub={STATS.roiCostPerHour} subColor="var(--green)" />
      </div>

      {/* Guardrail strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {GUARDRAIL_GATES.map((g) => {
          const style = GATE_STYLES[g.status];
          return (
            <div
              key={g.gate}
              className="text-center p-3 rounded-lg"
              style={{ background: style.bg, border: `1px solid ${style.border}` }}
            >
              <div className="text-lg mb-1">{g.icon}</div>
              <div className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{g.label}</div>
              <div className="text-[10px] font-mono mt-1" style={{ color: style.color }}>{style.label}</div>
              <div className="text-[9px] mt-0.5" style={{ color: "var(--text-4)" }}>{g.stat}</div>
            </div>
          );
        })}
      </div>

      {/* Activity feed + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-4)" }}>Activity Feed</div>
          <div className="space-y-1">
            {ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[item.type] }} />
                <span style={{ color: "var(--text-2)" }}>{item.message}</span>
                <span className="ml-auto text-[10px] shrink-0" style={{ color: "var(--text-4)" }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-4)" }}>Alerts</div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)", color: "var(--text-2)" }}>
              <span className="mr-2">⚠</span>Concentration nearing limit — Cedent ABC at 14.2% (limit 15%)
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "var(--text-2)" }}>
              <span className="mr-2">ℹ</span>Codex token tracking: 0 tokens reported — investigate parser
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", color: "var(--text-2)" }}>
              <span className="mr-2">✓</span>All 47 Paganini tests passing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
