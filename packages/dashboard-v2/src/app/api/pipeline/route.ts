import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const [runsRes, tasksRes] = await Promise.all([
      supabase
        .from("pipeline_runs")
        .select("id, title, status, current_stage, total_tokens, total_cost, duration_ms, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, name, status, agent_id, cost, tokens, duration, bmad_stage, priority, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (runsRes.error) throw runsRes.error;
    if (tasksRes.error) throw tasksRes.error;

    const tasks = tasksRes.data ?? [];

    // Group tasks by bmad_stage
    const byStage: Record<number, typeof tasks> = {};
    for (const t of tasks) {
      const stage = t.bmad_stage ?? 0;
      if (!byStage[stage]) byStage[stage] = [];
      byStage[stage].push(t);
    }

    return NextResponse.json({
      pipeline_runs: runsRes.data ?? [],
      tasks_by_stage: byStage,
      tasks_total: tasks.length,
    });
  } catch {
    return NextResponse.json({ pipeline_runs: [], tasks_by_stage: {}, tasks_total: 0 });
  }
}
