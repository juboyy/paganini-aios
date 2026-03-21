"""PAGANINI AIOS — Dashboard MVP.

Gate Token: GATE-2026-03-14T224033:701eaf7fa32c

FastAPI-based web dashboard for fund operations. Exposes a REST API for
agent status, query execution, report generation, and memory statistics,
plus a single-page HTML frontend at GET /.

Package: packages.dashboard.app
Factory: create_app(config: dict) -> FastAPI
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def create_app(config: dict) -> Any:  # noqa: ANN401
    """PAGANINI Dashboard Factory."""
    import time
    from fastapi import FastAPI, HTTPException, Query, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import HTMLResponse, JSONResponse
    from fastapi.staticfiles import StaticFiles

    from packages.kernel.engine import load_config
    from packages.kernel.memory import MemoryManager
    from packages.kernel.metaclaw import MetaClawProxy
    from packages.kernel.moltis import get_llm_fn
    from packages.kernel.router import CognitiveRouter
    from packages.rag.pipeline import RAGPipeline
    from packages.shared.guardrails import GuardrailPipeline
    from packages.agents.framework import AgentRegistry

    app = FastAPI(title="PAGANINI AIOS")

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize components
    memory = MemoryManager(config)
    metaclaw = MetaClawProxy(config)
    rag = RAGPipeline(config)
    guardrails = GuardrailPipeline(config)
    registry = AgentRegistry()
    llm_fn = get_llm_fn(config)

    # Use existing router logic or direct RAG
    router = CognitiveRouter(config)

    # Middleware for API Key verification
    @app.middleware("http")
    async def verify_api_key(request: Request, call_next: Any) -> Any:  # noqa: ANN401
        if request.url.path.startswith("/api/") and request.method != "OPTIONS":
            api_key = request.headers.get("X-API-Key")
            expected = "nwX1qHH50_6I3jw-Xzt37XF8tX709gdFLD54Qz8Jio8"
            if not api_key or api_key != expected:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized. Valid X-API-Key required."},
                )
        return await call_next(request)

    # ----------------------------------------------------------------
    # UI / Frontend
    # ----------------------------------------------------------------

    @app.get("/", response_class=HTMLResponse)
    async def index() -> str:
        """Serve the dashboard UI."""
        template_path = Path(__file__).parent / "templates" / "index.html"
        if not template_path.exists():
            return """
            <html><body style='font-family:sans-serif; padding:40px; background:#0a0a0b; color:#eee;'>
            <h1 style='color:#00f2fe;'>PAGANINI AIOS</h1>
            <p>UI template not found. API is active at <code>/api/</code></p>
            </body></html>
            """
        return template_path.read_text(encoding="utf-8")

    # ----------------------------------------------------------------
    # REST API
    # ----------------------------------------------------------------

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok", "version": "0.1.0"}

    @app.get("/api/status")
    async def status() -> dict:
        return {
            "status": "online",
            "version": "0.1.0",
            "provider": config.get("provider"),
            "rag": rag.status(),
            "memory": memory.stats(),
        }

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
            "guardrails": {
                "passed": post_guard.passed,
                "cvm_240_compliant": post_guard.cvm_240_compliant,
                "gates": [
                    {"gate": g.gate, "passed": g.passed, "reason": g.reason}
                    for g in post_guard.gates
                ]
            }
        }

    @app.get("/api/funds")
    async def list_funds() -> dict:
        """Return all onboarded fund profiles."""
        try:
            from packages.kernel.engine import load_funds
            funds = load_funds(config)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"funds": funds}

    @app.get("/api/daemons")
    async def daemons() -> dict:
        try:
            from packages.kernel.daemons import DaemonManager
            dm = DaemonManager(config)
            return {"daemons": dm.list()}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.get("/api/memory/stats")
    async def memory_stats() -> dict:
        try:
            stats = memory.stats()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return stats

    @app.get("/api/tunnel-url")
    async def tunnel_url() -> dict:
        import subprocess
        result = subprocess.run(
            [
                "grep", "-hoP",
                "https://[a-z0-9-]+\.trycloudflare\.com",
                "/var/log/paganini-tunnel.log",
                "/tmp/cloudflared.log",
            ],
            capture_output=True,
            text=True,
        )
        urls = [u for u in result.stdout.strip().splitlines() if u]
        url = urls[-1] if urls else "unknown"
        return {"tunnel_url": url}

    @app.get("/api/risk/score")
    async def risk_score(
        setor: str = "agro",
        atrasos: str = "0",
        concentracao: str = "low",
        rating: str = "AA",
        cdi: str = "stable",
    ):
        try:
            from packages.kernel.bayesian_risk import FIDCRiskNetwork
            net = FIDCRiskNetwork()
            result = net.score(
                setor_cedente=setor,
                historico_atrasos=atrasos,
                concentracao=concentracao,
                rating_cedente=rating,
                cdi_trend=cdi,
            )
            if isinstance(result, dict) and result.get("status") == 501:
                raise HTTPException(status_code=501, detail=result["error"])
            if isinstance(result, dict) and result.get("status") == 400:
                raise HTTPException(status_code=400, detail=result["error"])
            return result
        except (ImportError, ModuleNotFoundError):
            raise HTTPException(status_code=501, detail="Bayesian Network module not available.")
        except Exception as exc:
            logger.error("Risk score error: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc))

    @app.get("/api/risk/simulate")
    async def risk_simulate(
        scenarios: str = Query(..., description="JSON list of scenario dicts")
    ):
        import json
        try:
            from packages.kernel.bayesian_risk import FIDCRiskNetwork
            net = FIDCRiskNetwork()
            data = json.loads(scenarios)
            results = []
            for item in data:
                res = net.score(**item)
                results.append({"scenario": item, "result": res})
            return {"results": results}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Simulation error: {str(exc)}")

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
