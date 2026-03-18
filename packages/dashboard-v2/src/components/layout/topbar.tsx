"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-6 shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-4)" }}>
          AI Operating System for Financial Markets
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Health indicator */}
        <div className="flex items-center gap-2">
          <span className="pulse-dot w-2 h-2 rounded-full inline-block" style={{ background: "var(--green)" }} />
          <span className="text-xs" style={{ color: "var(--green)" }}>healthy</span>
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
          >
            {theme === "dark" ? "☀ Light" : "◑ Dark"}
          </button>
        )}
      </div>
    </header>
  );
}
