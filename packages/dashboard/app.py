"""PAGANINI AIOS — Dashboard MVP.

Gate Token: GATE-2026-03-14T224033:701eaf7fa32c

FastAPI-based web dashboard for fund operations. Exposes a REST API for
agent status, query execution, report generation, and memory statistics,
plus a single-page HTML frontend at ``GET /``.

Package: packages.dashboard.app
Factory: create_app(config: dict) -> FastAPI
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional dependency guard — FastAPI + Uvicorn are not in pyproject.toml
# ---------------------------------------------------------------------------
try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import HTMLResponse, JSONResponse
    from pydantic import BaseModel

    _FASTAPI_AVAILABLE = True
except ImportError:  # pragma: no cover
    _FASTAPI_AVAILABLE = False
    FastAPI = None  # type: ignore[assignment, misc]

if not _FASTAPI_AVAILABLE:  # pragma: no cover
    def create_app(config: dict) -> Any:  # noqa: ANN401
        raise RuntimeError(
            "FastAPI and Uvicorn are required to run the PAGANINI dashboard.\n"
            "Install them with:  pip install fastapi uvicorn[standard]\n"
        )


# ---------------------------------------------------------------------------
# Pydantic request models (only defined when FastAPI is available)
# ---------------------------------------------------------------------------

if _FASTAPI_AVAILABLE:
    class ReportRequest(BaseModel):
        template_id: str
        fund_id: str


# ---------------------------------------------------------------------------
# Inline HTML dashboard
# ---------------------------------------------------------------------------

_DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PAGANINI AIOS — Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { DEFAULT: '#7c3aed', dark: '#5b21b6', light: '#a78bfa' },
          },
        },
      },
    };
  </script>
  <style>
    body { background: #0f0f17; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
    .pulse-dot { animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background:#7c3aed; border-radius:2px; }
  </style>
</head>
<body class="dark text-gray-100 min-h-screen font-mono">

  <!-- Header -->
  <header class="border-b border-white/10 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="text-brand text-2xl font-bold tracking-widest">PAGANINI</span>
      <span class="text-xs text-gray-500 uppercase tracking-widest">AIOS Dashboard</span>
    </div>
    <div id="health-badge" class="flex items-center gap-2 text-xs">
      <span class="pulse-dot w-2 h-2 rounded-full bg-gray-500 inline-block"></span>
      <span class="text-gray-400">connecting…</span>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-6 py-8 grid gap-6">

    <!-- Status card -->
    <section class="card rounded-xl p-6">
      <h2 class="text-xs uppercase tracking-widest text-gray-400 mb-4">System Status</h2>
      <div id="status-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div><div id="st-chunks" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">RAG Chunks</div></div>
        <div><div id="st-agents" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">Agents</div></div>
        <div><div id="st-daemons" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">Daemons</div></div>
        <div><div id="st-meta" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">MetaClaw</div></div>
      </div>
    </section>

    <!-- Two-column: agents + query -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Agents -->
      <section class="card rounded-xl p-6">
        <h2 class="text-xs uppercase tracking-widest text-gray-400 mb-4">Agents</h2>
        <ul id="agents-list" class="space-y-2 text-sm text-gray-300">
          <li class="text-gray-600 italic">loading…</li>
        </ul>
      </section>

      <!-- Query -->
      <section class="card rounded-xl p-6 flex flex-col gap-4">
        <h2 class="text-xs uppercase tracking-widest text-gray-400">Query</h2>
        <div class="flex gap-2">
          <input id="q-input" type="text" placeholder="Ask anything about the fund…"
            class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand"
          />
          <input id="q-fund" type="text" placeholder="fund id"
            class="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand"
          />
          <button onclick="runQuery()"
            class="bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Ask
          </button>
        </div>
        <div id="q-result" class="hidden card rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap"></div>
        <div>
          <div class="text-xs uppercase tracking-widest text-gray-500 mb-2">Recent Queries</div>
          <ul id="recent-queries" class="space-y-1 text-xs text-gray-500 max-h-40 overflow-y-auto"></ul>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="text-center text-xs text-gray-700 py-2">
      PAGANINI AIOS · <span id="footer-ts"></span>
    </footer>
  </main>

  <script>
    const api = (path) => fetch(path).then(r => r.json()).catch(() => ({}));

    async function loadStatus() {
      const [status, agents] = await Promise.all([api('/api/status'), api('/api/agents')]);
      document.getElementById('st-chunks').textContent = status.chunks ?? '—';
      document.getElementById('st-agents').textContent = status.agents ?? '—';
      document.getElementById('st-daemons').textContent = status.daemons ?? '—';
      document.getElementById('st-meta').textContent = status.metaclaw ?? '—';
      const badge = document.getElementById('health-badge');
      badge.innerHTML = status.ok !== false
        ? '<span class="pulse-dot w-2 h-2 rounded-full bg-green-500 inline-block"></span><span class="text-green-400">healthy</span>'
        : '<span class="pulse-dot w-2 h-2 rounded-full bg-red-500 inline-block"></span><span class="text-red-400">degraded</span>';

      const list = document.getElementById('agents-list');
      if (agents.agents?.length) {
        list.innerHTML = agents.agents.map(a =>
          `<li class="flex justify-between"><span>${a.name}</span><span class="text-gray-500">${(a.domains||[]).join(', ')}</span></li>`
        ).join('');
      }
    }

    async function runQuery() {
      const q = document.getElementById('q-input').value.trim();
      const fundId = document.getElementById('q-fund').value.trim();
      if (!q) return;
      const resultEl = document.getElementById('q-result');
      resultEl.textContent = '⏳ thinking…';
      resultEl.classList.remove('hidden');
      const url = `/api/query?q=${encodeURIComponent(q)}${fundId ? '&fund_id=' + encodeURIComponent(fundId) : ''}`;
      const data = await api(url);
      resultEl.textContent = data.answer || JSON.stringify(data, null, 2);
      const recent = document.getElementById('recent-queries');
      const li = document.createElement('li');
      li.textContent = `${new Date().toLocaleTimeString()} · ${q.slice(0, 80)}`;
      recent.prepend(li);
    }

    document.getElementById('q-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') runQuery();
    });

    document.getElementById('footer-ts').textContent = new Date().toISOString();
    loadStatus();
    setInterval(loadStatus, 30000);
  </script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app(config: dict) -> "FastAPI":  # noqa: F821
    """Create and configure the PAGANINI dashboard FastAPI application.

    Args:
        config: PAGANINI AIOS configuration dict (same as used elsewhere).

    Returns:
        Configured ``FastAPI`` instance. Run with uvicorn:
        ``uvicorn packages.dashboard.app:app --reload``
    """
    if not _FASTAPI_AVAILABLE:
        raise RuntimeError(
            "FastAPI and Uvicorn are required to run the PAGANINI dashboard.\n"
            "Install them with:  pip install fastapi uvicorn[standard]\n"
        )

    # Lazy imports of PAGANINI modules (avoids hard dep at import time)
    from packages.agents.framework import AgentRegistry
    from packages.kernel.daemons import DaemonRunner
    from packages.kernel.memory import MemoryManager
    from packages.kernel.moltis import get_llm_fn
    from packages.rag.pipeline import RAGPipeline
    from packages.shared.guardrails import GuardrailPipeline

    # Initialise sub-systems once at startup
    rag = RAGPipeline(config)
    guardrails = GuardrailPipeline(config)
    memory = MemoryManager(config)
    llm_fn = get_llm_fn(config)
    registry = AgentRegistry(config)
    daemons = DaemonRunner(config)

    app = FastAPI(
        title="PAGANINI AIOS Dashboard",
        description="Fund operations dashboard — REST API + SPA frontend.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ----------------------------------------------------------------
    # GET /
    # ----------------------------------------------------------------

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    async def root() -> HTMLResponse:
        return HTMLResponse(content=_DASHBOARD_HTML)

    # ----------------------------------------------------------------
    # GET /api/health
    # ----------------------------------------------------------------

    @app.get("/api/health")
    async def health() -> dict:
        return {"ok": True, "service": "paganini-dashboard"}

    # ----------------------------------------------------------------
    # GET /api/status
    # ----------------------------------------------------------------

    @app.get("/api/status")
    async def status() -> dict:
        try:
            chunks = rag.chunk_count()
        except Exception as exc:
            logger.warning("rag.chunk_count failed: %s", exc)
            chunks = None

        try:
            agent_list = registry.list_agents()
            agent_count = len(agent_list)
        except Exception as exc:
            logger.warning("registry.list_agents failed: %s", exc)
            agent_count = None

        try:
            daemon_list = daemons.status()
            daemon_count = len(daemon_list) if isinstance(daemon_list, list) else None
        except Exception as exc:
            logger.warning("daemons.status failed: %s", exc)
            daemon_count = None

        metaclaw = config.get("metaclaw", {}).get("enabled", False)

        return {
            "ok": True,
            "chunks": chunks,
            "agents": agent_count,
            "daemons": daemon_count,
            "metaclaw": "active" if metaclaw else "inactive",
        }

    # ----------------------------------------------------------------
    # GET /api/agents
    # ----------------------------------------------------------------

    @app.get("/api/agents")
    async def agents() -> dict:
        try:
            agent_list = registry.list_agents()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"agents": agent_list}

    # ----------------------------------------------------------------
    # GET /api/daemons
    # ----------------------------------------------------------------

    @app.get("/api/daemons")
    async def daemon_status() -> dict:
        try:
            result = daemons.status()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"daemons": result}

    # ----------------------------------------------------------------
    # GET /api/query
    # ----------------------------------------------------------------

    @app.get("/api/query")
    async def query(
        q: str = Query(..., description="Natural language question"),
        fund_id: str | None = Query(None, description="Fund identifier for isolation"),
    ) -> dict:
        if not q.strip():
            raise HTTPException(status_code=400, detail="Query parameter 'q' cannot be empty.")

        # Guardrail pre-check
        guard_result = guardrails.check(q, context={"fund_id": fund_id})
        if guard_result.get("blocked"):
            raise HTTPException(
                status_code=403,
                detail=f"Request blocked by guardrails: {guard_result.get('reason')}",
            )

        try:
            rag_result = rag.run(query=q, fund_id=fund_id)
        except Exception as exc:
            logger.error("RAG pipeline error: %s", exc)
            raise HTTPException(status_code=500, detail="RAG pipeline error.") from exc

        answer = rag_result.get("answer", "")
        confidence = float(rag_result.get("confidence", 0.0))
        sources = rag_result.get("sources", [])

        # Persist to memory
        try:
            memory.store({"query": q, "answer": answer, "fund_id": fund_id, "confidence": confidence})
        except Exception as exc:
            logger.warning("Memory store failed: %s", exc)

        return {
            "answer": answer,
            "confidence": confidence,
            "sources": sources,
            "fund_id": fund_id,
        }

    # ----------------------------------------------------------------
    # GET /api/reports
    # ----------------------------------------------------------------

    REPORT_TEMPLATES = {
        "monthly": "Monthly LP Update",
        "quarterly": "Quarterly Fund Report",
        "annual": "Annual Letter",
        "nav": "NAV Statement",
        "capital_call": "Capital Call Notice",
    }

    @app.get("/api/reports")
    async def list_reports() -> dict:
        return {
            "templates": [
                {"id": k, "name": v} for k, v in REPORT_TEMPLATES.items()
            ]
        }

    # ----------------------------------------------------------------
    # POST /api/reports/generate
    # ----------------------------------------------------------------

    @app.post("/api/reports/generate")
    async def generate_report(request: "ReportRequest") -> dict:  # noqa: F821
        if request.template_id not in REPORT_TEMPLATES:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown template '{request.template_id}'. "
                       f"Valid: {list(REPORT_TEMPLATES.keys())}",
            )
        template_name = REPORT_TEMPLATES[request.template_id]
        prompt = (
            f"Generate a {template_name} for fund {request.fund_id}. "
            "Use all available fund data. Be concise and professional."
        )

        try:
            rag_result = rag.run(query=prompt, fund_id=request.fund_id)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Report generation failed.") from exc

        return {
            "template_id": request.template_id,
            "template_name": template_name,
            "fund_id": request.fund_id,
            "content": rag_result.get("answer", ""),
            "confidence": float(rag_result.get("confidence", 0.0)),
            "sources": rag_result.get("sources", []),
        }

    # ----------------------------------------------------------------
    # GET /api/memory/stats
    # ----------------------------------------------------------------

    @app.get("/api/memory/stats")
    async def memory_stats() -> dict:
        try:
            stats = memory.stats()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return stats

    # ----------------------------------------------------------------
    # Global exception handler
    # ----------------------------------------------------------------

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Any, exc: Exception) -> JSONResponse:  # noqa: ANN401
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error.", "error": str(exc)},
        )

    return app
