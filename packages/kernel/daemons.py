from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

import yaml
from packages.kernel.cedente_monitor import cedente_monitor as _real_cedente_monitor

from packages.kernel.handlers import (
    # (existing imports)

    regulatory_watch as _real_regulatory_watch,
    market_data_sync as _real_market_data_sync,
    reconciliation as _real_reconciliation,
    memory_reflection as _real_memory_reflection,
    self_audit as _real_self_audit,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Interval / trigger parsing
# ---------------------------------------------------------------------------

_INTERVAL_MAP = {
    "m": 60,
    "h": 3600,
    "d": 86400,
}


def parse_interval(raw: str) -> int:
    """Parse an interval string such as '15m', '1h', '6h', '24h' into seconds."""
    raw = raw.strip()
    for suffix, multiplier in _INTERVAL_MAP.items():
        if raw.endswith(suffix):
            return int(raw[: -len(suffix)]) * multiplier
    # Fallback: try plain integer (seconds)
    return int(raw)


def parse_trigger_hour_utc(raw: str | None) -> int | None:
    """Parse a trigger string like '06:00 UTC' and return the UTC hour (0-23)."""
    if not raw:
        return None
    # Accept formats: "06:00 UTC", "06:00", "6"
    part = raw.replace("UTC", "").strip()
    if ":" in part:
        return int(part.split(":")[0])
    return int(part)


# ---------------------------------------------------------------------------
# DaemonTask dataclass
# ---------------------------------------------------------------------------


@dataclass
class DaemonTask:
    name: str
    interval_seconds: int
    description: str = ""
    trigger_time: Optional[str] = None   # raw string e.g. "06:00 UTC"
    last_run: Optional[float] = None     # epoch seconds
    next_run: float = field(default_factory=lambda: time.time())
    status: str = "idle"                 # idle | running | error
    run_count: int = 0
    error_count: int = 0

    # Derived from trigger_time — not serialised to history
    _trigger_hour_utc: Optional[int] = field(default=None, init=False, repr=False, compare=False)

    def __post_init__(self) -> None:
        self._trigger_hour_utc = parse_trigger_hour_utc(self.trigger_time)

    def is_due(self) -> bool:
        """Return True when this daemon should run now."""
        now = time.time()
        if now < self.next_run:
            return False
        if self._trigger_hour_utc is not None:
            current_hour = datetime.now(timezone.utc).hour
            return current_hour == self._trigger_hour_utc
        return True

    def mark_running(self) -> None:
        self.status = "running"

    def mark_done(self, success: bool) -> None:
        self.last_run = time.time()
        self.next_run = self.last_run + self.interval_seconds
        self.run_count += 1
        if success:
            self.status = "idle"
        else:
            self.status = "error"
            self.error_count += 1

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "interval_seconds": self.interval_seconds,
            "description": self.description,
            "trigger_time": self.trigger_time,
            "last_run": self.last_run,
            "next_run": self.next_run,
            "status": self.status,
            "run_count": self.run_count,
            "error_count": self.error_count,
        }


# ---------------------------------------------------------------------------
# Built-in handler skeletons
# ---------------------------------------------------------------------------


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _resolve_base(config: dict) -> Path:
    """Return the resolved base_path from config, defaulting to cwd."""
    return Path(config.get("base_path", ".")).resolve()


def _append_daemon_result(base: Path, record: dict) -> None:
    """Append a result record to runtime/data/daemon_results.jsonl."""
    out_dir = base / "runtime" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "daemon_results.jsonl"
    with out_path.open("a") as fh:
        fh.write(json.dumps(record) + "\n")


