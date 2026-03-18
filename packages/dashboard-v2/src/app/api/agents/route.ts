import { NextResponse } from "next/server";

interface Agent {
  slug: string;
  name: string;
  icon: string;
  type: "FIDC" | "AIOS" | "Tier-2";
  role: string;
  status: "online" | "working" | "idle" | "offline";
  lastAction: string;
  tokens24h: number;
  cost24h: number;
}

const AGENTS: Agent[] = [
  { slug: "admin", name: "Admin", icon: "🏛", type: "FIDC", role: "Fund administration", status: "online", lastAction: "NAV calc updated", tokens24h: 4200, cost24h: 0.31 },
  { slug: "compliance", name: "Compliance", icon: "✅", type: "FIDC", role: "Regulatory compliance", status: "online", lastAction: "Op #1847 approved", tokens24h: 8900, cost24h: 0.42 },
  { slug: "custody", name: "Custody", icon: "🔐", type: "FIDC", role: "Asset custody", status: "online", lastAction: "Titles registered", tokens24h: 3100, cost24h: 0.18 },
  { slug: "due_diligence", name: "Due Diligence", icon: "🔍", type: "FIDC", role: "Credit analysis", status: "working", lastAction: "Cedent ABC scoring", tokens24h: 12400, cost24h: 0.68 },
  { slug: "gestor", name: "Gestor", icon: "📊", type: "FIDC", role: "Fund management", status: "online", lastAction: "Allocation adjusted", tokens24h: 6700, cost24h: 0.35 },
  { slug: "ir", name: "Investor Relations", icon: "💼", type: "FIDC", role: "Investor communications", status: "idle", lastAction: "Monthly report sent", tokens24h: 2100, cost24h: 0.12 },
  { slug: "pricing", name: "Pricing", icon: "💰", type: "FIDC", role: "Asset pricing", status: "online", lastAction: "PDD calc updated", tokens24h: 5300, cost24h: 0.28 },
  { slug: "reg_watch", name: "Reg Watch", icon: "📜", type: "FIDC", role: "Regulatory monitoring", status: "online", lastAction: "CVM bulletin parsed", tokens24h: 1800, cost24h: 0.09 },
  { slug: "reporting", name: "Reporting", icon: "📋", type: "FIDC", role: "Operational reports", status: "online", lastAction: "Dashboard refresh", tokens24h: 3400, cost24h: 0.16 },
  { slug: "code", name: "Code", icon: "💻", type: "AIOS", role: "CTO / Codex Supervisor", status: "working", lastAction: "PR #142 merged", tokens24h: 45200, cost24h: 1.28 },
  { slug: "codex", name: "Codex", icon: "⚡", type: "Tier-2", role: "Code execution engine", status: "idle", lastAction: "VIV-95 complete", tokens24h: 82000, cost24h: 3.70 },
];

export async function GET() {
  return NextResponse.json({
    agents: AGENTS,
    total: AGENTS.length,
    online: AGENTS.filter((a) => a.status !== "offline").length,
  });
}
