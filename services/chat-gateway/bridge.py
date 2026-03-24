"""
Paganini Chat Bridge — Unifies dashboard chat with OpenClaw sessions.

Architecture:
  Dashboard (Vercel) → POST /api/chat-bridge → EC2 Bridge → OpenClaw → Response
  
  Messages are persisted to Supabase `chat_messages` table.
  Each canvas tile maps to a session_id.
  Bridge forwards to Telegram bot → OraCLI session.
"""

import os
import json
import time
import uuid
import asyncio
import httpx
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Paganini Chat Bridge")

# ── Config ──
GATEWAY_TOKEN = os.environ.get("GATEWAY_TOKEN", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "5166650114")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "https://dashboard-v2-pearl-rho.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ──
async def verify_token(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")
    if token != GATEWAY_TOKEN:
        raise HTTPException(401, "Invalid token")

# ── Models ──
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    tile_id: Optional[str] = None
    mode: str = "ai"  # "ai" = Gemini response, "bridge" = forward to OraCLI via Telegram

class SessionCreate(BaseModel):
    tile_id: str
    agent: Optional[str] = None
    title: Optional[str] = None

# ── Supabase helpers ──
async def supabase_insert(table: str, data: dict):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            json=data,
            timeout=10,
        )
        return resp.json() if resp.status_code < 300 else None

async def supabase_query(table: str, params: dict = {}):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            params=params,
            timeout=10,
        )
        return resp.json() if resp.status_code < 300 else []

# ── Telegram bridge ──
async def send_to_telegram(text: str, reply_prefix: str = "") -> Optional[dict]:
    """Send a message to OraCLI via Telegram bot."""
    if not TELEGRAM_BOT_TOKEN:
        return None
    
    full_text = f"[Dashboard Chat] {reply_prefix}\n{text}" if reply_prefix else f"[Dashboard Chat]\n{text}"
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": full_text,
                "parse_mode": "Markdown",
            },
            timeout=10,
        )
        return resp.json() if resp.status_code == 200 else None

# ── Gemini streaming (existing functionality) ──
async def stream_gemini(message: str, context: str = ""):
    """Stream response from Gemini 2.5 Flash."""
    if not GEMINI_API_KEY:
        yield "data: Gemini API key not configured\n\n"
        return
    
    system_prompt = f"""You are OraCLI, the AI orchestrator for Paganini AIOS — 
an autonomous agent system for Brazilian credit funds (FIDCs).
You have real-time access to the system's state.

Current context from Supabase:
{context}

Respond in Portuguese (Brazilian). Be concise and technical."""

    payload = {
        "contents": [{"parts": [{"text": message}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096},
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", url, json=payload) as resp:
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text:
                            yield f"data: {json.dumps({'text': text})}\n\n"
                    except (json.JSONDecodeError, IndexError, KeyError):
                        pass
    yield "data: [DONE]\n\n"

# ── Supabase context builder ──
async def build_context() -> str:
    """Build context from Supabase for Gemini."""
    try:
        agents = await supabase_query("agents", {"select": "name,status,tasks_completed,model", "order": "tasks_completed.desc", "limit": "10"})
        timeline = await supabase_query("timeline_events", {"select": "title,type,created_at", "order": "created_at.desc", "limit": "5"})
        
        ctx_parts = []
        if agents:
            ctx_parts.append("Agents: " + ", ".join(f"{a.get('name','?')}({a.get('status','?')})" for a in agents[:5]))
        if timeline:
            ctx_parts.append("Recent: " + "; ".join(e.get("title", "?") for e in timeline[:3]))
        return "\n".join(ctx_parts) if ctx_parts else "No context available"
    except Exception:
        return "Context unavailable"

# ── Routes ──

@app.get("/health")
async def health():
    return {
        "status": "live",
        "service": "paganini-chat-bridge",
        "modes": ["ai", "bridge"],
        "supabase": bool(SUPABASE_URL),
        "telegram": bool(TELEGRAM_BOT_TOKEN),
    }

@app.post("/chat", dependencies=[Depends(verify_token)])
async def chat(msg: ChatMessage):
    """
    Handle chat message. Two modes:
    - "ai": Direct Gemini response (fast, streaming)
    - "bridge": Forward to OraCLI via Telegram (unified context, async)
    """
    session_id = msg.session_id or str(uuid.uuid4())
    
    # Persist user message
    await supabase_insert("chat_messages", {
        "session_id": session_id,
        "tile_id": msg.tile_id,
        "role": "user",
        "content": msg.message,
        "mode": msg.mode,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    if msg.mode == "bridge":
        # Forward to OraCLI via Telegram
        result = await send_to_telegram(msg.message, f"[tile:{msg.tile_id}]")
        
        # Store pending response marker
        await supabase_insert("chat_messages", {
            "session_id": session_id,
            "tile_id": msg.tile_id,
            "role": "assistant",
            "content": "⏳ Mensagem enviada ao OraCLI. Resposta chegará via Telegram.",
            "mode": "bridge",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {
            "session_id": session_id,
            "status": "forwarded",
            "telegram_sent": result is not None,
        }
    
    else:
        # AI mode — stream Gemini response
        context = await build_context()
        
        async def generate():
            full_response = []
            async for chunk in stream_gemini(msg.message, context):
                full_response.append(chunk)
                yield chunk
            
            # Persist assistant response
            response_text = ""
            for c in full_response:
                if c.startswith("data: ") and c.strip() != "data: [DONE]":
                    try:
                        response_text += json.loads(c[6:]).get("text", "")
                    except json.JSONDecodeError:
                        pass
            
            if response_text:
                await supabase_insert("chat_messages", {
                    "session_id": session_id,
                    "tile_id": msg.tile_id,
                    "role": "assistant",
                    "content": response_text,
                    "mode": "ai",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
        
        return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/sessions", dependencies=[Depends(verify_token)])
async def create_session(req: SessionCreate):
    """Create a new chat session for a canvas tile."""
    session_id = str(uuid.uuid4())
    
    await supabase_insert("chat_messages", {
        "session_id": session_id,
        "tile_id": req.tile_id,
        "role": "system",
        "content": f"Session created for tile {req.tile_id}" + (f" (agent: {req.agent})" if req.agent else ""),
        "mode": "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "session_id": session_id,
        "tile_id": req.tile_id,
        "agent": req.agent,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/sessions/{session_id}/messages", dependencies=[Depends(verify_token)])
async def get_messages(session_id: str, limit: int = 50):
    """Get message history for a session."""
    messages = await supabase_query("chat_messages", {
        "session_id": f"eq.{session_id}",
        "order": "created_at.asc",
        "limit": str(limit),
    })
    return messages

@app.get("/sessions", dependencies=[Depends(verify_token)])
async def list_sessions(limit: int = 20):
    """List active chat sessions."""
    # Get unique sessions from chat_messages
    messages = await supabase_query("chat_messages", {
        "select": "session_id,tile_id,created_at",
        "order": "created_at.desc",
        "limit": str(limit * 5),
    })
    
    # Deduplicate by session_id
    seen = {}
    for m in messages:
        sid = m.get("session_id")
        if sid and sid not in seen:
            seen[sid] = {
                "session_id": sid,
                "tile_id": m.get("tile_id"),
                "last_activity": m.get("created_at"),
            }
    
    return list(seen.values())[:limit]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
