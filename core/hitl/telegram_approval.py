"""Paganini AIOS — Telegram Approval Interface (HITL).

Sends structured approval requests as Telegram messages with inline keyboards.
Handles callback queries for Approve / Reject / Details actions.

Integration:
    from core.hitl.telegram_approval import TelegramApprovalInterface
    approval = TelegramApprovalInterface(telegram_client)
    approval.register(telegram_client)  # wires callback handlers
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.channels.telegram_client import TelegramClientChannel

from core.hitl.workflow import ApprovalRequest, ApprovalResult, HITLWorkflow, RiskLevel

log = logging.getLogger("paganini.hitl.telegram")

# ── Risk display helpers ────────────────────────────────────────────────────────

RISK_ICONS = {
    RiskLevel.HIGH: "🔴 ALTO",
    RiskLevel.MEDIUM: "🟡 MÉDIO",
    RiskLevel.LOW: "🟢 BAIXO",
}

RISK_COLORS = {
    RiskLevel.HIGH: "🔴",
    RiskLevel.MEDIUM: "🟡",
    RiskLevel.LOW: "🟢",
}


def _fmt_brl(value: float) -> str:
    """Format a float as Brazilian Real currency."""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _fmt_approval_message(req: ApprovalRequest) -> str:
    """Build the HTML Telegram message for an approval request."""
    risk_label = RISK_ICONS.get(req.risk_level, req.risk_level)
    fund_line = f"\nFundo: <b>{req.fund_id}</b>" if req.fund_id else ""
    agent_line = f"\nAgente: <b>{req.agent_id}</b>"
    approvers_line = (
        f"\nAprovadores: <b>{', '.join(req.approvers)}</b>" if req.approvers else ""
    )

    # Format data fields
    detail_lines: list[str] = []
    data = req.data or {}
    field_labels = {
        "cedente": "Cedente",
        "valor": "Valor",
        "vencimento": "Vencimento",
        "sacado": "Sacado",
        "taxa": "Taxa",
        "volume": "Volume",
        "parametro": "Parâmetro",
        "valor_anterior": "Valor Anterior",
        "valor_novo": "Valor Novo",
    }
    for key, label in field_labels.items():
        if key in data:
            val = data[key]
            if key == "valor" and isinstance(val, (int, float)):
                val = _fmt_brl(float(val))
            detail_lines.append(f"  - {label}: {val}")

    # Any extra fields not in the known list
    for key, val in data.items():
        if key not in field_labels:
            detail_lines.append(f"  - {key}: {val}")

    details_block = ""
    if detail_lines:
        details_block = "\n\nDetalhes:\n" + "\n".join(detail_lines)

    # Timeout info
    timeout_dt = time.strftime(
        "%d/%m/%Y %H:%M UTC",
        time.gmtime(req.created_at + req.timeout_hours * 3600)
    )

    return (
        f"🔒 <b>Aprovação Necessária</b>\n\n"
        f"Operação: <b>{req.description}</b>"
        f"{fund_line}"
        f"{agent_line}"
        f"{approvers_line}\n"
        f"Risco: <b>{risk_label}</b>"
        f"{details_block}\n\n"
        f"<i>Expira em: {timeout_dt}</i>\n"
        f"<i>ID: <code>{req.approval_id[:8]}</code></i>"
    )


def _make_approval_buttons(approval_id: str) -> list[list[dict]]:
    """Build inline keyboard rows for an approval request."""
    short_id = approval_id[:8]
    return [
        [
            {"text": "✅ Aprovar", "callback_data": f"hitl_approve:{approval_id}"},
            {"text": "❌ Rejeitar", "callback_data": f"hitl_reject:{approval_id}"},
        ],
        [
            {"text": "📋 Detalhes", "callback_data": f"hitl_details:{approval_id}"},
        ],
    ]


# ── Audit Log ──────────────────────────────────────────────────────────────────


class _AuditLogger:
    """Append-only audit trail for all approval decisions via Telegram."""

    def __init__(self, runtime_dir: str = "runtime"):
        self._path = Path(runtime_dir) / "hitl" / "telegram_audit.jsonl"
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def log(
        self,
        action: str,
        approval_id: str,
        approver_id: str,
        approver_name: str,
        operation_type: str,
        fund_id: Optional[str],
        approved: Optional[bool] = None,
        comments: str = "",
    ) -> None:
        entry = {
            "timestamp": time.time(),
            "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "action": action,
            "approval_id": approval_id,
            "approver_id": approver_id,
            "approver_name": approver_name,
            "operation_type": operation_type,
            "fund_id": fund_id,
            "approved": approved,
            "comments": comments,
        }
        try:
            with self._path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as exc:
            log.error("Audit log failed: %s", exc)


# ── Main Class ────────────────────────────────────────────────────────────────


class TelegramApprovalInterface:
    """Sends HITL approval requests via Telegram and handles responses.

    Args:
        bot: TelegramClientChannel instance (already configured).
        runtime_dir: Path to runtime directory for persistence.
        default_chat_id: If set, sends approval requests here by default.
        default_thread_id: Forum topic for approval messages.
    """

    def __init__(
        self,
        bot: "TelegramClientChannel",
        runtime_dir: str = "runtime",
        default_chat_id: Optional[int] = None,
        default_thread_id: Optional[int] = None,
    ):
        self._bot = bot
        self._workflow = HITLWorkflow(runtime_dir)
        self._audit = _AuditLogger(runtime_dir)
        self._default_chat_id = default_chat_id
        self._default_thread_id = default_thread_id

        # Maps approval_id → Telegram message_id (for editing after decision)
        self._msg_map: dict[str, tuple[int, int]] = {}  # approval_id → (chat_id, message_id)

    def register(self, bot: "TelegramClientChannel") -> None:
        """Wire up callback query handlers onto the bot."""
        bot.register_callback("hitl_approve", self._on_approve)
        bot.register_callback("hitl_reject", self._on_reject)
        bot.register_callback("hitl_details", self._on_details)
        log.info("HITL approval callbacks registered")

    # ── Public API ────────────────────────────────────────────────────────────

    def send_approval_request(
        self,
        request: ApprovalRequest,
        chat_id: Optional[int] = None,
        thread_id: Optional[int] = None,
    ) -> str:
        """Send an approval request message to Telegram.

        Creates the approval in the workflow, then sends the inline-keyboard
        message to the specified chat (or the default).

        Args:
            request:   The ApprovalRequest to send.
            chat_id:   Telegram chat to send the message to.
            thread_id: Topic thread (for group forums).

        Returns:
            The approval_id string.
        """
        # Register with workflow
        approval_id = self._workflow.request_approval(request)

        if request.status == "approved":
            # Was auto-approved (LOW risk)
            log.info("Auto-approved %s — no Telegram message needed", approval_id)
            return approval_id

        target_chat = chat_id or self._default_chat_id
        target_thread = thread_id or self._default_thread_id

        if not target_chat:
            log.warning("No chat_id for approval %s — skipping Telegram send", approval_id)
            return approval_id

        msg_text = _fmt_approval_message(request)
        buttons = _make_approval_buttons(approval_id)

        result = self._bot.send_inline_keyboard(
            target_chat, msg_text, buttons, thread_id=target_thread
        )

        if result.get("ok"):
            msg_id = result["result"]["message_id"]
            self._msg_map[approval_id] = (target_chat, msg_id)
            log.info("Sent approval request %s → msg_id=%s", approval_id[:8], msg_id)
        else:
            log.error("Failed to send approval message for %s: %s", approval_id, result)

        return approval_id

    def notify_result(
        self,
        result: ApprovalResult,
        notify_chat_id: Optional[int] = None,
        notify_thread_id: Optional[int] = None,
    ) -> None:
        """Send a confirmation message after an approval decision.

        Args:
            result:           The ApprovalResult from HITLWorkflow.
            notify_chat_id:   Chat to send the confirmation to.
            notify_thread_id: Topic thread for the confirmation.
        """
        action = "✅ Aprovado" if result.approved else "❌ Rejeitado"
        icon = "✅" if result.approved else "❌"
        when = time.strftime("%d/%m/%Y %H:%M UTC", time.gmtime(result.timestamp))
        comments_line = f"\n💬 Comentário: {result.comments}" if result.comments else ""

        text = (
            f"{icon} <b>Decisão Registrada</b>\n\n"
            f"Operação: <b>{result.operation_type}</b>\n"
            f"Status: <b>{action}</b>\n"
            f"Aprovador: <code>{result.approver_id}</code>\n"
            f"Data: <i>{when}</i>"
            f"{comments_line}\n\n"
            f"<i>ID: <code>{result.approval_id[:8]}</code></i>"
        )

        target_chat = notify_chat_id or self._default_chat_id
        if target_chat:
            self._bot.send_text(
                target_chat, text, thread_id=notify_thread_id or self._default_thread_id
            )

        # Edit the original approval message to remove buttons
        if result.approval_id in self._msg_map:
            c_id, m_id = self._msg_map.pop(result.approval_id)
            self._bot.edit_message_reply_markup(c_id, m_id, None)

    # ── Callback Handlers ─────────────────────────────────────────────────────

    def _on_approve(self, callback_query_id: str, callback: dict) -> None:
        """Handle ✅ Aprovar button press."""
        data: str = callback.get("data", "")
        approval_id = data.split(":", 1)[1] if ":" in data else ""
        from_user = callback.get("from", {})
        approver_id = str(from_user.get("id", "unknown"))
        approver_name = from_user.get("username") or from_user.get("first_name", "anon")

        try:
            req = self._workflow.get_approval(approval_id)
            result = self._workflow.process_approval(
                approval_id, approved=True, approver_id=approver_id,
                comments="Aprovado via Telegram"
            )
            self._audit.log(
                action="approved",
                approval_id=approval_id,
                approver_id=approver_id,
                approver_name=approver_name,
                operation_type=req.operation_type,
                fund_id=req.fund_id,
                approved=True,
            )
            self._bot.answer_callback_query(callback_query_id, "✅ Aprovação registrada!")

            chat_id = callback["message"]["chat"]["id"]
            thread_id = callback["message"].get("message_thread_id")
            self.notify_result(result, chat_id, thread_id)

        except KeyError:
            self._bot.answer_callback_query(
                callback_query_id, "⚠️ Aprovação não encontrada ou já processada."
            )
        except Exception as exc:
            log.error("Approve callback error: %s", exc)
            self._bot.answer_callback_query(callback_query_id, f"❌ Erro: {exc}")

    def _on_reject(self, callback_query_id: str, callback: dict) -> None:
        """Handle ❌ Rejeitar button press."""
        data: str = callback.get("data", "")
        approval_id = data.split(":", 1)[1] if ":" in data else ""
        from_user = callback.get("from", {})
        approver_id = str(from_user.get("id", "unknown"))
        approver_name = from_user.get("username") or from_user.get("first_name", "anon")

        try:
            req = self._workflow.get_approval(approval_id)
            result = self._workflow.process_approval(
                approval_id, approved=False, approver_id=approver_id,
                comments="Rejeitado via Telegram"
            )
            self._audit.log(
                action="rejected",
                approval_id=approval_id,
                approver_id=approver_id,
                approver_name=approver_name,
                operation_type=req.operation_type,
                fund_id=req.fund_id,
                approved=False,
            )
            self._bot.answer_callback_query(callback_query_id, "❌ Rejeição registrada.")

            chat_id = callback["message"]["chat"]["id"]
            thread_id = callback["message"].get("message_thread_id")
            self.notify_result(result, chat_id, thread_id)

        except KeyError:
            self._bot.answer_callback_query(
                callback_query_id, "⚠️ Aprovação não encontrada ou já processada."
            )
        except Exception as exc:
            log.error("Reject callback error: %s", exc)
            self._bot.answer_callback_query(callback_query_id, f"❌ Erro: {exc}")

    def _on_details(self, callback_query_id: str, callback: dict) -> None:
        """Handle 📋 Detalhes button — send full JSON payload."""
        data: str = callback.get("data", "")
        approval_id = data.split(":", 1)[1] if ":" in data else ""

        try:
            req = self._workflow.get_approval(approval_id)
            full_data = json.dumps(req.data, ensure_ascii=False, indent=2)
            age_hours = (time.time() - req.created_at) / 3600
            text = (
                f"📋 <b>Detalhes Completos</b>\n\n"
                f"<b>ID:</b> <code>{req.approval_id}</code>\n"
                f"<b>Tipo:</b> {req.operation_type}\n"
                f"<b>Fundo:</b> {req.fund_id or 'N/A'}\n"
                f"<b>Agente:</b> {req.agent_id}\n"
                f"<b>Risco:</b> {RISK_ICONS.get(req.risk_level, req.risk_level)}\n"
                f"<b>Aprovadores:</b> {', '.join(req.approvers) or 'N/A'}\n"
                f"<b>Criado há:</b> {age_hours:.1f}h\n"
                f"<b>Escalação em:</b> {req.escalation_hours}h\n"
                f"<b>Timeout em:</b> {req.timeout_hours}h\n\n"
                f"<pre>{full_data[:1000]}</pre>"
            )
            chat_id = callback["message"]["chat"]["id"]
            thread_id = callback["message"].get("message_thread_id")
            self._bot.send_text(chat_id, text, thread_id=thread_id)
            self._bot.answer_callback_query(callback_query_id)
        except KeyError:
            self._bot.answer_callback_query(
                callback_query_id, "⚠️ Aprovação não encontrada."
            )
        except Exception as exc:
            log.error("Details callback error: %s", exc)
            self._bot.answer_callback_query(callback_query_id, f"❌ Erro: {exc}")
