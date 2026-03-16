"""Paganini AIOS — Interactive Terminal UI.

Usage:
    paganini shell

A rich terminal interface for querying, monitoring, and managing
your fund operations without a browser.
"""

from __future__ import annotations

import json
import os
import readline  # noqa: F401 — enables arrow keys + history in input()
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from rich.columns import Columns
from rich.console import Console
from rich.markup import escape
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

console = Console()

# ── Paths ──────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent.parent
RUNTIME = BASE / "runtime"
MARKET_SNAPSHOT = RUNTIME / "data" / "market" / "latest_snapshot.json"
API_KEY_FILE = RUNTIME / "state" / "api_key.txt"

# ── Lazy imports (avoid crashing if subsystems missing) ───────
_engine = None
_rag = None


def _get_engine():
    global _engine
    if _engine is None:
        try:
            from packages.kernel.engine import load_config, create_engine
            config = load_config()
            api_key = os.environ.get("GOOGLE_API_KEY", "")
            if api_key:
                config["provider"] = {
                    "type": "google",
                    "model": "gemini/gemini-2.5-flash",
                    "api_key": api_key,
                }
            _engine = create_engine(config)
        except Exception:
            _engine = None
    return _engine


def _get_rag():
    global _rag
    if _rag is None:
        try:
            from packages.rag.pipeline import RAGPipeline
            from packages.kernel.engine import load_config
            config = load_config()
            api_key = os.environ.get("GOOGLE_API_KEY", "")
            if api_key:
                config["provider"] = {
                    "type": "google",
                    "model": "gemini/gemini-2.5-flash",
                    "api_key": api_key,
                }
            _rag = RAGPipeline(config)
        except Exception:
            _rag = None
    return _rag


# ═════════════════════════════════════════════════════════════
# COMMANDS
# ═════════════════════════════════════════════════════════════

def cmd_help(**_):
    """Show available commands."""
    commands = [
        ("query <text>", "Ask the fund AI agents"),
        ("market", "Show BCB market indicators"),
        ("agents", "List registered AI agents"),
        ("status", "System status overview"),
        ("onboard <cnpj>", "Onboard fund from CVM public data"),
        ("daemons", "Show daemon status"),
        ("alerts", "Show active alerts"),
        ("history", "Show query history"),
        ("clear", "Clear screen"),
        ("help", "This help"),
        ("quit / exit", "Exit shell"),
    ]
    table = Table(
        title="Commands", show_header=True, border_style="dim",
        title_style="bold #c9a84c",
    )
    table.add_column("Command", style="#c9a84c", min_width=20)
    table.add_column("Description", style="dim")
    for cmd, desc in commands:
        table.add_row(cmd, desc)
    console.print(table)


def cmd_status(**_):
    """Show system status."""
    from packages.kernel.engine import load_config

    config = load_config()

    # Count agents
    agents_dir = BASE / "packages" / "agents" / "souls"
    agent_count = len(list(agents_dir.glob("*.md"))) if agents_dir.exists() else 0

    # RAG chunks
    rag = _get_rag()
    chunks = 0
    if rag and hasattr(rag, "collection") and rag.collection:
        try:
            chunks = rag.collection.count()
        except Exception:
            pass

    # Market data
    market_ts = "—"
    if MARKET_SNAPSHOT.exists():
        try:
            data = json.loads(MARKET_SNAPSHOT.read_text())
            market_ts = data.get("timestamp", "—")
        except Exception:
            pass

    table = Table(
        title="🎻 System Status", show_header=False,
        border_style="#c9a84c", title_style="bold #c9a84c",
        padding=(0, 2),
    )
    table.add_column("Key", style="dim", min_width=20)
    table.add_column("Value", style="bold")
    table.add_row("Version", "0.1.0")
    table.add_row("Agents", str(agent_count))
    table.add_row("RAG Chunks", f"{chunks:,}" if chunks else "not indexed")
    table.add_row("Market Sync", market_ts)
    table.add_row("LLM Provider", config.get("provider", {}).get("model", "not configured"))
    table.add_row("Runtime", str(RUNTIME))
    console.print(table)


