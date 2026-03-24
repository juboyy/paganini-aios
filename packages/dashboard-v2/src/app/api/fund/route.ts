import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const [dailyCostsRes, agentsRes, tasksRes, deliverablesRes] = await Promise.all([
      supabase
        .from("daily_costs")
        .select("date, total, openai, anthropic, google")
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("agents")
        .select("id, name, emoji, total_cost, model, role, title")
        .order("total_cost", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, cost, agent_id, created_at")
        .not("cost", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("deliverables")
        .select("id, name, type, status, agent_id, lines_changed, category, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const dailyCosts = dailyCostsRes.data || [];
    const agents = agentsRes.data || [];
    const tasks = tasksRes.data || [];
    const deliverables = deliverablesRes.data || [];

    const totalCost = dailyCosts.reduce((s, d) => s + (d.total || 0), 0);
    const totalLoc = deliverables.reduce((s, d) => s + (d.lines_changed || 0), 0);

    // Cost per agent from tasks
    const costPerAgent: Record<string, number> = {};
    for (const task of tasks) {
      if (task.agent_id && task.cost) {
        costPerAgent[task.agent_id] = (costPerAgent[task.agent_id] || 0) + task.cost;
      }
    }

    // Projected monthly: avg last 7 days * 30
    const last7 = dailyCosts.slice(0, 7);
    const avg7 = last7.length > 0 ? last7.reduce((s, d) => s + (d.total || 0), 0) / last7.length : 0;
    const projectedMonthly = avg7 * 30;

    // FIDC fund stats (static FIDC data + AI cost overlay)
    const fundStats = {
      nav: "R$ 245.8M",
      cota_senior: "R$ 1.0234",
      cota_subordinada: "R$ 0.9876",
      subordination: "28.5%",
      total_receivables: "R$ 312.4M",
      pdd: "R$ 4.7M",
      net_portfolio: "R$ 307.7M",
    };

    return NextResponse.json({
      ...fundStats,
      deliverables: deliverables.slice(0, 20),
      totalLoc,
      totalDeliverables: deliverables.length,
      aiCosts: {
        total: totalCost,
        projectedMonthly,
        dailyCosts,
        perAgent: agents.map((a) => ({
          ...a,
          computed_cost: costPerAgent[a.id] || a.total_cost || 0,
        })),
      },
    });
  } catch (err) {
    console.error("fund route error:", err);
    // Fallback to static data
    return NextResponse.json({
      nav: "R$ 245.8M",
      cota_senior: "R$ 1.0234",
      cota_subordinada: "R$ 0.9876",
      subordination: "28.5%",
      total_receivables: "R$ 312.4M",
      pdd: "R$ 4.7M",
      net_portfolio: "R$ 307.7M",
    });
  }
}
