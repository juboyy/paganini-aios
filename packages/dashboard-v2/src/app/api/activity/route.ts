import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    // Fetch recent timeline events — skip repetitive task_monitor spam
    const { data: events, error } = await supabase
      .from("timeline_events")
      .select("title, description, type, agent_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    if (!events || events.length === 0) return NextResponse.json([]);

    // Fetch agents to map agent_id → name
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name");

    const agentMap = new Map<string, string>(
      (agents ?? []).map((a) => [a.id, a.name])
    );

    // Deduplicate: skip consecutive identical titles (task_monitor spam)
    const seen = new Set<string>();
    const deduped = events.filter((e) => {
      const key = `${e.title}::${e.agent_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const mapped = deduped.slice(0, 20).map((e) => {
      const d = new Date(e.created_at);
      const time = `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
      const agentName = agentMap.get(e.agent_id) ?? e.agent_id ?? "System";
      
      // Build a meaningful action string
      const action = e.title || e.description || "—";

      // Map DB types to display types
      const typeMap: Record<string, string> = {
        task: "info",
        deployment: "pass",
        error: "fail",
        alert: "warn",
        milestone: "pass",
        commit: "pass",
        decision: "info",
      };

      return {
        time,
        agent: agentName,
        action: action.length > 80 ? action.slice(0, 77) + "…" : action,
        type: typeMap[e.type] || "info",
      };
    });

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json([]);
  }
}
