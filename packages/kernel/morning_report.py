"""Paganini AIOS — Daily Morning Report Generator

Sends a daily summary to Slack/email with:
- Covenant status & alerts
- Market indicators (CDI, SELIC, IPCA)
- Regulatory updates
- Cedente risk events
- Reconciliation status

GATE-2026-03-15T150325:302c8788e62d
"""
from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def _ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def generate_morning_report(base_path: str = ".") -> str:
    """Generate the daily morning report in Markdown format."""
    base = Path(base_path).resolve()
    data_dir = base / "runtime" / "data"
    now = datetime.now(timezone.utc)
    report_lines = []

    report_lines.append(f"# 📊 Relatório Matinal — {now.strftime('%d/%m/%Y')}")
    report_lines.append(f"_Gerado: {_ts()}_\n")

    # 1. Market Data
    market_path = data_dir / "market" / "latest_snapshot.json"
    if market_path.exists():
        market = json.loads(market_path.read_text())
        indicators = market.get("indicators", {})
        report_lines.append("## 📈 Indicadores de Mercado (BCB)")
        for name, label in [
            ("cdi", "CDI"), ("selic", "SELIC"), ("ipca", "IPCA"),
            ("igpm", "IGP-M"), ("cambio_usd", "USD/BRL"),
            ("inad_pf", "Inadimpl. PF"), ("inad_pj", "Inadimpl. PJ"),
        ]:
            ind = indicators.get(name, {})
            val = ind.get("latest_value", "—")
            date = ind.get("latest_date", "")
            unit = "%" if name != "cambio_usd" else "R$"
            if val != "—":
                report_lines.append(f"- **{label}**: {val}{unit} ({date})")
        report_lines.append("")

    # 2. Covenant Alerts
    report_lines.append("## ⚠️ Covenants")
    funds_dir = base / "runtime" / "funds"
    sample_fund = base / "data" / "sample" / "fundo-atlas-premium.json"
    fund_files = list(funds_dir.glob("*/fund.json")) if funds_dir.exists() else []
    if not fund_files and sample_fund.exists():
        fund_files = [sample_fund]

    for fp in fund_files:
        fund = json.loads(fp.read_text())
        fname = fund.get("nome", fp.parent.name)
        covs = fund.get("covenants", {})
        issues = []
        for k, v in covs.items():
            if isinstance(v, dict) and v.get("status") in ("WARNING", "BORDERLINE", "BREACH"):
                issues.append(f"  - 🔴 **{k}**: {v.get('atual','?')} (limite {v.get('limite','?')}) — {v['status']}")
        if issues:
            report_lines.append(f"**{fname}**:")
            report_lines.extend(issues)
        else:
            report_lines.append(f"**{fname}**: ✅ Todos os covenants OK")
    report_lines.append("")

    # 3. Regulatory Alerts
    alerts_path = data_dir / "alerts.jsonl"
    if alerts_path.exists():
        reg_alerts = []
        ced_alerts = []
        for line in alerts_path.read_text().splitlines():
            try:
                a = json.loads(line)
                if a.get("type") == "regulatory":
                    reg_alerts.append(a)
                elif a.get("type") == "cedente_risk":
                    ced_alerts.append(a)
            except Exception:
                pass

        if reg_alerts:
            report_lines.append("## 📜 Alertas Regulatórios")
            for a in reg_alerts[-5:]:
                sev = a.get("severity", "?")
                icon = "🔴" if sev == "critical" else "🟡" if sev == "high" else "🟢"
                report_lines.append(f"- {icon} [{sev.upper()}] {a.get('title','')[:100]}")
            report_lines.append("")

        if ced_alerts:
            report_lines.append("## 🏢 Alertas de Cedentes")
            for a in ced_alerts[-5:]:
                sev = a.get("severity", "?")
                icon = "🔴" if sev in ("critical", "high") else "🟡"
                report_lines.append(f"- {icon} [{sev.upper()}] {a.get('title','')[:100]}")
            report_lines.append("")

    # 4. Daemon Health
    daemon_path = data_dir / "daemon_results.jsonl"
    if daemon_path.exists():
        last_runs = {}
        for line in daemon_path.read_text().splitlines():
            try:
                d = json.loads(line)
                last_runs[d["daemon"]] = d
            except Exception:
                pass

        report_lines.append("## 🤖 Status dos Daemons")
        for name, d in sorted(last_runs.items()):
            status = d.get("status", "?")
            icon = "✅" if status == "ok" else "⚠️" if status == "warn" else "🔴"
            report_lines.append(f"- {icon} **{name}**: {d.get('details','')[:80]}")
        report_lines.append("")

    # 5. Reconciliation
    report_lines.append("## 🔄 Reconciliação")
    recon = last_runs.get("reconciliation", {}) if daemon_path.exists() else {}
    if recon:
        status = recon.get("status", "?")
        details = recon.get("details", "")
        icon = "✅" if status == "ok" else "🔴"
        report_lines.append(f"{icon} {details}")
    else:
        report_lines.append("ℹ️ Nenhuma reconciliação recente")
    report_lines.append("")

    report_lines.append("---")
    report_lines.append(f"_Paganini AIOS v0.1.0 | {_ts()}_")

    return "\n".join(report_lines)


def send_slack(webhook_url: str, text: str) -> bool:
    """Send report to Slack via webhook."""
    payload = json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception:
        return False


if __name__ == "__main__":
    import sys
    base = sys.argv[1] if len(sys.argv) > 1 else "."
    report = generate_morning_report(base)
    print(report)

    # Send to Slack if webhook configured
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if webhook:
        if send_slack(webhook, report):
            print("\n✅ Sent to Slack")
        else:
            print("\n⚠️ Slack send failed")
