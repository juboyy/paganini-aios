import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const since30d = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [costsRes, tasksRes, tracesRes] = await Promise.all([
      supabase
        .from("daily_costs")
        .select("date, total, openai, anthropic, google")
        .gte("date", since30d)
        .order("date", { ascending: true }),
      supabase
        .from("tasks")
        .select("id, status, agent_id, cost, tokens, duration, created_at, bmad_stage"),
      supabase
        .from("traces")
        .select("id, agent_id, status, duration, error, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    const costs = costsRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const traces = tracesRes.data ?? [];

    // Task stats
    const done = tasks.filter((t) => t.status === "completed" || t.status === "done");
    const failed = tasks.filter((t) => t.status === "failed" || t.status === "error");
    const totalCost = tasks.reduce((s, t) => s + (t.cost ?? 0), 0);
    const totalTokens = tasks.reduce((s, t) => s + (t.tokens ?? 0), 0);
    const successRate = tasks.length > 0 ? (done.length / tasks.length) * 100 : 0;

    // Tasks per day (last 30d)
    const tasksByDay: Record<string, number> = {};
    const tokensByDay: Record<string, number> = {};
    for (const t of tasks) {
      const day = (t.created_at ?? "").split("T")[0];
      if (!tasksByDay[day]) tasksByDay[day] = 0;
      tasksByDay[day]++;
      if (!tokensByDay[day]) tokensByDay[day] = 0;
      tokensByDay[day] += t.tokens ?? 0;
    }

    // Trace stats
    const tracesDone = traces.filter((t) => t.status === "success" || t.status === "completed");
    const tracesErr = traces.filter((t) => t.status === "error" || t.status === "failed");
    const traceSuccessRate = traces.length > 0 ? (tracesDone.length / traces.length) * 100 : 0;

    // Agent efficiency from tasks
    const agentMap: Record<string, { tasks: number; done: number; cost: number; tokens: number }> = {};
    for (const t of tasks) {
      const a = t.agent_id ?? "unknown";
      if (!agentMap[a]) agentMap[a] = { tasks: 0, done: 0, cost: 0, tokens: 0 };
      agentMap[a].tasks++;
      if (t.status === "completed" || t.status === "done") agentMap[a].done++;
      agentMap[a].cost += t.cost ?? 0;
      agentMap[a].tokens += t.tokens ?? 0;
    }
    const agentEfficiency = Object.entries(agentMap)
      .map(([id, s]) => ({
        agent_id: id,
        tasks: s.tasks,
        success_rate: s.tasks > 0 ? (s.done / s.tasks) * 100 : 0,
        total_cost: s.cost,
        total_tokens: s.tokens,
      }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 15);

    return NextResponse.json({
      daily_costs: costs,
      tasks_by_day: tasksByDay,
      tokens_by_day: tokensByDay,
      task_stats: {
        total: tasks.length,
        done: done.length,
        failed: failed.length,
        success_rate: successRate,
        total_cost: totalCost,
        total_tokens: totalTokens,
      },
      trace_stats: {
        total: traces.length,
        done: tracesDone.length,
        errors: tracesErr.length,
        success_rate: traceSuccessRate,
      },
      agent_efficiency: agentEfficiency,
    });
  } catch (e) {
    console.error("metrics error:", e);
    return NextResponse.json({
      daily_costs: [],
      tasks_by_day: {},
      tokens_by_day: {},
      task_stats: { total: 0, done: 0, failed: 0, success_rate: 0, total_cost: 0, total_tokens: 0 },
      trace_stats: { total: 0, done: 0, errors: 0, success_rate: 0 },
      agent_efficiency: [],
    });
  }
}
