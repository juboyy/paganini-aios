import { NextResponse } from "next/server";

type ActivityType = "approval" | "alert" | "report" | "task" | "system" | "compliance" | "trade" | "audit";

interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  time: string;
  agent: string;
  agentIcon: string;
  meta?: Record<string, string | number>;
}

const ACTIVITY_FEED: ActivityItem[] = [
  {
    id: "act-001",
    type: "approval",
    message: "Op #1847 approved — R$ 340K receivable batch from Cedente ABC",
    time: "8 min ago",
    agent: "Compliance",
    agentIcon: "✅",
    meta: { amount: 340000, cedent: "ABC Factoring" },
  },
  {
    id: "act-002",
    type: "task",
    message: "Credit scoring completed for Cedente GHI — Score: 72/100 (B+)",
    time: "34 min ago",
    agent: "Due Diligence",
    agentIcon: "🔍",
    meta: { score: 72, grade: "B+", cedent: "GHI Comércio" },
  },
  {
    id: "act-003",
    type: "report",
    message: "NAV calculation updated — PL: R$ 127.4M (+0.18% vs yesterday)",
    time: "1h ago",
    agent: "Admin",
    agentIcon: "🏛",
    meta: { nav: 127400000, delta: 0.18 },
  },
  {
    id: "act-004",
    type: "alert",
    message: "Liquidity buffer narrowed to R$ 4.2M after senior quota redemption of R$ 1.8M",
    time: "2h ago",
    agent: "Gestor",
    agentIcon: "📊",
    meta: { buffer: 4200000, redemption: 1800000 },
  },
  {
    id: "act-005",
    type: "compliance",
    message: "INFORME MENSAL CVM filed successfully — March 2026",
    time: "4h ago",
    agent: "Reg Watch",
    agentIcon: "📜",
    meta: { period: "2026-03", reference: "INFORME-MAR-2026" },
  },
  {
    id: "act-006",
    type: "trade",
    message: "PDD provisioning recalculated — R$ 3.1M (127% NPL coverage)",
    time: "6h ago",
    agent: "Pricing",
    agentIcon: "💰",
    meta: { pdd: 3100000, coverage: 127 },
  },
  {
    id: "act-007",
    type: "system",
    message: "PR #142 merged — dashboard telemetry streaming improvements",
    time: "9h ago",
    agent: "Code",
    agentIcon: "💻",
    meta: { pr: 142, repo: "paganini" },
  },
  {
    id: "act-008",
    type: "audit",
    message: "Monthly investor report dispatched to 4 quota holders",
    time: "1d ago",
    agent: "Investor Relations",
    agentIcon: "💼",
    meta: { recipients: 4, period: "2026-02" },
  },
];

export async function GET() {
  return NextResponse.json({
    activity: ACTIVITY_FEED,
    total: ACTIVITY_FEED.length,
    updatedAt: new Date().toISOString(),
  });
}
