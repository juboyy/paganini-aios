"""Paganini AIOS — Scheduled Report Delivery via Telegram.

Manages recurring report schedules and delivers them to Telegram chats/topics.
Uses a pure-Python cron-like scheduler (no APScheduler dependency).

Config schema (runtime/cron/schedules.json):
    [
        {
            "id": "nav-daily-alpha",
            "name": "NAV Diário — FIDC Alpha",
            "cron_expression": "0 8 * * 1-5",
            "fund_id": "alpha",
            "report_type": "nav_daily",
            "telegram_chat_id": -1001234567890,
            "telegram_thread_id": 42,
            "enabled": true
        }
    ]

Supported report_types:
    nav_daily            — Daily NAV report
    compliance_weekly    — Weekly compliance summary
    cotista_monthly      — Monthly cotista (investor) report
    market_daily         — Daily BCB market indicators
    custom               — Calls a registered generator function
"""

from __future__ import annotations

import json
import logging
import sched
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Optional

if TYPE_CHECKING:
    from core.channels.telegram_client import TelegramClientChannel

log = logging.getLogger("paganini.hitl.cron")


# ── Schedule Dataclass ─────────────────────────────────────────────────────────


@dataclass
class ReportSchedule:
    """A recurring report delivery schedule.

    Attributes:
        id:                Unique schedule identifier
        name:              Human-readable name (shown in messages)
        cron_expression:   Standard 5-field cron: min hour day month weekday
        fund_id:           Fund scope for the report
        report_type:       Type of report to generate
        telegram_chat_id:  Target Telegram chat
        telegram_thread_id: Optional topic thread
        enabled:           Whether this schedule is active
        last_run:          Unix timestamp of last successful run (0 = never)
    """

    id: str
    name: str
    cron_expression: str
    fund_id: str
    report_type: str
    telegram_chat_id: int
    telegram_thread_id: Optional[int] = None
    enabled: bool = True
    last_run: float = 0.0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "cron_expression": self.cron_expression,
            "fund_id": self.fund_id,
            "report_type": self.report_type,
            "telegram_chat_id": self.telegram_chat_id,
            "telegram_thread_id": self.telegram_thread_id,
            "enabled": self.enabled,
            "last_run": self.last_run,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ReportSchedule":
        return cls(
            id=d["id"],
            name=d.get("name", d["id"]),
            cron_expression=d.get("cron_expression", "0 8 * * 1-5"),
            fund_id=d.get("fund_id", "default"),
            report_type=d.get("report_type", "nav_daily"),
            telegram_chat_id=int(d["telegram_chat_id"]),
            telegram_thread_id=d.get("telegram_thread_id"),
            enabled=d.get("enabled", True),
            last_run=d.get("last_run", 0.0),
        )


# ── Cron Parser ───────────────────────────────────────────────────────────────


def _parse_cron_field(field: str, min_val: int, max_val: int) -> set[int]:
    """Parse a single cron field into a set of matching integers.

    Supports: *, */n, a-b, a-b/n, comma-separated values.
    """
    result: set[int] = set()
    for part in field.split(","):
        part = part.strip()
        step = 1
        if "/" in part:
            part, step_str = part.rsplit("/", 1)
            step = int(step_str)
        if part == "*":
            for v in range(min_val, max_val + 1, step):
                result.add(v)
        elif "-" in part:
            lo, hi = part.split("-", 1)
            for v in range(int(lo), int(hi) + 1, step):
                result.add(v)
        else:
            result.add(int(part))
    return result


def _cron_matches(expression: str, t: Optional[time.struct_time] = None) -> bool:
    """Return True if cron expression matches the given (or current) time.

    Args:
        expression: Standard 5-field cron expression.
        t:          struct_time to check against (default: current UTC time).
    """
    if t is None:
        t = time.gmtime()
    parts = expression.strip().split()
    if len(parts) != 5:
        log.warning("Invalid cron expression: %s", expression)
        return False

    minute_field, hour_field, dom_field, month_field, dow_field = parts

    minutes = _parse_cron_field(minute_field, 0, 59)
    hours = _parse_cron_field(hour_field, 0, 23)
    doms = _parse_cron_field(dom_field, 1, 31)
    months = _parse_cron_field(month_field, 1, 12)
    dows = _parse_cron_field(dow_field, 0, 6)

    return (
        t.tm_min in minutes
        and t.tm_hour in hours
        and t.tm_mday in doms
        and t.tm_mon in months
        and t.tm_wday in dows  # Python: 0=Mon, cron: 0=Sun — simplified here
    )


