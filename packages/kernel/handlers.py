"""Paganini AIOS — Real daemon handler implementations.

Replaces stub handlers for: regulatory_watch, market_data_sync,
reconciliation, memory_reflection, self_audit.

Also adds: AlertDispatcher for multi-channel alert delivery.

Gate: GATE-2026-03-15T150325:302c8788e62d
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _resolve_base(config: dict) -> Path:
    return Path(config.get("base_path", ".")).resolve()


def _append_daemon_result(base: Path, record: dict) -> None:
    out_dir = base / "runtime" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "daemon_results.jsonl"
    with out_path.open("a") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")


def _append_alert(base: Path, alert: dict) -> None:
    """Append an alert to the unified alerts log."""
    out_dir = base / "runtime" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "alerts.jsonl"
    with out_path.open("a") as fh:
        fh.write(json.dumps(alert, ensure_ascii=False, default=str) + "\n")


def _load_fund_data(base: Path) -> list[dict]:
    candidates = [
        base / "runtime" / "data" / "funds.json",
        base / "data" / "sample" / "fundo-atlas-premium.json",
        base / "data" / "funds.json",
    ]
    for path in candidates:
        if path.exists():
            try:
                with path.open() as fh:
                    data = json.load(fh)
                    if isinstance(data, list):
                        return data
                    if isinstance(data, dict):
                        return [data]
            except Exception as exc:
                logger.warning("Failed to parse fund data at %s: %s", path, exc)
    return []


# ---------------------------------------------------------------------------
# 1. REGULATORY WATCH — Real implementation
# ---------------------------------------------------------------------------

def _fetch_rss(url: str, timeout: int = 15) -> str:
    """Fetch RSS/Atom feed content."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PaganiniAIOS/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception as exc:
        logger.warning("RSS fetch failed for %s: %s", url, exc)
        return ""


def _parse_rss_items(xml_text: str) -> list[dict]:
    """Simple RSS/Atom parser without external dependencies.

    Extracts title, link, pubDate/updated, description from items/entries.
    """
    items = []
    import re

    # Try RSS <item> tags
    rss_items = re.findall(r"<item[^>]*>(.*?)</item>", xml_text, re.DOTALL)
    if not rss_items:
        # Try Atom <entry> tags
        rss_items = re.findall(r"<entry[^>]*>(.*?)</entry>", xml_text, re.DOTALL)

    for raw in rss_items[:20]:  # Limit to 20 items
        title = re.search(r"<title[^>]*>(.*?)</title>", raw, re.DOTALL)
        link = re.search(r"<link[^>]*>(.*?)</link>", raw, re.DOTALL)
        if not link:
            link = re.search(r'<link[^>]+href=["\']([^"\']+)', raw)
        pub = re.search(r"<pubDate[^>]*>(.*?)</pubDate>", raw, re.DOTALL)
        if not pub:
            pub = re.search(r"<updated[^>]*>(.*?)</updated>", raw, re.DOTALL)
        desc = re.search(r"<description[^>]*>(.*?)</description>", raw, re.DOTALL)
        if not desc:
            desc = re.search(r"<summary[^>]*>(.*?)</summary>", raw, re.DOTALL)

        items.append({
            "title": _strip_tags(title.group(1)) if title else "",
            "link": (link.group(1) if link else "").strip(),
            "date": (pub.group(1) if pub else "").strip(),
            "description": _strip_tags(desc.group(1))[:500] if desc else "",
        })

    return items


def _strip_tags(text: str) -> str:
    """Remove HTML/XML tags from a string."""
    import re
    clean = re.sub(r"<[^>]+>", "", text)
    clean = clean.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    clean = clean.replace("&quot;", '"').replace("&#39;", "'")
    return clean.strip()


