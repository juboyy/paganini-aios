import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.CHAT_GATEWAY_URL || "";
const GATEWAY_TOKEN = process.env.CHAT_GATEWAY_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!GATEWAY_URL || !GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: "Chat gateway not configured" },
        { status: 503 }
      );
    }

    const response = await fetch(`${GATEWAY_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        messages: body.messages?.slice(-20) || [],
        agent: body.agent || "auto",
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
      return NextResponse.json(
        { error: "No response stream" },
        { status: 502 }
      );
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
