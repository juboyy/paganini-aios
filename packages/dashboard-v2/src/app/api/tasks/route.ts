import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let query = supabase
      .from("tasks")
      .select("id, name, status, agent_id, cost, tokens, created_at, completed_at, priority")
      .order("created_at", { ascending: false })
      .limit(20);

    if (statusFilter) {
      const statuses = statusFilter.split(",");
      query = query.in("status", statuses);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, agent_id, priority } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Task name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        name: name.trim(),
        agent_id: agent_id || null,
        priority: priority || "medium",
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id, name, status, agent_id, priority, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
