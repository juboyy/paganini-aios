"use client";

import { useState } from "react";
import { AGENTS } from "@/lib/mock-data";

type FilterType = "all" | "FIDC" | "AIOS" | "Tier-2";

const STATUS_COLORS: Record<string, string> = {
  online: "var(--green)",
  working: "var(--blue)",
  idle: "var(--amber)",
  offline: "var(--red)",
};

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  working: "Working",
  idle: "Idle",
  offline: "Offline",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  FIDC: { bg: "var(--accent-bg)", text: "var(--accent)" },
  AIOS: { bg: "rgba(var(--teal-rgb, 20, 184, 166), 0.12)", text: "var(--teal)" },
  "Tier-2": { bg: "rgba(var(--amber-rgb, 245, 158, 11), 0.12)", text: "var(--amber)" },
};

const FILTERS: FilterType[] = ["all", "FIDC", "AIOS", "Tier-2"];

const maxTokens = Math.max(...AGENTS.map((a) => a.tokens24h));

export default function AgentsPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all" ? AGENTS : AGENTS.filter((a) => a.type === filter);

  const counts = {
    all: AGENTS.length,
    FIDC: AGENTS.filter((a) => a.type === "FIDC").length,
    AIOS: AGENTS.filter((a) => a.type === "AIOS").length,
    "Tier-2": AGENTS.filter((a) => a.type === "Tier-2").length,
  };

  const onlineCount = AGENTS.filter((a) => a.status === "online" || a.status === "working").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            Agent Fleet
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            {onlineCount} of {AGENTS.length} agents active
          </p>
        </div>

        {/* Status summary pills */}
        <div className="hidden sm:flex items-center gap-3">
          {(["online", "working", "idle", "offline"] as const).map((s) => {
            const count = AGENTS.filter((a) => a.status === s).length;
            return (
              <div
                key={s}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLORS[s] }}
                />
                <span style={{ color: "var(--text-2)" }}>
                  {count} {STATUS_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={
              filter === f
                ? {
                    background: "var(--accent)",
                    color: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }
                : { color: "var(--text-3)" }
            }
          >
            {f === "all" ? "All" : f}{" "}
            <span
              className="ml-1 text-xs"
              style={{ opacity: filter === f ? 0.8 : 0.5 }}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        {/* Table header */}
        <div
          className="grid items-center px-5 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: "28px 200px 1fr 90px 160px 1fr 80px",
            color: "var(--text-4)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span />
          <span>Agent</span>
          <span>Role</span>
          <span>Type</span>
          <span>Last Action</span>
          <span>Tokens 24h</span>
          <span className="text-right">Cost</span>
        </div>

        {/* Rows */}
        {filtered.map((agent, idx) => {
          const tokenPct = Math.round((agent.tokens24h / maxTokens) * 100);
          const isLast = idx === filtered.length - 1;

          return (
            <div
              key={agent.slug}
              className="grid items-center px-5 py-3.5 transition-colors duration-150"
              style={{
                gridTemplateColumns: "28px 200px 1fr 90px 160px 1fr 80px",
                borderBottom: isLast ? "none" : "1px solid var(--border)",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(var(--accent-rgb, 99, 102, 241), 0.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              {/* Status dot */}
              <div className="flex items-center justify-center">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${agent.status === "online" ? "animate-pulse" : ""}`}
                  style={{ background: STATUS_COLORS[agent.status] }}
                />
              </div>

              {/* Icon + Name */}
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none">{agent.icon}</span>
                <div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-1)" }}
                  >
                    {agent.name}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {agent.domains.slice(0, 2).map((d) => (
                      <span
                        key={d}
                        className="text-[10px] px-1 rounded"
                        style={{
                          background: "var(--accent-bg)",
                          color: "var(--accent)",
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role */}
              <span className="text-sm" style={{ color: "var(--text-3)" }}>
                {agent.role}
              </span>

              {/* Type badge */}
              <div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      TYPE_COLORS[agent.type]?.bg ?? "var(--accent-bg)",
                    color: TYPE_COLORS[agent.type]?.text ?? "var(--accent)",
                  }}
                >
                  {agent.type}
                </span>
              </div>

              {/* Last action */}
              <span
                className="text-xs truncate"
                style={{ color: "var(--text-3)" }}
              >
                {agent.lastAction}
              </span>

              {/* Tokens bar */}
              <div className="flex items-center gap-2 pr-4">
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: "6px", background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${tokenPct}%`,
                      background:
                        tokenPct > 70
                          ? "var(--accent)"
                          : tokenPct > 40
                          ? "var(--blue)"
                          : "var(--teal)",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-mono w-12 text-right"
                  style={{ color: "var(--text-3)" }}
                >
                  {agent.tokens24h >= 1000
                    ? `${(agent.tokens24h / 1000).toFixed(1)}k`
                    : agent.tokens24h}
                </span>
              </div>

              {/* Cost */}
              <div className="text-right">
                <span
                  className="text-sm font-mono"
                  style={{ color: "var(--text-2)" }}
                >
                  ${agent.cost24h.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center" style={{ color: "var(--text-4)" }}>
            No agents in this category.
          </div>
        )}
      </div>

      {/* Totals bar */}
      <div
        className="flex items-center justify-between rounded-xl px-5 py-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <span className="text-sm" style={{ color: "var(--text-3)" }}>
          Showing {filtered.length} agents
        </span>
        <div className="flex items-center gap-6">
          <div className="text-sm" style={{ color: "var(--text-3)" }}>
            Total tokens:{" "}
            <span
              className="font-semibold font-mono"
              style={{ color: "var(--text-1)" }}
            >
              {(
                filtered.reduce((s, a) => s + a.tokens24h, 0) / 1000
              ).toFixed(1)}
              k
            </span>
          </div>
          <div className="text-sm" style={{ color: "var(--text-3)" }}>
            Total cost:{" "}
            <span
              className="font-semibold font-mono"
              style={{ color: "var(--text-1)" }}
            >
              ${filtered.reduce((s, a) => s + a.cost24h, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
