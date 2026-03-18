"use client";

// ── PDD Aging data ────────────────────────────────────────────────────────────
const pddAging = [
  {
    bucket: "0–30d",
    outstanding: 312_450_000,
    provisionRate: 0.5,
    color: "#00ff80",
    textColor: "var(--accent)",
  },
  {
    bucket: "31–60d",
    outstanding: 87_230_000,
    provisionRate: 3.0,
    color: "#39e07a",
    textColor: "#39e07a",
  },
  {
    bucket: "61–90d",
    outstanding: 42_180_000,
    provisionRate: 10.0,
    color: "#7dd45a",
    textColor: "#7dd45a",
  },
  {
    bucket: "91–120d",
    outstanding: 18_760_000,
    provisionRate: 30.0,
    color: "#f59e0b",
    textColor: "#f59e0b",
  },
  {
    bucket: "121–150d",
    outstanding: 9_340_000,
    provisionRate: 60.0,
    color: "#ef6820",
    textColor: "#ef6820",
  },
  {
    bucket: "151–180d",
    outstanding: 4_120_000,
    provisionRate: 80.0,
    color: "#e84040",
    textColor: "#e84040",
  },
  {
    bucket: ">180d",
    outstanding: 2_340_000,
    provisionRate: 100.0,
    color: "#ff2020",
    textColor: "#ff2020",
  },
];

const maxOutstanding = Math.max(...pddAging.map((r) => r.outstanding));

function fmtBRL(n: number): string {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}K`;
  return `R$ ${n}`;
}

// ── Sparkline SVG (30 day NAV) ────────────────────────────────────────────────
const sparkData = [
  820, 825, 822, 830, 835, 828, 833, 838, 834, 840,
  836, 842, 839, 844, 841, 847, 843, 848, 845, 850,
  847, 851, 849, 845, 848, 843, 847, 846, 847, 847,
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 100;
  const H = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }));

  const linePath = "M " + pts.map((p) => `${p.x},${p.y.toFixed(1)}`).join(" L ");
  const areaPath =
    linePath +
    ` L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 100, height: 32, display: "block" }}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#spark-grad-${color.replace(/[^a-z0-9]/gi, "")})`}
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r={2.5}
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  );
}

// ── Gauge (conic-gradient) ────────────────────────────────────────────────────
function Gauge({
  label,
  value,
  displayValue,
  threshold,
  displayThreshold,
  unit,
  color,
  status,
}: {
  label: string;
  value: number; // 0-1
  displayValue: string;
  threshold: number; // 0-1
  displayThreshold: string;
  unit: string;
  color: string;
  status: "green" | "warn" | "red";
}) {
  const deg = Math.round(value * 270); // 270° sweep
  const threshDeg = Math.round(threshold * 270);
  const startAngle = 135; // starts at bottom-left

  const statusColors = {
    green: "var(--accent)",
    warn: "#f59e0b",
    red: "#ef4444",
  };
  const gColor = statusColors[status];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Gauge circle */}
      <div style={{ position: "relative", width: 120, height: 120 }}>
        {/* Track */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from ${startAngle}deg, var(--border) 0deg, var(--border) 270deg, transparent 270deg)`,
          }}
        />
        {/* Fill */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from ${startAngle}deg, ${gColor} 0deg, ${gColor} ${deg}deg, transparent ${deg}deg)`,
            filter: `drop-shadow(0 0 6px ${gColor}60)`,
          }}
        />
        {/* Inner cutout */}
        <div
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: "50%",
            background: "var(--bg-card)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <div
            style={{
              color: gColor,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
              textShadow: `0 0 8px ${gColor}80`,
            }}
          >
            {displayValue}
          </div>
          <div
            style={{
              color: "var(--text-4)",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              textAlign: "center",
            }}
          >
            {unit}
          </div>
        </div>
        {/* Status dot */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: gColor,
            boxShadow: `0 0 6px ${gColor}`,
          }}
        />
      </div>

      <div className="text-center">
        <div style={{ color: "var(--text-2)", fontSize: 12, fontWeight: 600 }}>
          {label}
        </div>
        <div
          style={{
            color: "var(--text-4)",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            marginTop: 2,
          }}
        >
          threshold: {displayThreshold}
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            padding: "2px 8px",
            background: `${gColor}14`,
            color: gColor,
            border: `1px solid ${gColor}40`,
            borderRadius: "var(--radius)",
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
          }}
        >
          ✓ ABOVE LIMIT
        </div>
      </div>
    </div>
  );
}

