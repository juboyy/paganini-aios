"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "📊", label: "Overview" },
  { href: "/agents", icon: "🤖", label: "Agents" },
  { href: "/memory", icon: "🧠", label: "Memory" },
  { href: "/guardrails", icon: "🛡", label: "Guardrails" },
  { href: "/pipeline", icon: "📈", label: "Pipeline" },
  { href: "/symphony", icon: "🎵", label: "Symphony" },
  { href: "/fund", icon: "💰", label: "Fund Ops" },
  { href: "/telemetry", icon: "📊", label: "Telemetry" },
  { href: "/capabilities", icon: "⚡", label: "Capabilities" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r flex flex-col shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>🎵 PAGANINI</span>
        </Link>
        <div className="text-[10px] mt-1 uppercase tracking-widest" style={{ color: "var(--text-4)" }}>AIOS v2.0</div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: isActive ? "var(--accent-bg)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-3)",
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t text-[10px] space-y-1" style={{ borderColor: "var(--border)", color: "var(--text-4)" }}>
        <div>v2.0.0 · 19 agents</div>
        <div>ROI: 701.2h saved</div>
      </div>
    </aside>
  );
}
