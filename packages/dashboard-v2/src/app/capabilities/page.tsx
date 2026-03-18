"use client";

const TOP_STATS = [
  { label: "TOTAL SKILLS", value: "11", sub: "in lockfile", color: "var(--accent)" },
  { label: "ACTIVE AGENTS", value: "9", sub: "specialist instances", color: "var(--cyan)" },
  { label: "SKILL DEPS", value: "10", sub: "resolved edges", color: "var(--text-1)" },
  { label: "CONTEXT BUDGET", value: "3,138", sub: "tokens total", color: "var(--amber)" },
];

type SkillType = "abstract" | "orchestrator" | "specialist";

const SKILLS: {
  id: string;
  name: string;
  version: string;
  type: SkillType;
  tokens: number;
  deps: number;
  implements: string[];
}[] = [
  {
    id: "fidc-orchestrator",
    name: "fidc-orchestrator",
    version: "1.0.0",
    type: "orchestrator",
    tokens: 981,
    deps: 10,
    implements: ["orchestration", "routing", "coordination"],
  },
  {
    id: "compliance-agent",
    name: "compliance-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 736,
    deps: 1,
    implements: ["compliance-check", "regulatory-validation"],
  },
  {
    id: "pricing-agent",
    name: "pricing-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 147,
    deps: 1,
    implements: ["nav-calculation", "mark-to-market"],
  },
  {
    id: "admin-agent",
    name: "admin-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 145,
    deps: 1,
    implements: ["fund-admin", "investor-registry"],
  },
  {
    id: "due-diligence-agent",
    name: "due-diligence-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 148,
    deps: 1,
    implements: ["credit-analysis", "originator-review"],
  },
  {
    id: "custody-agent",
    name: "custody-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 145,
    deps: 1,
    implements: ["asset-custody", "settlement"],
  },
  {
    id: "risk-agent",
    name: "risk-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 144,
    deps: 1,
    implements: ["risk-metrics", "var-calculation"],
  },
  {
    id: "reporting-agent",
    name: "reporting-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 150,
    deps: 1,
    implements: ["report-generation", "cvm-reporting"],
  },
  {
    id: "ir-agent",
    name: "ir-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 151,
    deps: 1,
    implements: ["investor-relations", "quota-holder-comms"],
  },
  {
    id: "regwatch-agent",
    name: "regwatch-agent",
    version: "1.0.0",
    type: "specialist",
    tokens: 150,
    deps: 1,
    implements: ["regulatory-monitoring", "normative-watch"],
  },
  {
    id: "fidc-rules-base",
    name: "fidc-rules-base",
    version: "1.0.0",
    type: "abstract",
    tokens: 241,
    deps: 0,
    implements: ["base-rules", "fidc-core"],
  },
];

const SPECIALISTS = SKILLS.filter((s) => s.type === "specialist");
const ORCHESTRATOR = SKILLS.find((s) => s.type === "orchestrator")!;
const BASE = SKILLS.find((s) => s.type === "abstract")!;

const TYPE_COLOR: Record<SkillType, string> = {
  abstract: "var(--amber)",
  orchestrator: "var(--accent)",
  specialist: "var(--cyan)",
};

const LABEL_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.5625rem",
  letterSpacing: "0.12em",
  color: "var(--text-4)",
  textTransform: "uppercase" as const,
};

const VALUE_STYLE = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--text-1)",
  letterSpacing: "-0.02em",
};

const SECTION_TITLE = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.625rem",
  letterSpacing: "0.15em",
  color: "var(--text-4)",
  textTransform: "uppercase" as const,
  marginBottom: "0.75rem",
};

