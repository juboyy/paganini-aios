"""
Paganini Chat Bridge v2 — Sistema inteligente unificado.

Toda mensagem recebe resposta AI imediata com:
- Persona do agente selecionado (12 agentes reais do Supabase)
- Contexto real-time do Supabase (agents, tasks, timeline, costs)
- Histórico da conversa do tile
- Persistência automática no Supabase

Sem toggle. Sem espera. Sem Telegram middleman.
"""

import os
import json
import uuid
import httpx
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Paganini Chat Bridge v2")

# ── Config ──
GATEWAY_TOKEN = os.environ.get("GATEWAY_TOKEN", "")
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
    agent: str = "oracli"
    history: Optional[List[dict]] = None

class RespondMessage(BaseModel):
    session_id: Optional[str] = None
    tile_id: Optional[str] = None
    content: str
    agent: str = "oracli"

# ── Agent Personas ──
AGENT_PERSONAS = {
    "oracli": "Você é OraCLI, o kernel central do Paganini AIOS. Você orquestra todos os agentes, gerencia pipelines BMAD-CE, e tem visão completa do sistema. Responda como o cérebro do sistema.",
    "code": "Você é o Code Agent do Paganini AIOS. Especialista em implementação, code review, TypeScript, Python, e qualidade de código. Responda com foco técnico em código.",
    "architect": "Você é o Architect Agent. Responsável por design de sistemas, API contracts, data models, e decisões de arquitetura. Pense em trade-offs e escalabilidade.",
    "infra": "Você é o Infra Agent. Especialista em deploy, Docker, Vercel, AWS, CI/CD, e monitoring. Foco em infraestrutura e operações.",
    "docs": "Você é o Docs Agent. Responsável por documentação, Confluence, knowledge management. Priorize clareza e completude.",
    "general": "Você é o General Agent. Triage, UX review, pesquisa, comunicação. Versátil e pragmático.",
    "pm": "Você é o PM Agent. Sprint planning, stories, priorização, gestão de backlog. Foco em delivery e valor.",
    "data": "Você é o Data Agent. DB schemas, migrations, analytics, qualidade de dados. SQL e modelagem são seu domínio.",
    "qa": "Você é o QA Agent. Testes, coverage, regressão, quality gates. Zero tolerância para bugs em produção.",
    "security": "Você é o Security Agent. Vulnerabilidades, secrets, access control, compliance. Segurança é inegociável.",
    "codex": "Você é o Codex, engine de execução de código. Implementa specs, escreve código, executa testes. Foco em output concreto.",
    "ceo": "Você é o agente do João (CEO). Visão estratégica, prioridades de negócio, ROI. Decisões executivas.",
}

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

# ── Context builder ──
async def build_context(agent: str = "oracli") -> str:
    """Build rich context from Supabase for the AI."""
    parts = []
    try:
        agents, timeline, tasks, costs = await asyncio.gather(
            supabase_query("agents", {
                "select": "id,name,emoji,status,tasks_completed,model,current_task,error_rate,total_cost",
                "order": "tasks_completed.desc",
                "limit": "12",
            }),
            supabase_query("timeline_events", {
                "select": "title,type,agent_id,created_at",
                "order": "created_at.desc",
                "limit": "10",
            }),
            supabase_query("tasks", {
                "select": "name,status,agent_id,cost,tokens,created_at",
                "order": "created_at.desc",
                "limit": "15",
            }),
            supabase_query("daily_costs", {
                "select": "date,total,openai,anthropic,google",
                "order": "date.desc",
                "limit": "7",
            }),
        )
        
        if agents:
            parts.append("## Agentes do Sistema")
            for a in agents:
                status_icon = "🟢" if a.get("status") == "online" else "🔴"
                parts.append(f"- {a.get('emoji','')} {a.get('name','?')} [{status_icon}] — {a.get('tasks_completed',0)} tasks, modelo: {a.get('model','?')}, custo total: ${a.get('total_cost',0):.2f}")
        
        if tasks:
            parts.append("\n## Tasks Recentes")
            for t in tasks[:10]:
                parts.append(f"- [{t.get('status','?')}] {t.get('name','?')[:60]} (agent: {t.get('agent_id','?')}, ${t.get('cost',0):.4f}, {t.get('tokens',0)} tok)")
        
        if timeline:
            parts.append("\n## Timeline (últimos eventos)")
            for e in timeline[:5]:
                parts.append(f"- [{e.get('type','?')}] {e.get('title','?')[:60]} ({e.get('created_at','?')[:16]})")
        
        if costs:
            parts.append("\n## Custos Recentes (7 dias)")
            total_7d = sum(c.get("total", 0) for c in costs)
            parts.append(f"Total 7d: ${total_7d:.2f}")
            for c in costs[:3]:
                parts.append(f"- {c.get('date','?')}: ${c.get('total',0):.2f}")
    
    except Exception as e:
        parts.append(f"[Erro ao buscar contexto: {e}]")
    
    return "\n".join(parts) if parts else "Contexto indisponível"

