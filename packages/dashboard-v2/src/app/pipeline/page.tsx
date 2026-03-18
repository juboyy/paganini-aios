"use client";

const PIPELINE_STAGES = [
  { id: "ingest", label: "INGEST", queue: 12, avgTime: "0.3 min", successRate: 99.1 },
  { id: "process", label: "PROCESS", queue: 7, avgTime: "0.8 min", successRate: 97.4 },
  { id: "guardrails", label: "GUARDRAILS", queue: 4, avgTime: "1.2 min", successRate: 94.6 },
  { id: "approve", label: "APPROVE", queue: 3, avgTime: "1.5 min", successRate: 97.2 },
  { id: "settle", label: "SETTLE", queue: 1, avgTime: "0.4 min", successRate: 99.8 },
];

const PIPELINE_ITEMS = [
  { id: "OP-0481", cedente: "Metalúrgica Bonfim SA", amount: "R$ 2.4M", stage: "guardrails", entryTime: "12:34", elapsed: "1.2 min" },
  { id: "OP-0482", cedente: "Distribuidora Norte Ltda", amount: "R$ 890K", stage: "approve", entryTime: "12:36", elapsed: "0.8 min" },
  { id: "OP-0483", cedente: "Frigorífico Sul Carne", amount: "R$ 1.1M", stage: "process", entryTime: "12:41", elapsed: "0.3 min" },
  { id: "OP-0484", cedente: "Têxtil Paraná Ind.", amount: "R$ 3.2M", stage: "guardrails", entryTime: "12:42", elapsed: "0.5 min" },
  { id: "OP-0485", cedente: "Agro Cerrado Export", amount: "R$ 670K", stage: "ingest", entryTime: "12:44", elapsed: "0.1 min" },
  { id: "OP-0486", cedente: "Logística Brasília SA", amount: "R$ 1.8M", stage: "settle", entryTime: "12:30", elapsed: "3.9 min" },
  { id: "OP-0487", cedente: "Químicos do Nordeste", amount: "R$ 540K", stage: "process", entryTime: "12:43", elapsed: "0.2 min" },
  { id: "OP-0488", cedente: "Pharma Capital Ltda", amount: "R$ 2.1M", stage: "approve", entryTime: "12:38", elapsed: "0.6 min" },
];

const METRICS = [
  { label: "PROCESSED TODAY", value: "47", unit: "ops" },
  { label: "AVG END-TO-END", value: "4.2", unit: "min" },
  { label: "REJECTION RATE", value: "2.8", unit: "%" },
  { label: "AUTO-APPROVED", value: "89", unit: "%" },
];

// Throughput bars — hourly ops count (last 12h)
const THROUGHPUT = [3, 5, 4, 7, 6, 8, 9, 7, 5, 4, 6, 8];
const THROUGHPUT_LABELS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const STAGE_ORDER = ["ingest", "process", "guardrails", "approve", "settle"];

function stageIndex(stage: string) {
  return STAGE_ORDER.indexOf(stage);
}

function stageColor(stage: string) {
  const idx = stageIndex(stage);
  if (idx <= 1) return "var(--cyan)";
  if (idx === 2) return "var(--amber)";
  return "var(--accent)";
}

