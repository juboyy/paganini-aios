import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    // 1. Efficiency vs Human Team: Sum(tasks completed) * $50 / Sum(total cost)
    const { data: completedTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("status", "done");
    
    const { data: totalCosts } = await supabase
      .from("daily_costs")
      .select("total");
    
    const taskCount = completedTasks?.length || 0;
    const totalCost = (totalCosts || []).reduce((sum, r) => sum + (r.total || 0), 0) || 1; // avoid div by zero
    const efficiency = (taskCount * 50) / totalCost;

    // 2. Lines of Code Generated: Sum(deliverables.lines_changed)
    const { data: deliverables } = await supabase
      .from("deliverables")
      .select("lines_changed");
    
    const totalLines = (deliverables || []).reduce((sum, r) => sum + (r.lines_changed || 0), 0) || 0;

    // 3. Success Rate: pipeline_runs(status=done) / total_runs
    const { count: doneRuns } = await supabase
      .from("pipeline_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "done");
    
    const { count: totalRuns } = await supabase
      .from("pipeline_runs")
      .select("id", { count: "exact", head: true });
    
    const successRate = totalRuns && totalRuns > 0 ? (doneRuns || 0) / totalRuns : 0;

    // 4. Cost per Line: total cost / total lines generated
    const costPerLine = totalLines > 0 ? totalCost / totalLines : 0;

    // Legacy / Other stats for the UI layers/counters
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

    const stats = {
      efficiency: efficiency.toFixed(1),
      totalLines: totalLines,
      successRate: (successRate * 100).toFixed(1),
      costPerLine: costPerLine.toFixed(4),
      humanCost: (taskCount * 50).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      aiCost: totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      
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
          label: "TOTAL COST",
          value: `$${totalCost.toFixed(2)}`,
          delta: "all time",
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
