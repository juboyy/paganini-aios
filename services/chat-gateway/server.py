"""
Paganini AIOS Chat Gateway — FastAPI proxy on EC2
Routes dashboard chat through the Paganini kernel persona.
Auth: Bearer token. Rate limited. Streaming SSE.
Provider: Google Gemini (primary), OpenAI (fallback).
"""

import os
import json
import time
from collections import defaultdict
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# ── Config ──
GATEWAY_TOKEN = os.environ.get("GATEWAY_TOKEN", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
MODEL = os.environ.get("CHAT_MODEL", "gemini-2.5-flash")
MAX_REQUESTS_PER_MINUTE = int(os.environ.get("RATE_LIMIT", "20"))
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://dashboard-v2-pearl-rho.vercel.app"
).split(",")

SYSTEM_PROMPT = """Você é o kernel do Paganini AIOS — um sistema operacional de inteligência artificial para FIDCs (Fundos de Investimento em Direitos Creditórios) brasileiros.

Você orquestra 9 agentes especializados em FIDC:
1. Admin Agent — gestão administrativa do fundo
2. Compliance Agent — conformidade regulatória (CVM 175, BACEN)
3. Custódia Agent — controle de lastro e custódia
4. Due Diligence Agent — análise de cedentes e sacados
5. Gestor Agent — gestão de carteira e alocação
6. IR Agent — relações com investidores e reporting
7. Pricing Agent — precificação de recebíveis
8. Reg Watch Agent — monitoramento regulatório em tempo real
9. Reporting Agent — geração de relatórios (CADOC, CVM, ANBIMA)

E 12 agentes de código (OraCLI, Code, Docs, Infra, General, Architect, PM, Data, Codex, QA, Security).

Infraestrutura:
- Hybrid RAG: 164 documentos regulatórios, 6.993 chunks com embeddings
- 6 guardrail gates: Eligibility → Concentration → Covenant → PLD/AML → Compliance → Risk
- Modelo base: Qwen3.5-27B fine-tuned com SFT + GRPO (reward function de compliance regulatória)
- Pipeline: 47 segundos por operação completa (6 gates)
- Stack: Python, FastAPI, Docker, Kubernetes, pgvector, Supabase

Responda de forma técnica, precisa e concisa. Use dados concretos quando possível.
Formate com monospace/tabelas quando apropriado.
Responda sempre em português brasileiro.
Quando perguntarem sobre status, guardrails, operações ou métricas, gere dados realistas de demonstração consistentes."""

# ── App ──
app = FastAPI(title="Paganini Chat Gateway", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Rate limiter ──
rate_buckets: dict[str, list[float]] = defaultdict(list)

def check_rate_limit(token: str):
    now = time.time()
    rate_buckets[token] = [t for t in rate_buckets[token] if now - t < 60]
    if len(rate_buckets[token]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(429, detail="Rate limit exceeded. Max 20 req/min.")
    rate_buckets[token].append(now)

# ── Auth ──
async def verify_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, detail="Missing bearer token")
    token = auth[7:]
    if token != GATEWAY_TOKEN:
        raise HTTPException(403, detail="Invalid token")
    check_rate_limit(token)
    return token

# ── Models ──
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    agent: str = "auto"

# ── Audit log ──
audit_log: list[dict] = []

def log_request(req: ChatRequest, ip: str):
    entry = {
        "ts": time.time(),
        "ip": ip,
        "agent": req.agent,
        "msg_count": len(req.messages),
        "last_msg": req.messages[-1].content[:100] if req.messages else "",
    }
    audit_log.append(entry)
    if len(audit_log) > 1000:
        audit_log.pop(0)


# ── Gemini Streaming ──
async def stream_gemini(messages: list[dict]) -> AsyncGenerator[str, None]:
    """Stream via Gemini generateContent with SSE."""
    # Convert OpenAI-style messages to Gemini format
    contents = []
    for m in messages[-20:]:
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}"
        f":streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            if response.status_code != 200:
                err_body = ""
                async for chunk in response.aiter_text():
                    err_body += chunk
                    if len(err_body) > 300:
                        break
                yield f"data: {json.dumps({'error': f'Gemini {response.status_code}: {err_body[:200]}'})}\n\n"
                return

            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                lines = buffer.split("\n")
                buffer = lines.pop()

                for line in lines:
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data == "[DONE]":
                        continue
                    try:
                        parsed = json.loads(data)
                        candidates = parsed.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            for part in parts:
                                text = part.get("text", "")
                                if text:
                                    yield f"data: {json.dumps({'content': text})}\n\n"
                    except json.JSONDecodeError:
                        pass

    yield "data: [DONE]\n\n"


# ── OpenAI Streaming (fallback) ──
async def stream_openai(messages: list[dict]) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages[-20:],
                "temperature": 0.7,
                "max_tokens": 2048,
                "stream": True,
            },
        ) as response:
            if response.status_code != 200:
                yield f"data: {json.dumps({'error': f'OpenAI {response.status_code}'})}\n\n"
                return

            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                lines = buffer.split("\n")
                buffer = lines.pop()

                for line in lines:
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data == "[DONE]":
                        continue
                    try:
                        parsed = json.loads(data)
                        content = parsed.get("choices", [{}])[0].get("delta", {}).get("content")
                        if content:
                            yield f"data: {json.dumps({'content': content})}\n\n"
                    except json.JSONDecodeError:
                        pass

    yield "data: [DONE]\n\n"


# ── Route selector ──
def get_streamer(messages: list[dict]):
    if GEMINI_API_KEY:
        return stream_gemini(messages)
    elif OPENAI_API_KEY:
        return stream_openai(messages)
    else:
        async def error_stream():
            yield f"data: {json.dumps({'error': 'No API key configured'})}\n\n"
            yield "data: [DONE]\n\n"
        return error_stream()


# ── Routes ──
@app.get("/health")
async def health():
    provider = "gemini" if GEMINI_API_KEY else "openai" if OPENAI_API_KEY else "none"
    return {
        "status": "live",
        "service": "paganini-chat-gateway",
        "model": MODEL,
        "provider": provider,
        "agents": 21,
        "rate_limit": f"{MAX_REQUESTS_PER_MINUTE}/min",
    }

@app.get("/audit")
async def get_audit(token: str = Depends(verify_token)):
    return {"entries": audit_log[-50:]}

@app.post("/chat")
async def chat(req: ChatRequest, request: Request, token: str = Depends(verify_token)):
    ip = request.client.host if request.client else "unknown"
    log_request(req, ip)

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    return StreamingResponse(
        get_streamer(messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Agent": req.agent,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