// ── Recent operations ─────────────────────────────────────────────────────────
const recentOps = [
  {
    skill: "fidc:nav-calculator",
    agent: "Admin Agent",
    operation: "Calculate D+0 NAV",
    result: "R$ 847.3M",
    time: "14:18:32",
    color: "var(--accent)",
  },
  {
    skill: "fidc:cota-pricing",
    agent: "Pricing Agent",
    operation: "Price Cota Sênior",
    result: "R$ 1.2841",
    time: "14:18:28",
    color: "var(--accent)",
  },
  {
    skill: "fidc:cota-pricing",
    agent: "Pricing Agent",
    operation: "Price Cota Subordinada",
    result: "R$ 1.1027",
    time: "14:18:25",
    color: "var(--accent)",
  },
  {
    skill: "fidc:pdd-engine",
    agent: "Risk Agent",
    operation: "Run PDD aging pass",
    result: "R$ 3.12M provision",
    time: "14:17:44",
    color: "var(--cyan)",
  },
  {
    skill: "fidc:compliance-gates",
    agent: "Compliance",
    operation: "Validate covenant pack",
    result: "6/6 PASS",
    time: "14:17:30",
    color: "var(--cyan)",
  },
  {
    skill: "fidc:cedente-onboard",
    agent: "DD Agent",
    operation: "Onboard CNPJ 34.567.890",
    result: "APPROVED",
    time: "14:16:58",
    color: "var(--accent)",
  },
  {
    skill: "fidc:receivable-eval",
    agent: "Pricing Agent",
    operation: "Evaluate NF-e batch #4421",
    result: "R$ 2.34M accepted",
    time: "14:16:40",
    color: "var(--accent)",
  },
  {
    skill: "fidc:aml-screen",
    agent: "Compliance",
    operation: "PLD/AML screen sacado batch",
    result: "0 flags",
    time: "14:16:11",
    color: "var(--cyan)",
  },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FundPage() {
  return (
    <div
      className="min-h-screen p-4 md:p-6 space-y-6"
      style={{ background: "var(--bg)", fontFamily: "var(--font-display)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="tag-badge">FUND OPS</span>
            <span className="tag-badge-cyan">FIDC SKILL PACK</span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}
          >
            FIDC Operations
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>
            Skill pack in action — real-time fund management automation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="pulse-dot"
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
            }}
          />
          <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Skill Pack Header */}
      <div
        className="glass-card p-6"
        style={{
          borderRadius: "var(--radius)",
          background:
            "linear-gradient(135deg, rgba(0,255,128,0.05) 0%, rgba(0,0,0,0) 60%)",
          borderColor: "rgba(0,255,128,0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative orb */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,255,128,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                ACTIVE SKILL PACK
              </span>
            </div>
            <h2
              style={{
                color: "var(--text-1)",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: 6,
              }}
            >
              FIDC Operations Pack{" "}
              <span
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                }}
              >
                v1.4.2
              </span>
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="tag-badge">9 agents</span>
              <span className="tag-badge">6 guardrails</span>
              <span className="tag-badge">11 skills</span>
              <span className="tag-badge-cyan">marketplace</span>
            </div>
            <p
              style={{
                color: "var(--text-3)",
                fontSize: 12,
                maxWidth: 480,
                lineHeight: 1.6,
              }}
            >
              This is one of many possible packs. The platform extends via marketplace —
              plug in domain expertise for credit, insurance, real estate, or any structured
              finance vertical.
            </p>
          </div>

          {/* Skill pills */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 200,
            }}
          >
            {[
              "fidc:nav-calculator",
              "fidc:cota-pricing",
              "fidc:pdd-engine",
              "fidc:compliance-gates",
              "fidc:cedente-onboard",
              "fidc:receivable-eval",
              "fidc:aml-screen",
            ].map((skill) => (
              <div
                key={skill}
                style={{
                  background: "rgba(0,255,128,0.06)",
                  border: "1px solid rgba(0,255,128,0.15)",
                  borderRadius: "var(--radius)",
                  padding: "4px 10px",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent)",
                }}
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NAV Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total NAV */}
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <div
            style={{
              color: "var(--text-4)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Total NAV
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div
                style={{
                  color: "var(--text-1)",
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1,
                }}
              >
                R$ 847.3M
              </div>
              <div
                style={{
                  color: "var(--accent)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  marginTop: 4,
                }}
              >
                +2.3% MTD
              </div>
            </div>
            <Sparkline data={sparkData} color="var(--accent)" />
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="tag-badge">fidc:nav-calculator</span>
          </div>
        </div>

        {/* Cota Sênior */}
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <div
            style={{
              color: "var(--text-4)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Cota Sênior
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div
                style={{
                  color: "var(--text-1)",
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1,
                }}
              >
                R$ 1.2841
              </div>
              <div
                style={{
                  color: "var(--cyan)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  marginTop: 4,
                }}
              >
                +12.4% a.a.
              </div>
            </div>
            <Sparkline
              data={sparkData.map((v) => v * 0.00151)}
              color="var(--cyan)"
            />
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="tag-badge-cyan">fidc:cota-pricing</span>
          </div>
        </div>

        {/* Cota Subordinada */}
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <div
            style={{
              color: "var(--text-4)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Cota Subordinada
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div
                style={{
                  color: "var(--text-1)",
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1,
                }}
              >
                R$ 1.1027
              </div>
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  marginTop: 4,
                }}
              >
                +19.7% a.a.
              </div>
            </div>
            <Sparkline
              data={sparkData.map((v) => v * 0.00134)}
              color="#f59e0b"
            />
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="tag-badge">fidc:cota-pricing</span>
          </div>
        </div>
      </div>

      {/* PDD Aging Table */}
      <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              color: "var(--text-1)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            PDD Aging Provision
          </h2>
          <span className="tag-badge">fidc:pdd-engine</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Aging Bucket", "Outstanding", "Provision Rate", "Provision Amount", "Relative Size"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        textAlign: h === "Aging Bucket" ? "left" : "right",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {pddAging.map((row, i) => {
                const provision = row.outstanding * (row.provisionRate / 100);
                const barW = Math.round((row.outstanding / maxOutstanding) * 100);
                return (
                  <tr
                    key={row.bucket}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Bucket */}
                    <td style={{ padding: "10px 12px" }}>
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            display: "inline-block",
                            width: 3,
                            height: 14,
                            borderRadius: 1,
                            background: row.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            color: row.textColor,
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                          }}
                        >
                          {row.bucket}
                        </span>
                      </div>
                    </td>

                    {/* Outstanding */}
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: "var(--text-2)",
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {fmtBRL(row.outstanding)}
                    </td>

                    {/* Provision rate */}
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: row.textColor,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {row.provisionRate.toFixed(1)}%
                    </td>

                    {/* Provision amount */}
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: "var(--text-3)",
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {fmtBRL(provision)}
                    </td>

                    {/* SVG bar */}
                    <td style={{ padding: "10px 12px", minWidth: 120 }}>
                      <svg viewBox="0 0 100 12" style={{ width: 120, height: 12 }}>
                        <rect
                          x={0}
                          y={2}
                          width={barW}
                          height={8}
                          fill={row.color}
                          opacity={0.7}
                          rx={1}
                          style={{ filter: `drop-shadow(0 0 2px ${row.color}60)` }}
                        />
                        <rect
                          x={barW}
                          y={2}
                          width={100 - barW}
                          height={8}
                          fill="var(--border)"
                          rx={1}
                        />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals */}
            <tfoot>
              <tr style={{ borderTop: "1px solid rgba(0,255,128,0.2)" }}>
                <td
                  style={{
                    padding: "10px 12px",
                    color: "var(--text-1)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                  }}
                >
                  TOTAL
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    color: "var(--accent)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                  }}
                >
                  {fmtBRL(pddAging.reduce((s, r) => s + r.outstanding, 0))}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    color: "var(--text-3)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  —
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    color: "var(--accent)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                  }}
                >
                  {fmtBRL(
                    pddAging.reduce((s, r) => s + r.outstanding * (r.provisionRate / 100), 0)
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Covenant Gauges + Recent Ops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gauges */}
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2
              style={{
                color: "var(--text-1)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
              }}
            >
              Covenant Gauges
            </h2>
            <span className="tag-badge">fidc:compliance-gates</span>
          </div>

          <div className="flex justify-around flex-wrap gap-6">
            <Gauge
              label="Liquidity Ratio"
              value={2.8 / 5}
              displayValue="2.8x"
              threshold={1.5 / 5}
              displayThreshold="1.5x"
              unit="ratio"
              color="#00ff80"
              status="green"
            />
            <Gauge
              label="Subordination"
              value={28.5 / 50}
              displayValue="28.5%"
              threshold={25 / 50}
              displayThreshold="25%"
              unit="of NAV"
              color="#00ffff"
              status="green"
            />
            <Gauge
              label="Delinquency"
              value={(1 - 3.2 / 10)}
              displayValue="3.2%"
              threshold={(1 - 5 / 10)}
              displayThreshold="5%"
              unit="of portfolio"
              color="#00ff80"
              status="green"
            />
          </div>

          {/* All clear banner */}
          <div
            style={{
              marginTop: 20,
              padding: "10px 16px",
              background: "rgba(0,255,128,0.06)",
              border: "1px solid rgba(0,255,128,0.2)",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              ✓ All covenants within bounds
            </span>
            <span style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
              Last checked 14:18:32
            </span>
          </div>
        </div>

        {/* Recent Operations */}
        <div className="glass-card p-5" style={{ borderRadius: "var(--radius)" }}>
          <h2
            style={{
              color: "var(--text-1)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
              marginBottom: 16,
            }}
          >
            Recent Skill Executions
          </h2>

          <div className="space-y-2" style={{ maxHeight: 380, overflowY: "auto" }}>
            {recentOps.map((op, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "8px 12px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div className="flex flex-col gap-1">
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 6px",
                      background: `${op.color === "var(--cyan)" ? "rgba(0,255,255,0.08)" : "rgba(0,255,128,0.08)"}`,
                      color: op.color,
                      border: `1px solid ${op.color === "var(--cyan)" ? "rgba(0,255,255,0.25)" : "rgba(0,255,128,0.25)"}`,
                      borderRadius: "var(--radius)",
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {op.skill}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      color: "var(--text-2)",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {op.operation}
                  </div>
                  <div
                    style={{
                      color: "var(--text-4)",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      marginTop: 1,
                    }}
                  >
                    {op.agent}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      color: op.color,
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {op.result}
                  </div>
                  <div
                    style={{
                      color: "var(--text-4)",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      marginTop: 1,
                    }}
                  >
                    {op.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