FIDC_KEYWORDS = [
    "fidc", "fundo de investimento em direitos creditórios",
    "securitização", "cvm 175", "resolução cvm", "direitos creditórios",
    "custodiante", "cedente", "pdd", "inadimplência",
    "anbima", "bacen", "banco central", "crédito privado",
    "fundo de investimento", "regulamento", "patrimônio líquido",
]


def _classify_relevance(item: dict) -> dict:
    """Classify regulatory item relevance for fund operations.

    Returns enriched item with impact_score and impact_level.
    Uses keyword matching (fast, no LLM cost).
    """
    text = f"{item.get('title', '')} {item.get('description', '')}".lower()

    score = 0.0
    matched = []
    for kw in FIDC_KEYWORDS:
        if kw in text:
            score += 1.0
            matched.append(kw)

    # Normalize: max possible = len(FIDC_KEYWORDS)
    score = min(score / 4.0, 1.0)  # 4 keywords = max score

    if score >= 0.75:
        level = "critical"
    elif score >= 0.5:
        level = "high"
    elif score >= 0.25:
        level = "medium"
    else:
        level = "low"

    return {
        **item,
        "impact_score": round(score, 2),
        "impact_level": level,
        "matched_keywords": matched,
    }


def regulatory_watch(config: dict) -> dict:
    """Scan CVM/ANBIMA/BACEN RSS feeds for regulatory changes.

    Fetches feeds, classifies relevance, logs alerts for significant items,
    and optionally ingests new regulations into the RAG pipeline.
    """
    base = _resolve_base(config)
    started = _ts()

    # Feeds to scan (from regulatory_watch.yaml or defaults)
    feeds = config.get("regulatory_feeds", [
        {"url": "https://www.gov.br/cvm/pt-br/RSS", "name": "CVM"},
        {"url": "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/normativos", "name": "BACEN"},
    ])

    # Track what we've already seen
    seen_path = base / "runtime" / "data" / "regulatory_seen.json"
    seen_path.parent.mkdir(parents=True, exist_ok=True)
    seen_hashes: set = set()
    if seen_path.exists():
        try:
            seen_hashes = set(json.loads(seen_path.read_text()))
        except Exception:
            pass

    all_items: list[dict] = []
    new_items: list[dict] = []
    alerts: list[dict] = []

    for feed_cfg in feeds:
        url = feed_cfg.get("url", "")
        name = feed_cfg.get("name", "unknown")

        xml = _fetch_rss(url)
        if not xml:
            logger.warning("[%s] regulatory_watch: failed to fetch %s", started, name)
            continue

        items = _parse_rss_items(xml)
        for item in items:
            item["feed"] = name
            h = hashlib.md5(f"{item['title']}:{item['link']}".encode()).hexdigest()
            item["hash"] = h
            all_items.append(item)

            if h not in seen_hashes:
                classified = _classify_relevance(item)
                new_items.append(classified)
                seen_hashes.add(h)

                # Alert for medium+ impact
                if classified["impact_score"] >= 0.25:
                    alert = {
                        "type": "regulatory",
                        "timestamp": started,
                        "severity": classified["impact_level"],
                        "title": classified["title"],
                        "source": name,
                        "link": classified.get("link", ""),
                        "impact_score": classified["impact_score"],
                        "keywords": classified["matched_keywords"],
                        "description": classified.get("description", "")[:200],
                    }
                    alerts.append(alert)
                    _append_alert(base, alert)

    # Save seen hashes
    seen_path.write_text(json.dumps(list(seen_hashes)[-500:]))  # Keep last 500

    # Summary
    high_count = sum(1 for a in alerts if a.get("severity") in ("critical", "high"))
    result = {
        "status": "alerts" if alerts else "ok",
        "timestamp": started,
        "feeds_scanned": len(feeds),
        "total_items": len(all_items),
        "new_items": len(new_items),
        "alerts": len(alerts),
        "high_severity": high_count,
        "details": (
            f"Scanned {len(feeds)} feeds: {len(all_items)} items total, "
            f"{len(new_items)} new, {len(alerts)} alerts ({high_count} high/critical)"
        ),
    }

    _append_daemon_result(base, {"daemon": "regulatory-watch", **result})
    logger.info("[%s] regulatory_watch: %s", started, result["details"])
    print(f"[{started}] regulatory_watch: {result['details']}")

    # Dispatch alerts
    if alerts:
        try:
            dispatcher = AlertDispatcher(config)
            for alert in alerts:
                dispatcher.dispatch(alert)
        except Exception as exc:
            logger.warning("Alert dispatch failed: %s", exc)

    return result


