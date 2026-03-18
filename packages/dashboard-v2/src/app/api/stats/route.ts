import { NextResponse } from "next/server";
import { FUND_STATS, AGENTS, GUARDRAILS } from "../../../lib/mock-data";
export async function GET() {
  return NextResponse.json([
    { label: "TOTAL NAV", value: FUND_STATS.nav, delta: "+2.3%", color: "var(--accent)" },
    { label: "AGENTS ACTIVE", value: "9/9", delta: "NOMINAL", color: "var(--cyan)" },
    { label: "GUARDRAILS", value: "6/6", delta: "ALL PASS", color: "var(--accent)" },
    { label: "COST/HOUR", value: "sh.09", delta: "-12%", color: "var(--cyan)" },
  ]);
}
