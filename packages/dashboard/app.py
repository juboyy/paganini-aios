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
from pathlib import Path
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
    .gate-pass { border-color: #22c55e44; background: rgba(34,197,94,0.06); }
    .gate-warn { border-color: #eab30844; background: rgba(234,179,8,0.06); }
    .gate-block { border-color: #ef444444; background: rgba(239,68,68,0.06); }
  </style>
</head>
<body class="dark text-gray-100 min-h-screen font-mono">

  <!-- Header -->
  <header class="border-b border-white/10 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="text-brand text-2xl font-bold tracking-widest">PAGANINI</span>
      <span class="text-xs text-gray-500 uppercase tracking-widest">AIOS Dashboard</span>
      <span class="hidden sm:inline text-[10px] text-gray-600 border-l border-white/10 pl-3 ml-1">AI Operating System for Financial Markets</span>
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
      <div id="status-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
        <div><div id="st-funds" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">Funds</div></div>
        <div><div id="st-chunks" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">RAG Chunks</div></div>
        <div><div id="st-skills" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">Skills</div></div>
        <div><div id="st-agents" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">Agents</div></div>
        <div><div id="st-daemons" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">Daemons</div></div>
        <div><div id="st-meta" class="text-3xl font-bold text-brand">—</div><div class="text-xs text-gray-500 mt-1">MetaClaw</div></div>
      </div>
    </section>

    <!-- Guardrails Pipeline -->
    <section class="card rounded-xl p-6">
      <h2 class="text-xs uppercase tracking-widest text-gray-400 mb-4">Guardrail Gates</h2>
      <div id="guardrails-strip" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="gate-card text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">🎯</div>
          <div class="text-xs font-medium text-gray-300">Eligibility</div>
          <div id="g-eligibility" class="text-[10px] mt-1 text-gray-500">—</div>
        </div>
        <div class="gate-card text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">📊</div>
          <div class="text-xs font-medium text-gray-300">Concentration</div>
          <div id="g-concentration" class="text-[10px] mt-1 text-gray-500">—</div>
        </div>
        <div class="gate-card text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">📜</div>
          <div class="text-xs font-medium text-gray-300">Covenant</div>
          <div id="g-covenant" class="text-[10px] mt-1 text-gray-500">—</div>
        </div>
        <div class="gate-card text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">🔍</div>
          <div class="text-xs font-medium text-gray-300">PLD/AML</div>
          <div id="g-pld_aml" class="text-[10px] mt-1 text-gray-500">—</div>
        </div>
        <div class="gate-card text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">⚖️</div>
          <div class="text-xs font-medium text-gray-300">Compliance</div>
          <div id="g-compliance" class="text-[10px] mt-1 text-gray-500">—</div>
        </div>
        <div class="gate-card text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">🛡️</div>
          <div class="text-xs font-medium text-gray-300">Risk</div>
          <div id="g-risk_assessment" class="text-[10px] mt-1 text-gray-500">—</div>
        </div>
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

    <!-- Memory Layers -->
    <section class="card rounded-xl p-6">
      <h2 class="text-xs uppercase tracking-widest text-gray-400 mb-4">Memory Architecture</h2>
      <div id="memory-layers" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">🧠</div>
          <div class="text-xs font-medium text-gray-300">Episodic</div>
          <div id="mem-episodic" class="text-2xl font-bold text-brand mt-1">—</div>
          <div class="text-[10px] text-gray-600 mt-1">interactions</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">📚</div>
          <div class="text-xs font-medium text-gray-300">Semantic</div>
          <div id="mem-semantic" class="text-2xl font-bold text-brand mt-1">—</div>
          <div class="text-[10px] text-gray-600 mt-1">facts</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">⚙️</div>
          <div class="text-xs font-medium text-gray-300">Procedural</div>
          <div id="mem-procedural" class="text-2xl font-bold text-brand mt-1">—</div>
          <div class="text-[10px] text-gray-600 mt-1">patterns</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <div class="text-lg mb-1">🔗</div>
          <div class="text-xs font-medium text-gray-300">Relational</div>
          <div id="mem-relational" class="text-2xl font-bold text-brand mt-1">—</div>
          <div class="text-[10px] text-gray-600 mt-1">entities</div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="text-center text-xs text-gray-700 py-2 flex items-center justify-center gap-3">
      <span class="bg-brand/20 text-brand px-2 py-0.5 rounded text-[10px] font-medium">v0.1.0</span>
      <span>PAGANINI AIOS</span>
      <span>·</span>
      <span id="footer-gates" class="text-gray-500">—</span>
      <span>·</span>
      <span class="text-gray-600">updated</span>
      <span id="footer-ts"></span>
    </footer>
  </main>

  <script>
    const api = (path) => fetch(path).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => null);

    function setOffline() {
      const badge = document.getElementById('health-badge');
      badge.innerHTML = '<span class="pulse-dot w-2 h-2 rounded-full bg-red-500 inline-block"></span><span class="text-red-400">offline — retrying…</span>';
    }

    async function loadStatus() {
      const [status, agents] = await Promise.all([api('/api/status'), api('/api/agents')]);
      if (!status) { setOffline(); return; }
      document.getElementById('footer-ts').textContent = new Date().toLocaleTimeString();
      document.getElementById('st-funds').textContent = status.funds ?? '—';
      document.getElementById('st-chunks').textContent = status.chunks ?? '—';
      // Show onboarding hint if no data loaded
      const qResult = document.getElementById('q-result');
      if (status.chunks === 0 && !qResult.classList.contains('user-query')) {
        qResult.classList.remove('hidden');
        qResult.innerHTML = '<div class="text-gray-500 text-xs">No corpus loaded yet. Run: <code class="bg-white/10 px-1.5 py-0.5 rounded text-brand">paganini ingest data/corpus/fidc/</code></div>';
      }
      document.getElementById('st-skills').textContent = status.skills ?? '—';
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
          `<li class="flex justify-between items-center py-1">
            <div class="flex items-center gap-2">
              <span class="pulse-dot w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              <span>${a.name}</span>
              <span class="text-[10px] bg-brand/20 text-brand px-1.5 py-0.5 rounded">${a.role || ''}</span>
            </div>
            <span class="text-gray-500 text-[10px]">${(a.domains||[]).slice(0,3).join(', ')}</span>
          </li>`
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
      resultEl.classList.add('user-query');
      const url = `/api/query?q=${encodeURIComponent(q)}${fundId ? '&fund_id=' + encodeURIComponent(fundId) : ''}`;
      const data = await api(url);
      if (!data) { resultEl.textContent = '⚠ API offline — start the server with: paganini serve'; return; }
      const conf = data.confidence != null ? data.confidence : 0;
      const confColor = conf >= 0.7 ? 'text-green-400' : conf >= 0.4 ? 'text-yellow-400' : 'text-red-400';
      const srcCount = (data.sources||[]).length;
      resultEl.innerHTML = `<div class="flex items-center gap-2 mb-2 text-[10px]"><span class="${confColor} font-medium">confidence: ${(conf*100).toFixed(0)}%</span><span class="text-gray-600">· ${srcCount} source${srcCount!==1?'s':''}</span></div><div class="whitespace-pre-wrap">${data.answer || JSON.stringify(data, null, 2)}</div>`;
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

    async function loadGuardrails() {
      const data = await api('/api/guardrails');
      if (!data || !data.gates) return;
      for (const g of data.gates) {
        const el = document.getElementById('g-' + g.gate);
        const card = el?.closest('.gate-card');
        if (!el || !card) continue;
        card.classList.remove('gate-pass','gate-warn','gate-block');
        if (g.status === 'active') { card.classList.add('gate-pass'); el.textContent = '✓ active'; el.className = 'text-[10px] mt-1 text-green-400'; }
        else if (g.status === 'warning') { card.classList.add('gate-warn'); el.textContent = '⚠ warning'; el.className = 'text-[10px] mt-1 text-yellow-400'; }
        else if (g.status === 'disabled') { card.classList.add('gate-block'); el.textContent = '✗ off'; el.className = 'text-[10px] mt-1 text-red-400'; }
        else { el.textContent = g.status; }
      }
      const fg = document.getElementById('footer-gates');
      if (fg && data.summary) { fg.textContent = data.summary; fg.classList.add('text-green-600'); }
    }
    loadGuardrails();
    setInterval(loadGuardrails, 30000);

    async function loadMemory() {
      const data = await api('/api/memory/stats');
      if (!data) return;
      for (const layer of ['episodic','semantic','procedural','relational']) {
        const el = document.getElementById('mem-' + layer);
        if (el && data[layer] != null) el.textContent = data[layer];
      }
    }
    loadMemory();
    setInterval(loadMemory, 30000);
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

    def _count_funds() -> int:
        candidates = [
            Path("runtime/data/funds.json"),
            Path("runtime/state/funds.json"),
            Path("data/funds.json"),
        ]
        for p in candidates:
            if not p.exists():
                continue
            try:
                import json

                payload = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(payload, list):
                    return len(payload)
                if isinstance(payload, dict):
                    if isinstance(payload.get("funds"), list):
                        return len(payload["funds"])
                    return 1
            except Exception as exc:
                logger.warning("failed to parse fund data %s: %s", p, exc)
        return 0

    def _count_skills() -> int:
        skills_dir = Path(config.get("metaclaw", {}).get("skills_dir", "skills/"))
        if not skills_dir.exists() or not skills_dir.is_dir():
            return 0
        return len(list(skills_dir.glob("*.json")))

    @app.get("/api/status")
    async def status() -> dict:
        try:
            rag_status = rag.status()
            chunks = rag_status.get("chunks_indexed", 0)
        except Exception as exc:
            logger.warning("rag.status failed: %s", exc)
            chunks = None

        try:
            agent_list = registry.list()
            agent_count = len(agent_list)
        except Exception as exc:
            logger.warning("registry.list failed: %s", exc)
            agent_count = None

        try:
            daemon_list = daemons.status()
            daemon_count = len(daemon_list) if isinstance(daemon_list, list) else None
        except Exception as exc:
            logger.warning("daemons.status failed: %s", exc)
            daemon_count = None

        metaclaw = config.get("metaclaw", {}).get("enabled", False)
        funds = _count_funds()
        skills = _count_skills()

        return {
            "ok": True,
            "funds": funds,
            "chunks": chunks,
            "skills": skills,
            "agents": agent_count,
            "daemons": daemon_count,
            "metaclaw": "active" if metaclaw else "inactive",
        }

    # ----------------------------------------------------------------
    # GET /api/agents
    # ----------------------------------------------------------------

    @app.get("/api/guardrails")
    async def guardrails_status() -> dict:
        """Return the enable/disable status of each guardrail gate."""
        gate_names = [
            "eligibility",
            "concentration",
            "covenant",
            "pld_aml",
            "compliance",
            "risk_assessment",
        ]
        gates = []
        for name in gate_names:
            enabled = guardrails.gates_enabled.get(name, False)
            gates.append(
                {
                    "gate": name,
                    "status": "active" if enabled else "disabled",
                }
            )
        return {
            "gates": gates,
            "summary": f"{sum(1 for g in gates if g['status'] == 'active')}/{len(gates)} active",
        }

    @app.get("/api/agents")
    async def agents() -> dict:
        try:
            agent_list = registry.list()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {
            "agents": [
                {"name": a.name, "slug": a.slug, "role": a.role, "domains": a.domains}
                for a in agent_list
            ]
        }

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
        q = q.strip()
        if not q:
            raise HTTPException(
                status_code=400, detail="Query parameter 'q' cannot be empty."
            )
        if len(q) > 1200:
            raise HTTPException(
                status_code=413,
                detail="Query too long. Keep prompts under 1200 characters for safe processing.",
            )

        # Guardrail pre-check (input-only: no response/chunks yet)
        guard_result = guardrails.check(query=q, response="", chunks=[], confidence=0.0)
        if not guard_result.passed:
            raise HTTPException(
                status_code=403,
                detail=f"Request blocked by guardrails: {guard_result.blocked_by or 'policy violation'}",
            )

        try:
            rag_answer = rag.query(q, llm_fn=llm_fn)
        except Exception as exc:
            logger.error("RAG pipeline error: %s", exc)
            raise HTTPException(status_code=500, detail="RAG pipeline error.") from exc

        answer = rag_answer.text
        confidence = rag_answer.confidence
        sources = [
            {"source": c.source, "section": c.section, "score": c.score}
            for c in rag_answer.chunks
        ]

        # Guardrail post-check (full context: response + confidence)
        post_guard = guardrails.check(
            query=q, response=answer, chunks=rag_answer.chunks, confidence=confidence
        )
        if not post_guard.passed:
            raise HTTPException(
                status_code=403,
                detail=f"Response blocked by guardrails: {post_guard.blocked_by or 'policy violation'}",
            )

        # Persist to memory
        try:
            memory.record_interaction(
                query=q,
                response=answer,
                confidence=confidence,
                agent="dashboard",
            )
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
            "templates": [{"id": k, "name": v} for k, v in REPORT_TEMPLATES.items()]
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
            rag_answer = rag.query(prompt, llm_fn=llm_fn)
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail="Report generation failed."
            ) from exc

        return {
            "template_id": request.template_id,
            "template_name": template_name,
            "fund_id": request.fund_id,
            "content": rag_answer.text,
            "confidence": rag_answer.confidence,
            "sources": [
                {"source": c.source, "section": c.section} for c in rag_answer.chunks
            ],
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
    async def generic_exception_handler(
        request: Any, exc: Exception
    ) -> JSONResponse:  # noqa: ANN401
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error.", "error": str(exc)},
        )

    return app