# ---------------------------------------------------------------------------
# 2. MARKET DATA SYNC — BCB SGS API
# ---------------------------------------------------------------------------

# BCB SGS (Sistema Gerenciador de Séries Temporais) — free, no auth
BCB_SGS_SERIES = {
    "cdi": 4389,          # CDI daily rate
    "selic": 432,         # SELIC target rate
    "ipca": 433,          # IPCA monthly
    "igpm": 189,          # IGP-M monthly
    "cambio_usd": 1,      # USD/BRL exchange rate
    "inad_pf": 21112,     # Inadimplência PF
    "inad_pj": 21113,     # Inadimplência PJ
}


def _fetch_bcb_series(series_id: int, last_n: int = 5) -> list[dict]:
    """Fetch last N values from BCB SGS API."""
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}"
        f"/dados/ultimos/{last_n}?formato=json"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PaganiniAIOS/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("BCB SGS fetch failed for series %d: %s", series_id, exc)
        return []


def market_data_sync(config: dict) -> dict:
    """Sync market indicators from BCB SGS API.

    Fetches CDI, SELIC, IPCA, IGP-M, câmbio, inadimplência.
    Stores in runtime/data/market/ as JSON files.
    """
    base = _resolve_base(config)
    started = _ts()

    market_dir = base / "runtime" / "data" / "market"
    market_dir.mkdir(parents=True, exist_ok=True)

    results = {}
    errors = []
    alerts = []

    for name, series_id in BCB_SGS_SERIES.items():
        data = _fetch_bcb_series(series_id, last_n=10)
        if data:
            # Save to file
            out_path = market_dir / f"{name}.json"
            out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2))

            latest = data[-1]
            results[name] = {
                "latest_value": latest.get("valor"),
                "latest_date": latest.get("data"),
                "points": len(data),
            }

            # Alert on significant moves
            if len(data) >= 2 and name in ("cdi", "selic"):
                try:
                    curr = float(data[-1]["valor"])
                    prev = float(data[-2]["valor"])
                    if prev > 0:
                        change_pct = abs(curr - prev) / prev
                        if change_pct > 0.05:  # >5% change
                            alert = {
                                "type": "market",
                                "timestamp": started,
                                "severity": "high",
                                "title": f"{name.upper()} variou {change_pct:.1%} ({prev} → {curr})",
                                "source": "BCB SGS",
                                "indicator": name,
                                "previous": prev,
                                "current": curr,
                            }
                            alerts.append(alert)
                            _append_alert(base, alert)
                except (ValueError, KeyError):
                    pass
        else:
            errors.append(name)

    # Save consolidated snapshot
    snapshot = {
        "timestamp": started,
        "indicators": results,
        "errors": errors,
    }
    (market_dir / "latest_snapshot.json").write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2)
    )

    result = {
        "status": "ok" if not errors else "partial",
        "timestamp": started,
        "synced": len(results),
        "errors": len(errors),
        "error_series": errors,
        "alerts": len(alerts),
        "details": (
            f"Synced {len(results)}/{len(BCB_SGS_SERIES)} indicators from BCB. "
            f"{len(errors)} errors. {len(alerts)} market alerts."
        ),
    }

    _append_daemon_result(base, {"daemon": "market-data-sync", **result})
    logger.info("[%s] market_data_sync: %s", started, result["details"])
    print(f"[{started}] market_data_sync: {result['details']}")
    return result


