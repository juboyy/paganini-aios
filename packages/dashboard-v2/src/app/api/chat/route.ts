import { NextRequest, NextResponse } from "next/server";
import { buildChatContext } from "@/lib/supabase";

const GATEWAY_URL = process.env.CHAT_GATEWAY_URL || "";
const GATEWAY_TOKEN = process.env.CHAT_GATEWAY_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages?.slice(-20) || [];
    const agent = body.agent || "auto";

    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: "Chat gateway not configured" },
        { status: 503 }
      );
    }

    // Fetch real-time context from Supabase
    let context = "";
    try {
      context = await buildChatContext();
    } catch (e) {
      // Continue without context if Supabase fails
      console.error("Supabase context fetch failed:", e);
    }

    // Inject context as a system message before user messages
    const enrichedMessages = context
      ? [
          {
            role: "user" as const,
            content: `[CONTEXTO DO SISTEMA — dados em tempo real do Supabase]\n\n${context}\n\n---\nUse esses dados para responder com precisão. Se o usuário perguntar algo que está nos dados acima, use os valores reais. Se não estiver nos dados, gere estimativas realistas e indique que são estimativas.`,
          },
          {
            role: "assistant" as const,
            content: "Contexto carregado. Tenho acesso aos dados em tempo real dos agentes, tarefas, custos, pipeline e timeline. Pronto para responder.",
          },
          ...messages,
        ]
      : messages;

    const response = await fetch(`${GATEWAY_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        messages: enrichedMessages,
        agent,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gateway error: ${response.status}` },
        { status: response.status }
      );
    }

    // Proxy the SSE stream
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
