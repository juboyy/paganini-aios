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

const COVENANTS = [
  { name: "Subordination ratio", current: 43.2, limit: 40, unit: "%", inverted: false, status: "ok" },
  { name: "PDD / portfolio", current: 2.8, limit: 5, unit: "%", inverted: false, status: "ok" },
  { name: "Single cedent concentration", current: 14.2, limit: 15, unit: "%", inverted: false, status: "warn" },
  { name: "Delinquency 90d+", current: 3.1, limit: 8, unit: "%", inverted: false, status: "ok" },
  { name: "Liquidity ratio", current: 12.4, limit: 10, unit: "%", inverted: true, status: "ok" },
  { name: "Average ticket", current: 18200, limit: 50000, unit: "R$", inverted: false, status: "ok" },
];

const CASHFLOW = [
  { period: "30d", inflow: "R$ 28.4M", outflow: "R$ 21.2M", net: "+R$ 7.2M", positive: true },
  { period: "60d", inflow: "R$ 54.1M", outflow: "R$ 43.7M", net: "+R$ 10.4M", positive: true },
  { period: "90d", inflow: "R$ 79.8M", outflow: "R$ 68.3M", net: "+R$ 11.5M", positive: true },
  { period: "180d", inflow: "R$ 147.2M", outflow: "R$ 131.6M", net: "+R$ 15.6M", positive: true },
];

const PDD_BUCKETS = [
  { label: "0–30d", value: 0.4, amount: "R$ 982K" },
  { label: "31–60d", value: 0.8, amount: "R$ 1.96M" },
  { label: "61–90d", value: 1.2, amount: "R$ 2.94M" },
  { label: "91–180d", value: 2.4, amount: "R$ 5.89M" },
  { label: "180d+", value: 3.5, amount: "R$ 8.60M" },
];

function getConcentrationColor(pct: number): string {
  if (pct >= 12) return "var(--red)";
  if (pct >= 8) return "var(--amber)";
  if (pct >= 4) return "var(--blue)";
  return "var(--green)";
}

function getConcentrationBg(pct: number): string {
  if (pct >= 12) return "rgba(239,68,68,0.15)";
  if (pct >= 8) return "rgba(245,158,11,0.15)";
  if (pct >= 4) return "rgba(59,130,246,0.12)";
  return "rgba(34,197,94,0.1)";
}

function getCovenantColor(cov: (typeof COVENANTS)[0]): string {
  if (cov.status === "warn") return "var(--amber)";
  if (cov.status === "breach") return "var(--red)";
  return "var(--green)";
}

function covenantPct(cov: (typeof COVENANTS)[0]): number {
  if (cov.inverted) {
    // higher is better — show as distance above minimum
    return Math.min(100, (cov.current / (cov.limit * 2)) * 100);
  }
  return Math.min(100, (cov.current / cov.limit) * 100);
}

const CustomTooltip = ({
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
      className="rounded-xl px-3 py-2 text-sm shadow-lg"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text-1)",
      }}
    >
      <p style={{ color: "var(--text-3)" }} className="text-xs mb-0.5">
        {label}
      </p>
      <p className="font-semibold" style={{ color: "var(--accent)" }}>
        R$ {payload[0].value.toFixed(1)}M
      </p>
    </div>
  );
};