# ---------------------------------------------------------------------------
# 3. RECONCILIATION — Portfolio vs custody position check
# ---------------------------------------------------------------------------

def reconciliation(config: dict) -> dict:
    """Reconcile internal portfolio position against custody records.

    Compares fund data (internal) with custody export (if available).
    Detects: count mismatches, value discrepancies, missing assets.
    """
    base = _resolve_base(config)
    started = _ts()
    funds = _load_fund_data(base)

    # Look for custody export
    custody_path = base / "runtime" / "data" / "custody_export.json"
    custody_data = None
    if custody_path.exists():
        try:
            custody_data = json.loads(custody_path.read_text())
        except Exception:
            pass

    if not funds:
        result = {
            "status": "no_data",
            "timestamp": started,
            "discrepancies": [],
            "details": "No fund data found for reconciliation",
        }
        _append_daemon_result(base, {"daemon": "reconciliation", **result})
        return result

    discrepancies = []

    for fund in funds:
        name = fund.get("nome", fund.get("name", "unknown"))
        carteira = fund.get("carteira", {})

        # Internal checks (self-consistency)
        total_recebiveis = carteira.get("total_recebiveis", 0)
        cedentes = fund.get("cedentes", [])
        sum_cedentes = sum(c.get("recebiveis_ativos", 0) for c in cedentes) if cedentes else 0

        if total_recebiveis > 0 and sum_cedentes > 0:
            diff = abs(total_recebiveis - sum_cedentes)
            if diff > 0:
                discrepancies.append({
                    "fund": name,
                    "type": "count_mismatch",
                    "internal_total": total_recebiveis,
                    "sum_cedentes": sum_cedentes,
                    "difference": diff,
                    "severity": "high" if diff > total_recebiveis * 0.01 else "low",
                })

        # PL consistency: cotas * valor_cota ≈ PL
        cotas = fund.get("cotas", {})
        if cotas:
            computed_pl = 0
            for tranche_name, tranche_data in cotas.items():
                if isinstance(tranche_data, dict):
                    qtd = tranche_data.get("quantidade", 0)
                    val = tranche_data.get("valor_cota", 0)
                    computed_pl += qtd * val

            declared_pl = fund.get("patrimonio_liquido", 0)
            if computed_pl > 0 and declared_pl > 0:
                diff_pct = abs(computed_pl - declared_pl) / declared_pl
                if diff_pct > 0.001:  # >0.1% discrepancy
                    discrepancies.append({
                        "fund": name,
                        "type": "pl_mismatch",
                        "computed_pl": round(computed_pl, 2),
                        "declared_pl": declared_pl,
                        "diff_pct": round(diff_pct * 100, 3),
                        "severity": "high" if diff_pct > 0.01 else "medium",
                    })

        # Custody cross-check (if data available)
        if custody_data and isinstance(custody_data, dict):
            custody_total = custody_data.get(name, {}).get("total_assets", 0)
            if custody_total > 0 and total_recebiveis > 0:
                diff_pct = abs(custody_total - total_recebiveis) / total_recebiveis
                if diff_pct > 0.001:
                    discrepancies.append({
                        "fund": name,
                        "type": "custody_mismatch",
                        "internal": total_recebiveis,
                        "custody": custody_total,
                        "diff_pct": round(diff_pct * 100, 3),
                        "severity": "critical",
                    })

    # Generate alerts for discrepancies
    for d in discrepancies:
        if d["severity"] in ("high", "critical"):
            _append_alert(base, {
                "type": "reconciliation",
                "timestamp": started,
                "severity": d["severity"],
                "title": f"[{d['fund']}] {d['type']}: {d.get('diff_pct', 'N/A')}% discrepancy",
                "source": "reconciliation_daemon",
                "details": d,
            })

    result = {
        "status": "ok" if not discrepancies else "discrepancies_found",
        "timestamp": started,
        "funds_checked": len(funds),
        "discrepancies": discrepancies,
        "custody_available": custody_data is not None,
        "details": (
            f"Reconciled {len(funds)} fund(s): "
            f"{len(discrepancies)} discrepancy(ies) found"
        ),
    }

    _append_daemon_result(base, {"daemon": "reconciliation", **result})
    logger.info("[%s] reconciliation: %s", started, result["details"])
    print(f"[{started}] reconciliation: {result['details']}")
    return result


