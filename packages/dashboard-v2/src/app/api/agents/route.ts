import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("id, name, emoji, status, model, tasks_completed, avg_time, error_rate, total_cost, role, title, provider, uptime")
      .order("tasks_completed", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
