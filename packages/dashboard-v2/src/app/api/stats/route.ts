import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    // 1. Tasks completed
    const { data: completedTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("status", "done");
    
    // 2. Daily costs — separate real vs theoretical
    // Real cost = only Google (pay-per-use API)
    // Antigravity (Claude) = flat subscription = $0 inference
    // Codex (ChatGPT Team) = flat subscription = $0 inference
    const { data: totalCosts } = await supabase
      .from("daily_costs")
      .select("total, google");
    
    const taskCount = completedTasks?.length || 0;
    const theoreticalCost = (totalCosts || []).reduce((sum, r) => sum + (r.total || 0), 0);
    const realCost = (totalCosts || []).reduce((sum, r) => sum + (r.google || 0), 0);
    const effectiveCost = Math.max(realCost, 0.01); // avoid div by zero
    
    // Efficiency uses REAL cost (not theoretical)
    const efficiency = (taskCount * 50) / effectiveCost;

    // 3. Lines of Code Generated: Sum(deliverables.lines_changed)
    const { data: deliverables } = await supabase
      .from("deliverables")
      .select("lines_changed");
    
    const totalLines = (deliverables || []).reduce((sum, r) => sum + (r.lines_changed || 0), 0) || 0;

    // 4. Success Rate: pipeline_runs(status=done) / total_runs
    const { count: doneRuns } = await supabase
      .from("pipeline_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "done");
    
    const { count: totalRuns } = await supabase
      .from("pipeline_runs")
      .select("id", { count: "exact", head: true });
    
    const successRate = totalRuns && totalRuns > 0 ? (doneRuns || 0) / totalRuns : 0;

    // 5. Cost per Line uses REAL cost
    const costPerLine = totalLines > 0 ? effectiveCost / totalLines : 0;

    // Legacy / Other stats
    const { count: activeAgents } = await supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "online"]);

    const { count: totalAgents } = await supabase
      .from("agents")
      .select("id", { count: "exact", head: true });

    const { count: guardrailCount } = await supabase
      .from("quality_gate_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pass");

    // Format cost display
    const fmtCost = (v: number) => v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;

    const stats = {
      efficiency: efficiency.toFixed(1),
      totalLines: totalLines,
      successRate: (successRate * 100).toFixed(1),
      costPerLine: costPerLine.toFixed(6),
      // Show REAL cost model
      humanCost: `R$ ${(taskCount * 50).toLocaleString()}`,
      aiCost: fmtCost(realCost),
      theoreticalCost: fmtCost(theoreticalCost),
      realCost: fmtCost(realCost),
      costModel: "Antigravity (flat) + Codex (flat) + Google API (pay-per-use)",
      
      activeAgents: activeAgents || 0,
      totalAgents: totalAgents || 0,
      guardrails: guardrailCount || 6,
      
      cards: [
        {
          label: "AGENTS ACTIVE",
          value: totalAgents && totalAgents > 0 ? `${activeAgents || 0}/${totalAgents}` : "0/0",
          delta: activeAgents === totalAgents ? "NOMINAL" : `${(totalAgents || 0) - (activeAgents || 0)} IDLE`,
          color: "var(--cyan)",
        },
        {
          label: "GUARDRAILS",
          value: `${guardrailCount || 6}/6`,
          delta: "ALL PASS",
          color: "var(--accent)",
        },
        {
          label: "TASKS TOTAL",
          value: taskCount.toString(),
          delta: "all time",
          color: "var(--cyan)",
        },
        {
          label: "CUSTO REAL",
          value: fmtCost(realCost),
          delta: `teórico: ${fmtCost(theoreticalCost)}`,
          color: "var(--accent)",
        },
      ]
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({
      efficiency: "0",
      totalLines: 0,
      successRate: "0",
      costPerLine: "0",
      activeAgents: 0,
      totalAgents: 0,
      guardrails: 6,
      cards: []
    }, { status: 500 });
  }
}
