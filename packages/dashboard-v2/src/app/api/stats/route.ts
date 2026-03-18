import { NextResponse } from "next/server";

interface StatCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaDirection: "up" | "down" | "neutral";
  description: string;
}

interface FundStats {
  aum: StatCard;
  agentsOnline: StatCard;
  ragChunks: StatCard;
  guardrails: StatCard;
  symphonyTasks: StatCard;
  roiHours: StatCard;
  roiCost: StatCard;
  updatedAt: string;
}

export async function GET() {
  const stats: FundStats = {
    aum: {
      id: "aum",
      label: "Fund AUM",
      value: "R$ 127.4M",
      delta: "+2.3%",
      deltaDirection: "up",
      description: "Total assets under management",
    },
    agentsOnline: {
      id: "agents_online",
      label: "Agents Online",
      value: "9 / 11",
      delta: "+1",
      deltaDirection: "up",
      description: "Active FIDC + AIOS agents",
    },
    ragChunks: {
      id: "rag_chunks",
      label: "RAG Chunks",
      value: "48,291",
      delta: "+1,204",
      deltaDirection: "up",
      description: "Indexed knowledge base entries",
    },
    guardrails: {
      id: "guardrails",
      label: "Guardrails",
      value: "5 / 6 OK",
      delta: "1 warning",
      deltaDirection: "neutral",
      description: "Covenant and risk gates status",
    },
    symphonyTasks: {
      id: "symphony_tasks",
      label: "Symphony Tasks",
      value: "142",
      delta: "+18 today",
      deltaDirection: "up",
      description: "Orchestrated agent tasks this month",
    },
    roiHours: {
      id: "roi_hours",
      label: "Hours Saved",
      value: "312h",
      delta: "+28h this week",
      deltaDirection: "up",
      description: "Estimated analyst-hours replaced by agents",
    },
    roiCost: {
      id: "roi_cost",
      label: "AI Cost (30d)",
      value: "R$ 847",
      delta: "vs R$ 6,200 labor",
      deltaDirection: "down",
      description: "Total LLM spend vs equivalent headcount cost",
    },
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(stats);
}
