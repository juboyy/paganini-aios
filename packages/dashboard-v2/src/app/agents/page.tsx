"use client";

import { useState } from "react";
import { AGENTS } from "@/lib/mock-data";

type FilterType = "all" | "FIDC" | "AIOS" | "Tier-2";

const FILTERS: FilterType[] = ["all", "FIDC", "AIOS", "Tier-2"];

const STATUS_COLOR: Record<string, string> = {
  online: "var(--green)",
  working: "var(--blue)",
  idle: "var(--amber)",
  offline: "var(--red)",
};

const STATUS_BG: Record<string, string> = {
  online: "rgba(34,197,94,0.12)",
  working: "rgba(59,130,246,0.12)",
  idle: "rgba(234,179,8,0.12)",
  offline: "rgba(239,68,68,0.12)",
};

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  working: "Working",
  idle: "Idle",
  offline: "Offline",
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  FIDC: { bg: "var(--accent-bg)", color: "var(--accent)" },
  AIOS: { bg: "rgba(20,184,166,0.12)", color: "var(--teal)" },
  "Tier-2": { bg: "rgba(234,179,8,0.12)", color: "var(--amber)" },
};

const MAX_TOKENS = Math.max(...AGENTS.map((a) => a.tokens24h));

export default function AgentsPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? AGENTS : AGENTS.filter((a) => a.type === filter);

  const counts: Record<FilterType, number> = {
    all: AGENTS.length,
    FIDC: AGENTS.filter((a) => a.type === "FIDC").length,
    AIOS: AGENTS.filter((a) => a.type === "AIOS").length,
    "Tier-2": AGENTS.filter((a) => a.type === "Tier-2").length,
  };

  const onlineCount = AGENTS.filter((a) => a.status === "online" || a.status === "working").length;
  const idleCount = AGENTS.filter((a) => a.status === "idle").length;
  const totalCost = AGENTS.reduce((s, a) => s + a.cost24h, 0).toFixed(2);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          Agent Fleet
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-3)" }}>
          {onlineCount} of {AGENTS.length} active
        </p>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex items-center gap-1.5 rounded-2xl transition-all duration-200 active:scale-[0.98]"
              style={{
                padding: "8px 16px",
                minHeight: 44,
                fontSize: 13,
                fontWeight: 600,
                background: active ? "var(--accent)" : "var(--bg-card)",
                color: active ? "#fff" : "var(--text-3)",
                border: active ? "none" : "1px solid var(--border)",
                boxShadow: active ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                cursor: "pointer",
              }}
            >
              {f === "all" ? "All" : f}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: active ? "rgba(255,255,255,0.2)" : "var(--accent-bg)",
                  color: active ? "#fff" : "var(--accent)",
                }}
              >
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((agent) => {
          const tokenPct = Math.round((agent.tokens24h / MAX_TOKENS) * 100);
          const barColor =
            tokenPct > 70
              ? "var(--accent)"
              : tokenPct > 40
              ? "var(--blue)"
              : "var(--teal)";
          const typeStyle = TYPE_STYLE[agent.type] ?? TYPE_STYLE.FIDC;
          const isWorking = agent.status === "working";

          return (
            <div
              key={agent.slug}
              className="rounded-2xl flex flex-col gap-3 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                padding: "18px 18px 14px",
              }}
            >
              {/* Top row: icon + name/role + type badge */}
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{
                    width: 48,
                    height: 48,
                    fontSize: 22,
                    background: typeStyle.bg,
                    border: `1px solid ${typeStyle.color}30`,
                  }}
                >
                  {agent.icon}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold leading-tight truncate"
                    style={{ fontSize: 15, color: "var(--text-1)" }}
                  >
                    {agent.name}
                  </p>
                  <p
                    className="text-[13px] mt-0.5 truncate"
                    style={{ color: "var(--text-3)" }}
                  >
                    {agent.role}
                  </p>
                </div>

                {/* Type badge */}
                <span
                  className="rounded-xl flex-shrink-0 font-bold text-[9px] uppercase tracking-[0.15em]"
                  style={{
                    padding: "4px 8px",
                    background: typeStyle.bg,
                    color: typeStyle.color,
                    border: `1px solid ${typeStyle.color}30`,
                  }}
                >
                  {agent.type}
                </span>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-2">
                {/* Status dot */}
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isWorking ? "pulse-dot" : ""}`}
                  style={{ background: STATUS_COLOR[agent.status] }}
                />
                <span
                  className="rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] font-bold"
                  style={{
                    background: STATUS_BG[agent.status],
                    color: STATUS_COLOR[agent.status],
                  }}
                >
                  {STATUS_LABEL[agent.status]}
                </span>
                {/* Last action */}
                <span
                  className="text-[13px] truncate"
                  style={{ color: "var(--text-4)", marginLeft: "auto", maxWidth: 120 }}
                >
                  {agent.lastAction}
                </span>
              </div>

              {/* Token bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[9px] uppercase tracking-[0.15em] font-semibold"
                    style={{ color: "var(--text-4)" }}
                  >
                    Tokens 24h
                  </span>
                  <span
                    className="text-[13px] font-mono font-semibold"
                    style={{ color: "var(--text-3)" }}
                  >
                    {agent.tokens24h >= 1000
                      ? `${(agent.tokens24h / 1000).toFixed(1)}k`
                      : agent.tokens24h}
                  </span>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{ height: 6, background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${tokenPct}%`, background: barColor }}
                  />
                </div>
              </div>

              {/* Cost badge */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] uppercase tracking-[0.15em] font-semibold"
                  style={{ color: "var(--text-4)" }}
                >
                  Cost
                </span>
                <span
                  className="rounded-xl px-2.5 py-1 text-[13px] font-bold font-mono"
                  style={{
                    background: "var(--accent-bg)",
                    color: "var(--accent)",
                  }}
                >
                  ${agent.cost24h.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            className="col-span-full py-16 text-center rounded-2xl"
            style={{ color: "var(--text-4)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            No agents in this category
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div
        className="rounded-2xl flex flex-wrap items-center gap-4 px-5"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          minHeight: 52,
        }}
      >
        <span
          className="flex items-center gap-1.5 text-[13px]"
          style={{ color: "var(--text-3)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)" }}
          />
          <strong style={{ color: "var(--text-1)" }}>{onlineCount}</strong> online
        </span>
        <span
          className="flex items-center gap-1.5 text-[13px]"
          style={{ color: "var(--text-3)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--amber)" }}
          />
          <strong style={{ color: "var(--text-1)" }}>{idleCount}</strong> idle
        </span>
        <span className="text-[13px]" style={{ color: "var(--text-4)" }}>·</span>
        <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
          Total cost{" "}
          <strong className="font-mono" style={{ color: "var(--accent)" }}>
            ${totalCost}
          </strong>
        </span>
        <span className="text-[13px] ml-auto" style={{ color: "var(--text-4)" }}>
          Showing {filtered.length} agents
        </span>
      </div>
    </div>
  );
}