import asyncio

# ── Gemini streaming ──
async def stream_gemini(message: str, context: str, agent: str, history: list = None):
    """Stream response from Gemini 2.5 Flash with agent persona."""
    if not GEMINI_API_KEY:
        yield 'data: {"text":"API key não configurada"}\n\n'
        yield "data: [DONE]\n\n"
        return

    persona = AGENT_PERSONAS.get(agent, AGENT_PERSONAS["oracli"])
    
    system_prompt = f"""{persona}

Você faz parte do Paganini AIOS — um sistema autônomo de agentes para operações de FIDCs brasileiros.
O sistema tem 12 agentes especializados, pipeline BMAD-CE de 18 estágios, e observabilidade completa.

Dados em tempo real do sistema:
{context}

Regras:
- Responda em português brasileiro
- Seja conciso e direto (sem filler, sem "fico feliz em ajudar")
- Use dados reais do contexto quando relevante
- Se não souber algo, diga "dado não encontrado"
- Referência técnica quando aplicável
- Markdown para formatação
"""

    # Build conversation contents
    contents = []
    if history:
        for h in history[-10:]:  # Last 10 messages for context
            role = "user" if h.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096},
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", url, json=payload) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if text:
                                yield f'data: {json.dumps({"text": text})}\n\n'
                        except (json.JSONDecodeError, IndexError, KeyError):
                            pass
    except Exception as e:
        yield f'data: {json.dumps({"text": f"[Erro: {str(e)[:100]}]"})}\n\n'
    
    yield "data: [DONE]\n\n"

# ── Routes ──

@app.get("/health")
async def health():
    return {
        "status": "live",
        "service": "paganini-chat-bridge-v2",
        "supabase": bool(SUPABASE_URL),
        "gemini": bool(GEMINI_API_KEY),
        "agents": list(AGENT_PERSONAS.keys()),
    }

@app.post("/chat", dependencies=[Depends(verify_token)])
async def chat(msg: ChatMessage):
    """
    Receive message → respond immediately with agent-specific AI.
    All messages persisted to Supabase.
    """
    session_id = msg.session_id or f"canvas-{msg.tile_id or 'main'}"
    
    # Persist user message
    await supabase_insert("chat_messages", {
        "session_id": session_id,
        "tile_id": msg.tile_id,
        "role": "user",
        "content": msg.message,
        "mode": "system",
        "status": "sent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    # Build context and stream response
    context = await build_context(msg.agent)
    
    # Fetch conversation history for this tile
    history = []
    if msg.history:
        history = msg.history
    else:
        try:
            hist_data = await supabase_query("chat_messages", {
                "tile_id": f"eq.{msg.tile_id}" if msg.tile_id else "eq.main",
                "order": "created_at.asc",
                "limit": "20",
            })
            history = [{"role": h.get("role", "user"), "content": h.get("content", "")} for h in hist_data if h.get("role") in ("user", "assistant")]
        except:
            pass
    
    async def generate():
        full_response = []
        async for chunk in stream_gemini(msg.message, context, msg.agent, history):
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
                "mode": "system",
                "status": "delivered",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/respond", dependencies=[Depends(verify_token)])
async def respond(msg: RespondMessage):
    """OraCLI posts a response back (for manual/override responses)."""
    session_id = msg.session_id
    
    if not session_id and msg.tile_id:
        recent = await supabase_query("chat_messages", {
            "tile_id": f"eq.{msg.tile_id}",
            "order": "created_at.desc",
            "limit": "1",
        })
        session_id = recent[0].get("session_id") if recent else f"canvas-{msg.tile_id}"
    
    if not session_id:
        session_id = "default"
    
    await supabase_insert("chat_messages", {
        "session_id": session_id,
        "tile_id": msg.tile_id or "main",
        "role": "assistant",
        "content": msg.content,
        "mode": "system",
        "status": "delivered",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"status": "delivered", "session_id": session_id}

@app.get("/messages", dependencies=[Depends(verify_token)])
async def get_messages(
    session_id: Optional[str] = None,
    tile_id: Optional[str] = None,
    after: Optional[str] = None,
    limit: int = 50,
):
    """Fetch message history."""
    params = {"order": "created_at.asc", "limit": str(min(limit, 200))}
    if session_id:
        params["session_id"] = f"eq.{session_id}"
    if tile_id:
        params["tile_id"] = f"eq.{tile_id}"
    if after:
        params["created_at"] = f"gt.{after}"
    
    return await supabase_query("chat_messages", params)

@app.get("/sessions", dependencies=[Depends(verify_token)])
async def list_sessions(limit: int = 20):
    """List active chat sessions."""
    messages = await supabase_query("chat_messages", {
        "select": "session_id,tile_id,created_at",
        "order": "created_at.desc",
        "limit": str(limit * 5),
    })
    
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
