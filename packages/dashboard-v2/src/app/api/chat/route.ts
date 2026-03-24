import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GATEWAY_URL = process.env.CHAT_GATEWAY_URL || "";
const GATEWAY_TOKEN = process.env.CHAT_GATEWAY_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages?.slice(-20) || [];
    const agent = body.agent || "oracli";
    const tileId = body.tileId || "main";
    const sessionId = body.sessionId || `canvas-${tileId}`;

    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: "Chat gateway not configured" },
        { status: 503 }
      );
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    // Stream response from bridge
    const response = await fetch(`${GATEWAY_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        message: lastMessage,
        agent,
        tile_id: tileId,
        session_id: sessionId,
        history: messages.slice(-10),
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

// GET — fetch message history
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
