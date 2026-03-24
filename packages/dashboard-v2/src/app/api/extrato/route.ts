import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export interface ExtratoEntry {
  id: string;
  timestamp: string; // ISO string
  type: "task" | "interaction" | "event" | "trace";
  agent_id: string;
  title: string;
  status: string;
  cost?: number;
  tokens?: number;
  duration?: number | string | null;
  detail?: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const agentFilter = searchParams.get("agent") || "";
  const typeFilter = searchParams.get("type") || "";
  const statusFilter = searchParams.get("status") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
  const fetchLimit = 1000; // Fetch more per table for accurate stats

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  try {
    // Fetch all 4 tables in parallel
    const [tasksRes, interactionsRes, eventsRes, tracesRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, name, status, agent_id, cost, tokens, duration, created_at, completed_at, source, priority, mission_id, sprint_id, bmad_stage, github_commit, jira_key")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),

      supabase
        .from("interactions")
        .select("id, from_agent, to_agent, type, message, tokens, latency, mission_id, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),

      supabase
        .from("timeline_events")
        .select("id, title, description, type, agent_id, mission_id, sprint_id, metadata, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),

      supabase
        .from("traces")
        .select("id, name, agent_id, status, duration, error, spans, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
    ]);

    const tasks = tasksRes.data || [];
    const interactions = interactionsRes.data || [];
    const events = eventsRes.data || [];
    const traces = tracesRes.data || [];

    // Get real counts (not capped by fetchLimit)
    const [tasksCnt, intCnt, evtCnt, trcCnt] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .gte("created_at", dayStart).lte("created_at", dayEnd),
      supabase.from("interactions").select("id", { count: "exact", head: true })
        .gte("created_at", dayStart).lte("created_at", dayEnd),
      supabase.from("timeline_events").select("id", { count: "exact", head: true })
        .gte("created_at", dayStart).lte("created_at", dayEnd),
      supabase.from("traces").select("id", { count: "exact", head: true })
        .gte("created_at", dayStart).lte("created_at", dayEnd),
    ]);
    const realCounts = {
      tasks: tasksCnt.count ?? tasks.length,
      interactions: intCnt.count ?? interactions.length,
      events: evtCnt.count ?? events.length,
      traces: trcCnt.count ?? traces.length,
    };

    // Unify into ExtratoEntry[]
    const unified: ExtratoEntry[] = [
      ...tasks.map((t) => ({
        id: `task-${t.id}`,
        timestamp: t.created_at,
        type: "task" as const,
        agent_id: t.agent_id || "unknown",
        title: t.name || "Task sem nome",
        status: t.status || "unknown",
        cost: t.cost,
        tokens: t.tokens,
        duration: t.duration,
        detail: {
          bmad_stage: t.bmad_stage,
          github_commit: t.github_commit,
          jira_key: t.jira_key,
          source: t.source,
          priority: t.priority,
          mission_id: t.mission_id,
          sprint_id: t.sprint_id,
          completed_at: t.completed_at,
        },
      })),

      ...interactions.map((i) => {
        // Estimate cost from tokens if not explicit
        // Approximate: $0.003/1K input + $0.015/1K output (Gemini/Claude blend)
        const estimatedCost = i.tokens ? (i.tokens / 1000) * 0.005 : undefined;
        
        // Parse message for better display
        let parsedTitle = "";
        let parsedMessage = i.message || "";
        try {
          if (parsedMessage.startsWith("{") || parsedMessage.startsWith("[")) {
            const parsed = JSON.parse(parsedMessage);
            if (parsed.content) parsedMessage = parsed.content;
            else if (parsed.text) parsedMessage = parsed.text;
            else if (parsed.message) parsedMessage = parsed.message;
            else if (parsed.tool_call) parsedTitle = `[tool: ${parsed.tool_call.name || "?"}] `;
            else if (parsed.function_call) parsedTitle = `[fn: ${parsed.function_call.name || "?"}] `;
          }
        } catch {}
        
        const preview = parsedMessage.replace(/\n/g, " ").slice(0, 100);
        
        return {
          id: `interaction-${i.id}`,
          timestamp: i.created_at,
          type: "interaction" as const,
          agent_id: i.from_agent || "unknown",
          title: `${i.from_agent || "?"} → ${i.to_agent || "?"}: ${parsedTitle}${preview}${parsedMessage.length > 100 ? "…" : ""}`,
          status: "info",
          cost: estimatedCost,
          tokens: i.tokens,
          detail: {
            from_agent: i.from_agent,
            to_agent: i.to_agent,
            interaction_type: i.type,
            message: parsedMessage,
            latency: i.latency,
            mission_id: i.mission_id,
            estimated_cost: estimatedCost ? true : false,
          },
        };
      }),

      ...events.map((e) => ({
        id: `event-${e.id}`,
        timestamp: e.created_at,
        type: "event" as const,
        agent_id: e.agent_id || "system",
        title: e.title || "Evento",
        status: "info",
        detail: {
          description: e.description,
          event_type: e.type,
          mission_id: e.mission_id,
          sprint_id: e.sprint_id,
          metadata: e.metadata,
        },
      })),

      ...traces.map((t) => ({
        id: `trace-${t.id}`,
        timestamp: t.created_at,
        type: "trace" as const,
        agent_id: t.agent_id || "unknown",
        title: t.name || "Trace",
        status: t.status || "unknown",
        duration: t.duration,
        detail: {
          spans: t.spans,
          error: t.error,
        },
      })),
    ];

    // Apply filters
    let filtered = unified;
    if (agentFilter) filtered = filtered.filter((e) => e.agent_id === agentFilter);
    if (typeFilter) filtered = filtered.filter((e) => e.type === typeFilter);
    if (statusFilter) filtered = filtered.filter((e) => e.status === statusFilter);

    // Sort by timestamp desc
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Compute stats using REAL counts (not capped)
    const stats = {
      total: realCounts.tasks + realCounts.interactions + realCounts.events + realCounts.traces,
      tasks: realCounts.tasks,
      interactions: realCounts.interactions,
      events: realCounts.events,
      traces: realCounts.traces,
      totalCost: filtered.reduce((s, e) => s + (e.cost || 0), 0),
      totalTokens: filtered.reduce((s, e) => s + (e.tokens || 0), 0),
      agents: [...new Set(filtered.map((e) => e.agent_id))],
    };

    // Apply limit AFTER stats
    const entries = filtered.slice(0, limit);

    return NextResponse.json({ entries, stats, date });
  } catch (err) {
    console.error("[extrato] error:", err);
    return NextResponse.json({ entries: [], stats: null, date, error: String(err) }, { status: 500 });
  }
}
