import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    // Fetch timeline events
    const { data: events, error } = await supabase
      .from("timeline_events")
      .select("title, description, type, agent_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!events || events.length === 0) return NextResponse.json([]);

    // Fetch agents to map agent_id → name
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name");

    const agentMap = new Map<string, string>(
      (agents ?? []).map((a) => [a.id, a.name])
    );

    const mapped = events.map((e) => ({
      ...e,
      agent: agentMap.get(e.agent_id) ?? e.agent_id ?? "System",
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json([]);
  }
}
