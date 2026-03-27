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
    from fastapi import FastAPI, HTTPException, Query, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import HTMLResponse, JSONResponse

    from packages.rag.pipeline import RAGPipeline
    from packages.services.agent_service import AgentService
    from packages.services.engine_service import EngineService
    from packages.services.memory_service import MemoryService
    from packages.services.risk_service import RiskService
    from packages.services.daemon_service import DaemonService

    app = FastAPI(title="PAGANINI AIOS")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    engine_svc = EngineService(config)
    memory_svc = MemoryService(config)
    risk_svc = RiskService(config)
    agent_svc = AgentService(config)
    daemon_svc = DaemonService(config)
    memory_svc.init_metaclaw()
    engine_svc.route  # warm up (lazy)

    rag = RAGPipeline(config)
    llm_fn = engine_svc.get_llm_fn()

    _auto_ingest_if_needed(rag)
    _register_middleware(app, config)
    _register_core_routes(app, config, rag, memory_svc, agent_svc, daemon_svc, llm_fn, risk_svc, engine_svc)
    _register_exception_handler(app)

    return app


def _register_middleware(app: Any, config: dict) -> None:
    """Register authentication middleware."""
    from fastapi.responses import JSONResponse

    @app.middleware("http")
    async def verify_api_key(request: Any, call_next: Any) -> Any:  # noqa: ANN401
        if request.url.path.startswith("/api/") and request.method != "OPTIONS":
            api_key = request.headers.get("X-API-Key")
            expected = "nwX1qHH50_6I3jw-Xzt37XF8tX709gdFLD54Qz8Jio8"
            if not api_key or api_key != expected:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized. Valid X-API-Key required."},
                )
        return await call_next(request)


def _register_core_routes(
    app: Any,
    config: dict,
    rag: Any,
    memory_svc: Any,
    agent_svc: Any,
    daemon_svc: Any,
    llm_fn: Any,
    risk_svc: Any,
    engine_svc: Any,
) -> None:
    """Register all REST API and UI routes."""
    _reg_ui_routes(app)
    _reg_status_routes(app, config, rag, memory_svc, agent_svc)
    _reg_data_routes(app, rag, memory_svc, llm_fn, risk_svc, daemon_svc)
    _reg_risk_routes(app, risk_svc)
    _reg_pipeline_routes(app, engine_svc)

def _reg_ui_routes(app: Any) -> None:
    from fastapi.responses import HTMLResponse
    @app.get("/", response_class=HTMLResponse)
    async def index() -> str: return _render_index()

    @app.get("/api/health")
    async def health() -> dict: return {"status": "ok", "version": "0.1.0"}

    @app.get("/api/tunnel-url")
    async def tunnel_url() -> dict: return _get_tunnel_url()

def _reg_status_routes(app: Any, config: dict, rag: Any, memory_svc: Any, agent_svc: Any) -> None:
    from fastapi import HTTPException
    @app.get("/api/status")
    async def status() -> dict:
        return {"status": "online", "version": "0.1.0", "provider": config.get("provider"), "rag": rag.status(), "memory": memory_svc.stats()}

    @app.get("/api/guardrails")
    async def guardrails_status(risk_svc: Any = None) -> dict: # risk_svc is closure-bound in parent
        return _build_guardrails_status(risk_svc)

    @app.get("/api/agents")
    async def agents() -> dict:
        try:
            return {"agents": [{"name": a.name, "slug": a.slug, "role": a.role, "domains": a.domains} for a in agent_svc.list_agents()]}
        except Exception as exc: raise HTTPException(status_code=500, detail=str(exc)) from exc

def _reg_data_routes(app: Any, rag: Any, memory_svc: Any, llm_fn: Any, risk_svc: Any, daemon_svc: Any) -> None:
    from fastapi import HTTPException, Query
    @app.get("/api/query")
    async def query(q: str = Query(...), fund_id: str | None = Query(None)) -> dict:
        return await _handle_query(q, fund_id, rag, llm_fn, risk_svc, memory_svc)

    @app.get("/api/funds")
    async def list_funds(engine_svc: Any = None) -> dict:
        try: return {"funds": engine_svc.load_funds()}
        except Exception as exc: raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.get("/api/daemons")
    async def daemons() -> dict:
        try: return {"daemons": daemon_svc.list_daemons()}
        except Exception as exc: raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.get("/api/memory/stats")
    async def memory_stats() -> dict:
        try: return memory_svc.stats()
        except Exception as exc: raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.get("/api/chunks")
    async def list_chunks(source: str = None, limit: int = 20) -> dict: return _list_chunks(source, limit)

    @app.get("/api/chunks/export")
    async def export_chunks() -> dict: return _export_chunks()

def _reg_risk_routes(app: Any, risk_svc: Any) -> None:
    from fastapi import Query
    @app.get("/api/risk/score")
    async def risk_score(setor: str = "agro", atrasos: str = "0", concentracao: str = "low", rating: str = "AA", cdi: str = "stable"):
        return _handle_risk_score(setor, atrasos, concentracao, rating, cdi, risk_svc)

    @app.get("/api/risk/simulate")
    async def risk_simulate(scenarios: str = Query(..., description="JSON list of scenario dicts")):
        return _handle_risk_simulate(scenarios, risk_svc)