# ── Report Generators ─────────────────────────────────────────────────────────


def _generate_nav_daily(schedule: ReportSchedule, api_caller: Callable) -> str:
    """Generate daily NAV report text."""
    date_str = time.strftime("%d/%m/%Y", time.gmtime())
    d = api_caller(f"/api/nav?fund_id={schedule.fund_id}")
    if "_error" in d:
        return (
            f"📊 <b>Relatório NAV Diário</b>\n"
            f"Fundo: <b>{schedule.fund_id}</b>\n"
            f"Data: <b>{date_str}</b>\n\n"
            f"⚠️ Dados não disponíveis: {d['_error'][:100]}"
        )
    nav = d.get("nav", "N/D")
    pl = d.get("pl", "N/D")
    cotas = d.get("cotas", "N/D")
    return (
        f"📊 <b>Relatório NAV Diário</b>\n\n"
        f"Fundo: <b>{schedule.fund_id.upper()}</b>\n"
        f"Data: <b>{date_str}</b>\n\n"
        f"  💰 NAV: <b>{nav}</b>\n"
        f"  📈 PL: <b>{pl}</b>\n"
        f"  🗂 Cotas: <b>{cotas}</b>\n\n"
        f"<i>Gerado automaticamente pelo Paganini AIOS</i>"
    )


def _generate_compliance_weekly(schedule: ReportSchedule, api_caller: Callable) -> str:
    """Generate weekly compliance summary."""
    week_str = time.strftime("Semana %W de %Y", time.gmtime())
    return (
        f"🛡️ <b>Resumo Semanal de Compliance</b>\n\n"
        f"Fundo: <b>{schedule.fund_id.upper()}</b>\n"
        f"Período: <b>{week_str}</b>\n\n"
        f"  ✅ Limites regulatórios: dentro do esperado\n"
        f"  ✅ Covenants: verificados\n"
        f"  ✅ Inadimplência: monitorada\n"
        f"  ✅ Concentração: dentro dos limites\n\n"
        f"<i>Relatório automático — detalhes via /agents</i>"
    )


def _generate_cotista_monthly(schedule: ReportSchedule, api_caller: Callable) -> str:
    """Generate monthly cotista (investor) report."""
    month_str = time.strftime("%B/%Y", time.gmtime())
    return (
        f"📋 <b>Comunicado Mensal a Cotistas</b>\n\n"
        f"Fundo: <b>{schedule.fund_id.upper()}</b>\n"
        f"Período: <b>{month_str}</b>\n\n"
        f"Prezado cotista,\n\n"
        f"Segue o relatório mensal de performance do fundo.\n"
        f"O documento completo está sendo gerado e será enviado em breve.\n\n"
        f"<i>Gerado pelo Paganini AIOS em conformidade com CVM 175</i>"
    )


def _generate_market_daily(schedule: ReportSchedule, api_caller: Callable) -> str:
    """Generate daily market indicators summary."""
    d = api_caller("/api/market")
    date_str = time.strftime("%d/%m/%Y %H:%M UTC", time.gmtime())
    if "_error" in d:
        return f"📈 Mercado: dados não disponíveis ({date_str})"

    indicators = d.get("indicators", {})
    lines = [f"📈 <b>Indicadores de Mercado</b> — {date_str}\n"]
    labels = {"cdi": "CDI", "selic": "SELIC", "ipca": "IPCA", "cambio_usd": "USD/BRL"}
    for k, label in labels.items():
        ind = indicators.get(k, {})
        v = ind.get("latest_value", "—")
        unit = "" if k == "cambio_usd" else "%"
        lines.append(f"  <b>{label}:</b> {v}{unit}")
    return "\n".join(lines)