# ---------------------------------------------------------------------------
# 4. MEMORY REFLECTION — Consolidate operational learnings
# ---------------------------------------------------------------------------

def memory_reflection(config: dict) -> dict:
    """Analyze query patterns, guardrail blocks, and daemon alerts.

    Produces a daily summary of system behavior to optimize future operations.
    """
    base = _resolve_base(config)
    started = _ts()

    reflection: dict[str, Any] = {
        "timestamp": started,
        "query_stats": {},
        "guardrail_stats": {},
        "daemon_stats": {},
        "recommendations": [],
    }

    # 1. Analyze daemon results
    daemon_log = base / "runtime" / "data" / "daemon_results.jsonl"
    if daemon_log.exists():
        daemon_counts: dict[str, int] = {}
        daemon_errors: dict[str, int] = {}
        total_runs = 0

        for line in daemon_log.read_text().splitlines()[-200:]:  # Last 200 entries
            try:
                entry = json.loads(line)
                name = entry.get("daemon", "unknown")
                daemon_counts[name] = daemon_counts.get(name, 0) + 1
                total_runs += 1
                if entry.get("status") in ("error", "critical"):
                    daemon_errors[name] = daemon_errors.get(name, 0) + 1
            except json.JSONDecodeError:
                continue

        reflection["daemon_stats"] = {
            "total_runs": total_runs,
            "by_daemon": daemon_counts,
            "errors": daemon_errors,
        }

        # Recommendations based on patterns
        for name, err_count in daemon_errors.items():
            runs = daemon_counts.get(name, 0)
            if runs > 0 and (err_count / runs) > 0.3:
                reflection["recommendations"].append(
                    f"{name} has {err_count}/{runs} errors ({err_count/runs:.0%}). "
                    f"Investigate handler stability."
                )

    # 2. Analyze alerts
    alerts_log = base / "runtime" / "data" / "alerts.jsonl"
    if alerts_log.exists():
        alert_types: dict[str, int] = {}
        severity_counts: dict[str, int] = {}

        for line in alerts_log.read_text().splitlines()[-100:]:
            try:
                entry = json.loads(line)
                atype = entry.get("type", "unknown")
                sev = entry.get("severity", "unknown")
                alert_types[atype] = alert_types.get(atype, 0) + 1
                severity_counts[sev] = severity_counts.get(sev, 0) + 1
            except json.JSONDecodeError:
                continue

        reflection["alert_stats"] = {
            "by_type": alert_types,
            "by_severity": severity_counts,
        }

        if severity_counts.get("critical", 0) > 3:
            reflection["recommendations"].append(
                f"{severity_counts['critical']} critical alerts logged. "
                f"Review immediately."
            )

    # 3. Save reflection
    reflection_dir = base / "runtime" / "data" / "reflections"
    reflection_dir.mkdir(parents=True, exist_ok=True)
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ref_path = reflection_dir / f"reflection_{date_str}.json"
    ref_path.write_text(json.dumps(reflection, ensure_ascii=False, indent=2))

    result = {
        "status": "ok",
        "timestamp": started,
        "daemon_runs_analyzed": reflection["daemon_stats"].get("total_runs", 0),
        "recommendations": len(reflection["recommendations"]),
        "details": (
            f"Reflection complete: {reflection['daemon_stats'].get('total_runs', 0)} daemon runs, "
            f"{len(reflection['recommendations'])} recommendations"
        ),
    }

    _append_daemon_result(base, {"daemon": "memory-reflection", **result})
    logger.info("[%s] memory_reflection: %s", started, result["details"])
    print(f"[{started}] memory_reflection: {result['details']}")
    return result


