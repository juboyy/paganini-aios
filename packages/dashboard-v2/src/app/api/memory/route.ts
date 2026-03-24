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
      .limit(500);

    if (category && category !== "all") query = query.eq("type", category);
    if (agent_id && agent_id !== "all") query = query.eq("source_agent", agent_id);

    const { data, error } = await query;
    if (error) throw error;

    // Get total count
    const { count: totalCount } = await supabase
      .from("memory_entries")
      .select("id", { count: "exact", head: true });

    // Get unique categories and agents for filters
    const { data: allEntries } = await supabase
      .from("memory_entries")
      .select("type, source_agent")
      .limit(1000);

    const categories = [...new Set((allEntries ?? []).map(e => e.type).filter(Boolean))];
    const agents = [...new Set((allEntries ?? []).map(e => e.source_agent).filter(Boolean))];

    return NextResponse.json({
      entries: data ?? [],
      total: totalCount ?? (data ?? []).length,
      categories,
      agents,
    });
  } catch {
    return NextResponse.json({ entries: [], total: 0, categories: [], agents: [] });
  }
}
