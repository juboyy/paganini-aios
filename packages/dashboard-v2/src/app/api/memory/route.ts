import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const agent_id = searchParams.get("agent_id");

    let query = supabase
      .from("memory_entries")
      .select("id, content, category, agent_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (category) query = query.eq("category", category);
    if (agent_id) query = query.eq("agent_id", agent_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
