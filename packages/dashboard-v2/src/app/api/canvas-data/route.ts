import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const [agentsRes, timelineRes, tasksRes, costsRes, pipelineRes] = await Promise.all([
      supabase
        .from("agents")
        .select("id, name, emoji, status, model, tasks_completed, avg_time, error_rate, total_cost, role, title")
        .order("tasks_completed", { ascending: false }),
      supabase
        .from("timeline_events")
        .select("title, description, type, agent_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("tasks")
        .select("id, name, status, agent_id, cost, tokens, created_at, priority")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("daily_costs")
        .select("date, total, openai, anthropic, google")
        .order("date", { ascending: false })
        .limit(7),
      supabase
        .from("pipeline_runs")
        .select("id, title, status, current_stage, total_tokens, total_cost, duration_ms, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    return NextResponse.json({
      agents: agentsRes.data || [],
      timeline: timelineRes.data || [],
      tasks: tasksRes.data || [],
      daily_costs: costsRes.data || [],
      pipeline_runs: pipelineRes.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch canvas data", agents: [], timeline: [], tasks: [], daily_costs: [], pipeline_runs: [] },
      { status: 500 }
    );
  }
}
