"use client";

import { GUARDRAIL_GATES } from "@/lib/mock-data";

const STATUS_MAP = {
  pass: {
    label: "PASS",
    color: "#fff",
    bg: "var(--green)",
    glow: "none",
  },
  warn: {
    label: "WARN",
    color: "#fff",
    bg: "var(--amber)",
    glow: "0 0 0 1px var(--amber), 0 0 14px rgba(234,179,8,0.35)",
  },
  block: {
    label: "BLOCK",
    color: "#fff",
    bg: "var(--red)",
    glow: "0 0 0 1px var(--red), 0 0 14px rgba(239,68,68,0.4)",
  },
} as const;

const RECENT_EVENTS = [
  {
    id: 1,
    type: "pass" as const,
    gate: "Eligibility",
    message: "847 receivables checked — all eligible criteria met",
    time: "2m ago",
  },
  {
    id: 2,
    type: "warn" as const,
    gate: "Concentration",
    message: "Cedent ABC reached 14.2% — approaching 15% limit",
    time: "12m ago",
  },
  {
    id: 3,
    type: "pass" as const,
    gate: "PLD/AML",
    message: "Batch scan complete — 0 flags raised across 312 entities",
    time: "38m ago",
  },
  {
    id: 4,
    type: "pass" as const,
    gate: "Compliance",
    message: "CVM 356 eligibility confirmed for current portfolio",
    time: "1h ago",
  },
  {
    id: 5,
    type: "pass" as const,
    gate: "Covenant",
    message: "Subordination ratio 43.2% — within 40% minimum covenant",
    time: "2h ago",
  },
  {
    id: 6,
    type: "pass" as const,
    gate: "Risk",
    message: "PDD recalculated at 2.8% of portfolio — within 5% limit",
    time: "4h ago",
  },
];

const EVENT_DOT_COLOR: Record<string, string> = {
  pass: "var(--green)",
  warn: "var(--amber)",
  block: "var(--red)",
};

type EventType = "pass" | "warn" | "block";

const SOUL_CHECKS = [
  { check: "Action Over Permission", passing: true, detail: "No confirmation prompts issued in last 24h" },
  { check: "BMAD-CE Gate Token", passing: true, detail: "All 3 tasks had valid GATE tokens" },
  { check: "No Walls of Text", passing: false, detail: "2 responses exceeded 400 tokens (non-critical)" },
  { check: "Memory Write Discipline", passing: true, detail: "Daily log updated 4 times today" },
  { check: "No Anti-Patterns", passing: true, detail: "Zero filler phrases detected in outputs" },
];

export default function GuardrailsPage() {
  const passCount = GUARDRAIL_GATES.filter((g) => g.status === "pass").length;
  const warnCount = GUARDRAIL_GATES.filter((g) => g.status === "warn").length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-1)" }}
          >
            Guardrails
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-3)" }}>
            Real-time gate monitoring across all FIDC control layers
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-xl font-bold font-mono"
            style={{ color: "var(--green)" }}
          >
            {passCount}/{GUARDRAIL_GATES.length}
          </span>
          <span className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-4)" }}>
            Passing
          </span>
        </div>
      </div>

      {/* Gate Cards Grid — 2×3 mobile, 3×2 sm, 6 in one row lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {GUARDRAIL_GATES.map((gate) => {
          const s = STATUS_MAP[gate.status];
          const animated = (gate.status as string) === "warn" || (gate.status as string) === "block";

          return (
            <div
              key={gate.gate}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl text-center transition-all duration-300 active:scale-[0.98]"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: s.glow,
                padding: "20px 12px",
                animation: animated ? "pulse-dot 3s ease-in-out infinite" : "none",
                minHeight: 130,
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{gate.icon}</span>
              <span
                className="font-semibold"
                style={{ fontSize: 13, color: "var(--text-1)" }}
              >
                {gate.label}
              </span>
              <span
                className="rounded-xl font-bold text-[9px] uppercase tracking-[0.15em] px-2.5 py-1"
                style={{ background: s.bg, color: s.color }}
              >
                {s.label}
              </span>
              <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
                {gate.stat}
              </span>
            </div>
          );
        })}
      </div>

      {/* Warn alert */}
      {warnCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.3)",
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <p className="text-[13px]" style={{ color: "var(--amber)" }}>
            <strong>Concentration gate</strong> WARN — Cedent ABC at 14.2% approaching the 15% single-cedent limit.
          </p>
        </div>
      )}

      {/* Recent Events — timeline */}
      <section>
        <h2
          className="text-base font-semibold mb-4"
          style={{ color: "var(--text-1)" }}
        >
          Recent Events
        </h2>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {RECENT_EVENTS.map((event, idx) => {
            const dotColor = EVENT_DOT_COLOR[event.type];
            const isLast = idx === RECENT_EVENTS.length - 1;
            return (
              <div
                key={event.id}
                className="flex items-start gap-4 px-5 py-4"
                style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
              >
                {/* Timeline column */}
                <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: 20 }}>
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{
                      width: 10,
                      height: 10,
                      background: dotColor,
                      boxShadow: `0 0 6px ${dotColor}80`,
                    }}
                  />
                  {!isLast && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 24,
                        background: "var(--border)",
                        marginTop: 4,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] uppercase tracking-[0.15em] font-bold rounded-lg px-2 py-0.5"
                      style={{
                        background: EVENT_DOT_COLOR[event.type] + "20",
                        color: EVENT_DOT_COLOR[event.type],
                      }}
                    >
                      {event.gate}
                    </span>
                  </div>
                  <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                    {event.message}
                  </p>
                </div>

                {/* Timestamp */}
                <span
                  className="flex-shrink-0 text-[13px]"
                  style={{ color: "var(--text-4)" }}
                >
                  {event.time}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* SOUL Audit */}
      <section>
        <h2
          className="text-base font-semibold mb-4"
          style={{ color: "var(--text-1)" }}
        >
          SOUL Audit
        </h2>

        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 20 }}>🧠</span>
              <span className="font-semibold text-[13px]" style={{ color: "var(--text-2)" }}>
                Behavioral compliance checks
              </span>
            </div>
            <span
              className="rounded-xl px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] font-bold"
              style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)" }}
            >
              {SOUL_CHECKS.filter((c) => c.passing).length}/{SOUL_CHECKS.length} pass
            </span>
          </div>

          {/* Checks */}
          <div className="flex flex-col gap-2">
            {SOUL_CHECKS.map((check, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-2xl"
                style={{
                  padding: "12px 14px",
                  background: "var(--bg)",
                  border: `1px solid ${check.passing ? "var(--border)" : "rgba(234,179,8,0.3)"}`,
                }}
              >
                <span className="flex-shrink-0 text-base mt-0.5">
                  {check.passing ? "✅" : "⚠️"}
                </span>
                <div className="min-w-0">
                  <p
                    className="font-semibold text-[13px]"
                    style={{ color: "var(--text-2)" }}
                  >
                    {check.check}
                  </p>
                  <p
                    className="text-[13px] mt-0.5"
                    style={{ color: "var(--text-4)" }}
                  >
                    {check.detail}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 rounded-lg text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 ml-auto"
                  style={{
                    background: check.passing ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)",
                    color: check.passing ? "var(--green)" : "var(--amber)",
                  }}
                >
                  {check.passing ? "PASS" : "WARN"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
