import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const agent_id = searchParams.get("agent_id");

    let query = supabase
      .from("memory_entries")
      .select("id, content, type, source_agent, tags, confidence, access_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (category) query = query.eq("type", category);
    if (agent_id) query = query.eq("source_agent", agent_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