def cmd_market(**_):
    """Show market indicators."""
    if not MARKET_SNAPSHOT.exists():
        # Try to sync
        console.print("[dim]No market data. Syncing from BCB...[/dim]")
        try:
            from packages.kernel.handlers import market_data_sync
            market_data_sync({"fund_slug": "default"})
        except Exception as e:
            console.print(f"[red]Sync failed: {e}[/red]")
            return

    if not MARKET_SNAPSHOT.exists():
        console.print("[red]No market data available.[/red]")
        return

    data = json.loads(MARKET_SNAPSHOT.read_text())
    indicators = data.get("indicators", {})

    table = Table(
        title="📊 Market Indicators (BCB SGS)",
        title_style="bold #c9a84c", border_style="dim",
    )
    table.add_column("Indicator", style="#c9a84c", min_width=14)
    table.add_column("Value", justify="right", style="bold")
    table.add_column("Date", style="dim")

    labels = {
        "cdi": "CDI", "selic": "SELIC", "ipca": "IPCA",
        "igpm": "IGP-M", "cambio_usd": "USD/BRL",
        "inad_pf": "Inad. PF", "inad_pj": "Inad. PJ",
    }
    for key, label in labels.items():
        ind = indicators.get(key, {})
        val = ind.get("latest_value", "—")
        date = ind.get("latest_date", "—")
        unit = "" if key == "cambio_usd" else "%"
        table.add_row(label, f"{val}{unit}", date)

    table.add_row("", "", "")
    table.add_row("[dim]Updated[/dim]", "", data.get("timestamp", "—")[:19])
    console.print(table)


def cmd_agents(**_):
    """List registered agents."""
    try:
        from packages.kernel.engine import load_config, AgentRegistry
        config = load_config()
        registry = AgentRegistry(str(BASE / "agents"), config)
        agents = registry.list_agents()
    except Exception:
        agents = []

    if not agents:
        # Fallback: read SOUL files
        agents_dir = BASE / "packages" / "agents" / "souls"
        if agents_dir.exists():
            agents = [
                {"name": f.stem.replace("_", " ").title(), "id": f.stem}
                for f in sorted(agents_dir.glob("*.md"))
            ]

    icons = {
        "administrador": "📋", "compliance": "🛡️", "custodiante": "🏦",
        "due_diligence": "🔍", "gestor": "💼", "investor_relations": "📊",
        "pricing": "💰", "regulatory_watch": "📡", "reporting": "📝",
    }

    table = Table(
        title="🤖 AI Agents", title_style="bold #c9a84c", border_style="dim",
    )
    table.add_column("", min_width=2)
    table.add_column("Agent", style="bold", min_width=20)
    table.add_column("Status", justify="center")

    for a in agents:
        name = a if isinstance(a, str) else (a.get("name", a.get("id", "?")))
        aid = name.lower().replace(" ", "_").replace("agent:", "").strip()
        icon = icons.get(aid, "🤖")
        table.add_row(icon, name, "[green]● ready[/green]")

    console.print(table)


