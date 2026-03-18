"use client";

export function Topbar() {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6"
      style={{
        height: "48px",
        background: "hsl(220 20% 4% / 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left spacer for mobile hamburger */}
      <div className="w-10 lg:hidden" />

      {/* Status line */}
      <div className="flex items-center gap-3" style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", color: "var(--text-4)", letterSpacing: "0.1em" }}>
        <span>PAGANINI AIOS</span>
        <span style={{ color: "var(--border)" }}>│</span>
        <span style={{ color: "var(--text-3)" }}>PLATAFORMA DE AGENTES AUTÔNOMOS DE CÓDIGO</span>
      </div>

      {/* Right indicators */}
      <div className="flex items-center gap-4" style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem" }}>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="tag-badge">12 AGENTES DE CÓDIGO</span>
          <span className="tag-badge-cyan">52 CAPACIDADES</span>
          <span className="tag-badge" style={{ background: "hsl(45 100% 50% / 0.08)", color: "hsl(45 100% 50%)", borderColor: "hsl(45 100% 50% / 0.25)" }}>6 GATES</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
          <span
            className="pulse-dot"
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent)",
              display: "inline-block",
            }}
          />
          <span style={{ letterSpacing: "0.1em" }}>LIVE</span>
        </div>
      </div>
    </header>
  );
}
