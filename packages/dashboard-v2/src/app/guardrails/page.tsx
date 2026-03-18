import { GUARDRAIL_GATES } from "@/lib/mock-data";

const STATUS_MAP = {
  pass: { label: "PASS", color: "var(--green)", bg: "rgba(34,197,94,0.1)" },
  warn: { label: "WARN", color: "var(--amber)", bg: "rgba(245,158,11,0.1)" },
  block: { label: "BLOCK", color: "var(--red)", bg: "rgba(239,68,68,0.1)" },
} as const;

const GATE_HISTORY = [
  { id: 1, type: "pass", gate: "Eligibility", message: "847 receivables checked — all eligible criteria met", time: "2m ago" },
  { id: 2, type: "warn", gate: "Concentration", message: "Cedent ABC reached 14.2% — approaching 15% limit", time: "12m ago" },
  { id: 3, type: "pass", gate: "PLD/AML", message: "Batch scan complete — 0 flags raised across 312 entities", time: "38m ago" },
  { id: 4, type: "pass", gate: "Compliance", message: "CVM 356 eligibility confirmed for current portfolio", time: "1h ago" },
  { id: 5, type: "pass", gate: "Covenant", message: "Subordination ratio 43.2% — within 40% minimum covenant", time: "2h ago" },
  { id: 6, type: "pass", gate: "Risk", message: "PDD recalculated at 2.8% of portfolio — within 5% limit", time: "4h ago" },
];

const SOUL_AUDIT_ENTRIES = [
  { check: "Action Over Permission", status: "pass", detail: "No confirmation prompts issued in last 24h" },
  { check: "BMAD-CE Gate Token", status: "pass", detail: "All 3 tasks had valid GATE tokens" },
  { check: "No Walls of Text", status: "warn", detail: "2 responses exceeded 400 tokens (non-critical)" },
  { check: "Memory Write Discipline", status: "pass", detail: "Daily log updated 4 times today" },
  { check: "No Anti-Patterns", status: "pass", detail: "Zero filler phrases detected in outputs" },
];

const GATE_TOKENS = [
  { token: "GATE-20260318T091132:a2f8c3d1e095", task: "NAV calculation update", tier: "Quick", status: "consumed" },
  { token: "GATE-20260318T073408:b9e1724fc881", task: "Cedent ABC scoring pipeline", tier: "Feature", status: "consumed" },
  { token: "GATE-20260317T234512:c4a76d2e8b03", task: "Compliance report generation", tier: "Micro", status: "consumed" },
];

export default function GuardrailsPage() {
  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
          Guardrails
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          Real-time gate monitoring across all FIDC control layers
        </p>
      </div>

      {/* Gate cards grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {GUARDRAIL_GATES.map((gate) => {
          const s = STATUS_MAP[gate.status];
          return (
            <div
              key={gate.gate}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center"
              style={{
                background: "var(--bg-card)",
                border: `1px solid var(--border)`,
              }}
            >
              <span className="text-2xl leading-none">{gate.icon}</span>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-1)" }}
              >
                {gate.label}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: s.bg, color: s.color }}
              >
                {s.label}
              </span>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                {gate.stat}
              </span>
            </div>
          );
        })}
      </div>

      {/* Gate History */}
      <section>
        <h2
          className="text-base font-semibold mb-3"
          style={{ color: "var(--text-1)" }}
        >
          Gate History
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
        >
          {GATE_HISTORY.map((entry, idx) => {
            const s = STATUS_MAP[entry.type as keyof typeof STATUS_MAP];
            const isLast = idx === GATE_HISTORY.length - 1;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-4 px-5 py-4"
                style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
              >
                {/* Status indicator */}
                <div className="mt-0.5 flex-shrink-0">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-2)" }}
                    >
                      {entry.gate}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>
                    {entry.message}
                  </p>
                </div>

                {/* Time */}
                <span
                  className="flex-shrink-0 text-xs"
                  style={{ color: "var(--text-4)" }}
                >
                  {entry.time}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dev Gate section */}
      <section>
        <h2
          className="text-base font-semibold mb-3"
          style={{ color: "var(--text-1)" }}
        >
          Dev Gate
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* GATE Tokens */}
          <div
            className="rounded-2xl p-5"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  GATE Tokens
                </h3>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              >
                {GATE_TOKENS.length} today
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {GATE_TOKENS.map((gt) => (
                <div
                  key={gt.token}
                  className="flex flex-col gap-1 rounded-xl p-3"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between">
                    <code
                      className="text-xs font-mono truncate"
                      style={{ color: "var(--accent)" }}
                    >
                      {gt.token}
                    </code>
                    <span
                      className="flex-shrink-0 ml-2 text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(34,197,94,0.1)",
                        color: "var(--green)",
                      }}
                    >
                      {gt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-3)" }}
                    >
                      {gt.task}
                    </span>
                    <span
                      className="text-xs px-1 rounded"
                      style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                    >
                      {gt.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SOUL Audit */}
          <div
            className="rounded-2xl p-5"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  SOUL Audit
                </h3>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(34,197,94,0.1)", color: "var(--green)" }}
              >
                {SOUL_AUDIT_ENTRIES.filter((e) => e.status === "pass").length}/
                {SOUL_AUDIT_ENTRIES.length} passing
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {SOUL_AUDIT_ENTRIES.map((entry, idx) => {
                const passing = entry.status === "pass";
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <span
                      className="mt-0.5 flex-shrink-0 text-sm"
                    >
                      {passing ? "✅" : "⚠️"}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "var(--text-2)" }}
                      >
                        {entry.check}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-4)" }}
                      >
                        {entry.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
