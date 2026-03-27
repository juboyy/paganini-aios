"""PAGANINI AIOS — Dashboard MVP.

Gate Token: GATE-2026-03-14T224033:701eaf7fa32c

FastAPI-based web dashboard for fund operations. Exposes a REST API for
agent status, query execution, report generation, and memory statistics,
plus a single-page HTML frontend at GET /.

Package: core.channels.api
Factory: create_app(config: dict) -> FastAPI
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional dependency guard — FastAPI + Uvicorn are not in pyproject.toml
# ---------------------------------------------------------------------------
try:
    from fastapi import Depends, FastAPI, HTTPException, Query, Request
    from fastapi.responses import FileResponse, JSONResponse
    from pydantic import BaseModel
    from core.channels.audit import query_audit_log
    from core.channels.auth import verify_api_key  # noqa: F401
    from core.channels.api_middleware import apply_cors, apply_audit_middleware, apply_static
    from core.channels.api_routes import (
        handle_query,
        _load_funds_list,
        _load_skills_list,
        _read_alerts_file,
        _read_daemon_history,
        _parse_market_history,
        REPORT_TEMPLATES,
    )

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


if _FASTAPI_AVAILABLE:
    class ReportRequest(BaseModel):
        template_id: str
        fund_id: str


def create_app(config: dict) -> "FastAPI":  # noqa: F821
    """Create and configure the PAGANINI dashboard FastAPI application."""
    if not _FASTAPI_AVAILABLE:
        raise RuntimeError(
            "FastAPI and Uvicorn are required to run the PAGANINI dashboard.\n"
            "Install them with:  pip install fastapi uvicorn[standard]\n"
        )

    from core.runtime.framework import AgentRegistry
    from core.runtime.daemons import DaemonRunner
    from core.memory.manager import MemoryManager
    from core.moltis.llm import get_llm_fn
    from core.rag.pipeline import RAGPipeline
    from packs.finance.guardrails.compliance import GuardrailPipeline

    rag = RAGPipeline(config)
    guardrails = GuardrailPipeline(config)
    memory = MemoryManager(config)
    llm_fn = get_llm_fn(config)
    registry = AgentRegistry(souls_dir=config.get("souls_dir", "packs/finance/agents/souls"))
    daemons = DaemonRunner(config)
    base_path = Path(config.get("base_path", ".")).resolve()

    _auto_ingest(rag, base_path)

    app = FastAPI(
        title="PAGANINI AIOS Dashboard",
        description="Fund operations dashboard — REST API + SPA frontend.",
        version="0.1.0",
    )

    static_dir = Path(__file__).resolve().parent / "static"
    apply_static(app, static_dir)
    apply_cors(app)
    apply_audit_middleware(app)

    _register_routes(
        app, config, rag, guardrails, memory, llm_fn, registry, daemons, base_path, static_dir
    )

    return app


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _auto_ingest(rag: Any, base_path: Path) -> None:
    """Auto-ingest corpus if ChromaDB collection is empty."""
    try:
        if rag.collection.count() == 0:
            for corpus_dir in ["data/corpus", "data/sample-corpus"]:
                corpus_path = base_path / corpus_dir
                if corpus_path.is_dir() and any(corpus_path.iterdir()):
                    logger.info("Auto-ingesting corpus from %s...", corpus_dir)
                    rag.ingest(str(corpus_path))
                    logger.info("Indexed %d chunks", rag.collection.count())
                    break
    except Exception as exc:
        logger.warning("Auto-ingest failed: %s", exc)


def _register_routes(
    app: Any,
    config: dict,
    rag: Any,
    guardrails: Any,
    memory: Any,
    llm_fn: Any,
    registry: Any,
    daemons: Any,
    base_path: Path,
    static_dir: Path,
) -> None:
    """Register all HTTP routes on the app."""
    _register_core_routes(app, static_dir)
    _register_status_routes(app, config, rag, registry, daemons)
    _register_data_routes(app, config, rag, memory, guardrails, llm_fn, base_path)
    _register_report_routes(app, rag)
    _register_exception_handler(app)


def _register_core_routes(app: Any, static_dir: Path) -> None:
    """Register root, health, funds, skills, metaclaw routes."""

    @app.get("/", include_in_schema=False)
    async def root() -> FileResponse:
        index_file = static_dir / "index.html"
        if not index_file.exists():
            raise HTTPException(status_code=404, detail="Dashboard frontend not found.")
        return FileResponse(index_file)

    @app.get("/api/health")
    async def health() -> dict:
        return {"ok": True, "service": "paganini-dashboard"}

    @app.get("/api/funds", dependencies=[Depends(verify_api_key)])
    async def list_funds() -> dict:
        funds = _load_funds_list()
        return {"funds": funds, "total": len(funds)}

    @app.post("/api/onboard", dependencies=[Depends(verify_api_key)])
    async def onboard_fund(request: Request) -> dict:
        return await _handle_onboard(request)

    @app.get("/api/skills", dependencies=[Depends(verify_api_key)])
    async def list_skills(cfg: dict = config) -> dict:
        return _load_skills_list(config)

    @app.get("/api/metaclaw", dependencies=[Depends(verify_api_key)])
    async def metaclaw_skills() -> dict:
        result = _load_skills_list(config)
        return {
            "enabled": config.get("metaclaw", {}).get("enabled", False),
            "mode": config.get("metaclaw", {}).get("mode", "off"),
            "skills": result["skills"],
            "total": result["total"],
        }


def _register_status_routes(
    app: Any, config: dict, rag: Any, registry: Any, daemons: Any
) -> None:
    """Register /api/status, /api/agents, /api/daemons routes."""

    @app.get("/api/status", dependencies=[Depends(verify_api_key)])
    async def status() -> dict:
        chunks = _safe_call(lambda: rag.collection.count(), "rag.chunk_count")
        agent_count = _safe_call(lambda: len(registry.list()), "registry.list_agents")
        daemon_list = _safe_call(lambda: daemons.status(), "daemons.status")
        daemon_count = len(daemon_list) if isinstance(daemon_list, list) else None
        metaclaw = config.get("metaclaw", {}).get("enabled", False)
        funds_dir = Path("runtime/funds")
        skills_dir = Path("runtime/skills")
        return {
            "ok": True,
            "chunks": chunks,
            "agents": agent_count,
            "daemons": daemon_count,
            "funds": len(list(funds_dir.iterdir())) if funds_dir.exists() else 0,
            "skills": len(list(skills_dir.glob("*.json"))) if skills_dir.exists() else 0,
            "metaclaw": "active" if metaclaw else "inactive",
        }

    @app.get("/api/agents", dependencies=[Depends(verify_api_key)])
    async def agents() -> dict:
        try:
            agent_list = registry.list()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        serialized = [
            {
                "id": getattr(a, "slug", ""),
                "name": getattr(a, "name", ""),
                "domains": getattr(a, "domains", []),
                "tools": len(getattr(a, "tools", [])),
                "constraints": len(getattr(a, "constraints", [])),
            }
            for a in agent_list
        ]
        return {"agents": serialized}

    @app.get("/api/daemons", dependencies=[Depends(verify_api_key)])
    async def daemon_status() -> dict:
        try:
            result = daemons.status()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"daemons": result}


def _register_data_routes(
    app: Any,
    config: dict,
    rag: Any,
    memory: Any,
    guardrails: Any,
    llm_fn: Any,
    base_path: Path,
) -> None:
    """Register query, memory, audit, alerts, market, daemon history routes."""

    @app.get("/api/query", dependencies=[Depends(verify_api_key)])
    async def query(
        request: Request,
        q: str = Query(..., description="Natural language question"),
        fund_id: str | None = Query(None, description="Fund identifier for isolation"),
        session_id: str | None = Query(None, description="Conversation session identifier"),
    ) -> dict:
        return await handle_query(
            request=request, q=q, fund_id=fund_id, session_id=session_id,
            rag=rag, memory=memory, guardrails=guardrails, llm_fn=llm_fn, config=config,
        )

    @app.get("/api/memory/stats", dependencies=[Depends(verify_api_key)])
    async def memory_stats() -> dict:
        try:
            return memory.stats()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.get("/api/audit", dependencies=[Depends(verify_api_key)])
    async def audit_entries(
        limit: int = Query(50, ge=1, le=500),
        path: str | None = Query(None),
        since: str | None = Query(None),
    ) -> dict:
        entries = query_audit_log(since=since, path_filter=path, limit=limit)
        return {"total": len(entries), "entries": entries}

    @app.get("/api/alerts", dependencies=[Depends(verify_api_key)])
    async def get_alerts(
        limit: int = Query(50),
        severity: str | None = Query(None),
        alert_type: str | None = Query(None),
    ) -> dict:
        alerts_file = _runtime_path("data", "alerts.jsonl")
        return _read_alerts_file(alerts_file, severity, alert_type, limit)

    @app.get("/api/market", dependencies=[Depends(verify_api_key)])
    async def get_market() -> dict:
        snapshot_file = base_path / "runtime" / "data" / "market" / "latest_snapshot.json"
        if snapshot_file.exists():
            with snapshot_file.open(encoding="utf-8") as f:
                return json.load(f)
        return {"error": "No market data available. Run market_data_sync daemon."}

    @app.get("/api/market/history", dependencies=[Depends(verify_api_key)])
    async def get_market_history(
        days: int = Query(30, ge=1, le=3650),
        indicator: str | None = Query(None),
    ) -> dict:
        history_file = base_path / "runtime" / "data" / "market" / "history.jsonl"
        if not history_file.exists():
            return {"points": [], "indicators": []}
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        points, names = _parse_market_history(history_file, cutoff, indicator)
        points.sort(key=lambda item: item["timestamp"])
        filtered = sorted(n for n in names if indicator is None or n == indicator)
        return {"points": points, "indicators": filtered}

    @app.get("/api/daemons/history", dependencies=[Depends(verify_api_key)])
    async def daemon_history(
        daemon: str | None = Query(None),
        limit: int = Query(50),
    ) -> dict:
        results_file = _runtime_path("data", "daemon_results.jsonl")
        return _read_daemon_history(results_file, daemon, limit)


def _register_report_routes(app: Any, rag: Any) -> None:
    """Register /api/reports and /api/reports/generate."""

    @app.get("/api/reports", dependencies=[Depends(verify_api_key)])
    async def list_reports() -> dict:
        return {"templates": [{"id": k, "name": v} for k, v in REPORT_TEMPLATES.items()]}

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


def _register_exception_handler(app: Any) -> None:
    """Register global exception handler."""

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Any, exc: Exception) -> JSONResponse:  # noqa: ANN401
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error.", "error": str(exc)},
        )


async def _handle_onboard(request: Any) -> dict:
    """Handle POST /api/onboard — extract to keep route handler small."""
    body = await request.json()
    cnpj = body.get("cnpj", "").replace(".", "").replace("/", "").replace("-", "")
    if not cnpj or len(cnpj) < 11:
        raise HTTPException(status_code=400, detail="CNPJ inválido")
    try:
        from packs.finance.integrations.cvm import build_fund_profile, save_fund_profile
        profile = build_fund_profile(cnpj)
        if not profile or not (
            profile.get("nome")
            or profile.get("cadastro", {}).get("nome")
            or profile.get("cnpj")
        ):
            raise HTTPException(status_code=404, detail="Fundo não encontrado na CVM")
        save_fund_profile(profile, ".")
        _write_onboard_alert(profile)
        cad = profile.get("cadastro") or {}
        inf = profile.get("informe_diario") or {}
        return {
            "ok": True,
            "nome": cad.get("nome") or profile.get("nome") or profile.get("cnpj", "?"),
            "cnpj": cad.get("cnpj") or profile.get("cnpj", "?"),
            "pl": profile.get("patrimonio_liquido") or inf.get("pl_atual", 0),
            "cotistas": profile.get("num_cotistas") or inf.get("nr_cotistas", 0),
            "classe": cad.get("classe") or cad.get("tipo") or "",
            "administrador": cad.get("administrador") or "",
            "gestor": cad.get("gestor") or "",
            "situacao": cad.get("situacao") or "",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def _write_onboard_alert(profile: dict) -> None:
    """Write an onboarding event to the alerts JSONL file."""
    import datetime as _dt
    import json as _json
    alert = {
        "type": "onboarding",
        "severity": "info",
        "title": f"Fundo onboarded: {(profile.get('cadastro', {}).get('nome', '') or profile.get('cnpj', ''))[:50]}",
        "timestamp": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "source": "dashboard",
    }
    Path("runtime/logs").mkdir(parents=True, exist_ok=True)
    with open("runtime/data/alerts.jsonl", "a") as f:
        f.write(_json.dumps(alert, ensure_ascii=False) + "\n")


def _safe_call(fn: Any, label: str) -> Any:
    """Call fn(), logging any exception and returning None on failure."""
    try:
        return fn()
    except Exception as exc:
        logger.warning("%s failed: %s", label, exc)
        return None


def _runtime_path(*parts: str) -> str:
    """Return absolute path under runtime/ directory."""
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base, "runtime", *parts)