export default function FundPage() {
  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          Fund Operations
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          FIDC Paganini · R$ 245.8M AUM · Mar 2026
        </p>
      </div>

      {/* NAV Chart */}
      <section
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              Net Asset Value
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              12-month trailing · millions BRL
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-bold font-mono"
              style={{ color: "var(--accent)" }}
            >
              R$ 245.8M
            </p>
            <p className="text-xs" style={{ color: "var(--green)" }}>
              +34.8% YTD
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={NAV_HISTORY}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
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
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill="url(#navGradient)"
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
      </section>

      {/* Concentration Heatmap */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            Cedent Concentration
          </h2>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-4)" }}>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: "var(--green)" }} /> &lt;4%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: "var(--blue)" }} /> 4–8%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: "var(--amber)" }} /> 8–12%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: "var(--red)" }} /> 12%+
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {CONCENTRATION.map((item) => (
            <div
              key={item.cedent}
              className="flex flex-col items-center justify-center rounded-xl p-3 text-center"
              style={{
                background: getConcentrationBg(item.pct),
                border: `1px solid ${getConcentrationColor(item.pct)}40`,
                minHeight: "72px",
              }}
            >
              <p
                className="text-lg font-bold font-mono leading-none"
                style={{ color: getConcentrationColor(item.pct) }}
              >
                {item.pct}%
              </p>
              <p
                className="text-xs mt-1 leading-tight"
                style={{ color: "var(--text-3)" }}
              >
                {item.cedent.replace("Cedent ", "")}
              </p>
            </div>
          ))}
        </div>

        {/* Limit warning */}
        <div
          className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <span className="text-sm">⚠️</span>
          <p className="text-xs" style={{ color: "var(--amber)" }}>
            <strong>Cedent ABC</strong> at 14.2% is approaching the 15% single-cedent concentration limit. Guardrail WARN active.
          </p>
        </div>
      </section>

      {/* Covenant Monitor */}
      <section>
        <h2
          className="text-base font-semibold mb-3"
          style={{ color: "var(--text-1)" }}
        >
          Covenant Monitor
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {COVENANTS.map((cov, idx) => {
            const pct = covenantPct(cov);
            const color = getCovenantColor(cov);
            const isLast = idx === COVENANTS.length - 1;

            return (
              <div
                key={cov.name}
                className="flex items-center gap-5 px-5 py-4"
                style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
              >
                {/* Name + status */}
                <div className="w-56 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-2)" }}
                    >
                      {cov.name}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex-1 flex items-center gap-3">
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ height: "6px", background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span
                    className="w-28 text-right text-sm font-mono"
                    style={{ color: "var(--text-2)" }}
                  >
                    {cov.unit === "R$"
                      ? `R$ ${(cov.current / 1000).toFixed(1)}K`
                      : `${cov.current}${cov.unit}`}
                    {" / "}
                    {cov.unit === "R$"
                      ? `R$ ${(cov.limit / 1000).toFixed(0)}K`
                      : `${cov.limit}${cov.unit}`}
                  </span>
                </div>

                {/* Status badge */}
                <div className="w-16 text-right flex-shrink-0">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        cov.status === "ok"
                          ? "rgba(34,197,94,0.1)"
                          : cov.status === "warn"
                          ? "rgba(245,158,11,0.1)"
                          : "rgba(239,68,68,0.1)",
                      color,
                    }}
                  >
                    {cov.status.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cashflow + PDD side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Cashflow */}
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
                key={cf.period}
                className="rounded-2xl p-4"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: "var(--text-4)" }}
                >
                  {cf.period} window
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>
                      Inflow
                    </span>
                    <span
                      className="text-xs font-mono font-medium"
                      style={{ color: "var(--green)" }}
                    >
                      {cf.inflow}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>
                      Outflow
                    </span>
                    <span
                      className="text-xs font-mono font-medium"
                      style={{ color: "var(--red)" }}
                    >
                      {cf.outflow}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center pt-1.5"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-2)" }}
                    >
                      Net
                    </span>
                    <span
                      className="text-sm font-bold font-mono"
                      style={{ color: cf.positive ? "var(--green)" : "var(--red)" }}
                    >
                      {cf.net}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PDD Summary */}
        <section>
          <h2
            className="text-base font-semibold mb-3"
            style={{ color: "var(--text-1)" }}
          >
            PDD Summary
          </h2>
          <div
            className="rounded-2xl p-5 h-full"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Total */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Total provision
                </p>
                <p
                  className="text-2xl font-bold font-mono mt-0.5"
                  style={{ color: "var(--text-1)" }}
                >
                  R$ 20.33M
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  % of portfolio
                </p>
                <p
                  className="text-2xl font-bold font-mono mt-0.5"
                  style={{ color: "var(--amber)" }}
                >
                  2.8%
                </p>
              </div>
            </div>

            {/* Buckets */}
            <div className="flex flex-col gap-2.5">
              {PDD_BUCKETS.map((bucket) => {
                const max = PDD_BUCKETS[PDD_BUCKETS.length - 1].value;
                const pct = Math.round((bucket.value / max) * 100);
                return (
                  <div key={bucket.label} className="flex items-center gap-3">
                    <span
                      className="w-16 text-xs flex-shrink-0"
                      style={{ color: "var(--text-4)" }}
                    >
                      {bucket.label}
                    </span>
                    <div
                      className="flex-1 rounded-full overflow-hidden"
                      style={{ height: "6px", background: "var(--border)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            bucket.value >= 3
                              ? "var(--red)"
                              : bucket.value >= 1.5
                              ? "var(--amber)"
                              : "var(--blue)",
                        }}
                      />
                    </div>
                    <div className="w-28 flex justify-between items-center flex-shrink-0">
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--text-3)" }}
                      >
                        {bucket.amount}
                      </span>
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--text-4)" }}
                      >
                        {bucket.value}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <p
              className="mt-4 text-xs"
              style={{ color: "var(--text-4)", borderTop: "1px solid var(--border)", paddingTop: "12px" }}
            >
              Calculated by Pricing Agent · Last updated 14:32 UTC · Limit: 5% per covenant
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
