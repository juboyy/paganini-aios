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
    _metaclaw = MetaClawProxy(config)  # noqa: F841 — initialized for side-effects
    rag = RAGPipeline(config)
    guardrails = GuardrailPipeline(config)
    registry = AgentRegistry()
    llm_fn = get_llm_fn(config)

    # Use existing router logic or direct RAG
    _router = CognitiveRouter(config)  # noqa: F841 — initialized for side-effects

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


    # AUTO-INGEST: Load corpus on startup if BM25 is empty
    bm25_path = Path.cwd() / 'runtime' / 'data' / 'bm25_index.json'
    corpus_dirs = [
        Path.cwd() / 'packs' / 'fidc' / 'corpus',
        Path.cwd() / 'packs' / 'finance' / 'corpus',
        Path.cwd() / 'data' / 'sample-corpus',
    ]
    need_ingest = True
    if bm25_path.exists():
        import json as _json
        try:
            _bm25 = _json.load(open(bm25_path))
            if len(_bm25.get('ids', [])) >= 80:
                need_ingest = False
        except Exception:
            pass
    if need_ingest:
        for cdir in corpus_dirs:
            if cdir.exists() and list(cdir.rglob('*.md')):
                try:
                    from packages.rag.pipeline import RAGPipeline
                    rag = RAGPipeline.from_config(Path.cwd() / 'config.yaml')
                    stats = rag.ingest(str(cdir))
                    print(f'[auto-ingest] {cdir.name}: {stats["chunks"]} chunks from {stats["files"]} files')
                    if stats.get('chunks', 0) > 0:
                        break
                except Exception as e:
                    print(f'[auto-ingest] {cdir.name} failed: {e}')

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
                r"https://[a-z0-9-]+\.trycloudflare\.com",
                "/var/log/paganini-tunnel.log",
                "/tmp/cloudflared.log",
            ],
            capture_output=True,
            text=True,
        )
        urls = [u for u in result.stdout.strip().splitlines() if u]
        url = urls[-1] if urls else "unknown"
        return {"tunnel_url": url}


    @app.get("/api/chunks")
    async def list_chunks(source: str = None, limit: int = 20) -> dict:
        """List indexed chunks with optional source filter."""
        import json as _json
        bm25_path = Path.cwd() / "runtime" / "data" / "bm25_index.json"
        if not bm25_path.exists():
            return {"total": 0, "chunks": [], "sources": []}
        data = _json.load(open(bm25_path))
        ids = data.get("ids", [])
        metas = data.get("metadatas", [])
        sources = list(set(m.get("source", "?") for m in metas))
        if source:
            filtered = [(i, m) for i, m in zip(ids, metas) if source.lower() in m.get("source", "").lower()]
        else:
            filtered = list(zip(ids, metas))
        chunks = [{"id": i, **m} for i, m in filtered[:limit]]
        return {"total": len(ids), "showing": len(chunks), "sources": sources, "chunks": chunks}

    @app.get("/api/chunks/export")
    async def export_chunks() -> dict:
        """Export chunks summary for RL training."""
        export_path = Path.cwd() / "runtime" / "rl-training-data.json"
        if export_path.exists():
            import json as _json
            return _json.load(open(export_path))
        return {"error": "Run: python3 scripts/export_chunks_for_rl.py"}

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


    # ── Pipeline Engine ──────────────────────────────────────────
    @app.get("/api/pipeline/packs")
    async def pipeline_packs() -> dict:
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

    @app.get("/api/pipeline/{domain}")
    async def pipeline_detail(domain: str) -> dict:
        """Get full pipeline definition for a domain."""
        pipeline_file = Path.cwd() / "packs" / domain / "pipeline.yaml"
        if not pipeline_file.exists():
            raise HTTPException(status_code=404, detail=f"Pack not found: {domain}")
        import yaml
        return yaml.safe_load(pipeline_file.read_text())

    @app.get("/api/pipeline/{domain}/classify")
    async def pipeline_classify(domain: str, task: str = "general task") -> dict:
        """Classify a task into a pipeline tier."""
        try:
            from packages.kernel.pipeline import load_pipeline, PipelineEngine
            cfg = load_pipeline(Path.cwd() / "packs" / domain / "pipeline.yaml")
            engine = PipelineEngine(cfg)
            tier = engine.classify(task)
            stages_in_tier = [s for s in cfg.stages if s.id in tier.stages]
            return {
                "domain": domain,
                "task": task,
                "tier": tier.name,
                "criteria": tier.criteria,
                "max_minutes": tier.max_minutes,
                "stages": [{"id": s.id, "name": s.name, "kind": s.kind.value, "agent": s.agent} for s in stages_in_tier],
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/pipeline/{domain}/run")
    async def pipeline_dry_run(domain: str, task: str = "test task") -> dict:
        """Dry-run a pipeline for a task (no execution, shows plan)."""
        try:
            from packages.kernel.pipeline import load_pipeline, PipelineEngine
            cfg = load_pipeline(Path.cwd() / "packs" / domain / "pipeline.yaml")
            engine = PipelineEngine(cfg)
            run = engine.execute(task, dry_run=True)
            return run.to_dict()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))



    @app.get("/api/pipeline/{domain}/execute")
    async def pipeline_execute(domain: str, task: str = "test task") -> dict:
        """Execute a pipeline for real with wired handlers."""
        try:
            from packages.kernel.pipeline import load_pipeline, PipelineEngine
            from packages.kernel.pipeline_handlers import wire_handlers
            cfg = load_pipeline(Path.cwd() / "packs" / domain / "pipeline.yaml")
            engine = wire_handlers(PipelineEngine(cfg))
            run = engine.execute(task)
            return run.to_dict()
        except Exception as e:
            import traceback
            raise HTTPException(status_code=500, detail=f"{e}\n{traceback.format_exc()}")

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
