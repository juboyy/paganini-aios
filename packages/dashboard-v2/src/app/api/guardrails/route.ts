import { NextResponse } from "next/server";

interface GuardrailEvent {
  time: string;
  message: string;
  severity: "info" | "warn" | "block";
}

interface Guardrail {
  id: string;
  name: string;
  description: string;
  status: "active" | "warning" | "breached" | "inactive";
  stat: string;
  statLabel: string;
  recentEvents: GuardrailEvent[];
}

const GUARDRAILS: Guardrail[] = [
  {
    id: "concentration",
    name: "Concentration Limit",
    description: "Max exposure per cedent capped at 15% of AUM",
    status: "active",
    stat: "9.4%",
    statLabel: "Highest single cedent",
    recentEvents: [
      { time: "2h ago", message: "Cedente XYZ reached 9.4% — within limit", severity: "info" },
      { time: "1d ago", message: "Allocation rebalanced after new batch", severity: "info" },
      { time: "3d ago", message: "Near-breach alert at 13.1% — auto-flagged", severity: "warn" },
    ],
  },
  {
    id: "pdd_coverage",
    name: "PDD Coverage",
    description: "Provision for doubtful debts must cover ≥ 110% of NPL",
    status: "active",
    stat: "127%",
    statLabel: "Current coverage ratio",
    recentEvents: [
      { time: "6h ago", message: "PDD recalculated after new NPL batch", severity: "info" },
      { time: "2d ago", message: "Coverage dipped to 112% — still compliant", severity: "warn" },
      { time: "5d ago", message: "Full PDD audit passed", severity: "info" },
    ],
  },
  {
    id: "liquidity",
    name: "Liquidity Buffer",
    description: "Cash + T+1 assets must cover 30-day redemption obligations",
    status: "warning",
    stat: "R$ 4.2M",
    statLabel: "30-day buffer vs R$ 3.8M req",
    recentEvents: [
      { time: "30m ago", message: "Buffer narrowed after senior quota redemption", severity: "warn" },
      { time: "1d ago", message: "Rollover of R$ 2.1M in DPGEs completed", severity: "info" },
      { time: "4d ago", message: "Liquidity stress test passed", severity: "info" },
    ],
  },
  {
    id: "subordination",
    name: "Subordination Ratio",
    description: "Junior + Mezz tranches must be ≥ 20% of total net equity",
    status: "active",
    stat: "23.1%",
    statLabel: "Current subordination",
    recentEvents: [
      { time: "12h ago", message: "NAV update — subordination recalculated", severity: "info" },
      { time: "3d ago", message: "New senior quota issuance — ratio checked", severity: "info" },
      { time: "7d ago", message: "Ratio at 20.4% post-redemption — alert cleared", severity: "warn" },
    ],
  },
  {
    id: "delinquency",
    name: "Delinquency Gate",
    description: "NPL > 90 days must not exceed 8% of portfolio",
    status: "active",
    stat: "5.7%",
    statLabel: "NPL 90d+ ratio",
    recentEvents: [
      { time: "4h ago", message: "Monthly delinquency report generated", severity: "info" },
      { time: "2d ago", message: "3 receivables moved to 91+ bucket", severity: "warn" },
      { time: "6d ago", message: "Recovery from Cedent MNO processed — NPL decreased", severity: "info" },
    ],
  },
  {
    id: "regulatory",
    name: "Regulatory Compliance",
    description: "CVM Instruction 356 / 444 — monthly reporting obligations",
    status: "active",
    stat: "100%",
    statLabel: "Filings current",
    recentEvents: [
      { time: "1d ago", message: "INFORME MENSAL filed — CVM acknowledged", severity: "info" },
      { time: "8d ago", message: "Custodian reconciliation report submitted", severity: "info" },
      { time: "15d ago", message: "Quarterly audit report dispatched to ANBIMA", severity: "info" },
    ],
  },
];

export async function GET() {
  return NextResponse.json({
    guardrails: GUARDRAILS,
    total: GUARDRAILS.length,
    active: GUARDRAILS.filter((g) => g.status === "active").length,
    warnings: GUARDRAILS.filter((g) => g.status === "warning").length,
    breached: GUARDRAILS.filter((g) => g.status === "breached").length,
  });
}