def cmd_query(text: str = "", **_):
    """Query the fund AI."""
    if not text:
        console.print("[red]Usage: query <your question>[/red]")
        return

    console.print(f"[dim]⟳ Querying agents...[/dim]")

    rag = _get_rag()
    if rag is None:
        console.print("[red]RAG pipeline not available. Check configuration.[/red]")
        return

    try:
        from packages.kernel.engine import load_config, get_llm_fn
        config = load_config()
        llm_fn = get_llm_fn(config)
        result = rag.query(text, llm_fn=llm_fn)
    except Exception as e:
        console.print(f"[red]Query failed: {e}[/red]")
        return

    answer = result.text if hasattr(result, "text") else (result.get("answer", "No answer.") if isinstance(result, dict) else str(result))
    confidence = result.confidence if hasattr(result, "confidence") else (result.get("confidence", 0) if isinstance(result, dict) else 0)
    sources = result.chunks if hasattr(result, "chunks") else (result.get("sources", []) if isinstance(result, dict) else [])

    # Confidence color
    conf_pct = int(confidence * 100)
    conf_color = "green" if conf_pct >= 80 else "yellow" if conf_pct >= 60 else "red"

    # Answer panel
    console.print()
    console.print(Panel(
        answer,
        title=f"[{conf_color}]Confiança: {conf_pct}%[/{conf_color}]",
        border_style="#c9a84c",
        padding=(1, 2),
    ))

    # Sources
    if sources:
        src_texts = []
        for s in sources[:5]:
            if isinstance(s, dict):
                name = s.get("source", "doc").split("/")[-1].replace(".md", "")
                section = s.get("section", "")
            elif hasattr(s, "source"):
                name = (getattr(s, "source", None) or "doc").split("/")[-1].replace(".md", "")
                section = getattr(s, "section", "")
            else:
                name = str(s)
                section = ""
            src_texts.append(f"[dim]📄 {name}[/dim]" + (f" · {section[:40]}" if section else ""))
        console.print("  ".join(src_texts))
    console.print()

    # Store in history
    _query_history.append({
        "q": text,
        "confidence": conf_pct,
        "time": datetime.now(timezone.utc).isoformat(),
    })


def cmd_onboard(text: str = "", **_):
    """Onboard a fund from CVM public data."""
    cnpj = text.strip()
    if not cnpj or len(cnpj) < 14:
        console.print("[red]Usage: onboard XX.XXX.XXX/XXXX-XX[/red]")
        return

    console.print(f"[#c9a84c]▸[/#c9a84c] Onboarding fund CNPJ {cnpj}...")

    try:
        from packages.kernel.cvm_ingester import build_fund_profile, save_fund_profile

        console.print("[dim]  → Buscando cadastro na CVM...[/dim]")
        profile = build_fund_profile(cnpj)

        console.print("[dim]  → Salvando perfil...[/dim]")
        path = save_fund_profile(profile, str(RUNTIME / "funds"))

        # Display results
        table = Table(
            title="🏢 Fund Profile", title_style="bold #c9a84c", border_style="#c9a84c",
        )
        table.add_column("Field", style="dim", min_width=18)
        table.add_column("Value", style="bold")

        for key in ["cnpj", "nome", "administrador", "classe", "situacao", "patrimonio_liquido", "valor_cota", "cotistas"]:
            val = profile.get(key) or profile.get("cadastro", {}).get(key, "—")
            if val and val != "—":
                table.add_row(key.replace("_", " ").title(), str(val))

        table.add_row("Saved To", str(path))
        console.print(table)
        console.print("[green]✓ Fund onboarded successfully[/green]")

    except Exception as e:
        console.print(f"[red]Onboard failed: {e}[/red]")


def cmd_daemons(**_):
    """Show daemon status."""
    try:
        from packages.kernel.daemons import DaemonScheduler
        from packages.kernel.engine import load_config
        config = load_config()
        sched = DaemonScheduler(config)
        daemons = sched.list_daemons()
    except Exception:
        daemons = []

    if not daemons:
        console.print("[dim]No daemons registered.[/dim]")
        return

    table = Table(
        title="⚙ Daemons", title_style="bold #c9a84c", border_style="dim",
    )
    table.add_column("Name", style="#c9a84c")
    table.add_column("Interval", justify="right")
    table.add_column("Status", justify="center")
    table.add_column("Runs", justify="right")

    for d in daemons:
        name = d.get("name", "?")
        interval = d.get("interval_seconds", 0)
        status = d.get("status", "idle")
        runs = d.get("run_count", 0)
        interval_str = f"{interval//60}m" if interval >= 60 else f"{interval}s"
        status_color = "green" if status in ("ok", "idle") else "yellow" if status == "running" else "red"
        table.add_row(name, interval_str, f"[{status_color}]● {status}[/{status_color}]", str(runs))

    console.print(table)


