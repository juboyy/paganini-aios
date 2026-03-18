"use client";

const NAV_STATS = [
  { label: "TOTAL NAV", value: "R$ 245.8M", delta: "+1.2%", up: true },
  { label: "COTA SÊNIOR", value: "R$ 1.0234", delta: "+0.03%", up: true },
  { label: "COTA SUBORDINADA", value: "R$ 0.9876", delta: "-0.12%", up: false },
  { label: "SUBORDINATION RATIO", value: "28.5%", delta: "+0.3pp", up: true },
];

const PORTFOLIO_STATS = [
  { label: "TOTAL RECEIVABLES", value: "R$ 312.4M" },
  { label: "PDD PROVISION", value: "R$ 4.7M" },
  { label: "NET PORTFOLIO", value: "R$ 307.7M" },
];

const PDD_AGING = [
  { bucket: "0–30d", amount: "R$ 280.0M", rate: 1, pct: 90 },
  { bucket: "31–60d", amount: "R$ 18.2M", rate: 3, pct: 5.8 },
  { bucket: "61–90d", amount: "R$ 8.1M", rate: 10, pct: 2.6 },
  { bucket: "91–120d", amount: "R$ 3.8M", rate: 30, pct: 1.2 },
  { bucket: "121–150d", amount: "R$ 1.5M", rate: 50, pct: 0.5 },
  { bucket: "151–180d", amount: "R$ 0.6M", rate: 70, pct: 0.2 },
  { bucket: ">180d", amount: "R$ 0.2M", rate: 100, pct: 0.06 },
];

const RECENT_OPS = [
  { cedente: "Metalúrgica Bonfim SA", amount: "R$ 2.4M", rate: "12.3%", status: "APPROVED" },
  { cedente: "Distribuidora Norte Ltda", amount: "R$ 890K", rate: "11.8%", status: "APPROVED" },
  { cedente: "Frigorífico Sul Carne", amount: "R$ 1.1M", rate: "13.1%", status: "FLAGGED" },
  { cedente: "Têxtil Paraná Ind.", amount: "R$ 3.2M", rate: "12.0%", status: "APPROVED" },
  { cedente: "Agro Cerrado Export", amount: "R$ 670K", rate: "14.5%", status: "REJECTED" },
];

const COVENANTS = [
  { label: "LIQUIDITY RATIO", value: 1.12, min: 1.05, max: 2.0, unit: "x", display: "1.12x", threshold: "MIN 1.05x" },
  { label: "SUBORDINATION", value: 28.5, min: 20, max: 50, unit: "%", display: "28.5%", threshold: "MIN 20%" },
  { label: "DEFAULT RATE", value: 2.8, min: 0, max: 5, unit: "%", display: "2.8%", threshold: "MAX 5%", inverted: true },
];

function rateColor(rate: number) {
  if (rate <= 3) return "var(--accent)";
  if (rate <= 30) return "var(--amber)";
  return "var(--red)";
}

function statusBadge(status: string) {
  if (status === "APPROVED") return "tag-badge";
  if (status === "FLAGGED") return "tag-badge-cyan";
  return null;
}

function CovenantGauge({ cov }: { cov: typeof COVENANTS[0] }) {
  const pct = ((cov.value - cov.min) / (cov.max - cov.min)) * 100;
  const thresholdPct = cov.inverted
    ? ((cov.max - cov.min) / (cov.max - cov.min)) * 100
    : ((cov.min - cov.min) / (cov.max - cov.min)) * 100;
  const safe = cov.inverted ? cov.value <= cov.max * 0.7 : cov.value >= cov.min * 1.05;
  const color = safe ? "var(--accent)" : "var(--amber)";

  return (
    <div className="glass-card p-4" style={{ flex: 1 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 12 }}>
        {cov.label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", marginBottom: 4 }}>
        {cov.display}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: color, marginBottom: 12 }}>
        {cov.threshold}
      </div>
      {/* Bar gauge */}
      <div style={{ position: "relative", height: 6, background: "hsl(220 20% 10%)", borderRadius: 1, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${Math.min(pct, 100)}%`,
          background: color,
          borderRadius: 1,
          transition: "width 0.6s ease",
          boxShadow: `0 0 8px ${color}`,
        }} />
        {/* threshold line */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${cov.inverted ? 100 - ((cov.max * 0.7 - cov.min) / (cov.max - cov.min)) * 100 : ((cov.min - cov.min) / (cov.max - cov.min)) * 100}%`,
          width: 1,
          background: "var(--text-4)",
          opacity: 0.5,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)" }}>{cov.min}{cov.unit}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)" }}>{cov.max}{cov.unit}</span>
      </div>
    </div>
  );
}

