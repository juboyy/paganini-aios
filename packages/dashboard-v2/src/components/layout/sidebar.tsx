"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "OVERVIEW", icon: "◆" },
  { href: "/agents", label: "AGENTS", icon: "◎" },
  { href: "/guardrails", label: "GUARDRAILS", icon: "⬡" },
  { href: "/memory", label: "MEMORY", icon: "◈" },
  { href: "/fund", label: "FUND OPS", icon: "▣" },
  { href: "/pipeline", label: "PIPELINE", icon: "◇" },
  { href: "/symphony", label: "SYMPHONY", icon: "≋" },
  { href: "/telemetry", label: "TELEMETRY", icon: "△" },
  { href: "/capabilities", label: "CAPABILITIES", icon: "⊞" },
  { href: "/settings", label: "SETTINGS", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 flex items-center justify-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--accent)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.875rem",
        }}
        aria-label="Toggle menu"
      >
        {open ? "✕" : "≡"}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: "200px",
          background: "var(--bg-card)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-4 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span style={{ fontSize: "1.25rem" }}>🎻</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              PAGANINI
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", color: "var(--text-3)", letterSpacing: "0.12em" }}>
              AIOS v0.1.0
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 mb-0.5 transition-all duration-150"
                style={{
                  borderRadius: "var(--radius)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.08em",
                  color: active ? "var(--accent)" : "var(--text-3)",
                  background: active ? "var(--accent-bg)" : "transparent",
                  borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  textShadow: active ? "0 0 10px hsl(150 100% 50% / 0.3)" : "none",
                }}
              >
                <span style={{ fontSize: "0.625rem", opacity: active ? 1 : 0.5 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{
            borderTop: "1px solid var(--border)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            color: "var(--text-4)",
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
              display: "inline-block",
            }}
          />
          SYSTEM ONLINE
        </div>
      </aside>
    </>
  );
}