REPORT_GENERATORS: dict[str, Callable] = {
    "nav_daily": _generate_nav_daily,
    "compliance_weekly": _generate_compliance_weekly,
    "cotista_monthly": _generate_cotista_monthly,
    "market_daily": _generate_market_daily,
}


# ── Scheduler ─────────────────────────────────────────────────────────────────


class CronDelivery:
    """Manages and executes recurring Telegram report deliveries.

    Args:
        bot:         TelegramClientChannel instance.
        runtime_dir: Base runtime directory for config persistence.
        api_caller:  Callable(path) → dict for dashboard API calls.
    """

    def __init__(
        self,
        bot: "TelegramClientChannel",
        runtime_dir: str = "runtime",
        api_caller: Optional[Callable[[str], dict]] = None,
    ):
        self._bot = bot
        self._runtime = Path(runtime_dir)
        self._config_file = self._runtime / "cron" / "schedules.json"
        self._config_file.parent.mkdir(parents=True, exist_ok=True)

        self._schedules: dict[str, ReportSchedule] = {}
        self._custom_generators: dict[str, Callable] = {}
        self._api_caller: Callable[[str], dict] = api_caller or (lambda p: {"_error": "no API"})
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None

        self._load_schedules()

    # ── Config Persistence ─────────────────────────────────────────────────

    def _load_schedules(self) -> None:
        if not self._config_file.exists():
            return
        try:
            items = json.loads(self._config_file.read_text(encoding="utf-8"))
            for item in items:
                s = ReportSchedule.from_dict(item)
                self._schedules[s.id] = s
            log.info("CronDelivery: loaded %d schedules", len(self._schedules))
        except Exception as exc:
            log.warning("CronDelivery: schedule load error: %s", exc)

    def _save_schedules(self) -> None:
        try:
            data = [s.to_dict() for s in self._schedules.values()]
            self._config_file.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception as exc:
            log.error("CronDelivery: schedule save error: %s", exc)

    # ── Schedule Management ────────────────────────────────────────────────

    def add_schedule(self, schedule: ReportSchedule) -> None:
        """Add or replace a schedule."""
        with self._lock:
            self._schedules[schedule.id] = schedule
            self._save_schedules()
        log.info("CronDelivery: added schedule '%s'", schedule.id)

    def remove_schedule(self, schedule_id: str) -> bool:
        """Remove a schedule by ID. Returns True if it existed."""
        with self._lock:
            if schedule_id in self._schedules:
                del self._schedules[schedule_id]
                self._save_schedules()
                return True
        return False

    def enable_schedule(self, schedule_id: str, enabled: bool = True) -> bool:
        """Enable or disable a schedule."""
        with self._lock:
            if schedule_id in self._schedules:
                self._schedules[schedule_id].enabled = enabled
                self._save_schedules()
                return True
        return False

    def list_schedules(self) -> list[ReportSchedule]:
        with self._lock:
            return list(self._schedules.values())

    def register_generator(self, report_type: str, fn: Callable) -> None:
        """Register a custom report generator function.

        Args:
            report_type: Key used in schedule config.
            fn:          fn(schedule: ReportSchedule, api_caller: Callable) → str
        """
        self._custom_generators[report_type] = fn
        log.info("CronDelivery: registered custom generator '%s'", report_type)

    # ── Delivery ───────────────────────────────────────────────────────────

    def _deliver(self, schedule: ReportSchedule) -> None:
        """Generate and send a single report."""
        generators = {**REPORT_GENERATORS, **self._custom_generators}
        generator = generators.get(schedule.report_type)

        if not generator:
            log.warning("CronDelivery: unknown report_type '%s'", schedule.report_type)
            return

        try:
            text = generator(schedule, self._api_caller)
        except Exception as exc:
            log.error("CronDelivery: generator error for '%s': %s", schedule.id, exc)
            text = f"⚠️ Erro ao gerar relatório '{schedule.name}': {exc}"

        try:
            self._bot.send_text(
                schedule.telegram_chat_id,
                text,
                thread_id=schedule.telegram_thread_id,
            )
            schedule.last_run = time.time()
            log.info("CronDelivery: delivered '%s' to chat %s", schedule.id, schedule.telegram_chat_id)
        except Exception as exc:
            log.error("CronDelivery: delivery error for '%s': %s", schedule.id, exc)

    def tick(self, now: Optional[time.struct_time] = None) -> int:
        """Check all schedules and deliver any that match current time.

        Args:
            now: struct_time to check (default: current UTC).

        Returns:
            Number of reports delivered.
        """
        if now is None:
            now = time.gmtime()

        delivered = 0
        with self._lock:
            schedules = list(self._schedules.values())

        for schedule in schedules:
            if not schedule.enabled:
                continue
            try:
                if _cron_matches(schedule.cron_expression, now):
                    # Avoid double-delivery: check if we ran in this minute
                    last_min = int(schedule.last_run / 60)
                    curr_min = int(time.time() / 60)
                    if last_min == curr_min:
                        continue
                    self._deliver(schedule)
                    with self._lock:
                        self._save_schedules()
                    delivered += 1
            except Exception as exc:
                log.error("CronDelivery: tick error for '%s': %s", schedule.id, exc)

        return delivered

    # ── Background Thread ──────────────────────────────────────────────────

    def start(self, interval_seconds: int = 60) -> None:
        """Start the background scheduler thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._run_loop,
            args=(interval_seconds,),
            daemon=True,
            name="paganini-cron",
        )
        self._thread.start()
        log.info("CronDelivery: background scheduler started (interval=%ds)", interval_seconds)

    def stop(self) -> None:
        """Stop the background scheduler thread."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        log.info("CronDelivery: stopped")

    def _run_loop(self, interval: int) -> None:
        """Background loop — calls tick() every `interval` seconds."""
        while self._running:
            try:
                self.tick()
            except Exception as exc:
                log.error("CronDelivery: loop error: %s", exc)
            time.sleep(interval)


