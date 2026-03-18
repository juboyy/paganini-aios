import { NextResponse } from "next/server";

interface NavPoint {
  month: string;
  nav: number;
  pl: number;
}

interface Cedent {
  name: string;
  pct: number;
  amount: number;
  rating: string;
}

interface Covenant {
  id: string;
  name: string;
  threshold: string;
  current: string;
  status: "ok" | "warning" | "breached";
  margin: string;
}

interface CashflowBucket {
  days: number;
  inflow: number;
  outflow: number;
  net: number;
}

interface FundData {
  navHistory: NavPoint[];
  concentration: Cedent[];
  covenants: Covenant[];
  cashflow: CashflowBucket[];
  updatedAt: string;
}

const NAV_HISTORY: NavPoint[] = [
  { month: "Apr/25", nav: 108.42, pl: 110200000 },
  { month: "May/25", nav: 110.87, pl: 112700000 },
  { month: "Jun/25", nav: 109.34, pl: 111100000 },
  { month: "Jul/25", nav: 112.10, pl: 113900000 },
  { month: "Aug/25", nav: 114.55, pl: 116400000 },
  { month: "Sep/25", nav: 113.20, pl: 115000000 },
  { month: "Oct/25", nav: 116.80, pl: 118700000 },
  { month: "Nov/25", nav: 118.40, pl: 120300000 },
  { month: "Dec/25", nav: 121.15, pl: 123100000 },
  { month: "Jan/26", nav: 123.60, pl: 125600000 },
  { month: "Feb/26", nav: 125.20, pl: 127200000 },
  { month: "Mar/26", nav: 127.40, pl: 127400000 },
];

const CONCENTRATION: Cedent[] = [
  { name: "ABC Factoring", pct: 9.4, amount: 11980000, rating: "A-" },
  { name: "GHI Comércio", pct: 8.7, amount: 11085000, rating: "B+" },
  { name: "DEF Indústria", pct: 7.9, amount: 10065000, rating: "A" },
  { name: "JKL Serviços", pct: 7.2, amount: 9173000, rating: "B+" },
  { name: "MNO Atacado", pct: 6.8, amount: 8663000, rating: "A-" },
  { name: "PQR Varejo", pct: 6.1, amount: 7771000, rating: "B" },
  { name: "STU Logística", pct: 5.4, amount: 6880000, rating: "A-" },
  { name: "VWX Agro", pct: 4.9, amount: 6243000, rating: "B+" },
  { name: "YZ Exportações", pct: 4.3, amount: 5478000, rating: "B" },
  { name: "Others (38)", pct: 39.3, amount: 50063000, rating: "Mixed" },
];

const COVENANTS: Covenant[] = [
  {
    id: "concentration_limit",
    name: "Max Cedent Concentration",
    threshold: "≤ 15%",
    current: "9.4%",
    status: "ok",
    margin: "5.6pp",
  },
  {
    id: "pdd_coverage",
    name: "PDD Coverage Ratio",
    threshold: "≥ 110%",
    current: "127%",
    status: "ok",
    margin: "17pp",
  },
  {
    id: "subordination",
    name: "Subordination Ratio",
    threshold: "≥ 20%",
    current: "23.1%",
    status: "ok",
    margin: "3.1pp",
  },
  {
    id: "delinquency_90",
    name: "NPL 90d+ Gate",
    threshold: "≤ 8%",
    current: "5.7%",
    status: "ok",
    margin: "2.3pp",
  },
  {
    id: "liquidity_buffer",
    name: "Liquidity Buffer",
    threshold: "≥ R$ 3.8M",
    current: "R$ 4.2M",
    status: "warning",
    margin: "R$ 400K",
  },
  {
    id: "leverage",
    name: "Leverage Ratio",
    threshold: "≤ 2.0×",
    current: "1.4×",
    status: "ok",
    margin: "0.6×",
  },
];

const CASHFLOW: CashflowBucket[] = [
  { days: 30, inflow: 8400000, outflow: 6200000, net: 2200000 },
  { days: 60, inflow: 14700000, outflow: 11300000, net: 3400000 },
  { days: 90, inflow: 21500000, outflow: 17800000, net: 3700000 },
  { days: 180, inflow: 39200000, outflow: 33600000, net: 5600000 },
];

export async function GET() {
  const data: FundData = {
    navHistory: NAV_HISTORY,
    concentration: CONCENTRATION,
    covenants: COVENANTS,
    cashflow: CASHFLOW,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(data);
}