export default function PipelinePage() {
  const maxThroughput = Math.max(...THROUGHPUT);

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <span className="pulse-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
            PIPELINE
          </h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginTop: 2 }}>
            OPERATIONS FLOW · REAL-TIME
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span className="tag-badge-cyan">LIVE</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-4)" }}>
            {PIPELINE_ITEMS.length} ITEMS IN FLIGHT
          </span>
        </div>
      </div>

      {/* Visual Pipeline */}
      <div className="glass-card p-4" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 16 }}>
          PIPELINE STAGES
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              {/* Stage block */}
              <div style={{
                flex: 1,
                background: "hsl(220 20% 4% / 0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius)",
                padding: "12px 14px",
                position: "relative",
              }}>
                {/* Queue bubble */}
                <div style={{
                  position: "absolute",
                  top: -8, right: 8,
                  background: "var(--accent)",
                  color: "hsl(220 20% 4%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.45rem",
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: "1px 5px",
                  boxShadow: "0 0 6px var(--accent)",
                }}>
                  {stage.queue}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 8 }}>
                  {stage.label}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", marginBottom: 6 }}>
                  {stage.avgTime}
                </div>
                {/* Success rate bar */}
                <div style={{ height: 3, background: "hsl(220 20% 10%)", borderRadius: 1, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{
                    height: "100%",
                    width: `${stage.successRate}%`,
                    background: stage.successRate > 97 ? "var(--accent)" : "var(--amber)",
                    boxShadow: `0 0 4px ${stage.successRate > 97 ? "var(--accent)" : "var(--amber)"}`,
                  }} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)" }}>
                  {stage.successRate}% OK
                </div>
              </div>

              {/* Arrow connector */}
              {i < PIPELINE_STAGES.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 4px", color: "var(--border-subtle)", fontSize: "0.75rem" }}>
                  <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                    <path d="M0 6H16M16 6L10 1M16 6L10 11" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {METRICS.map((m) => (
          <div key={m.label} className="glass-card p-4">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 8 }}>
              {m.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                {m.value}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-4)" }}>
                {m.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Items in flight */}
      <div className="glass-card p-4" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)", marginBottom: 16 }}>
          ITEMS IN FLIGHT
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "70px 1fr auto auto auto", gap: "0 20px", alignItems: "center" }}>
          {["ID", "CEDENTE", "AMOUNT", "STAGE", "ELAPSED"].map((h) => (
            <div key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", letterSpacing: "0.12em", color: "var(--text-4)", paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
              {h}
            </div>
          ))}
          {PIPELINE_ITEMS.map((item) => {
            const color = stageColor(item.stage);
            const stageIdx = stageIndex(item.stage);
            return (
              <>
                <div key={item.id + "-id"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--cyan)", paddingTop: 10 }}>
                  {item.id}
                </div>
                <div key={item.id + "-c"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-1)", paddingTop: 10 }}>
                  {item.cedente}
                </div>
                <div key={item.id + "-a"} style={{ fontFamily: "var(--font-display)", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", paddingTop: 10, textAlign: "right" }}>
                  {item.amount}
                </div>
                {/* Stage pip track */}
                <div key={item.id + "-s"} style={{ paddingTop: 10, display: "flex", alignItems: "center", gap: 3 }}>
                  {STAGE_ORDER.map((s, i) => (
                    <div key={s} style={{
                      width: i === stageIdx ? 14 : 6,
                      height: 6,
                      borderRadius: 1,
                      background: i < stageIdx ? "var(--accent)" : i === stageIdx ? color : "hsl(220 20% 10%)",
                      boxShadow: i === stageIdx ? `0 0 5px ${color}` : "none",
                      transition: "all 0.3s",
                    }} />
                  ))}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: color, marginLeft: 4 }}>
                    {item.stage.toUpperCase()}
                  </span>
                </div>
                <div key={item.id + "-e"} style={{ fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--text-3)", paddingTop: 10, textAlign: "right" }}>
                  {item.elapsed}
                </div>
              </>
            );
          })}
        </div>
      </div>

      {/* Throughput chart */}
      <div className="glass-card p-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.12em", color: "var(--text-4)" }}>
            THROUGHPUT — LAST 12H
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--text-4)" }}>ops/h</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
          {THROUGHPUT.map((v, i) => {
            const barH = (v / maxThroughput) * 100;
            const isLast = i === THROUGHPUT.length - 1;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{
                    width: "100%",
                    height: `${barH}%`,
                    background: isLast ? "var(--accent)" : "var(--cyan)",
                    borderRadius: "var(--radius)",
                    opacity: isLast ? 1 : 0.5 + (i / THROUGHPUT.length) * 0.5,
                    boxShadow: isLast ? "0 0 8px var(--accent)" : "none",
                    transition: "height 0.4s ease",
                    position: "relative",
                  }}>
                    {isLast && (
                      <div style={{
                        position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                        fontFamily: "var(--font-mono)", fontSize: "0.45rem", color: "var(--accent)",
                      }}>{v}</div>
                    )}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.4rem", color: "var(--text-4)" }}>{THROUGHPUT_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