# ---------------------------------------------------------------------------
# 5. SELF AUDIT — System integrity verification
# ---------------------------------------------------------------------------

def self_audit(config: dict) -> dict:
    """Verify system integrity: ChromaDB, guardrails, agents, config.

    Checks that all components are functional and data is consistent.
    """
    base = _resolve_base(config)
    started = _ts()

    checks: list[dict] = []
    issues: list[dict] = []

    # 1. ChromaDB health
    try:
        from packages.rag.pipeline import RAGPipeline
        rag = RAGPipeline(config)
        chunk_count = rag.collection.count()
        checks.append({"component": "chromadb", "status": "ok", "chunks": chunk_count})
        if chunk_count == 0:
            issues.append({
                "component": "chromadb",
                "severity": "critical",
                "message": "ChromaDB is empty — no corpus indexed",
            })
    except Exception as exc:
        checks.append({"component": "chromadb", "status": "error", "error": str(exc)})
        issues.append({
            "component": "chromadb",
            "severity": "critical",
            "message": f"ChromaDB failed: {exc}",
        })

    # 2. Config validation
    required_keys = ["name", "version"]
    for key in required_keys:
        if key not in config:
            issues.append({
                "component": "config",
                "severity": "medium",
                "message": f"Missing config key: {key}",
            })
    checks.append({"component": "config", "status": "ok" if not any(
        i["component"] == "config" for i in issues) else "warn"})

    # 3. Agent souls directory
    souls_dir = Path(config.get("souls_dir", "packages/agents/souls"))
    if souls_dir.exists():
        soul_count = len(list(souls_dir.glob("*.yaml"))) + len(list(souls_dir.glob("*.yml")))
        checks.append({"component": "agents", "status": "ok", "souls": soul_count})
        if soul_count == 0:
            issues.append({
                "component": "agents",
                "severity": "high",
                "message": "No agent SOUL files found",
            })
    else:
        checks.append({"component": "agents", "status": "missing"})
        issues.append({
            "component": "agents",
            "severity": "high",
            "message": f"Souls directory not found: {souls_dir}",
        })

    # 4. Runtime directories
    for subdir in ["data", "logs", "state"]:
        dir_path = base / "runtime" / subdir
        if not dir_path.exists():
            dir_path.mkdir(parents=True, exist_ok=True)
            checks.append({"component": f"runtime/{subdir}", "status": "created"})
        else:
            checks.append({"component": f"runtime/{subdir}", "status": "ok"})

    # 5. Corpus check
    corpus_dir = base / "data" / "corpus" / "fidc"
    if corpus_dir.exists():
        md_count = len(list(corpus_dir.rglob("*.md")))
        checks.append({"component": "corpus", "status": "ok", "files": md_count})
    else:
        checks.append({"component": "corpus", "status": "missing"})
        issues.append({
            "component": "corpus",
            "severity": "high",
            "message": "Corpus directory not found: data/corpus/fidc/",
        })

    # 6. Guardrails import check
    try:
        from packages.shared.guardrails import GuardrailPipeline
        gp = GuardrailPipeline(config)
        checks.append({"component": "guardrails", "status": "ok"})
    except Exception as exc:
        checks.append({"component": "guardrails", "status": "error", "error": str(exc)})
        issues.append({
            "component": "guardrails",
            "severity": "critical",
            "message": f"Guardrails failed to load: {exc}",
        })

    # 7. Disk space
    try:
        import shutil
        usage = shutil.disk_usage(str(base))
        free_gb = usage.free / (1024**3)
        checks.append({"component": "disk", "status": "ok", "free_gb": round(free_gb, 1)})
        if free_gb < 2:
            issues.append({
                "component": "disk",
                "severity": "high",
                "message": f"Low disk space: {free_gb:.1f}GB free",
            })
    except Exception:
        pass

    # Log issues as alerts
    for issue in issues:
        if issue["severity"] in ("critical", "high"):
            _append_alert(base, {
                "type": "self_audit",
                "timestamp": started,
                "severity": issue["severity"],
                "title": f"[{issue['component']}] {issue['message']}",
                "source": "self_audit",
            })

    overall = "ok"
    if any(i["severity"] == "critical" for i in issues):
        overall = "critical"
    elif any(i["severity"] == "high" for i in issues):
        overall = "warn"

    result = {
        "status": overall,
        "timestamp": started,
        "checks": checks,
        "issues": issues,
        "details": (
            f"Audit: {len(checks)} checks, {len(issues)} issues "
            f"({sum(1 for i in issues if i['severity'] in ('critical', 'high'))} high+)"
        ),
    }

    _append_daemon_result(base, {"daemon": "self-audit", **result})
    logger.info("[%s] self_audit: %s", started, result["details"])
    print(f"[{started}] self_audit: {result['details']}")
    return result


