"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PRODUTO_NAV = [
  { href: "/overview",      label: "VISÃO GERAL",  icon: "◉" },
  { href: "/",              label: "CENTRAL",       icon: "⬡" },
  { href: "/agents",        label: "AGENTES",       icon: "◎" },
  { href: "/onboard",       label: "ONBOARDING",    icon: "⊙" },
  { href: "/guardrails",    label: "GUARDRAILS",    icon: "⛊" },
  { href: "/reports",       label: "RELATÓRIOS",    icon: "⊡" },
  { href: "/memory",        label: "CONHECIMENTO",  icon: "◈" },
  { href: "/capabilities",  label: "SKILLS",        icon: "⊞" },
  { href: "/fund",          label: "PACK FIDC",     icon: "▣" },
];

const PLATAFORMA_NAV = [
  { href: "/sprint",        label: "SPRINT",        icon: "▷" },
  { href: "/pipeline",      label: "EXECUÇÃO",      icon: "▷" },
  { href: "/symphony",      label: "ORQUESTRA",     icon: "≋" },
  { href: "/telemetry",     label: "TELEMETRIA",    icon: "△" },
  { href: "/integrations",  label: "INTEGRAÇÕES",   icon: "⊕" },
  { href: "/learning",      label: "APRENDIZADO",   icon: "🧠" },
  { href: "/settings",      label: "CONFIGURAÇÃO",  icon: "⚙" },
];

function NavItem({ item, onClick }: { item: { href: string; label: string; icon: string }; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onClick}
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
      <span style={{ fontSize: "0.625rem", opacity: active ? 1 : 0.5 }}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function Sidebar() {
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
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.8125rem",
                color: "var(--text-1)",
                letterSpacing: "-0.02em",
              }}
            >
              PAGANINI
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.5rem",
                color: "var(--accent)",
                letterSpacing: "0.14em",
              }}
            >
              AI OPERATING SYSTEM
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">

          {/* Group 1: PRODUTO */}
          <div
            className="px-3 pt-3 pb-1"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.5rem",
              letterSpacing: "0.16em",
              color: "var(--accent)",
              opacity: 0.7,
            }}
          >
            PRODUTO
          </div>
          {PRODUTO_NAV.map((item) => (
            <NavItem key={item.href} item={item} onClick={() => setOpen(false)} />
          ))}

          {/* Divider */}
          <div
            style={{
              margin: "0.75rem 0.75rem 0",
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--border), transparent)",
            }}
          />

          {/* Group 2: PLATAFORMA */}
          <div
            className="px-3 pt-3 pb-1"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.5rem",
              letterSpacing: "0.16em",
              color: "var(--text-4)",
            }}
          >
            PLATAFORMA
          </div>
          {PLATAFORMA_NAV.map((item) => (
            <NavItem key={item.href} item={item} onClick={() => setOpen(false)} />
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.5625rem",
              color: "var(--text-4)",
            }}
          >
            <span
              className="pulse-dot"
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent)",
                display: "inline-block",
              }}
            />
            KERNEL ONLINE
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.5rem",
              color: "var(--text-4)",
              marginTop: "4px",
              opacity: 0.6,
            }}
          >
            12 AGENTES • 52 CAPS • 6 GATES
          </div>
        </div>
      </aside>
    </>
  );
}