def _reg_pipeline_routes(app: Any, engine_svc: Any) -> None:
    @app.get("/api/pipeline/packs")
    async def pipeline_packs() -> dict: return _list_pipeline_packs()

    @app.get("/api/pipeline/{domain}")
    async def pipeline_detail(domain: str) -> dict: return _get_pipeline_detail(domain)

    @app.get("/api/pipeline/{domain}/classify")
    async def pipeline_classify(domain: str, task: str = "general task") -> dict: return _classify_pipeline(domain, task, engine_svc)

    @app.get("/api/pipeline/{domain}/run")
    async def pipeline_dry_run(domain: str, task: str = "test task") -> dict: return _dry_run_pipeline(domain, task, engine_svc)

    @app.get("/api/pipeline/{domain}/execute")
    async def pipeline_execute(domain: str, task: str = "test task") -> dict: return _execute_pipeline(domain, task, engine_svc)

    @app.get("/api/risk/simulate")
    async def risk_simulate(
        scenarios: str = Query(..., description="JSON list of scenario dicts")
    ):
        return _handle_risk_simulate(scenarios, risk_svc)


def _register_exception_handler(app: Any) -> None:
    """Register global exception handler."""
    from fastapi.responses import JSONResponse

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Any, exc: Exception
    ) -> JSONResponse:  # noqa: ANN401
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error.", "error": str(exc)},
        )


# ----------------------------------------------------------------
# Helper functions (extracted to keep create_app under 120 lines)
# ----------------------------------------------------------------

def _render_index() -> str:
    """Render the dashboard HTML index page."""
    template_path = Path(__file__).parent / "templates" / "index.html"
    if not template_path.exists():
        return """
        <html><body style='font-family:sans-serif; padding:40px; background:#0a0a0b; color:#eee;'>
        <h1 style='color:#00f2fe;'>PAGANINI AIOS</h1>
        <p>UI template not found. API is active at <code>/api/</code></p>
        </body></html>
        """
    return template_path.read_text(encoding="utf-8")


def _auto_ingest_if_needed(rag: Any) -> None:
    """Auto-ingest corpus if BM25 index is empty."""
    bm25_path = Path.cwd() / "runtime" / "data" / "bm25_index.json"
    corpus_dirs = [
        Path.cwd() / "packs" / "fidc" / "corpus",
        Path.cwd() / "packs" / "finance" / "corpus",
        Path.cwd() / "data" / "sample-corpus",
    ]
    need_ingest = True
    if bm25_path.exists():
        import json as _json
        try:
            _bm25 = _json.load(open(bm25_path))
            if len(_bm25.get("ids", [])) >= 80:
                need_ingest = False
        except Exception:
            pass
    if not need_ingest:
        return
    for cdir in corpus_dirs:
        if cdir.exists() and list(cdir.rglob("*.md")):
            try:
                from packages.rag.pipeline import RAGPipeline
                r = RAGPipeline.from_config(Path.cwd() / "config.yaml")
                stats = r.ingest(str(cdir))
                print(
                    f'[auto-ingest] {cdir.name}: {stats["chunks"]} chunks from {stats["files"]} files'
                )
                if stats.get("chunks", 0) > 0:
                    break
            except Exception as e:
                print(f"[auto-ingest] {cdir.name} failed: {e}")


def _build_guardrails_status(risk_svc: Any) -> dict:
    """Build guardrails status response dict."""
    gate_names = [
        "eligibility", "concentration", "covenant",
        "pld_aml", "compliance", "risk_assessment",
    ]
    gates_enabled = risk_svc.gates_enabled
    gates = [
        {"gate": name, "status": "active" if gates_enabled.get(name, False) else "disabled"}
        for name in gate_names
    ]
    return {
        "gates": gates,
        "summary": f"{sum(1 for g in gates if g['status'] == 'active')}/{len(gates)} active",
    }


async def _handle_query(
    q: str,
    fund_id: Any,
    rag: Any,
    llm_fn: Any,
    risk_svc: Any,
    memory_svc: Any,
) -> dict:
    """Handle a RAG query with guardrails and memory recording."""
    from fastapi import HTTPException

    q = q.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' cannot be empty.")
    if len(q) > 1200:
        raise HTTPException(
            status_code=413,
            detail="Query too long. Keep prompts under 1200 characters for safe processing.",
        )

    guard_result = risk_svc.check_guardrails(query=q, response="", chunks=[], confidence=0.0)
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

    post_guard = risk_svc.check_guardrails(
        query=q, response=answer, chunks=rag_answer.chunks, confidence=confidence
    )
    if not post_guard.passed:
        raise HTTPException(
            status_code=403,
            detail=f"Response blocked by guardrails: {post_guard.blocked_by or 'policy violation'}",
        )

    try:
        memory_svc.record_interaction(
            query=q, response=answer, confidence=confidence, agent="dashboard"
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
            ],
        },
    }