# ---------------------------------------------------------------------------
# ALERT DISPATCHER — Multi-channel alert delivery
# ---------------------------------------------------------------------------

class AlertDispatcher:
    """Dispatch alerts to multiple channels based on severity config.

    Channels:
    - log: always (runtime/data/alerts.jsonl)
    - slack: webhook for high+ severity
    - email: via SMTP for critical (optional)
    - webhook: custom URL for integrations
    """

    def __init__(self, config: dict):
        self.config = config
        self.base = _resolve_base(config)
        alert_cfg = config.get("alerts", {})
        self.slack_webhook = alert_cfg.get("slack_webhook", os.environ.get("SLACK_WEBHOOK_URL", ""))
        self.webhook_url = alert_cfg.get("webhook_url", "")
        self.min_severity_slack = alert_cfg.get("min_severity_slack", "high")
        self.min_severity_webhook = alert_cfg.get("min_severity_webhook", "medium")

    SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}

    def _severity_gte(self, severity: str, threshold: str) -> bool:
        return self.SEVERITY_ORDER.get(severity, 0) >= self.SEVERITY_ORDER.get(threshold, 0)

    def dispatch(self, alert: dict) -> None:
        """Dispatch alert to appropriate channels."""
        severity = alert.get("severity", "low")

        # Always log
        # (already logged by caller via _append_alert)

        # Slack
        if self.slack_webhook and self._severity_gte(severity, self.min_severity_slack):
            self._send_slack(alert)

        # Webhook
        if self.webhook_url and self._severity_gte(severity, self.min_severity_webhook):
            self._send_webhook(alert)

    def _send_slack(self, alert: dict) -> None:
        """Send alert to Slack via incoming webhook."""
        severity = alert.get("severity", "?")
        emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(severity, "⚪")
        title = alert.get("title", "Alert")
        source = alert.get("source", "")
        link = alert.get("link", "")

        text = f"{emoji} *[{severity.upper()}]* {title}"
        if source:
            text += f"\n📡 Source: {source}"
        if link:
            text += f"\n🔗 {link}"

        payload = json.dumps({"text": text}).encode("utf-8")
        try:
            req = urllib.request.Request(
                self.slack_webhook,
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=10)
            logger.info("Slack alert sent: %s", title[:50])
        except Exception as exc:
            logger.warning("Slack dispatch failed: %s", exc)

    def _send_webhook(self, alert: dict) -> None:
        """Send alert to custom webhook."""
        payload = json.dumps(alert, ensure_ascii=False, default=str).encode("utf-8")
        try:
            req = urllib.request.Request(
                self.webhook_url,
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception as exc:
            logger.warning("Webhook dispatch failed: %s", exc)
