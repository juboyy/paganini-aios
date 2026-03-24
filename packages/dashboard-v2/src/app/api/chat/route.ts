import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GATEWAY_URL = process.env.CHAT_GATEWAY_URL || "";
const GATEWAY_TOKEN = process.env.CHAT_GATEWAY_TOKEN || "";

async function buildChatContext(): Promise<string> {
  try {
    const [agents, timeline, tasks] = await Promise.all([
      supabase.from("agents").select("name,status,tasks_completed,model").order("tasks_completed", { ascending: false }).limit(10),
      supabase.from("timeline_events").select("title,type,created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("tasks").select("name,status,agent_id,cost").order("created_at", { ascending: false }).limit(5),
    ]);

    const parts: string[] = [];
    if (agents.data?.length) {
      parts.push("Agents: " + agents.data.map(a => `${a.name}(${a.status})`).join(", "));
    }
    if (timeline.data?.length) {
      parts.push("Recent events: " + timeline.data.map(e => e.title).join("; "));
    }
    if (tasks.data?.length) {
      parts.push("Recent tasks: " + tasks.data.map(t => `${t.name}(${t.status})`).join("; "));
    }
    return parts.join("\n") || "No context available";
  } catch {
    return "Context unavailable";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages?.slice(-20) || [];
    const agent = body.agent || "auto";
    const mode = body.mode || "ai";
    const tileId = body.tileId || "main-chat";
    const sessionId = body.sessionId;

    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: "Chat gateway not configured" },
        { status: 503 }
      );
    }

    // Get context from Supabase
    const context = await buildChatContext();

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Build enriched messages for AI mode
    const enrichedMessages = context
      ? [
          {
            role: "user" as const,
            content: `[CONTEXTO SISTEMA — dados Supabase real-time]\n\n${context}\n\n---\nUse esses dados para responder. Se algo não estiver nos dados, indique como estimativa.`,
          },
          {
            role: "assistant" as const,
            content: "Contexto carregado. Pronto.",
          },
          ...messages,
        ]
      : messages;

    if (mode === "bridge") {
      // Bridge mode — forward to OraCLI via Telegram
      const response = await fetch(`${GATEWAY_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          message: lastMessage,
          mode: "bridge",
          tile_id: tileId,
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      return NextResponse.json({
        ...data,
        note: "Mensagem enviada ao OraCLI. Resposta chegará na sessão.",
      });
    }

    // AI mode — stream Gemini via gateway
    const response = await fetch(`${GATEWAY_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        message: lastMessage,
        messages: enrichedMessages,
        mode: "ai",
        tile_id: tileId,
        session_id: sessionId,
        agent,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gateway error: ${response.status}` },
        { status: response.status }
      );
    }

    const stream = response.body;
    if (!stream) {
      return NextResponse.json({ error: "No response stream" }, { status: 502 });
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — fetch message history for a session
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const tileId = req.nextUrl.searchParams.get("tileId");
  const after = req.nextUrl.searchParams.get("after");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  try {
    let query = supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (sessionId) query = query.eq("session_id", sessionId);
    if (tileId) query = query.eq("tile_id", tileId);
    if (after) query = query.gt("created_at", after);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([]);
  }
}
