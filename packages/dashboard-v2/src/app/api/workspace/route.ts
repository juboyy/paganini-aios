import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = "http://localhost:18789";
const BRIDGE_URL = process.env.CHAT_GATEWAY_URL || "";
const BRIDGE_TOKEN = process.env.CHAT_GATEWAY_TOKEN || "";

function getGatewayToken(): string {
  return process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_TOKEN || "";
}

async function invokeGatewayTool(tool: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getGatewayToken()}`,
      },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) return data.result;
    }
  } catch {}

  if (BRIDGE_URL && BRIDGE_TOKEN) {
    const res = await fetch(`${BRIDGE_URL}/gateway-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BRIDGE_TOKEN}`,
      },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return (await res.json()).result || (await res.json());
  }
  throw new Error("Cannot reach gateway");
}

// GET — list directory or read file
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") || "/home/node/.openclaw/workspace";
  const action = req.nextUrl.searchParams.get("action") || "list";

  try {
    if (action === "list") {
      const result = await invokeGatewayTool("exec", {
        command: `ls -la --time-style=long-iso "${path}" 2>/dev/null | tail -n +2 | head -50`,
        timeout: 5,
      }) as Record<string, unknown>;

      // Parse ls output
      const text = extractText(result);
      const entries = text.split("\n").filter(Boolean).map(line => {
        const parts = line.split(/\s+/);
        const isDir = line.startsWith("d");
        const name = parts.slice(7).join(" ");
        const size = parseInt(parts[4] || "0");
        return { name, isDir, size, perms: parts[0] || "" };
      }).filter(e => e.name && e.name !== "." && e.name !== "..");

      return NextResponse.json({ path, entries });
    }

    if (action === "read") {
      const result = await invokeGatewayTool("read", {
        file_path: path,
        limit: 100,
      }) as Record<string, unknown>;

      const text = extractText(result);
      return NextResponse.json({ path, content: text });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 });
  }
}

function extractText(result: unknown): string {
  if (!result) return "";
  const r = result as Record<string, unknown>;
  if (r.content && Array.isArray(r.content)) {
    return r.content.map((c: { text?: string }) => c.text || "").join("");
  }
  if (typeof r === "string") return r;
  return JSON.stringify(r);
}
