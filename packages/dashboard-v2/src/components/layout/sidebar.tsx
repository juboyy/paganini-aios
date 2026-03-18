"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", icon: "📊", label: "Overview" },
  { href: "/agents", icon: "🤖", label: "Agents" },
  { href: "/memory", icon: "🧠", label: "Memory" },
  { href: "/guardrails", icon: "🛡", label: "Guardrails" },
  { href: "/pipeline", icon: "⚡", label: "Pipeline" },
  { href: "/symphony", icon: "🎵", label: "Symphony" },
  { href: "/fund", icon: "💰", label: "Fund Ops" },
  { href: "/telemetry", icon: "📈", label: "Telemetry" },
  { href: "/capabilities", icon: "🔌", label: "Capabilities" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 w-10 h-10 rounded-xl flex items-center justify-center lg:hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        aria-label="Toggle menu"
      >
        <span className="text-lg">{open ? "✕" : "☰"}</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen w-64 lg:w-56
          border-r flex flex-col shrink-0
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="text-2xl">🎻</span>
            <div>
              <div className="text-base font-bold tracking-tight" style={{ color: "var(--accent)" }}>PAGANINI</div>
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-4)" }}>AIOS v2.0</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]"
                style={{
                  background: isActive ? "var(--accent-bg)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-3)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span className="text-lg w-7 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="pulse-dot w-2 h-2 rounded-full" style={{ background: "var(--green)" }} />
            <span className="text-[10px]" style={{ color: "var(--green)" }}>System healthy</span>
          </div>
          <div className="text-[9px] space-y-0.5" style={{ color: "var(--text-4)" }}>
            <div>19 agents · 16 online</div>
            <div>701.2h saved · $0.09/h</div>
          </div>
        </div>
      </aside>
    </>
  );
}
