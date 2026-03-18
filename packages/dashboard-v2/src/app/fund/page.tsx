"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NAV_HISTORY, CONCENTRATION } from "@/lib/mock-data";

/* ──────────────────────────────────────────────
   Static data
────────────────────────────────────────────── */
const COVENANTS = [
  { name: "Subordination ratio", current: 43.2, limit: 40, unit: "%", status: "ok" as const },
  { name: "PDD / portfolio", current: 2.8, limit: 5, unit: "%", status: "ok" as const },
  { name: "Single cedent conc.", current: 14.2, limit: 15, unit: "%", status: "warn" as const },
  { name: "Delinquency 90d+", current: 3.1, limit: 8, unit: "%", status: "ok" as const },
];

const CASHFLOW = [
  { label: "Inflow 30d", value: "R$ 28.4M", positive: true },
  { label: "Outflow 30d", value: "R$ 21.2M", positive: false },
  { label: "Net 30d", value: "+R$ 7.2M", positive: true },
  { label: "Net 90d", value: "+R$ 11.5M", positive: true },
];

const PDD_BUCKETS = [
  { label: "0–30d", value: 0.4 },
  { label: "31–60d", value: 0.8 },
  { label: "61–90d", value: 1.2 },
  { label: "91–180d", value: 2.4 },
  { label: "180d+", value: 3.5 },
];

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
function concColor(pct: number) {
  if (pct >= 12) return "var(--red)";
  if (pct >= 8) return "var(--amber)";
  if (pct >= 4) return "var(--blue)";
  return "var(--green)";
}

function concBarColor(pct: number) {
  if (pct >= 14) return "var(--red)";
  if (pct >= 10) return "var(--amber)";
  return "var(--green)";
}

function covenantColor(status: "ok" | "warn" | "breach") {
  if (status === "breach") return "var(--red)";
  if (status === "warn") return "var(--amber)";
  return "var(--green)";
}

/** Arc progress as SVG circle */
function CircleProgress({
  current,
  limit,
  status,
  unit,
  name,
}: {
  current: number;
  limit: number;
  status: "ok" | "warn" | "breach";
  unit: string;
  name: string;
}) {
  const pct = Math.min(100, (current / limit) * 100);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = covenantColor(status);

  return (
    <div
      className="rounded-2xl flex flex-col items-center gap-2 active:scale-[0.98] transition-all duration-200"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        padding: "20px 12px 16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* SVG circle */}
      <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={40}
          cy={40}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={7}
        />
        {/* Progress */}
        <circle
          cx={40}
          cy={40}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>

      {/* Value overlay — we position absolutely above the svg */}
      <div
        className="flex flex-col items-center"
        style={{ marginTop: -80 - 8, marginBottom: 8 - 16, height: 80, justifyContent: "center" }}
      >
        <span
          className="font-bold font-mono"
          style={{ fontSize: 15, color: "var(--text-1)" }}
        >
          {current}
          {unit}
        </span>
      </div>

      <p
        className="text-[13px] text-center leading-tight"
        style={{ color: "var(--text-3)" }}
      >
        {name}
      </p>
      <div className="flex items-center gap-1">
        <span
          className="rounded-full w-1.5 h-1.5"
          style={{ background: color }}
        />
        <span
          className="text-[9px] uppercase tracking-[0.15em] font-bold"
          style={{ color }}
        >
          {status}
        </span>
        <span className="text-[9px]" style={{ color: "var(--text-4)" }}>
          / {limit}
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Recharts custom tooltip
────────────────────────────────────────────── */
const NavTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl px-3 py-2 text-[13px] shadow-lg"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text-1)",
      }}
    >
      <p style={{ color: "var(--text-3)" }} className="text-[9px] uppercase tracking-[0.15em] mb-0.5">
        {label}
      </p>
      <p className="font-bold font-mono" style={{ color: "var(--accent)" }}>
        R$ {payload[0].value.toFixed(1)}M
      </p>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Page
