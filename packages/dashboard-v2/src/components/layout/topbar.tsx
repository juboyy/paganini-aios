"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-4 lg:px-6 shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      {/* Spacer for mobile hamburger */}
      <div className="w-10 lg:hidden" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.15em] hidden sm:block" style={{ color: "var(--text-4)" }}>
          AI Operating System for Financial Markets
        </span>
        <span className="text-[10px] uppercase tracking-[0.15em] sm:hidden" style={{ color: "var(--text-4)" }}>
          PAGANINI AIOS
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="pulse-dot w-2 h-2 rounded-full" style={{ background: "var(--green)" }} />
          <span className="text-[10px] hidden sm:inline" style={{ color: "var(--green)" }}>healthy</span>
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors active:scale-95"
            style={{ border: "1px solid var(--border)", color: "var(--text-3)" }}
          >
            {theme === "dark" ? "☀" : "◑"}
          </button>
        )}
      </div>
    </header>
  );
}
