import { NextRequest, NextResponse } from "next/server";

// Gateway proxy — calls OpenClaw gateway /tools/invoke
const GATEWAY_URL = "http://localhost:18789";

function getGatewayToken(): string {
  // In Vercel, we can't access localhost. Use env var for the EC2 bridge proxy.
  return process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_TOKEN || "";
}

// This route runs server-side but needs to reach the gateway.
// On Vercel (serverless), we proxy through the EC2 bridge.
// Locally, we hit localhost:18789 directly.
const BRIDGE_URL = process.env.CHAT_GATEWAY_URL || "";
const BRIDGE_TOKEN = process.env.CHAT_GATEWAY_TOKEN || "";

async function invokeGatewayTool(tool: string, args: Record<string, unknown>): Promise<unknown> {
  // Try direct gateway first (works when running locally / in container)
  try {
    const directRes = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getGatewayToken()}`,
      },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(15000),
    });
    if (directRes.ok) {
      const data = await directRes.json();
      if (data.ok) return data.result;
    }
  } catch {
    // Direct failed (probably on Vercel) — try bridge proxy
  }

  // Fallback: proxy through EC2 bridge
  if (BRIDGE_URL && BRIDGE_TOKEN) {
    const bridgeRes = await fetch(`${BRIDGE_URL}/gateway-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BRIDGE_TOKEN}`,
      },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(15000),
    });
    if (bridgeRes.ok) {
      const data = await bridgeRes.json();
      return data.result || data;
    }
  }

  throw new Error("Cannot reach gateway");
}

// GET — list active sessions
export async function GET(req: NextRequest) {
  const minutes = parseInt(req.nextUrl.searchParams.get("minutes") || "60");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  try {
    const result = await invokeGatewayTool("sessions_list", {
      activeMinutes: minutes,
      limit,
    }) as Record<string, unknown>;

    // Parse sessions from gateway response
    const details = result?.details as Record<string, unknown> | undefined;
    const sessions = (details?.sessions || []) as Array<Record<string, unknown>>;

    const parsed = sessions.map(s => ({
      key: s.sessionKey || s.key || "",
      label: s.label || s.displayName || s.key || "",
      model: s.model || "unknown",
      totalTokens: s.totalTokens || 0,
      contextTokens: s.contextTokens || 0,
      contextPercent: s.contextTokens ? Math.round(((s.totalTokens as number) / (s.contextTokens as number)) * 100) : 0,
      channel: s.channel || "unknown",
      updatedAt: s.updatedAt || 0,
      sessionId: s.sessionId || "",
    }));

    return NextResponse.json({ sessions: parsed, count: parsed.length });
  } catch (error) {
    return NextResponse.json({ sessions: [], count: 0, error: String(error) }, { status: 502 });
  }
}

// POST — spawn a new session or send a message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "spawn";

    if (action === "spawn") {
      const result = await invokeGatewayTool("sessions_spawn", {
        task: body.task,
        label: body.label || `canvas-${Date.now()}`,
        model: body.model || "claude-sonnet-4-6",
        mode: "run",
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "send") {
      const result = await invokeGatewayTool("sessions_send", {
        sessionKey: body.sessionKey,
        message: body.message,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "history") {
      const result = await invokeGatewayTool("sessions_history", {
        sessionKey: body.sessionKey,
        limit: body.limit || 20,
        includeTools: body.includeTools ?? false,
      });
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 502 });
  }
}
