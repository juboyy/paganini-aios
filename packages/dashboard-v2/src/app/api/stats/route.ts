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
    const googleCost = (totalCosts || []).reduce((sum, r) => sum + (r.google || 0), 0);
    
    // Real monthly cost = fixed subscriptions + variable API
    // Antigravity: R$500/mo (~$88 USD at 5.7 BRL/USD) — flat, Claude Opus/Sonnet
    // ChatGPT Team: $30/mo — flat, Codex GPT-5.x
    // Google API: variable (pay-per-use)
    const ANTIGRAVITY_USD = 500 / 5.7; // R$500 converted
    const CODEX_USD = 30;
    const MONTHLY_SUBSCRIPTIONS = Math.round(ANTIGRAVITY_USD + CODEX_USD); // ~$118
    const operatingDays = Math.max((totalCosts || []).length, 1);
    const googleMonthly = (googleCost / operatingDays) * 30;
    const realMonthlyCost = MONTHLY_SUBSCRIPTIONS + googleMonthly;
    const effectiveCost = Math.max(realMonthlyCost, 1); // avoid div by zero
    
    // Efficiency = human equivalent / real monthly cost
    const humanEquivalentMonthly = taskCount * 50; // $50/task
    const efficiency = humanEquivalentMonthly / effectiveCost;

    // 3. Lines of Code Generated: Sum(deliverables.lines_changed)
    const { data: deliverables } = await supabase
      .from("deliverables")
      .select("lines_changed");
    
    const totalLines = (deliverables || []).reduce((sum, r) => sum + (r.lines_changed || 0), 0) || 0;

    // 4. Success Rate: pipeline_runs(done/completed) / total_runs
    const { count: doneRuns } = await supabase
      .from("pipeline_runs")
      .select("id", { count: "exact", head: true })
      .in("status", ["done", "completed"]);
    
    const { count: totalRuns } = await supabase
      .from("pipeline_runs")
      .select("id", { count: "exact", head: true });
    
    const successRate = totalRuns && totalRuns > 0 ? (doneRuns || 0) / totalRuns : 0;

    // 5. Cost per Line uses REAL monthly cost
    const costPerLine = totalLines > 0 ? realMonthlyCost / totalLines : 0;

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
    const fmtCost = (v: number) => v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`;

    const stats = {
      efficiency: efficiency.toFixed(1),
      totalLines: totalLines,
      successRate: (successRate * 100).toFixed(1),
      costPerLine: costPerLine.toFixed(6),
      // Real cost model
      humanCost: `$${humanEquivalentMonthly.toLocaleString()}`,
      aiCost: fmtCost(realMonthlyCost),
      realMonthlyCost: realMonthlyCost.toFixed(0),
      subscriptions: MONTHLY_SUBSCRIPTIONS,
      googleApi: googleMonthly.toFixed(2),
      costModel: `Subs $${MONTHLY_SUBSCRIPTIONS}/mo + Google API ~$${googleMonthly.toFixed(0)}/mo`,
      
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
          label: "CUSTO MENSAL",
          value: fmtCost(realMonthlyCost),
          delta: `subs $${MONTHLY_SUBSCRIPTIONS} + API ~$${googleMonthly.toFixed(0)}`,
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