def _load_fund_data(base: Path) -> list[dict]:
    """Try to load fund data from runtime/data/funds.json or similar.

    Returns an empty list (no crash) when no data is found.
    """
    candidates = [
        base / "runtime" / "data" / "funds.json",
        base / "runtime" / "state" / "funds.json",
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
                        return list(data.values())
            except Exception as exc:
                logger.warning("Failed to parse fund data at %s: %s", path, exc)
    return []


# ---------------------------------------------------------------------------
# Real handler implementations
# ---------------------------------------------------------------------------


def covenant_monitor(config: dict) -> dict:
    """Check covenant compliance across all active funds.

    Reads fund data from filesystem memory, evaluates known covenant thresholds,
    and returns a structured result with any violations or warnings.
    """
    base = _resolve_base(config)
    funds = _load_fund_data(base)
    started = _ts()

    if not funds:
        result = {
            "status": "no_data",
            "timestamp": started,
            "violations": [],
            "warnings": [],
            "details": "No fund data found in runtime/data/funds.json",
        }
        _append_daemon_result(base, {"daemon": "covenant-monitor", **result})
        logger.info("[%s] covenant_monitor: no_data", started)
        return result

    # Default covenant thresholds (override via config["covenants"] dict)
    thresholds: dict = config.get("covenants", {
        "max_inadimplencia_rate": 0.05,       # 5%
        "min_subordinacao": 0.20,              # 20%
        "max_concentracao_cedente": 0.15,      # 15% per cedente
        "min_liquidity_ratio": 0.10,           # 10%
    })

    violations: list[dict] = []
    warnings:   list[dict] = []

    for fund in funds:
        name = fund.get("name", fund.get("fund_name", "unknown"))
        cnpj = fund.get("cnpj", "—")

        # --- Inadimplência check ---
        inad = fund.get("inadimplencia_rate", fund.get("default_rate"))
        if inad is not None:
            limit = thresholds["max_inadimplencia_rate"]
            if inad > limit:
                violations.append({
                    "fund": name, "cnpj": cnpj,
                    "covenant": "inadimplencia_rate",
                    "limit": limit, "actual": inad,
                    "severity": "breach",
                })
            elif inad > limit * 0.80:  # 80% of limit → warning
                warnings.append({
                    "fund": name, "cnpj": cnpj,
                    "covenant": "inadimplencia_rate",
                    "limit": limit, "actual": inad,
                    "severity": "warn",
                })

        # --- Subordinação check ---
        sub = fund.get("subordinacao_ratio", fund.get("subordination_ratio"))
        if sub is not None:
            limit = thresholds["min_subordinacao"]
            if sub < limit:
                violations.append({
                    "fund": name, "cnpj": cnpj,
                    "covenant": "subordinacao_ratio",
                    "limit": limit, "actual": sub,
                    "severity": "breach",
                })
            elif sub < limit * 1.10:  # within 10% headroom → warning
                warnings.append({
                    "fund": name, "cnpj": cnpj,
                    "covenant": "subordinacao_ratio",
                    "limit": limit, "actual": sub,
                    "severity": "warn",
                })

        # --- Concentração por cedente check ---
        top_cedente_pct = fund.get("top_cedente_pct", fund.get("max_cedente_concentration"))
        if top_cedente_pct is not None:
            limit = thresholds["max_concentracao_cedente"]
            if top_cedente_pct > limit:
                violations.append({
                    "fund": name, "cnpj": cnpj,
                    "covenant": "concentracao_cedente",
                    "limit": limit, "actual": top_cedente_pct,
                    "severity": "breach",
                })

    overall = "ok" if not violations else "breach"
    if warnings and not violations:
        overall = "warn"

    result = {
        "status": overall,
        "timestamp": started,
        "funds_checked": len(funds),
        "violations": violations,
        "warnings": warnings,
        "details": (
            f"Checked {len(funds)} fund(s): "
            f"{len(violations)} breach(es), {len(warnings)} warning(s)"
        ),
    }

    _append_daemon_result(base, {"daemon": "covenant-monitor", **result})
    logger.info("[%s] covenant_monitor: %s", started, result["details"])
    print(f"[{started}] covenant_monitor: {result['details']}")
    return result


def pdd_calculator(config: dict) -> dict:
    """Calculate PDD (Provisão para Devedores Duvidosos) using IFRS9 staging logic.

    Stage 1 — performing (0–30d overdue):       0.5% provision
    Stage 2 — underperforming (31–90d overdue): 5.0% provision
    Stage 3 — non-performing (>90d overdue):    20.0% provision

    Reads receivables/aging data from runtime; handles missing data gracefully.
    """
    base = _resolve_base(config)
    started = _ts()

    # Try to load aging/receivables data
    aging_candidates = [
        base / "runtime" / "data" / "aging.json",
        base / "runtime" / "state" / "aging.json",
        base / "data" / "aging.json",
    ]
    aging_data: dict | None = None
    for path in aging_candidates:
        if path.exists():
            try:
                with path.open() as fh:
                    aging_data = json.load(fh)
                break
            except Exception as exc:
                logger.warning("Failed to parse aging data at %s: %s", path, exc)

    if aging_data is None:
        # Fall back to fund-level totals if aging isn't available
        funds = _load_fund_data(base)
        if not funds:
            result = {
                "status": "no_data",
                "timestamp": started,
                "pdd_total": 0.0,
                "by_stage": {"stage1": 0.0, "stage2": 0.0, "stage3": 0.0},
                "details": "No aging or fund data found",
            }
            _append_daemon_result(base, {"daemon": "pdd-calculator", **result})
            logger.info("[%s] pdd_calculator: no_data", started)
            return result

        # Approximate from fund-level inadimplencia
        pdd_stage1 = pdd_stage2 = pdd_stage3 = 0.0
        for fund in funds:
            carteira = fund.get("carteira_total", fund.get("pl", 0.0))
            inad = fund.get("inadimplencia_rate", 0.0)
            # Rough split: (1-inad) performing, half inad underperforming, half non-performing
            stage1_base = carteira * (1.0 - inad)
            stage2_base = carteira * inad * 0.50
            stage3_base = carteira * inad * 0.50
            pdd_stage1 += stage1_base * 0.005
            pdd_stage2 += stage2_base * 0.05
            pdd_stage3 += stage3_base * 0.20
    else:
        # Compute from structured aging buckets
        # Expected shape: {"stage1": <amount>, "stage2": <amount>, "stage3": <amount>}
        # OR {"buckets": [{"days_overdue": int, "balance": float}, ...]}
        if "stage1" in aging_data:
            pdd_stage1 = float(aging_data["stage1"]) * 0.005
            pdd_stage2 = float(aging_data.get("stage2", 0)) * 0.05
            pdd_stage3 = float(aging_data.get("stage3", 0)) * 0.20
        elif "buckets" in aging_data:
            pdd_stage1 = pdd_stage2 = pdd_stage3 = 0.0
            for bucket in aging_data["buckets"]:
                balance = float(bucket.get("balance", 0))
                days    = int(bucket.get("days_overdue", 0))
                if days <= 30:
                    pdd_stage1 += balance * 0.005
                elif days <= 90:
                    pdd_stage2 += balance * 0.05
                else:
                    pdd_stage3 += balance * 0.20
        else:
            pdd_stage1 = pdd_stage2 = pdd_stage3 = 0.0

    pdd_total = pdd_stage1 + pdd_stage2 + pdd_stage3
    result = {
        "status": "ok",
        "timestamp": started,
        "pdd_total": round(pdd_total, 2),
        "by_stage": {
            "stage1": round(pdd_stage1, 2),
            "stage2": round(pdd_stage2, 2),
            "stage3": round(pdd_stage3, 2),
        },
        "details": (
            f"PDD total: R$ {pdd_total:,.2f} "
            f"(S1={pdd_stage1:,.2f} S2={pdd_stage2:,.2f} S3={pdd_stage3:,.2f})"
        ),
    }

    _append_daemon_result(base, {"daemon": "pdd-calculator", **result})
    logger.info("[%s] pdd_calculator: %s", started, result["details"])
    print(f"[{started}] pdd_calculator: {result['details']}")
    return result


def reconciliation(config: dict) -> dict:
    """Real implementation: portfolio vs custody reconciliation."""
    return _real_reconciliation(config)


def market_data_sync(config: dict) -> dict:
    """Real implementation: BCB SGS API sync."""
    return _real_market_data_sync(config)


def risk_scanner(config: dict) -> dict:
    """Scan portfolio for risk indicators: concentration, diversification, and alerts.

    Reads fund data from filesystem; returns structured alerts and concentration metrics.
    """
    base = _resolve_base(config)
    started = _ts()
    funds = _load_fund_data(base)

    if not funds:
        result = {
            "status": "no_data",
            "timestamp": started,
            "alerts": [],
            "concentration": {},
            "details": "No fund data available for risk scan",
        }
        _append_daemon_result(base, {"daemon": "risk-scanner", **result})
        logger.info("[%s] risk_scanner: no_data", started)
        return result

    thresholds: dict = config.get("risk_limits", {
        "max_concentration_index": 0.15,   # HHI / top-cedente % PL
        "min_diversification_count": 5,    # minimum distinct cedentes
        "max_var_99_pct_pl": 0.10,         # VaR 99% must not exceed 10% PL
        "min_liquidity_ratio": 0.10,
    })

    alerts: list[dict] = []
    concentration_summary: dict = {}
    total_pl = 0.0

    for fund in funds:
        name = fund.get("name", fund.get("fund_name", "unknown"))
        pl   = float(fund.get("pl", fund.get("patrimonio_liquido", 0.0)))
        total_pl += pl

        # Concentration check
        top_cedente_pct = float(fund.get("top_cedente_pct", fund.get("max_cedente_concentration", 0.0)))
        n_cedentes      = int(fund.get("n_cedentes", fund.get("cedente_count", 0)))
        liq_ratio       = float(fund.get("liquidity_ratio", fund.get("indice_liquidez", 1.0)))
        var_99          = float(fund.get("var_99", 0.0))

        concentration_summary[name] = {
            "pl": pl,
            "top_cedente_pct": top_cedente_pct,
            "n_cedentes": n_cedentes,
            "liquidity_ratio": liq_ratio,
        }

        if top_cedente_pct > thresholds["max_concentration_index"]:
            alerts.append({
                "fund": name, "type": "concentration",
                "message": (
                    f"Top cedente represents {top_cedente_pct:.1%} of PL, "
                    f"exceeding limit of {thresholds['max_concentration_index']:.1%}"
                ),
                "severity": "high",
            })

        if n_cedentes > 0 and n_cedentes < thresholds["min_diversification_count"]:
            alerts.append({
                "fund": name, "type": "diversification",
                "message": (
                    f"Only {n_cedentes} cedente(s) — minimum is "
                    f"{thresholds['min_diversification_count']}"
                ),
                "severity": "medium",
            })

        if liq_ratio < thresholds["min_liquidity_ratio"]:
            alerts.append({
                "fund": name, "type": "liquidity",
                "message": (
                    f"Liquidity ratio {liq_ratio:.1%} below minimum "
                    f"{thresholds['min_liquidity_ratio']:.1%}"
                ),
                "severity": "high",
            })

        if pl > 0 and var_99 > 0 and (var_99 / pl) > thresholds["max_var_99_pct_pl"]:
            alerts.append({
                "fund": name, "type": "var",
                "message": (
                    f"VaR 99% is {var_99/pl:.1%} of PL, "
                    f"exceeding limit of {thresholds['max_var_99_pct_pl']:.1%}"
                ),
                "severity": "high",
            })

    high_count = sum(1 for a in alerts if a.get("severity") == "high")
    overall = "ok" if not alerts else ("critical" if high_count > 0 else "warn")

    result = {
        "status": overall,
        "timestamp": started,
        "alerts": alerts,
        "concentration": concentration_summary,
        "total_pl": round(total_pl, 2),
        "details": (
            f"Scanned {len(funds)} fund(s): "
            f"{len(alerts)} alert(s) ({high_count} high-severity)"
        ),
    }

    _append_daemon_result(base, {"daemon": "risk-scanner", **result})
    logger.info("[%s] risk_scanner: %s", started, result["details"])
    print(f"[{started}] risk_scanner: {result['details']}")
    return result


def regulatory_watch(config: dict) -> dict:
    """Real implementation: RSS scan + classify + alert."""
    return _real_regulatory_watch(config)


def memory_reflection(config: dict) -> dict:
    """Real implementation: analyze patterns + recommendations."""
    return _real_memory_reflection(config)


def self_audit(config: dict) -> dict:
    """Real implementation: system integrity verification."""
    return _real_self_audit(config)


# Map YAML daemon names → built-in handlers
_BUILTIN_HANDLERS: dict[str, Callable] = {
    "covenant-monitor": covenant_monitor,
    "pdd-calculator": pdd_calculator,
    "reconciliation": reconciliation,
    "market-data-sync": market_data_sync,
    "risk-scanner": risk_scanner,
    "regulatory-watch": regulatory_watch,
    "memory-reflection": memory_reflection,
    "self-audit": self_audit,
    "cedente-monitor": _real_cedente_monitor,
}


# ---------------------------------------------------------------------------
# DaemonRunner
# ---------------------------------------------------------------------------


class DaemonRunner:
    """
    Loads daemon definitions from YAML, registers handlers, and drives
    periodic execution. Designed for tmux/systemd long-running loops and
    one-shot CLI invocations alike.

    Usage::

        runner = DaemonRunner(config)
        runner.register_defaults()
        runner.run_due()            # one-shot check
        # or
        runner.run_loop(interval=60)  # blocking loop
    """

    def __init__(
        self,
        config: dict,
        daemons_path: str = "infra/daemons.yaml",
    ) -> None:
        self.config = config
        self._tasks: dict[str, DaemonTask] = {}
        self._handlers: dict[str, Callable] = {}
        self._history_path = self._resolve_history_path()
        self._load_daemons(daemons_path)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _resolve_history_path(self) -> Path:
        base = Path(self.config.get("base_path", "."))
        p = base / "runtime" / "state" / "daemon_history.jsonl"
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def _load_daemons(self, daemons_path: str) -> None:
        """Parse daemons.yaml and populate self._tasks."""
        path = Path(daemons_path)
        if not path.is_absolute():
            # Resolve relative to base_path if provided
            base = Path(self.config.get("base_path", "."))
            path = base / daemons_path

        if not path.exists():
            logger.warning("daemons.yaml not found at %s — starting with empty daemon set", path)
            return

        with path.open() as fh:
            raw = yaml.safe_load(fh)

        daemons_def: dict = raw.get("daemons", {})
        for name, spec in daemons_def.items():
            interval_raw = spec.get("interval", "1h")
            interval_seconds = parse_interval(interval_raw)
            trigger = spec.get("trigger")
            task = DaemonTask(
                name=name,
                interval_seconds=interval_seconds,
                description=spec.get("description", ""),
                trigger_time=trigger,
            )
            self._tasks[name] = task
            logger.debug("Loaded daemon '%s' (every %ss)", name, interval_seconds)

    def _append_history(self, record: dict) -> None:
        with self._history_path.open("a") as fh:
            fh.write(json.dumps(record) + "\n")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def register(self, name: str, handler_fn: Callable) -> None:
        """Register a Python callable as the handler for a named daemon."""
        if name not in self._tasks:
            logger.warning(
                "Registering handler for unknown daemon '%s'. "
                "It won't run until a matching task is defined in YAML.",
                name,
            )
        self._handlers[name] = handler_fn
        logger.debug("Registered handler for daemon '%s'", name)

    def register_defaults(self) -> None:
        """Register all 8 built-in skeleton handlers."""
        for name, fn in _BUILTIN_HANDLERS.items():
            self.register(name, fn)

    def run_once(self, name: str) -> dict:
        """
        Execute a single daemon by name immediately, regardless of schedule.
        Catches exceptions, updates stats, appends to history.
        Returns a result dict with status/details.
        """
        task = self._tasks.get(name)
        if task is None:
            raise ValueError(f"Unknown daemon: '{name}'")

        handler = self._handlers.get(name)
        if handler is None:
            logger.info("Daemon '%s' has no handler registered — skipping execution", name)
            return {"status": "no_handler", "daemon": name}

        task.mark_running()
        started_at = time.time()
        result: dict = {}

        try:
            result = handler(self.config) or {}
            success = True
        except Exception as exc:
            logger.exception("Daemon '%s' raised an exception", name)
            result = {"status": "error", "details": str(exc)}
            success = False
        finally:
            ended_at = time.time()
            task.mark_done(success)

            record = {
                "daemon": name,
                "started_at": datetime.fromtimestamp(started_at, tz=timezone.utc).isoformat(),
                "ended_at": datetime.fromtimestamp(ended_at, tz=timezone.utc).isoformat(),
                "duration_seconds": round(ended_at - started_at, 3),
                "success": success,
                "result": result,
                "run_count": task.run_count,
                "error_count": task.error_count,
            }
            self._append_history(record)

        return result

    def run_due(self) -> list[str]:
        """
        Check all registered daemons and run any that are past their next_run
        time (and match their trigger hour, if applicable).
        Returns list of daemon names that were executed.
        """
        executed: list[str] = []
        for name, task in self._tasks.items():
            if name not in self._handlers:
                continue
            if task.is_due():
                logger.info("Running due daemon: %s", name)
                self.run_once(name)
                executed.append(name)
        return executed

    def run_all(self) -> list[str]:
        """Run all registered daemons once regardless of schedule.

        Returns list of daemon names executed.
        Used by the systemd one-shot service (--run-all flag).
        """
        executed: list[str] = []
        for name in list(self._tasks.keys()):
            if name not in self._handlers:
                continue
            logger.info("run_all: executing daemon %s", name)
            self.run_once(name)
            executed.append(name)
        return executed

    def run_loop(self, interval: int = 60) -> None:
        """
        Blocking infinite loop — calls run_due() every `interval` seconds.
        Designed for tmux/systemd long-running processes.
        Handles KeyboardInterrupt gracefully.
        """
        logger.info("DaemonRunner loop started (tick=%ss)", interval)
        print(f"[{_ts()}] DaemonRunner loop started (tick={interval}s)")
        try:
            while True:
                executed = self.run_due()
                if executed:
                    logger.info("Tick: ran %d daemon(s): %s", len(executed), executed)
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("DaemonRunner loop stopped by user")
            print(f"[{_ts()}] DaemonRunner loop stopped.")

    def status(self) -> list[dict]:
        """Return current status of all registered daemons."""
        return [
            {
                **task.to_dict(),
                "has_handler": task.name in self._handlers,
            }
            for task in self._tasks.values()
        ]

    def history(self, name: str, limit: int = 10) -> list[dict]:
        """
        Return the last `limit` run records for a given daemon name,
        read from the append-only daemon_history.jsonl file.
        """
        if not self._history_path.exists():
            return []

        records: list[dict] = []
        with self._history_path.open() as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    if record.get("daemon") == name:
                        records.append(record)
                except json.JSONDecodeError:
                    continue

        return records[-limit:]


# ---------------------------------------------------------------------------
# CLI entry point — supports --run-all for systemd one-shot mode
# ---------------------------------------------------------------------------

def main() -> None:
    """CLI entry point for running all daemons once (used by systemd service)."""
    import argparse
    import sys

    parser = argparse.ArgumentParser(
        prog="python3 -m packages.kernel.daemons",
        description="PAGANINI AIOS daemon runner",
    )
    parser.add_argument(
        "--run-all",
        action="store_true",
        help="Run all registered daemons once and exit (one-shot mode).",
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Run in continuous loop mode (blocking).",
    )
    parser.add_argument(
        "--config",
        default="daemons.yaml",
        help="Path to daemons YAML config (default: daemons.yaml).",
    )
    args = parser.parse_args()

    # Load config
    config_path = Path(args.config)
    if config_path.exists():
        with config_path.open() as fh:
            cfg = yaml.safe_load(fh) or {}
    else:
        cfg = {}

    runner = DaemonRunner(cfg)

    if args.run_all:
        logging.basicConfig(level=logging.INFO)
        logger.info("--run-all: running all registered daemons once")
        executed = runner.run_all()
        print(f"Executed {len(executed)} daemon(s): {executed}")
        sys.exit(0)
    elif args.loop:
        logging.basicConfig(level=logging.INFO)
        runner.run_loop()
    else:
        parser.print_help()
        sys.exit(0)


if __name__ == "__main__":
    main()
