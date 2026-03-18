import { NextResponse } from "next/server";

interface RoiStats {
  hoursAutomated: number;
  costAI30d: number;
  costEquivalentHeadcount: number;
  savingsMultiplier: number;
  tasksCompleted30d: number;
  avgTaskDurationMin: number;
}

interface TokenUsageDay {
  date: string;
  tokens: number;
  cost: number;
  calls: number;
}

interface ProviderCost {
  provider: string;
  tokens: number;
  cost: number;
  pct: number;
  model: string;
}

interface ProviderHealth {
  provider: string;
  uptime: number;
  status: "operational" | "degraded" | "outage";
  avgLatencyMs: number;
  p99LatencyMs: number;
  errors24h: number;
}

interface TelemetryData {
  roi: RoiStats;
  tokenUsage: TokenUsageDay[];
  costBreakdown: ProviderCost[];
  providerHealth: ProviderHealth[];
  updatedAt: string;
}

const ROI: RoiStats = {
  hoursAutomated: 312,
  costAI30d: 847,
  costEquivalentHeadcount: 6200,
  savingsMultiplier: 7.3,
  tasksCompleted30d: 142,
  avgTaskDurationMin: 4.2,
};

// Last 7 days — most recent last
const TOKEN_USAGE: TokenUsageDay[] = [
  { date: "2026-03-12", tokens: 142000, cost: 4.26, calls: 89 },
  { date: "2026-03-13", tokens: 198000, cost: 5.94, calls: 124 },
  { date: "2026-03-14", tokens: 87000, cost: 2.61, calls: 51 },
  { date: "2026-03-15", tokens: 64000, cost: 1.92, calls: 38 },
  { date: "2026-03-16", tokens: 221000, cost: 6.63, calls: 138 },
  { date: "2026-03-17", tokens: 275000, cost: 8.25, calls: 162 },
  { date: "2026-03-18", tokens: 189000, cost: 5.67, calls: 117 },
];

const COST_BREAKDOWN: ProviderCost[] = [
  {
    provider: "Anthropic",
    tokens: 620000,
    cost: 18.60,
    pct: 47.3,
    model: "claude-sonnet-4-6",
  },
  {
    provider: "OpenAI",
    tokens: 380000,
    cost: 14.25,
    pct: 36.2,
    model: "gpt-5.3-codex",
  },
  {
    provider: "Google",
    tokens: 180000,
    cost: 4.32,
    pct: 11.0,
    model: "gemini-2.5-pro",
  },
  {
    provider: "Groq",
    tokens: 95000,
    cost: 2.19,
    pct: 5.5,
    model: "llama-3.3-70b",
  },
];

const PROVIDER_HEALTH: ProviderHealth[] = [
  {
    provider: "Anthropic",
    uptime: 99.94,
    status: "operational",
    avgLatencyMs: 1240,
    p99LatencyMs: 4800,
    errors24h: 2,
  },
  {
    provider: "OpenAI",
    uptime: 99.71,
    status: "operational",
    avgLatencyMs: 980,
    p99LatencyMs: 3600,
    errors24h: 5,
  },
  {
    provider: "Google",
    uptime: 98.82,
    status: "degraded",
    avgLatencyMs: 2100,
    p99LatencyMs: 8200,
    errors24h: 18,
  },
  {
    provider: "Groq",
    uptime: 99.98,
    status: "operational",
    avgLatencyMs: 420,
    p99LatencyMs: 1100,
    errors24h: 0,
  },
];

export async function GET() {
  const data: TelemetryData = {
    roi: ROI,
    tokenUsage: TOKEN_USAGE,
    costBreakdown: COST_BREAKDOWN,
    providerHealth: PROVIDER_HEALTH,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(data);
}
