import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const [agentsRes, timelineRes, tasksRes] = await Promise.all([
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
        .select("name, status, agent_id, cost, tokens, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      agents: agentsRes.data || [],
      timeline: timelineRes.data || [],
      tasks: tasksRes.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch canvas data", agents: [], timeline: [], tasks: [] },
      { status: 500 }
    );
  }
}
