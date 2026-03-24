import { NextResponse } from "next/server";

// FIDC demo fund data — realistic static representation of Paganini FIDC
const FUND_STATS = {
  nav: "R$ 245.8M",
  cota_senior: "R$ 1.0234",
  cota_subordinada: "R$ 0.9876",
  subordination: "28.5%",
  total_receivables: "R$ 312.4M",
  pdd: "R$ 4.7M",
  net_portfolio: "R$ 307.7M",
};

export async function GET() {
  return NextResponse.json(FUND_STATS);
}
