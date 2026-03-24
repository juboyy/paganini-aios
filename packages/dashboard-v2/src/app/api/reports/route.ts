import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const [deliverablesRes, timelineRes] = await Promise.all([
      supabase
        .from("deliverables")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("timeline_events")
        .select("id, title, description, type, agent_id, created_at")
        .eq("type", "deploy")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      deliverables: deliverablesRes.data || [],
      deployEvents: timelineRes.data || [],
    });
  } catch (err) {
    console.error("reports route error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
