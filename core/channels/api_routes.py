"""PAGANINI AIOS — API Route Handlers.

Individual async handler functions extracted from api.py:create_app to reduce
cyclomatic complexity and line count of the factory function.

All handlers receive the subsystems they need as closure dependencies
(rag, memory, guardrails, registry, daemons, llm_fn, config, base_path).
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

REPORT_TEMPLATES = {
    "monthly": "Monthly LP Update",
    "quarterly": "Quarterly Fund Report",
    "annual": "Annual Letter",
    "nav": "NAV Statement",
    "capital_call": "Capital Call Notice",
}


# ---------------------------------------------------------------------------
# Subsystem-independent route helpers
# ---------------------------------------------------------------------------


def _load_funds_list() -> list[dict]:
    """Load all onboarded fund profiles from runtime/funds/."""
    import json as _json
    funds_dir = Path("runtime/funds")
    funds = []
    if not funds_dir.exists():
        return funds
    for fdir in sorted(funds_dir.iterdir()):
        fj = fdir / "fund.json"
        if not fj.exists():
            continue
        try:
            fd = _json.loads(fj.read_text())
            cad = fd.get("cadastro") or {}
            inf = fd.get("informe_diario") or {}
            ult = inf.get("ultimo") or {}
            funds.append({
                "id": fdir.name,
                "nome": fd.get("nome") or cad.get("nome", "?"),
                "cnpj": fd.get("cnpj") or cad.get("cnpj", "?"),
                "classe": fd.get("classe") or cad.get("classe") or cad.get("tipo") or "",
                "pl": fd.get("patrimonio_liquido") or inf.get("pl_atual") or ult.get("pl", 0),
                "cotistas": fd.get("num_cotistas") or inf.get("nr_cotistas") or ult.get("nr_cotistas", 0),
                "data_info": fd.get("onboarded_at", ult.get("data", ""))[:10],
                "situacao": fd.get("situacao") or cad.get("situacao") or "EM FUNCIONAMENTO NORMAL",
                "administrador": fd.get("administrador") or cad.get("administrador") or "",
                "gestor": fd.get("gestor") or cad.get("gestor") or "",
            })
        except Exception:
            pass
    return funds


def _load_skills_list(config: dict) -> dict:
    """Load MetaClaw learned skills from runtime/skills/."""
    import json as _json
    skills_dir = Path("runtime/skills")
    skills = []
    if skills_dir.exists():
        for sf in sorted(skills_dir.glob("*.json")):
            try:
                skills.append(_json.loads(sf.read_text()))
            except Exception:
                pass
    return {
        "skills": skills,
        "total": len(skills),
        "metaclaw_enabled": config.get("metaclaw", {}).get("enabled", False),
    }


def _read_alerts_file(
    alerts_file: str,
    severity: str | None,
    alert_type: str | None,
    limit: int,
) -> dict:
    """Read and filter the alerts JSONL file."""
    import os
    alerts = []
    if os.path.exists(alerts_file):
        with open(alerts_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    alert = json.loads(line)
                    if severity and alert.get("severity") != severity:
                        continue
                    if alert_type and alert.get("type") != alert_type:
                        continue
                    alerts.append(alert)
                except Exception:
                    continue
    alerts.reverse()
    return {
        "total": len(alerts),
        "alerts": alerts[:limit],
        "filters": {"severity": severity, "type": alert_type},
    }


def _read_daemon_history(results_file: str, daemon: str | None, limit: int) -> dict:
    """Read and filter the daemon results JSONL file."""
    import os
    entries = []
    if os.path.exists(results_file):
        with open(results_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    if daemon and entry.get("daemon") != daemon:
                        continue
                    entries.append(entry)
                except Exception:
                    continue
    entries.reverse()
    return {"total": len(entries), "entries": entries[:limit]}


def _parse_market_history(
    history_file: Path,
    cutoff: datetime,
    indicator: str | None,
) -> tuple[list[dict], set[str]]:
    """Parse market history JSONL file and return (points, indicator_names)."""
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
            points.append({"timestamp": timestamp.isoformat(), "indicators": indicators})
    return points, indicator_names


# ---------------------------------------------------------------------------
# Query handler (the biggest one — extracted into helpers)
# ---------------------------------------------------------------------------

_GREETINGS = {
    "oi", "olá", "ola", "hey", "hi", "hello", "bom dia",
    "boa tarde", "boa noite", "e aí", "e ai", "fala",
    "salve", "eae", "yo", "tudo bem", "como vai", "opa",
}

_MARKET_KEYWORDS = [
    "mercado", "indicador", "bcb", "cdi", "selic", "ipca",
    "igpm", "igp-m", "dólar", "dolar", "câmbio", "cambio",
    "usd", "inadimplência", "inadimplencia", "juros", "taxa",
]

_PURE_MARKET_KEYWORDS = [
    "indicador", "cdi", "selic", "ipca", "igpm", "igp-m",
    "dólar", "dolar", "câmbio", "cambio", "usd", "mercado atual",
    "inadimplência", "inadimplencia", "dados de mercado",
    "taxa de juros", "indicadores bcb",
]


def _build_greeting_response(
    q: str,
    session_id: str,
    fund_id: str | None,
    memory: Any,
) -> dict:
    """Return a pre-canned greeting response and persist to memory."""
    greeting_resp = (
        "Olá! Sou o Paganini — seu assistente de inteligência para fundos de investimento.\n\n"
        "**O que posso fazer:**\n"
        "• Consultar regulação (CVM 175, custodiante, compliance)\n"
        "• Analisar indicadores de mercado (CDI, SELIC, IPCA, câmbio)\n"
        "• Monitorar covenants e stress tests\n"
        "• Onboarding de fundos via CNPJ (CVM Dados Abertos)\n\n"
        "**Exemplos de perguntas:**\n"
        "• *Quais as obrigações do custodiante de um fundo?*\n"
        "• *O que é subordinação de cotas?*\n"
        "• *Quais os indicadores de mercado atuais?*\n"
        "• *Como funciona o stress test de um fundo?*"
    )
    memory.session.add(session_id, "user", q, {})
    memory.session.add(session_id, "assistant", greeting_resp, {"confidence": 1.0})
    return {
        "answer": greeting_resp,
        "confidence": 1.0,
        "sources": [],
        "fund_id": fund_id,
        "session_id": session_id,
        "agent": "paganini",
        "routed_to": "paganini",
        "latency_ms": 0,
    }


def _build_market_context(q: str) -> str:
    """Enrich context with BCB market data if query is market-related."""
    if not any(kw in q.lower() for kw in _MARKET_KEYWORDS):
        return ""
    market_file = Path("runtime/data/market/latest_snapshot.json")
    if not market_file.exists():
        return ""
    import json as _json
    mdata = _json.loads(market_file.read_text())
    indicators = mdata.get("indicators", {})
    labels = {
        "cdi": "CDI", "selic": "SELIC", "ipca": "IPCA",
        "igpm": "IGP-M", "cambio_usd": "USD/BRL",
        "inad_pf": "Inadimplência PF", "inad_pj": "Inadimplência PJ",
    }
    lines = ["Dados atuais de mercado (BCB SGS):"]
    for k, label in labels.items():
        ind = indicators.get(k, {})
        v = ind.get("latest_value", "?")
        dt = ind.get("latest_date", "?")
        unit = "" if k == "cambio_usd" else "%"
        lines.append(f"  {label}: {v}{unit} (data: {dt})")
    lines.append(f"  Timestamp: {mdata.get('timestamp', '?')}")
    return "\n".join(lines)


def _route_and_enrich(q: str, config: dict) -> tuple[str, str]:
    """Run cognitive router and return (routed_agent, extra_context)."""
    routed_agent = "rag"
    extra_context = _build_market_context(q)
    try:
        from core.router.cognitive_router import CognitiveRouter
        router = CognitiveRouter(config)
        routing = router.route(q)
        if routing.primary_agent:
            routed_agent = routing.primary_agent.slug
        if routing.primary_agent and hasattr(routing.primary_agent, "soul_text"):
            soul_snippet = (routing.primary_agent.soul_text or "")[:300]
            if soul_snippet:
                extra_context += (
                    f"\n\nAgente especializado: {routing.primary_agent.name}\n{soul_snippet}"
                )
    except Exception as exc:
        logger.warning("Router enrichment failed (non-fatal): %s", exc)
    return routed_agent, extra_context


def _try_direct_market_answer(
    q: str,
    extra_context: str,
    llm_fn: Any,
    memory: Any,
    session_id: str,
    fund_id: str | None,
    routed_agent: str,
    t0: float,
) -> dict | None:
    """Attempt to answer a pure market query directly without RAG. Returns dict or None."""
    import time
    is_pure_market = (
        any(kw in q.lower() for kw in _PURE_MARKET_KEYWORDS)
        and extra_context
        and "BCB" in extra_context
    )
    if not is_pure_market:
        return None
    try:
        market_answer = llm_fn(
            "Você é um especialista em mercado financeiro brasileiro. "
            "Responda sobre os indicadores com os dados fornecidos. "
            "Seja preciso, use os valores exatos. Formate de forma clara.",
            f"{extra_context}\n\nPergunta: {q}",
        )
        memory.record_interaction(q, market_answer, chunks=[], confidence=0.95, agent=routed_agent)
        memory.session.add(session_id, "user", q, {"fund_id": fund_id})
        memory.session.add(session_id, "assistant", market_answer, {"fund_id": fund_id, "confidence": 0.95})
        return {
            "answer": market_answer,
            "confidence": 0.95,
            "sources": [{"source": "BCB SGS (Banco Central)", "section": "Dados ao vivo", "text": ""}],
            "fund_id": fund_id,
            "session_id": session_id,
            "agent": routed_agent,
            "routed_to": routed_agent,
            "latency_ms": int((time.time() - t0) * 1000),
        }
    except Exception as exc:
        logger.warning("Direct market answer failed: %s", exc)
        return None


async def handle_query(
    request: Any,
    q: str,
    fund_id: str | None,
    session_id: str | None,
    rag: Any,
    memory: Any,
    guardrails: Any,
    llm_fn: Any,
    config: dict,
) -> dict:
    """Core query handler extracted from create_app to reduce factory size."""
    import time
    from fastapi import HTTPException

    if not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' cannot be empty.")

    current_session_id = session_id or str(uuid.uuid4())
    history = memory.session.get_history(current_session_id, limit=5)
    history_context = _build_history_context(history)

    rag_query = q if not history_context else f"{history_context}\n\nCurrent question: {q}"

    q_clean = q.lower().strip("!?. ")
    if q_clean in _GREETINGS:
        return _build_greeting_response(q, current_session_id, fund_id, memory)

    t0 = time.time()
    routed_agent, extra_context = _route_and_enrich(q, config)

    direct = _try_direct_market_answer(
        q, extra_context, llm_fn, memory, current_session_id, fund_id, routed_agent, t0
    )
    if direct is not None:
        return direct

    enriched_query = rag_query if not extra_context else f"{extra_context}\n\n---\n\n{rag_query}"

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

    _apply_guardrails(q, answer, chunks, confidence, guardrails, latency_ms)
    _persist_interaction(q, answer, chunks, confidence, fund_id, current_session_id, routed_agent, memory)

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


def _build_history_context(history: list) -> str:
    """Serialize session history into a context string."""
    if not history:
        return ""
    serialized = [
        f"{entry.get('role', 'unknown')}: {str(entry.get('content', '')).strip()}"
        for entry in history
        if str(entry.get("content", "")).strip()
    ]
    return ("Conversation history:\n" + "\n".join(serialized)) if serialized else ""


def _apply_guardrails(
    q: str,
    answer: str,
    chunks: list,
    confidence: float,
    guardrails: Any,
    latency_ms: int,
) -> None:
    """Run post-response guardrails; return blocked response if needed."""
    from fastapi import HTTPException
    try:
        guard = guardrails.check(q, answer, [c.text[:100] for c in chunks], confidence)
        if not guard.passed:
            raise HTTPException(
                status_code=200,
                detail=f"[Bloqueado por {guard.blocked_by}] Consulta bloqueada pelos guardrails.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Guardrail check failed: %s", exc)


def _persist_interaction(
    q: str,
    answer: str,
    chunks: list,
    confidence: float,
    fund_id: str | None,
    session_id: str,
    agent: str,
    memory: Any,
) -> None:
    """Persist query + answer to memory."""
    try:
        memory.record_interaction(
            q, answer,
            chunks=[c.text[:200] for c in chunks],
            confidence=confidence,
            agent=agent,
        )
        memory.session.add(session_id, "user", q, {"fund_id": fund_id})
        memory.session.add(session_id, "assistant", answer, {"fund_id": fund_id, "confidence": confidence})
    except Exception as exc:
        logger.warning("Memory store failed: %s", exc)
