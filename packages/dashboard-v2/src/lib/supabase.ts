import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

/* ── Context fetchers for Chat RAG ── */

export async function getAgentsSummary() {
  const { data } = await supabase
    .from("agents")
    .select("id, name, emoji, status, model, tasks_completed, avg_time, error_rate, total_cost, role, title")
    .order("tasks_completed", { ascending: false });
  return data || [];
}

export async function getRecentTasks(limit = 10) {
  const { data } = await supabase
    .from("tasks")
    .select("id, name, status, agent_id, cost, tokens, duration, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getRecentTimeline(limit = 10) {
  const { data } = await supabase
    .from("timeline_events")
    .select("title, description, type, agent_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getCapabilities() {
  const { data } = await supabase
    .from("capabilities")
    .select("name, kind, status, agents, description")
    .eq("status", "active")
    .order("name");
  return data || [];
}

export async function getDailyCosts(days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_costs")
    .select("date, total, openai, anthropic, google")
    .gte("date", since)
    .order("date", { ascending: false });
  return data || [];
}

export async function getPipelineRuns(limit = 5) {
  const { data } = await supabase
    .from("pipeline_runs")
    .select("id, title, status, current_stage, total_tokens, total_cost, duration_ms, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getRecentTraces(limit = 5) {
  const { data } = await supabase
    .from("traces")
    .select("name, agent_id, status, duration, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getInteractions(limit = 10) {
  const { data } = await supabase
    .from("interactions")
    .select("from_agent, to_agent, type, message, tokens, latency, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

/* ── Build enriched context for chat ── */
export async function buildChatContext(): Promise<string> {
  const [agents, tasks, timeline, costs, pipelines, traces] = await Promise.all([
    getAgentsSummary(),
    getRecentTasks(8),
    getRecentTimeline(8),
    getDailyCosts(7),
    getPipelineRuns(3),
    getRecentTraces(5),
  ]);

  const sections: string[] = [];

  if (agents.length) {
    sections.push(
      `## Agentes (${agents.length} registrados)\n` +
      agents.map((a) => `- ${a.emoji || "•"} ${a.name} (${a.id}): ${a.status} | ${a.role || a.title} | ${a.tasks_completed} tasks | custo total: $${a.total_cost?.toFixed(2) || "0"} | modelo: ${a.model}`).join("\n")
    );
  }

  if (tasks.length) {
    sections.push(
      `## Tarefas Recentes\n` +
      tasks.map((t) => `- [${t.status}] ${t.name} (${t.agent_id}) — ${t.tokens} tokens, $${t.cost?.toFixed(2) || "0"} — ${t.created_at}`).join("\n")
    );
  }

  if (timeline.length) {
    sections.push(
      `## Timeline\n` +
      timeline.map((e) => `- [${e.type}] ${e.title}: ${e.description?.slice(0, 100) || "—"} (${e.agent_id}, ${e.created_at})`).join("\n")
    );
  }

  if (costs.length) {
    sections.push(
      `## Custos (últimos 7 dias)\n` +
      costs.map((c) => `- ${c.date}: $${c.total?.toFixed(2)} (OpenAI: $${c.openai?.toFixed(2)}, Anthropic: $${c.anthropic?.toFixed(2)}, Google: $${c.google?.toFixed(2)})`).join("\n")
    );
  }

  if (pipelines.length) {
    sections.push(
      `## Pipeline Runs Recentes\n` +
      pipelines.map((p) => `- ${p.title || p.id}: ${p.status} | stage: ${p.current_stage} | ${p.total_tokens} tokens | $${p.total_cost?.toFixed(2) || "0"}`).join("\n")
    );
  }

  if (traces.length) {
    sections.push(
      `## Traces Recentes\n` +
      traces.map((t) => `- ${t.name} (${t.agent_id}): ${t.status} | ${t.duration} | ${t.error || "ok"}`).join("\n")
    );
  }

  return sections.join("\n\n");
}