def cmd_alerts(**_):
    """Show active alerts."""
    alerts_file = RUNTIME / "logs" / "alerts.jsonl"
    if not alerts_file.exists():
        console.print("[green]✓ No alerts[/green]")
        return

    alerts = []
    for line in alerts_file.read_text().strip().split("\n")[-10:]:
        try:
            alerts.append(json.loads(line))
        except Exception:
            pass

    if not alerts:
        console.print("[green]✓ No alerts[/green]")
        return

    for a in alerts:
        sev = a.get("severity", "info")
        icon = "🔴" if sev == "critical" else "🟡" if sev in ("high", "warning") else "🔵"
        msg = a.get("title", a.get("message", "?"))
        ts = a.get("timestamp", "")[:19]
        console.print(f"  {icon} [{sev}] {msg}  [dim]{ts}[/dim]")


_query_history: list[dict] = []


def cmd_history(**_):
    """Show query history for this session."""
    if not _query_history:
        console.print("[dim]No queries yet this session.[/dim]")
        return

    table = Table(title="Query History", border_style="dim")
    table.add_column("#", style="dim", min_width=3)
    table.add_column("Query", min_width=40)
    table.add_column("Conf", justify="right")

    for i, h in enumerate(_query_history, 1):
        table.add_row(str(i), h["q"][:60], f"{h['confidence']}%")

    console.print(table)


# ═════════════════════════════════════════════════════════════
# MAIN REPL
# ═════════════════════════════════════════════════════════════

COMMANDS = {
    "help": cmd_help, "h": cmd_help, "?": cmd_help,
    "status": cmd_status, "st": cmd_status,
    "market": cmd_market, "mkt": cmd_market,
    "agents": cmd_agents, "ag": cmd_agents,
    "query": cmd_query, "q": cmd_query, "ask": cmd_query,
    "onboard": cmd_onboard, "ob": cmd_onboard,
    "daemons": cmd_daemons, "dm": cmd_daemons,
    "alerts": cmd_alerts, "al": cmd_alerts,
    "history": cmd_history, "hist": cmd_history,
    "clear": lambda **_: os.system("clear"),
    "cls": lambda **_: os.system("clear"),
}


def banner():
    """Show startup banner."""
    console.print()
    console.print(Panel(
        "[bold #c9a84c]🎻 PAGANINI AIOS[/bold #c9a84c]\n"
        "[dim]AI Operations System for Investment Funds[/dim]\n\n"
        "[dim]Type [bold]help[/bold] for commands, [bold]query <text>[/bold] to ask agents[/dim]",
        border_style="#c9a84c",
        padding=(1, 4),
    ))
    console.print()


def run_shell():
    """Main interactive shell loop."""
    banner()

    # Quick status on entry
    try:
        cmd_status()
    except Exception:
        pass

    console.print()

    while True:
        try:
            raw = console.input("[#c9a84c]paganini>[/#c9a84c] ").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Bye.[/dim]")
            break

        if not raw:
            continue

        if raw.lower() in ("quit", "exit", "q!", ":q"):
            console.print("[dim]Bye.[/dim]")
            break

        parts = raw.split(None, 1)
        cmd_name = parts[0].lower()
        cmd_text = parts[1] if len(parts) > 1 else ""

        # If no command match, treat entire input as query
        if cmd_name in COMMANDS:
            try:
                COMMANDS[cmd_name](text=cmd_text)
            except Exception as e:
                console.print(f"[red]Error: {e}[/red]")
        else:
            # Default: treat as query
            try:
                cmd_query(text=raw)
            except Exception as e:
                console.print(f"[red]Error: {e}[/red]")


if __name__ == "__main__":
    run_shell()
