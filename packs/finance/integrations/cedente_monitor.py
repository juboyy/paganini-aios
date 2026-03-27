"""Paganini AIOS — Cedente Monitor daemon.

Proactive intelligence: monitors news about each cedente (assignor)
in the fund's portfolio. Detects credit events, lawsuits, regulatory
issues, ownership changes that could affect receivables quality.

Gate: GATE-2026-03-15T150325:302c8788e62d
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _resolve_base(config: dict) -> Path:
    return Path(config.get("base_path", ".")).resolve()


def _append_alert(base: Path, alert: dict) -> None:
    out_dir = base / "runtime" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    with (out_dir / "alerts.jsonl").open("a") as fh:
        fh.write(json.dumps(alert, ensure_ascii=False, default=str) + "\n")


def _append_daemon_result(base: Path, record: dict) -> None:
    out_dir = base / "runtime" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    with (out_dir / "daemon_results.jsonl").open("a") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")


def _load_cedentes(base: Path) -> list[dict]:
    """Load cedente list from fund data."""
    candidates = [
        base / "runtime" / "data" / "funds.json",
        base / "data" / "sample" / "fundo-atlas-premium.json",
    ]
    for path in candidates:
        if path.exists():
            try:
                data = json.loads(path.read_text())
                if isinstance(data, dict):
                    return data.get("cedentes", [])
                if isinstance(data, list):
                    cedentes = []
                    for fund in data:
                        cedentes.extend(fund.get("cedentes", []))
                    return cedentes
            except Exception:
                pass
    return []


# Risk keywords that indicate potential credit issues
RISK_KEYWORDS = {
    "critical": [
        "falência", "recuperação judicial", "recuperacao judicial",
        "fraude", "lavagem de dinheiro", "prisão", "preso",
        "CPI", "operação policial", "busca e apreensão",
        "default", "calote", "insolvência", "insolvencia",
    ],
    "high": [
        "inadimplência", "inadimplencia", "atraso pagamento",
        "protesto", "execução fiscal", "ação judicial", "acao judicial",
        "demissão em massa", "demissao em massa", "fechamento",
        "rebaixamento", "downgrade", "prejuízo", "prejuizo",
        "multa", "autuação", "embargo",
    ],
    "medium": [
        "processo", "investigação", "investigacao",
        "mudança societária", "fusão", "aquisição",
        "redução capital", "reducao capital",
        "troca diretoria", "reestruturação", "reestruturacao",
        "queda receita", "queda faturamento",
    ],
    "low": [
        "expansão", "novo contrato", "crescimento",
        "investimento", "parceria", "certificação",
    ],
}


def _search_cedente_news(company_name: str, cnpj: str = "") -> list[dict]:
    """Search for news about a cedente using Google News RSS.

    Uses Google News RSS feed (no API key needed).
    """
    results = []

    # Build search query
    query = f'"{company_name}"'
    if cnpj:
        query += f' OR "{cnpj}"'

    # Google News RSS
    encoded = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419"

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "PaganiniAIOS/1.0 (CedenteMonitor)",
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            xml = resp.read().decode("utf-8", errors="ignore")

        # Parse RSS items
        import re
        items = re.findall(r"<item>(.*?)</item>", xml, re.DOTALL)

        for item_xml in items[:10]:  # Max 10 per cedente
            title_m = re.search(r"<title>(.*?)</title>", item_xml, re.DOTALL)
            link_m = re.search(r"<link>(.*?)</link>", item_xml, re.DOTALL)
            pub_m = re.search(r"<pubDate>(.*?)</pubDate>", item_xml, re.DOTALL)

            title = title_m.group(1).strip() if title_m else ""
            # Remove CDATA
            title = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", title)
            title = re.sub(r"<[^>]+>", "", title)

            link = link_m.group(1).strip() if link_m else ""
            pub_date = pub_m.group(1).strip() if pub_m else ""

            if title:
                results.append({
                    "title": title,
                    "link": link,
                    "date": pub_date,
                    "source": "google_news",
                })

    except Exception as exc:
        logger.warning("News search failed for %s: %s", company_name, exc)

    return results


def _classify_risk(title: str) -> tuple[str, list[str]]:
    """Classify news headline risk level. Returns (severity, matched_keywords)."""
    text = title.lower()
    matched = []

    for severity in ("critical", "high", "medium", "low"):
        for kw in RISK_KEYWORDS[severity]:
            if kw.lower() in text:
                matched.append(kw)
                if severity in ("critical", "high"):
                    return severity, matched

    if matched:
        return "medium", matched

    return "info", []


def cedente_monitor(config: dict) -> dict:
    """Monitor news about each cedente in the fund portfolio."""
    base = _resolve_base(config)
    started = _ts()

    cedentes = _load_cedentes(base)
    if not cedentes:
        return _handle_no_cedentes(base, started)

    seen_hashes = _load_seen_hashes(base)
    total_news, new_items, alerts, cedente_results = _scan_cedentes(
        cedentes, seen_hashes, started, base
    )
    _save_seen_hashes(base, seen_hashes)
    _save_scan_results(base, started, cedente_results, alerts)

    high_count = sum(1 for a in alerts if a.get("severity") in ("critical", "high"))
    result = {
        "status": "alerts" if high_count > 0 else ("warnings" if alerts else "ok"),
        "timestamp": started, "cedentes_scanned": len(cedente_results),
        "total_news": total_news, "new_items": new_items, "alerts": len(alerts),
        "high_severity": high_count,
        "details": f"Scanned {len(cedente_results)} cedentes: {total_news} news items, {new_items} new, {len(alerts)} risk alerts ({high_count} high/critical)",
    }

    _append_daemon_result(base, {"daemon": "cedente-monitor", **result})
    logger.info("[%s] cedente_monitor: %s", started, result["details"])
    _dispatch_high_alerts(alerts, config)
    return result

def _handle_no_cedentes(base: Path, started: str) -> dict:
    res = {"status": "no_data", "timestamp": started, "details": "No cedentes found in fund data"}
    _append_daemon_result(base, {"daemon": "cedente-monitor", **res})
    return res

def _scan_cedentes(
    cedentes: list,
    seen_hashes: set,
    started: str,
    base: Path,
) -> tuple:
    """Scan each cedente for news; return (total_news, new_items, alerts, cedente_results)."""
    total_news = 0
    new_items = 0
    alerts: list = []
    cedente_results: dict = {}

    for cedente in cedentes:
        name = cedente.get("nome", cedente.get("name", ""))
        cnpj = cedente.get("cnpj", "")
        if not name: continue
        time.sleep(0.5)

        news = _search_cedente_news(name, cnpj)
        total_news += len(news)
        cedente_items = []

        for item in news:
            h = hashlib.md5(f"{item['title']}:{item['link']}".encode()).hexdigest()
            if h in seen_hashes: continue
            seen_hashes.add(h)
            new_items += 1
            severity, keywords = _classify_risk(item["title"])
            enriched = {**item, "cedente": name, "cnpj": cnpj, "risk_severity": severity, "risk_keywords": keywords, "hash": h}
            cedente_items.append(enriched)
            if severity in ("critical", "high", "medium"):
                alert = {"type": "cedente_risk", "timestamp": started, "severity": severity, "title": f"[{name}] {item['title'][:120]}", "source": "cedente_monitor", "cedente": name, "cnpj": cnpj, "link": item.get("link", ""), "keywords": keywords}
                alerts.append(alert)
                _append_alert(base, alert)

        cedente_results[name] = {"total_news": len(news), "new_items": len(cedente_items), "risk_items": sum(1 for i in cedente_items if i["risk_severity"] in ("critical", "high", "medium"))}

    return total_news, new_items, alerts, cedente_results


def _dispatch_high_alerts(alerts: list, config: dict) -> None:
    """Dispatch high/critical alerts via AlertDispatcher if available."""
    high_alerts = [a for a in alerts if a.get("severity") in ("critical", "high")]
    if not high_alerts:
        return
    try:
        from core.runtime.handlers import AlertDispatcher
        dispatcher = AlertDispatcher(config)
        for alert in high_alerts:
            dispatcher.dispatch(alert)
    except Exception as exc:
        logger.warning("Alert dispatch failed: %s", exc)
