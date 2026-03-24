import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const agent_id = searchParams.get("agent_id");

    // Get total count + categories + agents in parallel
    const [countRes, metaRes] = await Promise.all([
      supabase.from("memory_entries").select("id", { count: "exact", head: true }),
      supabase.from("memory_entries").select("type, source_agent").limit(1000),
    ]);
    const totalCount = countRes.count ?? 0;
    const categories = [...new Set((metaRes.data ?? []).map(e => e.type).filter(Boolean))];
    const agents = [...new Set((metaRes.data ?? []).map(e => e.source_agent).filter(Boolean))];

    let entries: any[] = [];

    if (!category || category === "all") {
      // Default view: show priority entries (decisions, facts, errors) first,
      // then recent context (excluding heartbeat spam)
      const [priorityRes, contextRes] = await Promise.all([
        supabase
          .from("memory_entries")
          .select("id, content, type, source_agent, tags, confidence, access_count, created_at")
          .in("type", ["decision", "fact", "error_pattern", "preference", "learning", "task", "error"])
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("memory_entries")
          .select("id, content, type, source_agent, tags, confidence, access_count, created_at")
          .not("content", "like", "Read HEARTBEAT.md%")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      // Merge: priority first, then context, deduplicated
      const seenIds = new Set<string>();
      for (const e of [...(priorityRes.data ?? []), ...(contextRes.data ?? [])]) {
        if (!seenIds.has(e.id)) {
          seenIds.add(e.id);
          entries.push(e);
        }
      }
    } else {
      // Filtered view
      let query = supabase
        .from("memory_entries")
        .select("id, content, type, source_agent, tags, confidence, access_count, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (category !== "all") query = query.eq("type", category);
      if (agent_id && agent_id !== "all") query = query.eq("source_agent", agent_id);

      const { data } = await query;
      entries = data ?? [];
    }

    return NextResponse.json({ entries, total: totalCount, categories, agents });
  } catch {
    return NextResponse.json({ entries: [], total: 0, categories: [], agents: [] });
  }
}
