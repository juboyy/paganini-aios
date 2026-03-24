import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const [tracesRes, gateRunsRes, tasksRes, totalTracesRes] = await Promise.all([
      // Error traces (recent 20)
      supabase
        .from("traces")
        .select("id, name, agent_id, status, error, duration, created_at")
        .eq("status", "error")
        .order("created_at", { ascending: false })
        .limit(20),
      // Quality gate runs
      supabase
        .from("quality_gate_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      // Tasks in review/QA stages
      supabase
        .from("tasks")
        .select("id, name, status, agent_id, bmad_stage, created_at")
        .in("bmad_stage", [12, 13])
        .order("created_at", { ascending: false })
        .limit(20),
      // Total traces count for quality score
      supabase
        .from("traces")
        .select("id, status", { count: "exact" })
        .limit(1),
    ]);

    const errorTraces = tracesRes.data || [];
    const gateRuns = gateRunsRes.data || [];
    const reviewTasks = tasksRes.data || [];
    const totalCount = totalTracesRes.count || 0;
    const errorCount = errorTraces.length;

    // Quality score: % of traces without error (0-100)
    const qualityScore =
      totalCount > 0
        ? Math.round(((totalCount - errorCount) / totalCount) * 100 * 10) / 10
        : 100;

    return NextResponse.json({
      qualityScore,
      totalTraces: totalCount,
      errorTraces: errorCount,
      recentErrors: errorTraces,
      gateRuns,
      reviewTasks,
    });
  } catch (err) {
    console.error("code-quality route error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