function SkillCard({ skill, highlight }: { skill: typeof SKILLS[0]; highlight?: boolean }) {
  const typeColor = TYPE_COLOR[skill.type];
  return (
    <div style={{
      background: "hsl(220 20% 4% / 0.5)",
      border: `1px solid ${highlight ? typeColor : "var(--border-subtle)"}`,
      borderRadius: "var(--radius)",
      padding: "0.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-2)", letterSpacing: "0.04em" }}>{skill.name}</div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", letterSpacing: "0.08em" }}>v{skill.version}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span
          className={skill.type === "specialist" ? "tag-badge-cyan" : "tag-badge"}
          style={{ color: typeColor, borderColor: typeColor }}
        >
          {skill.type}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <div>
          <div style={LABEL_STYLE}>TOKENS</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: typeColor, letterSpacing: "-0.02em" }}>{skill.tokens}</div>
        </div>
        <div>
          <div style={LABEL_STYLE}>DEPS</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--text-2)", letterSpacing: "-0.02em" }}>{skill.deps}</div>
        </div>
      </div>

      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: "0.3rem" }}>IMPLEMENTS</div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.25rem" }}>
          {skill.implements.map((imp) => (
            <span key={imp} style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.4375rem",
              color: "var(--text-4)",
              background: "hsl(220 20% 8%)",
              padding: "0.15rem 0.4rem",
              borderRadius: "var(--radius)",
              letterSpacing: "0.05em",
            }}>
              {imp}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CapabilitiesPage() {
  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
          CAPABILITIES
        </h1>
        <span style={{ ...LABEL_STYLE, fontSize: "0.5rem" }}>SKILLS REGISTRY &amp; DEPENDENCY GRAPH</span>
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {TOP_STATS.map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div style={LABEL_STYLE}>{s.label}</div>
            <div style={{ ...VALUE_STYLE, color: s.color, marginTop: "0.25rem" }}>{s.value}</div>
            <div style={{ ...LABEL_STYLE, marginTop: "0.25rem", fontSize: "0.5rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Dependency tree */}
      <div className="glass-card p-4">
        <div style={SECTION_TITLE}>SKILL DEPENDENCY TREE</div>

        {/* Orchestrator */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <div style={{
            background: "hsl(220 20% 4% / 0.8)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius)",
            padding: "0.5rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.2rem",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)", letterSpacing: "0.08em" }}>{ORCHESTRATOR.name}</div>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span className="tag-badge">orchestrator</span>
              <span style={{ ...LABEL_STYLE, fontSize: "0.4375rem" }}>{ORCHESTRATOR.tokens} tokens</span>
            </div>
          </div>
        </div>

        {/* Connector line down */}
        <div style={{ display: "flex", justifyContent: "center", height: "1.5rem", position: "relative" }}>
          <div style={{ width: "1px", height: "100%", background: "var(--border-subtle)" }} />
        </div>

        {/* Connector bar across specialists */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: "0rem" }}>
          <div style={{ width: "calc(100% - 4rem)", height: "1px", background: "var(--border-subtle)", position: "absolute", top: 0 }} />
        </div>

        {/* Drop lines + specialists */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "0.4rem", position: "relative" }}>
          {/* Top connector lines */}
          {SPECIALISTS.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "center", height: "1.25rem" }}>
              <div style={{ width: "1px", height: "100%", background: "var(--border-subtle)" }} />
            </div>
          ))}
        </div>

        {/* Specialist cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "0.4rem" }}>
          {SPECIALISTS.map((s) => (
            <div key={s.id} style={{
              background: "hsl(220 20% 4% / 0.5)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius)",
              padding: "0.5rem 0.4rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.3rem",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.4375rem",
                color: "var(--cyan)",
                letterSpacing: "0.04em",
                textAlign: "center",
              }}>
                {s.name.replace("-agent", "")}
              </div>
              <span className="tag-badge-cyan" style={{ fontSize: "0.375rem" }}>specialist</span>
              <div style={{ ...LABEL_STYLE, fontSize: "0.4375rem" }}>{s.tokens}t</div>
            </div>
          ))}
        </div>

        {/* Lines down to base */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "0.4rem" }}>
          {SPECIALISTS.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "center", height: "1.25rem" }}>
              <div style={{ width: "1px", height: "100%", background: "var(--border-subtle)" }} />
            </div>
          ))}
        </div>

        {/* Base bar */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: "0rem" }}>
          <div style={{ width: "calc(100% - 4rem)", height: "1px", background: "var(--border-subtle)", position: "absolute", top: 0 }} />
        </div>

        {/* Line to base */}
        <div style={{ display: "flex", justifyContent: "center", height: "1.25rem" }}>
          <div style={{ width: "1px", height: "100%", background: "var(--border-subtle)" }} />
        </div>

        {/* Base */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            background: "hsl(220 20% 4% / 0.8)",
            border: "1px solid var(--amber)",
            borderRadius: "var(--radius)",
            padding: "0.5rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.2rem",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--amber)", letterSpacing: "0.08em" }}>{BASE.name}</div>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span className="tag-badge" style={{ color: "var(--amber)" }}>abstract</span>
              <span style={{ ...LABEL_STYLE, fontSize: "0.4375rem" }}>{BASE.tokens} tokens</span>
            </div>
          </div>
        </div>
      </div>

      {/* All skill cards */}
      <div className="glass-card p-4">
        <div style={SECTION_TITLE}>SKILL REGISTRY — ALL ENTRIES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          {SKILLS.map((s) => (
            <SkillCard key={s.id} skill={s} highlight={s.type === "orchestrator" || s.type === "abstract"} />
          ))}
        </div>
      </div>

      {/* Validation footer */}
      <div className="glass-card p-4">
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="pulse-dot" style={{ background: "var(--accent)" }} />
            <div>
              <div style={LABEL_STYLE}>SKILL VALIDATION</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)", marginTop: "0.2rem" }}>All 11 skills valid ✓</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="pulse-dot" style={{ background: "var(--accent)" }} />
            <div>
              <div style={LABEL_STYLE}>LOCKFILE INTEGRITY</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--accent)", marginTop: "0.2rem" }}>SHA256 verified ✓</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div>
              <div style={LABEL_STYLE}>LOCKFILE HASH</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.4375rem", color: "var(--text-4)", marginTop: "0.2rem", letterSpacing: "0.04em" }}>
                sha256:a4f8c2e1b9d3f7a0c5e2b8d4f1a6c3e9b7d2f5a1c8e4b0d7f3a9c6e2b5d8f4a1
              </div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <span className="tag-badge">dependencies resolved</span>
            <span className="tag-badge-cyan">no conflicts</span>
          </div>
        </div>
      </div>

    </div>
  );
}