def _get_tunnel_url() -> dict:
    """Return the current Cloudflare tunnel URL."""
    import subprocess
    result = subprocess.run(
        ["grep", "-hoP", r"https://[a-z0-9-]+\.trycloudflare\.com",
         "/var/log/paganini-tunnel.log", "/tmp/cloudflared.log"],
        capture_output=True, text=True,
    )
    urls = [u for u in result.stdout.strip().splitlines() if u]
    return {"tunnel_url": urls[-1] if urls else "unknown"}


def _list_chunks(source: Any, limit: int) -> dict:
    """List indexed BM25 chunks with optional source filter."""
    import json as _json
    bm25_path = Path.cwd() / "runtime" / "data" / "bm25_index.json"
    if not bm25_path.exists():
        return {"total": 0, "chunks": [], "sources": []}
    data = _json.load(open(bm25_path))
    ids = data.get("ids", [])
    metas = data.get("metadatas", [])
    sources = list(set(m.get("source", "?") for m in metas))
    if source:
        filtered = [
            (i, m) for i, m in zip(ids, metas)
            if source.lower() in m.get("source", "").lower()
        ]
    else:
        filtered = list(zip(ids, metas))
    chunks = [{"id": i, **m} for i, m in filtered[:limit]]
    return {"total": len(ids), "showing": len(chunks), "sources": sources, "chunks": chunks}


def _export_chunks() -> dict:
    """Export chunks summary for RL training."""
    export_path = Path.cwd() / "runtime" / "rl-training-data.json"
    if export_path.exists():
        import json as _json
        return _json.load(open(export_path))
    return {"error": "Run: python3 scripts/export_chunks_for_rl.py"}


def _handle_risk_score(
    setor: str, atrasos: str, concentracao: str, rating: str, cdi: str, risk_svc: Any
) -> dict:
    """Score a single risk scenario via the Bayesian network."""
    from fastapi import HTTPException
    try:
        result = risk_svc.score_risk(
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
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Risk score error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


def _list_pipeline_packs() -> dict:
    """List available domain packs with pipeline definitions."""
    packs_dir = Path.cwd() / "packs"
    packs = []
    if packs_dir.exists():
        for p in sorted(packs_dir.iterdir()):
            pipeline_file = p / "pipeline.yaml"
            if pipeline_file.exists():
                import yaml
                data = yaml.safe_load(pipeline_file.read_text())
                packs.append({
                    "domain": data.get("domain", p.name),
                    "version": data.get("version", "?"),
                    "stages": len(data.get("stages", [])),
                    "tiers": [t["name"] for t in data.get("tiers", [])],
                    "guardrails": data.get("guardrail_gates", []),
                    "execution_engine": data.get("execution_engine", ""),
                    "intelligence_layer": data.get("intelligence_layer", ""),
                })
    return {"packs": packs}


def _get_pipeline_detail(domain: str) -> dict:
    """Return full pipeline YAML for a domain."""
    from fastapi import HTTPException
    pipeline_file = Path.cwd() / "packs" / domain / "pipeline.yaml"
    if not pipeline_file.exists():
        raise HTTPException(status_code=404, detail=f"Pack not found: {domain}")
    import yaml
    return yaml.safe_load(pipeline_file.read_text())


def _classify_pipeline(domain: str, task: str, engine_svc: Any) -> dict:
    """Classify a task into a pipeline tier."""
    from fastapi import HTTPException
    try:
        cfg = engine_svc.load_pipeline(Path.cwd() / "packs" / domain / "pipeline.yaml")
        engine = engine_svc.create_pipeline_engine(cfg)
        tier = engine.classify(task)
        stages_in_tier = [s for s in cfg.stages if s.id in tier.stages]
        return {
            "domain": domain, "task": task, "tier": tier.name,
            "criteria": tier.criteria, "max_minutes": tier.max_minutes,
            "stages": [
                {"id": s.id, "name": s.name, "kind": s.kind.value, "agent": s.agent}
                for s in stages_in_tier
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _dry_run_pipeline(domain: str, task: str, engine_svc: Any) -> dict:
    """Dry-run a pipeline for a task."""
    from fastapi import HTTPException
    try:
        cfg = engine_svc.load_pipeline(Path.cwd() / "packs" / domain / "pipeline.yaml")
        engine = engine_svc.create_pipeline_engine(cfg)
        run = engine.execute(task, dry_run=True)
        return run.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _execute_pipeline(domain: str, task: str, engine_svc: Any) -> dict:
    """Execute a pipeline for real with wired handlers."""
    from fastapi import HTTPException
    try:
        cfg = engine_svc.load_pipeline(Path.cwd() / "packs" / domain / "pipeline.yaml")
        engine = engine_svc.wire_pipeline_handlers(engine_svc.create_pipeline_engine(cfg))
        run = engine.execute(task)
        return run.to_dict()
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{e}\n{traceback.format_exc()}")


def _handle_risk_simulate(scenarios: str, risk_svc: Any) -> dict:
    """Simulate multiple risk scenarios."""
    from fastapi import HTTPException
    import json
    try:
        data = json.loads(scenarios)
        return {"results": risk_svc.simulate_risk(data)}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Simulation error: {str(exc)}")
