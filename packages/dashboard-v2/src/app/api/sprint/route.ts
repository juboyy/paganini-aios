import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, name, status, agent_id, cost, tokens, duration, priority, created_at, completed_at, bmad_stage")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    const tasks = data ?? [];

    const pending = tasks.filter((t) => t.status === "pending");
    const in_progress = tasks.filter((t) => t.status === "in_progress");
    const done = tasks.filter((t) => t.status === "completed" || t.status === "done");

    // Daily completion rates — last 14 days
    const now = Date.now();
    const days: Record<string, { date: string; completed: number; total: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().split("T")[0];
      days[d] = { date: d, completed: 0, total: 0 };
    }
    for (const t of tasks) {
      const day = (t.created_at ?? "").split("T")[0];
      if (days[day]) days[day].total++;
      if ((t.status === "completed" || t.status === "done") && t.completed_at) {
        const doneDay = t.completed_at.split("T")[0];
        if (days[doneDay]) days[doneDay].completed++;
      }
    }

    return NextResponse.json({
      pending,
      in_progress,
      done,
      daily: Object.values(days),
      stats: {
        total: tasks.length,
        pending: pending.length,
        in_progress: in_progress.length,
        done: done.length,
        total_cost: tasks.reduce((s, t) => s + (t.cost ?? 0), 0),
        total_tokens: tasks.reduce((s, t) => s + (t.tokens ?? 0), 0),
      },
    });
  } catch {
    return NextResponse.json({
      pending: [],
      in_progress: [],
      done: [],
      daily: [],
      stats: { total: 0, pending: 0, in_progress: 0, done: 0, total_cost: 0, total_tokens: 0 },
    });
  }
}