export default function FundPage() {
  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <span className="pulse-dot" style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} />
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
            FUND OPS
          </h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginTop: 2 }}>
            FIDC PAGANINI · LIVE DATA · {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="tag-badge">OPERATIONAL</span>
        </div>
      </div>

      {/* NAV Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {NAV_STATS.map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: s.up ? "var(--accent)" : "var(--red)", marginTop: 6 }}>
              {s.delta} 24H
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio + Aging */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, marginBottom: 20 }}>
        {/* Portfolio Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PORTFOLIO_STATS.map((s) => (
            <div key={s.label} className="glass-card p-4" style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* PDD Aging Table */}
        <div className="glass-card p-4">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 16 }}>
            PDD AGING SCHEDULE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto auto", gap: "0 16px", alignItems: "center" }}>
            {/* Header */}
            {["BUCKET", "EXPOSURE", "% PORT.", "PDD RATE"].map((h) => (
              <div key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", letterSpacing: "0.12em", color: "var(--text-4)", paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                {h}
              </div>
            ))}
            {PDD_AGING.map((row) => {
              const barColor = rateColor(row.rate);
              return (
                <>
                  <div key={row.bucket + "-b"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-2)", paddingTop: 8 }}>
                    {row.bucket}
                  </div>
                  {/* Bar cell */}
                  <div key={row.bucket + "-bar"} style={{ paddingTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: "hsl(220 20% 10%)", borderRadius: 1, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${row.pct}%`, background: barColor, borderRadius: 1, boxShadow: `0 0 6px ${barColor}` }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-1)", minWidth: 60, textAlign: "right" }}>
                      {row.amount}
                    </span>
                  </div>
                  <div key={row.bucket + "-pct"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-3)", paddingTop: 8, textAlign: "right" }}>
                    {row.pct.toFixed(1)}%
                  </div>
                  <div key={row.bucket + "-rate"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: barColor, paddingTop: 8, textAlign: "right" }}>
                    {row.rate}%
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Operations */}
      <div className="glass-card p-4" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 16 }}>
          RECENT PURCHASE OPERATIONS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0 24px", alignItems: "center" }}>
          {["CEDENTE", "AMOUNT", "DISCOUNT RATE", "GUARDRAIL"].map((h) => (
            <div key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", letterSpacing: "0.12em", color: "var(--text-4)", paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
              {h}
            </div>
          ))}
          {RECENT_OPS.map((op) => {
            const badge = statusBadge(op.status);
            return (
              <>
                <div key={op.cedente + "-n"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-1)", paddingTop: 10 }}>
                  {op.cedente}
                </div>
                <div key={op.cedente + "-a"} style={{ fontFamily: "var(--font-display)", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", paddingTop: 10, textAlign: "right" }}>
                  {op.amount}
                </div>
                <div key={op.cedente + "-r"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--cyan)", paddingTop: 10, textAlign: "right" }}>
                  {op.rate}
                </div>
                <div key={op.cedente + "-s"} style={{ paddingTop: 10, textAlign: "right" }}>
                  {badge ? (
                    <span className={badge}>{op.status}</span>
                  ) : (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", letterSpacing: "0.08em", color: "var(--red)", border: "1px solid var(--red)", borderRadius: "var(--radius)", padding: "2px 6px" }}>
                      {op.status}
                    </span>
                  )}
                </div>
              </>
            );
          })}
        </div>
      </div>

      {/* Covenant Dashboard */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 12 }}>
          COVENANT DASHBOARD
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {COVENANTS.map((cov) => (
            <CovenantGauge key={cov.label} cov={cov} />
          ))}
        </div>
      </div>
    </div>
  );
}