────────────────────────────────────────────── */
export default function FundPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          Fund Operations
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-3)" }}>
          FIDC Paganini · R$ 245.8M AUM · Mar 2026
        </p>
      </div>

      {/* ── NAV Chart ───────────────────────────── */}
      <section
        className="rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-0"
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
              Net Asset Value
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
              12-month trailing · millions BRL
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-xl font-bold font-mono"
              style={{ color: "var(--accent)" }}
            >
              R$ 245.8M
            </p>
            <p className="text-[13px]" style={{ color: "var(--green)" }}>
              +34.8% YTD
            </p>
          </div>
        </div>

        <div style={{ padding: "16px 8px 8px" }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={NAV_HISTORY}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--text-4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["dataMin - 5", "dataMax + 5"]}
                tick={{ fill: "var(--text-4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<NavTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fill="url(#navFill)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "var(--accent)",
                  stroke: "var(--bg-card)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Concentration ────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
            Cedent Concentration
          </h2>
          <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--text-4)" }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded inline-block" style={{ background: "var(--green)" }} />
              &lt;10%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded inline-block" style={{ background: "var(--amber)" }} />
              10–14%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded inline-block" style={{ background: "var(--red)" }} />
              14%+
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONCENTRATION.map((item) => {
            const barColor = concBarColor(item.pct);
            const textColor = concColor(item.pct);
            const barPct = Math.min(100, (item.pct / 15) * 100); // 15% = limit
            const LIMIT_POS = (15 / 15) * 100; // 100% — the limit is at bar end

            return (
              <div
                key={item.cedent}
                className="rounded-2xl flex flex-col gap-2.5 transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  padding: "16px 16px 14px",
                }}
              >
                {/* Name + pct */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>
                    {item.cedent}
                  </span>
                  <span
                    className="text-xl font-bold font-mono"
                    style={{ color: textColor }}
                  >
                    {item.pct}%
                  </span>
                </div>

                {/* Progress bar with limit indicator */}
                <div className="relative" style={{ height: 8 }}>
                  {/* Track */}
                  <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{ background: "var(--border)" }}
                  >
                    {/* Fill */}
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  {/* Limit line (at 100% of bar width = 15% cedent) */}
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${LIMIT_POS}%`,
                      width: 2,
                      background: "var(--red)",
                      transform: "translateX(-50%)",
                      borderRadius: 1,
                    }}
                  />
                </div>

                {/* Limit label */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-4)" }}>
                    Limit: 15%
                  </span>
                  {item.pct >= 14 && (
                    <span
                      className="text-[9px] uppercase tracking-[0.15em] font-bold rounded-lg px-2 py-0.5"
                      style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)" }}
                    >
                      ⚠ Near limit
                    </span>
                  )}
                  {item.pct >= 10 && item.pct < 14 && (
                    <span
                      className="text-[9px] uppercase tracking-[0.15em] font-bold rounded-lg px-2 py-0.5"
                      style={{ background: "rgba(234,179,8,0.12)", color: "var(--amber)" }}
                    >
                      Watch
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Covenants: circular progress ─────────── */}
      <section>
        <h2
          className="text-base font-semibold mb-3"
          style={{ color: "var(--text-1)" }}
        >
          Covenant Monitor
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COVENANTS.map((cov) => (
            <CircleProgress
              key={cov.name}
              current={cov.current}
              limit={cov.limit}
              status={cov.status}
              unit={cov.unit}
              name={cov.name}
            />
          ))}
        </div>
      </section>

      {/* ── Cashflow: 2×2 grid ────────────────────── */}
      <section>
        <h2
          className="text-base font-semibold mb-3"
          style={{ color: "var(--text-1)" }}
        >
          Cashflow Projection
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CASHFLOW.map((cf) => (
            <div
              key={cf.label}
              className="rounded-2xl flex flex-col gap-1 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                padding: "18px 16px 14px",
              }}
            >
              <span
                className="text-[9px] uppercase tracking-[0.15em] font-semibold"
                style={{ color: "var(--text-4)" }}
              >
                {cf.label}
              </span>
              <span
                className="text-xl font-bold font-mono"
                style={{ color: cf.positive ? "var(--green)" : "var(--red)" }}
              >
                {cf.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PDD Summary ───────────────────────────── */}
      <section>
        <h2
          className="text-base font-semibold mb-3"
          style={{ color: "var(--text-1)" }}
        >
          PDD Summary
        </h2>
        <div
          className="rounded-2xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            padding: "20px",
          }}
        >
          {/* Big number */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-4)" }}>
                Total provision
              </p>
              <p
                className="text-xl font-bold font-mono mt-1"
                style={{ color: "var(--text-1)" }}
              >
                R$ 20.33M
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-4)" }}>
                % of portfolio
              </p>
              <p
                className="text-xl font-bold font-mono mt-1"
                style={{ color: "var(--amber)" }}
              >
                2.8%
              </p>
            </div>
          </div>

          {/* Aging bucket mini bars */}
          <div className="flex flex-col gap-2.5">
            {PDD_BUCKETS.map((bucket) => {
              const maxVal = PDD_BUCKETS[PDD_BUCKETS.length - 1].value;
              const pct = Math.round((bucket.value / maxVal) * 100);
              const barColor =
                bucket.value >= 3
                  ? "var(--red)"
                  : bucket.value >= 1.5
                  ? "var(--amber)"
                  : "var(--blue)";

              return (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span
                    className="text-[13px] flex-shrink-0 font-mono"
                    style={{ color: "var(--text-4)", width: 52 }}
                  >
                    {bucket.label}
                  </span>
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ height: 7, background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                  <span
                    className="text-[13px] font-bold font-mono flex-shrink-0"
                    style={{ color: barColor, width: 36, textAlign: "right" }}
                  >
                    {bucket.value}%
                  </span>
                </div>
              );
            })}
          </div>

          <p
            className="mt-4 text-[13px]"
            style={{
              color: "var(--text-4)",
              borderTop: "1px solid var(--border)",
              paddingTop: 12,
            }}
          >
            Calculated by Pricing Agent · Last updated 14:32 UTC · Limit: 5%
          </p>
        </div>
      </section>
    </div>
  );
}
