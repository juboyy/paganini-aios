"""PAGANINI AIOS — Dashboard MVP.

Gate Token: GATE-2026-03-14T224033:701eaf7fa32c

FastAPI-based web dashboard for fund operations. Exposes a REST API for
agent status, query execution, report generation, and memory statistics,
plus a single-page HTML frontend at ``GET /``.

Package: packages.dashboard.app
Factory: create_app(config: dict) -> FastAPI
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional dependency guard — FastAPI + Uvicorn are not in pyproject.toml
# ---------------------------------------------------------------------------
try:
    from fastapi import Depends, FastAPI, HTTPException, Query, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import FileResponse, JSONResponse
    from fastapi.staticfiles import StaticFiles
    from pydantic import BaseModel
    from packages.dashboard.audit import AuditMiddleware, query_audit_log
    from packages.dashboard.auth import get_api_key, verify_api_key  # noqa: F401

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
    registry = AgentRegistry(souls_dir=config.get("souls_dir", "packages/agents/souls"))
    daemons = DaemonRunner(config)
    base_path = Path(config.get("base_path", ".")).resolve()

    app = FastAPI(
        title="PAGANINI AIOS Dashboard",
        description="Fund operations dashboard — REST API + SPA frontend.",
        version="0.1.0",
    )

    # ----------------------------------------------------------------
    # GET /api/funds — Onboarded fund portfolio
    # ----------------------------------------------------------------
    @app.get("/api/funds", dependencies=[Depends(verify_api_key)])
    async def list_funds():
        import json as _json
        funds_dir = Path("runtime/funds")
        funds = []
        if funds_dir.exists():
            for fdir in sorted(funds_dir.iterdir()):
                fj = fdir / "fund.json"
                if fj.exists():
                    try:
                        fd = _json.loads(fj.read_text())
                        cad = fd.get("cadastro", {})
                        inf = fd.get("informe_diario", {})
                        ult = inf.get("ultimo", {})
                        funds.append({
                            "id": fdir.name,
                            "nome": cad.get("nome") or fd.get("nome", "?"),
                            "cnpj": cad.get("cnpj") or fd.get("cnpj", "?"),
                            "classe": cad.get("classe") or cad.get("tipo") or "Multimercado",
                            "pl": inf.get("pl_atual") or ult.get("pl", 0),
                            "cotistas": inf.get("nr_cotistas") or ult.get("nr_cotistas", 0),
                            "data_info": ult.get("data", inf.get("periodo", "")),
                            "situacao": cad.get("situacao") or "EM FUNCIONAMENTO NORMAL",
                        })
                    except Exception:
                        pass
        return {"funds": funds, "total": len(funds)}

    # ----------------------------------------------------------------
    # POST /api/onboard — Onboard fund via CNPJ
    # ----------------------------------------------------------------
    @app.post("/api/onboard", dependencies=[Depends(verify_api_key)])
    async def onboard_fund(request: Request):
        body = await request.json()
        cnpj = body.get("cnpj", "").replace(".", "").replace("/", "").replace("-", "")
        if not cnpj or len(cnpj) < 11:
            raise HTTPException(status_code=400, detail="CNPJ inválido")
        try:
            from packages.kernel.cvm_ingester import build_fund_profile, save_fund_profile
            profile = build_fund_profile(cnpj)
            if not profile or not profile.get("nome"):
                raise HTTPException(status_code=404, detail="Fundo não encontrado na CVM")
            save_fund_profile(profile, ".")
            # Log alert
            import json as _json, datetime
            alert = {
                "type": "onboarding", "severity": "info",
                "title": f"Fundo onboarded: {(profile.get('cadastro',{}).get('nome','') or profile.get('cnpj',''))[:50]}",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "source": "dashboard"
            }
            Path("runtime/logs").mkdir(parents=True, exist_ok=True)
            with open("runtime/logs/alerts.jsonl", "a") as f:
                f.write(_json.dumps(alert, ensure_ascii=False) + "\n")
            cad = profile.get("cadastro", {})
            inf = profile.get("informe_diario", {})
            return {
                "ok": True,
                "nome": cad.get("nome") or profile.get("cnpj", "?"),
                "cnpj": cad.get("cnpj") or profile.get("cnpj", "?"),
                "pl": inf.get("pl_atual", 0),
                "cotistas": inf.get("nr_cotistas", 0),
            }
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))


    static_dir = Path(__file__).resolve().parent / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(AuditMiddleware)

    # ----------------------------------------------------------------
    # GET /
    # ----------------------------------------------------------------

    @app.get("/", include_in_schema=False)
    async def root() -> FileResponse:
        index_file = static_dir / "index.html"
        if not index_file.exists():
            raise HTTPException(status_code=404, detail="Dashboard frontend not found.")
        return FileResponse(index_file)

    # ----------------------------------------------------------------
    # GET /api/health
    # ----------------------------------------------------------------

    @app.get("/api/health")
    async def health() -> dict:
        return {"ok": True, "service": "paganini-dashboard"}

    # ----------------------------------------------------------------
    # GET /api/status
    # ----------------------------------------------------------------

    @app.get("/api/status", dependencies=[Depends(verify_api_key)])
    async def status() -> dict:
        try:
            chunks = rag.collection.count()
        except Exception as exc:
            logger.warning("rag.chunk_count failed: %s", exc)
            chunks = None

        try:
            agent_list = registry.list()
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

    @app.get("/api/agents", dependencies=[Depends(verify_api_key)])
    async def agents() -> dict:
        try:
            agent_list = registry.list()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        # Serialize AgentSOUL objects to dicts
        serialized = []
        for a in agent_list:
            serialized.append({
                "id": getattr(a, "slug", ""),
                "name": getattr(a, "name", ""),
                "domains": getattr(a, "domains", []),
                "tools": len(getattr(a, "tools", [])),
                "constraints": len(getattr(a, "constraints", [])),
            })
        return {"agents": serialized}

    # ----------------------------------------------------------------
    # GET /api/daemons
    # ----------------------------------------------------------------

    @app.get("/api/daemons", dependencies=[Depends(verify_api_key)])
    async def daemon_status() -> dict:
        try:
            result = daemons.status()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"daemons": result}

    # ----------------------------------------------------------------
    # GET /api/query
    # ----------------------------------------------------------------

    @app.get("/api/query", dependencies=[Depends(verify_api_key)])
    async def query(
        request: Request,
        q: str = Query(..., description="Natural language question"),
        fund_id: str | None = Query(None, description="Fund identifier for isolation"),
        session_id: str | None = Query(None, description="Conversation session identifier"),
    ) -> dict:
        if not q.strip():
            raise HTTPException(status_code=400, detail="Query parameter 'q' cannot be empty.")

        import time
        current_session_id = session_id or str(uuid.uuid4())
        history = memory.session.get_history(current_session_id, limit=5)
        history_context = ""
        if history:
            serialized_history = []
            for entry in history:
                role = entry.get("role", "unknown")
                content = str(entry.get("content", "")).strip()
                if content:
                    serialized_history.append(f"{role}: {content}")
            if serialized_history:
                history_context = "Conversation history:\n" + "\n".join(serialized_history)

        rag_query = q
        if history_context:
            rag_query = f"{history_context}\n\nCurrent question: {q}"

        t0 = time.time()

        # ── Cognitive Router: classify and enrich ──
        routed_agent = "rag"
        extra_context = ""
        try:
            from packages.kernel.router import CognitiveRouter
            router = CognitiveRouter(config)
            routing = router.route(q)
            if routing.primary_agent:
                routed_agent = routing.primary_agent.slug

            # Enrich with market data for market-related queries
            market_keywords = ["mercado", "indicador", "bcb", "cdi", "selic", "ipca",
                               "igpm", "igp-m", "dólar", "dolar", "câmbio", "cambio",
                               "usd", "inadimplência", "inadimplencia", "juros", "taxa"]
            if any(kw in q.lower() for kw in market_keywords):
                market_file = Path("runtime/data/market/latest_snapshot.json")
                if market_file.exists():
                    import json as _json
                    mdata = _json.loads(market_file.read_text())
                    indicators = mdata.get("indicators", {})
                    lines = ["Dados atuais de mercado (BCB SGS):"]
                    labels = {"cdi": "CDI", "selic": "SELIC", "ipca": "IPCA",
                              "igpm": "IGP-M", "cambio_usd": "USD/BRL",
                              "inad_pf": "Inadimplência PF", "inad_pj": "Inadimplência PJ"}
                    for k, label in labels.items():
                        ind = indicators.get(k, {})
                        v = ind.get("latest_value", "?")
                        dt = ind.get("latest_date", "?")
                        unit = "" if k == "cambio_usd" else "%"
                        lines.append(f"  {label}: {v}{unit} (data: {dt})")
                    lines.append(f"  Timestamp: {mdata.get('timestamp', '?')}")
                    extra_context = "\n".join(lines)

            # Enrich with agent SOUL context
            if routing.primary_agent and hasattr(routing.primary_agent, 'soul_text'):
                soul_snippet = (routing.primary_agent.soul_text or "")[:300]
                if soul_snippet:
                    extra_context += f"\n\nAgente especializado: {routing.primary_agent.name}\n{soul_snippet}"

        except Exception as exc:
            logger.warning("Router enrichment failed (non-fatal): %s", exc)

        # For pure market data queries, answer directly with live data
        pure_market = any(kw in q.lower() for kw in [
            "indicador", "cdi", "selic", "ipca", "igpm", "igp-m",
            "dólar", "dolar", "câmbio", "cambio", "usd", "mercado atual",
            "inadimplência", "inadimplencia", "dados de mercado",
            "taxa de juros", "indicadores bcb"
        ]) and extra_context and "BCB" in extra_context

        if pure_market:
            # Use LLM to synthesize market data response without RAG
            try:
                market_answer = llm_fn(
                    "Você é um especialista em mercado financeiro brasileiro. "
                    "Responda sobre os indicadores com os dados fornecidos. "
                    "Seja preciso, use os valores exatos. Formate de forma clara.",
                    f"{extra_context}\n\nPergunta: {q}"
                )
                memory.record_interaction(q, market_answer, chunks=[], confidence=0.95, agent=routed_agent)
                memory.session.add(current_session_id, "user", q, {"fund_id": fund_id})
                memory.session.add(current_session_id, "assistant", market_answer, {"fund_id": fund_id, "confidence": 0.95})
                return {
                    "answer": market_answer,
                    "confidence": 0.95,
                    "sources": [{"source": "BCB SGS (Banco Central)", "section": "Dados ao vivo", "text": ""}],
                    "fund_id": fund_id,
                    "session_id": current_session_id,
                    "agent": routed_agent,
                    "routed_to": routed_agent,
                    "latency_ms": int((time.time() - t0) * 1000),
                }
            except Exception as exc:
                logger.warning("Direct market answer failed: %s", exc)

        # Build enriched query
        enriched_query = rag_query
        if extra_context:
            enriched_query = f"{extra_context}\n\n---\n\n{rag_query}"

        try:
            answer_obj = rag.query(enriched_query, llm_fn=llm_fn)
        except Exception as exc:
            logger.error("RAG pipeline error: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        answer = answer_obj.text
        confidence = answer_obj.confidence
        request.state.audit_confidence = confidence
        request.state.audit_agent_used = routed_agent
        chunks = answer_obj.chunks
        sources = [{"source": c.source, "section": c.section, "text": c.text[:200]} for c in chunks]
        latency_ms = int((time.time() - t0) * 1000)

        # Post-response guardrails
        try:
            guard = guardrails.check(q, answer, [c.text[:100] for c in chunks], confidence)
            if not guard.passed:
                return {"answer": f"[Bloqueado por {guard.blocked_by}] Consulta bloqueada pelos guardrails.", "confidence": 0.0, "sources": [], "blocked": True, "blocked_by": guard.blocked_by, "latency_ms": latency_ms}
        except Exception as exc:
            logger.warning("Guardrail check failed: %s", exc)

        # Persist to memory
        try:
            memory.record_interaction(q, answer, chunks=[c.text[:200] for c in chunks], confidence=confidence, agent="dashboard")
            memory.session.add(current_session_id, "user", q, {"fund_id": fund_id})
            memory.session.add(current_session_id, "assistant", answer, {"fund_id": fund_id, "confidence": confidence})
        except Exception as exc:
            logger.warning("Memory store failed: %s", exc)

        return {
            "answer": answer,
            "confidence": confidence,
            "sources": sources,
            "fund_id": fund_id,
            "session_id": current_session_id,
            "agent": routed_agent,
            "routed_to": routed_agent,
            "latency_ms": latency_ms,
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

    @app.get("/api/reports", dependencies=[Depends(verify_api_key)])
    async def list_reports() -> dict:
        return {
            "templates": [
                {"id": k, "name": v} for k, v in REPORT_TEMPLATES.items()
            ]
        }

    # ----------------------------------------------------------------
    # POST /api/reports/generate
    # ----------------------------------------------------------------

    @app.post("/api/reports/generate", dependencies=[Depends(verify_api_key)])
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

    @app.get("/api/memory/stats", dependencies=[Depends(verify_api_key)])
    async def memory_stats() -> dict:
        try:
            stats = memory.stats()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return stats

    # ----------------------------------------------------------------
    # GET /api/audit
    # ----------------------------------------------------------------

    @app.get("/api/audit", dependencies=[Depends(verify_api_key)])
    async def audit_entries(
        limit: int = Query(50, ge=1, le=500, description="Max entries to return"),
        path: str | None = Query(None, description="Filter by request path"),
        since: str | None = Query(None, description="Filter entries since ISO timestamp"),
    ) -> dict:
        entries = query_audit_log(since=since, path_filter=path, limit=limit)
        return {"total": len(entries), "entries": entries}

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


    # ─── Alerts Timeline ───────────────────────────────────────────
    @app.get("/api/alerts", dependencies=[Depends(verify_api_key)])
    async def get_alerts(
        limit: int = Query(50, description="Max alerts to return"),
        severity: str | None = Query(None, description="Filter by severity"),
        alert_type: str | None = Query(None, description="Filter by type"),
    ) -> dict:
        """Return unified alert timeline from all daemons."""
        import os
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        alerts_file = os.path.join(base, "runtime", "data", "alerts.jsonl")

        alerts = []
        if os.path.exists(alerts_file):
            with open(alerts_file) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        alert = __import__("json").loads(line)
                        if severity and alert.get("severity") != severity:
                            continue
                        if alert_type and alert.get("type") != alert_type:
                            continue
                        alerts.append(alert)
                    except Exception:
                        continue

        # Most recent first
        alerts.reverse()
        return {
            "total": len(alerts),
            "alerts": alerts[:limit],
            "filters": {"severity": severity, "type": alert_type},
        }

    # ─── Market Data ───────────────────────────────────────────────
    @app.get("/api/market", dependencies=[Depends(verify_api_key)])
    async def get_market() -> dict:
        """Return latest market indicators from BCB sync."""
        snapshot_file = base_path / "runtime" / "data" / "market" / "latest_snapshot.json"

        if snapshot_file.exists():
            with snapshot_file.open(encoding="utf-8") as f:
                return json.load(f)
        return {"error": "No market data available. Run market_data_sync daemon."}

    @app.get("/api/market/history", dependencies=[Depends(verify_api_key)])
    async def get_market_history(
        days: int = Query(30, ge=1, le=3650, description="Number of days to return"),
        indicator: str | None = Query(None, description="Indicator key filter"),
    ) -> dict:
        history_file = base_path / "runtime" / "data" / "market" / "history.jsonl"
        if not history_file.exists():
            return {"points": [], "indicators": []}

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        points: list[dict[str, Any]] = []
        indicator_names: set[str] = set()

        with history_file.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                timestamp_str = entry.get("timestamp")
                try:
                    timestamp = datetime.fromisoformat(str(timestamp_str).replace("Z", "+00:00"))
                except ValueError:
                    continue
                if timestamp < cutoff:
                    continue

                indicators = entry.get("indicators", {})
                if not isinstance(indicators, dict):
                    continue
                indicator_names.update(indicators.keys())

                if indicator:
                    if indicator in indicators:
                        points.append({
                            "timestamp": timestamp.isoformat(),
                            "indicator": indicator,
                            **indicators[indicator],
                        })
                    continue

                points.append({
                    "timestamp": timestamp.isoformat(),
                    "indicators": indicators,
                })

        points.sort(key=lambda item: item["timestamp"])
        filtered_names = sorted(name for name in indicator_names if indicator is None or name == indicator)
        return {"points": points, "indicators": filtered_names}

    # ─── Daemon Results ────────────────────────────────────────────
    @app.get("/api/daemons/history", dependencies=[Depends(verify_api_key)])
    async def daemon_history(
        daemon: str | None = Query(None, description="Filter by daemon name"),
        limit: int = Query(50, description="Max entries"),
    ) -> dict:
        """Return daemon execution history."""
        import os
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        results_file = os.path.join(base, "runtime", "data", "daemon_results.jsonl")

        entries = []
        if os.path.exists(results_file):
            with open(results_file) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = __import__("json").loads(line)
                        if daemon and entry.get("daemon") != daemon:
                            continue
                        entries.append(entry)
                    except Exception:
                        continue

        entries.reverse()
        return {"total": len(entries), "entries": entries[:limit]}

    return app