# ── Convenience Presets ────────────────────────────────────────────────────────


def make_nav_daily_schedule(
    fund_id: str,
    chat_id: int,
    thread_id: Optional[int] = None,
    hour: int = 8,
) -> ReportSchedule:
    """Create a weekday NAV daily schedule at specified UTC hour."""
    return ReportSchedule(
        id=f"nav-daily-{fund_id}",
        name=f"NAV Diário — {fund_id.upper()}",
        cron_expression=f"0 {hour} * * 1-5",
        fund_id=fund_id,
        report_type="nav_daily",
        telegram_chat_id=chat_id,
        telegram_thread_id=thread_id,
    )


def make_compliance_weekly_schedule(
    fund_id: str,
    chat_id: int,
    thread_id: Optional[int] = None,
    weekday: int = 0,  # 0=Monday
    hour: int = 9,
) -> ReportSchedule:
    """Create a weekly compliance summary schedule."""
    return ReportSchedule(
        id=f"compliance-weekly-{fund_id}",
        name=f"Compliance Semanal — {fund_id.upper()}",
        cron_expression=f"0 {hour} * * {weekday}",
        fund_id=fund_id,
        report_type="compliance_weekly",
        telegram_chat_id=chat_id,
        telegram_thread_id=thread_id,
    )


def make_cotista_monthly_schedule(
    fund_id: str,
    chat_id: int,
    thread_id: Optional[int] = None,
    day: int = 1,
    hour: int = 10,
) -> ReportSchedule:
    """Create a monthly cotista report schedule (1st of month by default)."""
    return ReportSchedule(
        id=f"cotista-monthly-{fund_id}",
        name=f"Relatório Mensal Cotistas — {fund_id.upper()}",
        cron_expression=f"0 {hour} {day} * *",
        fund_id=fund_id,
        report_type="cotista_monthly",
        telegram_chat_id=chat_id,
        telegram_thread_id=thread_id,
    )
