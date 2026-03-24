import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const [interactionsRes, agentsRes] = await Promise.all([
      supabase
        .from("interactions")
        .select("from_agent, to_agent, type, tokens, latency, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("agents")
        .select("id, name, emoji, status, model")
        .order("name"),
    ]);

    const interactions = interactionsRes.data || [];
    const agents = agentsRes.data || [];

    // Group interactions by from_agent→to_agent pair
    const pairMap = new Map<string, { from_agent: string; to_agent: string; count: number; types: Record<string, number>; total_tokens: number }>();

    for (const interaction of interactions) {
      const key = `${interaction.from_agent}→${interaction.to_agent}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, {
          from_agent: interaction.from_agent,
          to_agent: interaction.to_agent,
          count: 0,
          types: {},
          total_tokens: 0,
        });
      }
      const pair = pairMap.get(key)!;
      pair.count++;
      pair.total_tokens += interaction.tokens || 0;
      if (interaction.type) {
        pair.types[interaction.type] = (pair.types[interaction.type] || 0) + 1;
      }
    }

    const pairs = Array.from(pairMap.values()).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      pairs,
      agents,
      totalInteractions: interactions.length,
    });
  } catch (err) {
    console.error("symphony route error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
