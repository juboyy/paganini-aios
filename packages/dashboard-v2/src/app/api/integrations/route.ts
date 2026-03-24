import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("capabilities")
      .select("id, name, description, kind, status, agents, created_at")
      .eq("kind", "integration")
      .order("name");

    if (error) throw error;

    return NextResponse.json({ integrations: data || [] });
  } catch (err) {
    console.error("integrations route error:", err);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}
