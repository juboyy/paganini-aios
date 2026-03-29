"""Paganini AIOS — Enhanced Telegram Client Channel (WS5).

Multi-fund support via Telegram Topics, HITL integration, inline keyboards,
document upload handling, voice message placeholders, and session continuity.

Inspired by Hermes Agent's Telegram-first approach, adapted for financial FIDC ops.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen

log = logging.getLogger("paganini.telegram_client")

# ── Fund Topic Mapping ─────────────────────────────────────────────────────────
# Maps Telegram thread_id (topic ID) → fund metadata
# Populated at runtime from config or auto-detected from topic names

FUND_TOPIC_PATTERNS: dict[str, str] = {
    r"alpha": "alpha",
    r"beta": "beta",
    r"gamma": "gamma",
    r"vivaldi": "vivaldi",
    r"fidc[\s_-]?(\w+)": r"\1",
}


# ── Session State ──────────────────────────────────────────────────────────────


@dataclass
class ConversationSession:
    """Per-user, per-fund conversation state."""

    user_id: int
    fund_id: str
    chat_id: int
    thread_id: Optional[int]
    session_id: Optional[str] = None
    message_count: int = 0
    last_activity: float = field(default_factory=time.time)
    context: dict[str, Any] = field(default_factory=dict)


# ── Callback Registry ──────────────────────────────────────────────────────────


@dataclass
class CallbackHandler:
    """Registered inline keyboard callback."""

    prefix: str
    handler: Callable[[str, dict], None]


# ── Enhanced Telegram Client ───────────────────────────────────────────────────


class TelegramClientChannel:
    """Enhanced Telegram bot with multi-fund Topics, HITL, and rich formatting.

    Key improvements over base TelegramBot:
    - Fund-aware routing via Telegram Topics (message_thread_id)
    - Inline keyboard support with callback query handling
    - Document/voice upload handling
    - Session continuity per (user, fund) pair
    - Thread-safe session store
    - Pluggable callback registry for HITL approval buttons
    """

    def __init__(
        self,
        token: str,
        api_base: str = "http://localhost:8000",
        api_key: str = "",
        topic_fund_map: Optional[dict[int, str]] = None,
        runtime_dir: str = "runtime",
    ):
        self.token = token
        self.tg_api = f"https://api.telegram.org/bot{token}"
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key
        self.offset = 0
        self._bot_username = "bot"

        # thread_id → fund_id mapping (from Telegram Topics)
        self._topic_fund_map: dict[int, str] = topic_fund_map or {}

        # (user_id, fund_id) → ConversationSession
        self._sessions: dict[tuple[int, str], ConversationSession] = {}
        self._session_lock = threading.Lock()

        # Callback query handlers: prefix → handler fn
        self._callback_handlers: dict[str, CallbackHandler] = {}

        # Runtime directories
        self._runtime = Path(runtime_dir)
        self._sessions_file = self._runtime / "sessions" / "telegram_sessions.json"
        self._sessions_file.parent.mkdir(parents=True, exist_ok=True)

        self._load_sessions()

    # ── Telegram API ────────────────────────────────────────────────────────

    def _tg(self, method: str, data: Optional[dict] = None) -> dict:
        """Call Telegram Bot API."""
        url = f"{self.tg_api}/{method}"
        payload = json.dumps(data).encode("utf-8") if data else None
        headers = {"Content-Type": "application/json"} if data else {}
        req = Request(url, data=payload, headers=headers)
        try:
            with urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except Exception as exc:
            log.error("Telegram %s: %s", method, exc)
            return {"ok": False, "error": str(exc)}

    def _api(self, path: str, timeout: int = 60) -> dict:
        """Call Paganini dashboard API."""
        url = f"{self.api_base}{path}"
        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        req = Request(url, headers=headers)
        try:
            with urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read())
        except Exception as exc:
            return {"_error": str(exc)}

    # ── Fund Routing ─────────────────────────────────────────────────────────

    def _resolve_fund(self, msg: dict) -> str:
        """Resolve fund_id from message thread (Telegram Topic) or chat title."""
        thread_id: Optional[int] = msg.get("message_thread_id")

        if thread_id and thread_id in self._topic_fund_map:
            return self._topic_fund_map[thread_id]

        # Try to infer fund from thread/forum topic name (if available in msg)
        forum_topic = msg.get("forum_topic_created") or msg.get("reply_to_message", {}).get(
            "forum_topic_created", {}
        )
        topic_name: str = forum_topic.get("name", "") if isinstance(forum_topic, dict) else ""

        if topic_name:
            fund = self._match_topic_name(topic_name)
            if fund and thread_id:
                self._topic_fund_map[thread_id] = fund
                log.info("Auto-mapped topic '%s' (id=%s) → fund '%s'", topic_name, thread_id, fund)
            return fund or "default"

        return "default"

    def _match_topic_name(self, name: str) -> Optional[str]:
        """Match a topic name to a fund_id using pattern rules."""
        name_lower = name.lower()
        for pattern, fund_id in FUND_TOPIC_PATTERNS.items():
            m = re.search(pattern, name_lower)
            if m:
                # Support backreference substitution in fund_id template
                if r"\1" in fund_id and m.lastindex:
                    return m.group(1)
                return fund_id
        return None

    def register_topic_fund(self, thread_id: int, fund_id: str) -> None:
        """Manually register a topic → fund mapping."""
        self._topic_fund_map[thread_id] = fund_id
        log.info("Registered topic %s → fund '%s'", thread_id, fund_id)

    # ── Session Management ────────────────────────────────────────────────────

    def _get_session(self, user_id: int, fund_id: str, chat_id: int,
                     thread_id: Optional[int] = None) -> ConversationSession:
        """Get or create a conversation session for (user, fund)."""
        key = (user_id, fund_id)
        with self._session_lock:
            if key not in self._sessions:
                self._sessions[key] = ConversationSession(
                    user_id=user_id,
                    fund_id=fund_id,
                    chat_id=chat_id,
                    thread_id=thread_id,
                )
            sess = self._sessions[key]
            sess.last_activity = time.time()
            sess.message_count += 1
            return sess

    def _save_sessions(self) -> None:
        """Persist session state to disk."""
        data = {}
        with self._session_lock:
            for (uid, fid), sess in self._sessions.items():
                data[f"{uid}:{fid}"] = {
                    "user_id": sess.user_id,
                    "fund_id": sess.fund_id,
                    "chat_id": sess.chat_id,
                    "thread_id": sess.thread_id,
                    "session_id": sess.session_id,
                    "message_count": sess.message_count,
                    "last_activity": sess.last_activity,
                }
        try:
            self._sessions_file.write_text(json.dumps(data, ensure_ascii=False, indent=2))
        except Exception as exc:
            log.warning("Session save failed: %s", exc)

    def _load_sessions(self) -> None:
        """Restore session state from disk."""
        if not self._sessions_file.exists():
            return
        try:
            data = json.loads(self._sessions_file.read_text())
            for _key, s in data.items():
                sess = ConversationSession(
                    user_id=s["user_id"],
                    fund_id=s["fund_id"],
                    chat_id=s["chat_id"],
                    thread_id=s.get("thread_id"),
                    session_id=s.get("session_id"),
                    message_count=s.get("message_count", 0),
                    last_activity=s.get("last_activity", time.time()),
                )
                self._sessions[(sess.user_id, sess.fund_id)] = sess
            log.info("Restored %d sessions", len(self._sessions))
        except Exception as exc:
            log.warning("Session load failed: %s", exc)

    # ── Send Methods ──────────────────────────────────────────────────────────

    def send_text(
        self,
        chat_id: int,
        text: str,
        thread_id: Optional[int] = None,
        parse_mode: str = "HTML",
        reply_markup: Optional[dict] = None,
        reply_to_message_id: Optional[int] = None,
    ) -> dict:
        """Send text message, auto-split at 4000 chars."""
        results = []
        for chunk in [text[i:i + 4000] for i in range(0, max(len(text), 1), 4000)]:
            payload: dict[str, Any] = {
                "chat_id": chat_id,
                "text": chunk,
                "parse_mode": parse_mode,
            }
            if thread_id:
                payload["message_thread_id"] = thread_id
            if reply_markup:
                payload["reply_markup"] = reply_markup
            if reply_to_message_id:
                payload["reply_to_message_id"] = reply_to_message_id
            results.append(self._tg("sendMessage", payload))
        return results[-1] if results else {"ok": False}

    def send_document(
        self,
        chat_id: int,
        file_path: str,
        caption: str = "",
        thread_id: Optional[int] = None,
    ) -> dict:
        """Send a document file (report, PDF, etc.)."""
        # Use multipart form upload via urllib (no requests dep)
        import email.generator
        import email.mime.multipart
        import email.mime.base
        import email.mime.text

        path = Path(file_path)
        if not path.exists():
            log.error("Document not found: %s", file_path)
            return {"ok": False, "error": "file not found"}

        # Build multipart body manually (stdlib only)
        boundary = "PaganiniBoundary1234567890"
        body_parts: list[bytes] = []

        def field(name: str, value: str) -> bytes:
            return (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
                f"{value}\r\n"
            ).encode("utf-8")

        body_parts.append(field("chat_id", str(chat_id)))
        if thread_id:
            body_parts.append(field("message_thread_id", str(thread_id)))
        if caption:
            body_parts.append(field("caption", caption[:1024]))

        file_data = path.read_bytes()
        file_part = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="document"; filename="{path.name}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode("utf-8") + file_data + b"\r\n"
        body_parts.append(file_part)
        body_parts.append(f"--{boundary}--\r\n".encode("utf-8"))

        body = b"".join(body_parts)
        url = f"{self.tg_api}/sendDocument"
        req = Request(
            url,
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        try:
            with urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except Exception as exc:
            log.error("sendDocument: %s", exc)
            return {"ok": False, "error": str(exc)}

    def send_typing(self, chat_id: int, thread_id: Optional[int] = None) -> None:
        """Send typing action indicator."""
        payload: dict[str, Any] = {"chat_id": chat_id, "action": "typing"}
        if thread_id:
            payload["message_thread_id"] = thread_id
        self._tg("sendChatAction", payload)

    def send_inline_keyboard(
        self,
        chat_id: int,
        text: str,
        buttons: list[list[dict]],
        thread_id: Optional[int] = None,
        parse_mode: str = "HTML",
    ) -> dict:
        """Send message with inline keyboard markup.

        Args:
            buttons: List of rows, each row is a list of button dicts.
                     Each button: {"text": "Label", "callback_data": "prefix:payload"}
        """
        reply_markup = {"inline_keyboard": buttons}
        return self.send_text(
            chat_id, text, thread_id=thread_id,
            parse_mode=parse_mode, reply_markup=reply_markup
        )

    def edit_message_reply_markup(
        self, chat_id: int, message_id: int, reply_markup: Optional[dict]
    ) -> dict:
        """Edit inline keyboard on an existing message (e.g., after approval)."""
        return self._tg("editMessageReplyMarkup", {
            "chat_id": chat_id,
            "message_id": message_id,
            "reply_markup": reply_markup or {},
        })

    def answer_callback_query(self, callback_query_id: str, text: str = "") -> dict:
        """Answer a callback query (removes loading state on button)."""
        return self._tg("answerCallbackQuery", {
            "callback_query_id": callback_query_id,
            "text": text,
        })

    # ── Callback Registration ─────────────────────────────────────────────────

    def register_callback(self, prefix: str, handler: Callable[[str, dict], None]) -> None:
        """Register a callback query handler for a given prefix.

        Args:
            prefix: The callback_data prefix (e.g. "hitl_approve")
            handler: fn(callback_query_id: str, callback: dict) -> None
        """
        self._callback_handlers[prefix] = CallbackHandler(prefix=prefix, handler=handler)
        log.info("Registered callback handler for prefix '%s'", prefix)

    def _dispatch_callback(self, callback: dict) -> None:
        """Route callback query to registered handler."""
        data: str = callback.get("data", "")
        prefix = data.split(":")[0] if ":" in data else data

        if prefix in self._callback_handlers:
            cb_id = callback["id"]
            try:
                self._callback_handlers[prefix].handler(cb_id, callback)
            except Exception as exc:
                log.error("Callback handler '%s' error: %s", prefix, exc)
                self.answer_callback_query(cb_id, "❌ Erro interno.")
        else:
            log.warning("No handler for callback prefix '%s'", prefix)
            self.answer_callback_query(callback["id"])

    # ── Document & Voice Handling ─────────────────────────────────────────────

    def handle_document(self, msg: dict, fund_id: str, session: ConversationSession) -> None:
        """Handle document upload — triggers corpus ingestion pipeline."""
        doc = msg.get("document", {})
        file_name = doc.get("file_name", "documento")
        file_id = doc.get("file_id", "")
        mime = doc.get("mime_type", "application/octet-stream")
        caption = msg.get("caption", "")

        chat_id = msg["chat"]["id"]
        thread_id = msg.get("message_thread_id")

        supported = {
            "application/pdf": "pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "text/plain": "txt",
            "text/markdown": "md",
        }

        if mime not in supported and not file_name.endswith((".pdf", ".docx", ".txt", ".md")):
            self.send_text(
                chat_id,
                f"⚠️ Formato não suportado: <code>{mime}</code>\n\n"
                "Envie PDF, DOCX, TXT ou Markdown.",
                thread_id=thread_id,
            )
            return

        self.send_typing(chat_id, thread_id)
        self.send_text(
            chat_id,
            f"📥 <b>Documento recebido</b>\n\n"
            f"Arquivo: <code>{file_name}</code>\n"
            f"Fundo: <b>{fund_id}</b>\n\n"
            f"⏳ Iniciando indexação no corpus...",
            thread_id=thread_id,
        )

        # Download file via Telegram file API
        file_info = self._tg("getFile", {"file_id": file_id})
        if not file_info.get("ok"):
            self.send_text(chat_id, "❌ Erro ao obter arquivo do Telegram.", thread_id=thread_id)
            return

        file_path_tg = file_info["result"]["file_path"]
        download_url = f"https://api.telegram.org/file/bot{self.token}/{file_path_tg}"

        # Save to runtime/uploads/
        uploads_dir = self._runtime / "uploads" / fund_id
        uploads_dir.mkdir(parents=True, exist_ok=True)
        local_path = uploads_dir / file_name

        try:
            req = Request(download_url)
            with urlopen(req, timeout=60) as resp:
                local_path.write_bytes(resp.read())
        except Exception as exc:
            self.send_text(chat_id, f"❌ Erro no download: {exc}", thread_id=thread_id)
            return

        # Trigger ingestion pipeline
        try:
            from core.ingestion.pipeline import IngestDocument, IngestResult
            result: IngestResult = IngestDocument(
                file_path=str(local_path),
                tenant_id="paganini",
                fund_id=fund_id,
                doc_type=supported.get(mime, "txt"),
            )
            self.send_text(
                chat_id,
                f"✅ <b>Indexação concluída</b>\n\n"
                f"📄 Arquivo: <code>{file_name}</code>\n"
                f"🗂 Fundo: <b>{fund_id}</b>\n"
                f"📦 Chunks criados: <b>{result.chunks_created}</b>\n"
                f"🔤 Tokens processados: <b>{result.total_tokens}</b>\n"
                f"⏱ Tempo: <b>{result.embedding_time_ms:.0f}ms</b>\n\n"
                f"O documento já está disponível para consultas.",
                thread_id=thread_id,
            )
        except ImportError:
            log.warning("core.ingestion not available — skipping auto-ingest")
            self.send_text(
                chat_id,
                f"✅ Arquivo <code>{file_name}</code> salvo em <code>{local_path}</code>.\n\n"
                "⚠️ Pipeline de indexação não disponível nesta instalação.",
                thread_id=thread_id,
            )

    def handle_voice(self, msg: dict, fund_id: str, session: ConversationSession) -> None:
        """Handle voice message — placeholder for Whisper integration."""
        chat_id = msg["chat"]["id"]
        thread_id = msg.get("message_thread_id")
        duration = msg.get("voice", {}).get("duration", 0)

        self.send_text(
            chat_id,
            f"🎙️ Mensagem de voz recebida ({duration}s).\n\n"
            "⏳ Transcrição via Whisper não disponível nesta versão.\n\n"
            "<i>Integração Whisper planejada para WS6.</i>",
            thread_id=thread_id,
        )

    # ── Main Message Dispatcher ───────────────────────────────────────────────

    def handle(self, msg: dict) -> None:
        """Process incoming Telegram message."""
        chat_id: int = msg["chat"]["id"]
        user_id: int = msg.get("from", {}).get("id", chat_id)
        thread_id: Optional[int] = msg.get("message_thread_id")
        text: str = (msg.get("text") or "").strip()

        fund_id = self._resolve_fund(msg)
        session = self._get_session(user_id, fund_id, chat_id, thread_id)

        # Document upload
        if "document" in msg:
            self.handle_document(msg, fund_id, session)
            return

        # Voice message
        if "voice" in msg:
            self.handle_voice(msg, fund_id, session)
            return

        if not text:
            return

        # Commands
        if self._handle_command(chat_id, text, fund_id, thread_id):
            return

        # Casual / short
        if self._handle_casual(chat_id, text, thread_id):
            return

        # Strip /query prefix
        if text.startswith("/query"):
            text = text[6:].strip()
        if not text:
            return

        # PLD guardrail
        if self._check_pld_guardrail(chat_id, text, thread_id):
            return

        # Fund-aware RAG query
        self._handle_rag_query(chat_id, text, fund_id, session, thread_id)

    def handle_callback_query(self, callback: dict) -> None:
        """Handle inline keyboard button press."""
        self._dispatch_callback(callback)

    # ── Sub-handlers ─────────────────────────────────────────────────────────

    def _handle_command(
        self, chat_id: int, text: str, fund_id: str, thread_id: Optional[int]
    ) -> bool:
        """Built-in commands. Returns True if handled."""
        cmd = text.split()[0].lower()

        if cmd == "/start":
            self.send_text(
                chat_id,
                "🎻 <b>Paganini AIOS</b>\n\n"
                f"Sistema de IA para fundos FIDC.\n"
                f"Fundo detectado: <b>{fund_id}</b>\n\n"
                "<b>Comandos:</b>\n"
                "/market — Indicadores BCB\n"
                "/agents — Agentes disponíveis\n"
                "/status — Status do sistema\n"
                "/pending — Aprovações pendentes\n\n"
                "Ou simplesmente faça sua pergunta.",
                thread_id=thread_id,
            )
            return True

        if cmd in ("/help",):
            return self._handle_command(chat_id, "/start", fund_id, thread_id)

        if cmd == "/market":
            self._cmd_market(chat_id, thread_id)
            return True

        if cmd == "/status":
            self._cmd_status(chat_id, thread_id)
            return True

        if cmd == "/agents":
            self._cmd_agents(chat_id, thread_id)
            return True

        if cmd == "/pending":
            self._cmd_pending(chat_id, fund_id, thread_id)
            return True

        if cmd == "/fund":
            parts = text.split()
            if len(parts) > 1 and thread_id:
                self.register_topic_fund(thread_id, parts[1])
                self.send_text(
                    chat_id,
                    f"✅ Tópico mapeado para fundo: <b>{parts[1]}</b>",
                    thread_id=thread_id,
                )
            return True

        return False

    def _cmd_market(self, chat_id: int, thread_id: Optional[int]) -> None:
        self.send_typing(chat_id, thread_id)
        d = self._api("/api/market")
        if "_error" in d:
            self.send_text(chat_id, f"❌ {d['_error'][:200]}", thread_id=thread_id)
            return
        indicators = d.get("indicators", {})
        labels = {
            "cdi": "CDI", "selic": "SELIC", "ipca": "IPCA",
            "igpm": "IGP-M", "cambio_usd": "USD/BRL",
            "inad_pf": "Inad. PF", "inad_pj": "Inad. PJ",
        }
        lines = ["📊 <b>Indicadores BCB</b>\n"]
        for k, label in labels.items():
            ind = indicators.get(k, {})
            v = ind.get("latest_value", "—")
            dt = ind.get("latest_date", "")
            unit = "" if k == "cambio_usd" else "%"
            lines.append(f"  <b>{label}:</b> {v}{unit}  <i>({dt})</i>")
        self.send_text(chat_id, "\n".join(lines), thread_id=thread_id)

    def _cmd_status(self, chat_id: int, thread_id: Optional[int]) -> None:
        self.send_typing(chat_id, thread_id)
        d = self._api("/api/status")
        if "_error" in d:
            self.send_text(chat_id, f"❌ {d['_error'][:200]}", thread_id=thread_id)
            return
        self.send_text(
            chat_id,
            "🎻 <b>Paganini AIOS</b>\n\n"
            f"  <b>Status:</b> {'🟢 online' if d.get('ok') else '🔴 offline'}\n"
            f"  <b>Agentes:</b> {d.get('agents', '?')}\n"
            f"  <b>Chunks:</b> {d.get('chunks', '?')}\n"
            f"  <b>Modelo:</b> {d.get('model', '?')}\n",
            thread_id=thread_id,
        )

    def _cmd_agents(self, chat_id: int, thread_id: Optional[int]) -> None:
        self.send_typing(chat_id, thread_id)
        agents = self._api("/api/agents")
        if isinstance(agents, dict) and "_error" in agents:
            self.send_text(chat_id, f"❌ {agents['_error'][:200]}", thread_id=thread_id)
            return
        if isinstance(agents, dict):
            agents = agents.get("agents", [])
        icons = {
            "administrador": "📋", "compliance": "🛡️", "custodiante": "🏦",
            "due_diligence": "🔍", "gestor": "💼", "investor_relations": "📊",
            "pricing": "💰", "regulatory_watch": "📡", "reporting": "📝",
        }
        lines = ["🤖 <b>Agentes</b>\n"]
        for a in agents:
            name = a.get("name", str(a)) if isinstance(a, dict) else str(a)
            key = name.lower().replace(" ", "_").replace("agent:", "").strip()
            lines.append(f"  {icons.get(key, '🤖')} {name}")
        self.send_text(chat_id, "\n".join(lines), thread_id=thread_id)

    def _cmd_pending(self, chat_id: int, fund_id: str, thread_id: Optional[int]) -> None:
        """Show pending HITL approvals for this fund."""
        try:
            from core.hitl.workflow import HITLWorkflow
            wf = HITLWorkflow()
            pending = wf.list_pending(fund_id=fund_id if fund_id != "default" else None)
            if not pending:
                self.send_text(
                    chat_id, "✅ Nenhuma aprovação pendente.", thread_id=thread_id
                )
                return
            lines = [f"🔒 <b>Aprovações Pendentes</b> ({len(pending)})\n"]
            for req in pending[:10]:
                risk_icon = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(
                    req.risk_level, "⚪"
                )
                lines.append(
                    f"  {risk_icon} <b>{req.operation_type}</b>\n"
                    f"     ID: <code>{req.approval_id}</code>\n"
                    f"     Fundo: {req.fund_id or 'N/A'}\n"
                )
            self.send_text(chat_id, "\n".join(lines), thread_id=thread_id)
        except ImportError:
            self.send_text(
                chat_id, "⚠️ Módulo HITL não disponível.", thread_id=thread_id
            )

    def _handle_casual(self, chat_id: int, text: str, thread_id: Optional[int]) -> bool:
        """Handle greetings and very short queries."""
        greetings = {
            "oi", "olá", "ola", "hey", "hi", "hello", "bom dia",
            "boa tarde", "boa noite", "e aí", "e ai", "fala",
            "salve", "eae", "yo", "tudo bem", "como vai",
        }
        if text.lower().strip("!?.") in greetings:
            self.send_text(
                chat_id,
                "🎻 Olá! Sou o assistente Paganini.\n\n"
                "Pergunte sobre regulação de fundos, covenants, "
                "custódia, compliance, stress test, PLD/AML...\n\n"
                "<b>Exemplos:</b>\n"
                "• Quais as obrigações do custodiante?\n"
                "• O que é subordinação de cotas?\n"
                "• Como funciona o stress test?\n"
                "• /market — indicadores BCB",
                thread_id=thread_id,
            )
            return True

        if len(text) < 10 and not text.startswith("/"):
            self.send_text(
                chat_id,
                "Pode elaborar? Preciso de uma pergunta mais específica "
                "sobre fundos de investimento.\n\n"
                "<i>Ex: \"Quais as obrigações do custodiante?\"</i>",
                thread_id=thread_id,
            )
            return True

        return False

    def _check_pld_guardrail(self, chat_id: int, text: str, thread_id: Optional[int]) -> bool:
        """Block adversarial PLD/AML attempts."""
        if re.search(
            r"coaf|lavagem|fraude|burlar|evadir|bypass|fracionar.*evitar|"
            r"ocultar.*origem|simular|fraudar|driblar",
            text,
            re.IGNORECASE,
        ):
            self.send_text(
                chat_id,
                "🛡️ <b>QUERY BLOQUEADA</b>\n\n"
                "Guardrail PLD/AML detectou tentativa de obter "
                "orientações que violam regulação.\n\n"
                "<b>Base legal:</b> CVM 175 Art. 23 · Lei 9.613/98",
                thread_id=thread_id,
            )
            return True
        return False

    def _handle_rag_query(
        self,
        chat_id: int,
        text: str,
        fund_id: str,
        session: ConversationSession,
        thread_id: Optional[int],
    ) -> None:
        """Fund-aware RAG query via dashboard API."""
        self.send_typing(chat_id, thread_id)
        params = urlencode({"q": text, "fund_id": fund_id})
        if session.session_id:
            params += f"&session_id={session.session_id}"

        d = self._api(f"/api/query?{params}", timeout=60)
        if "_error" in d:
            self.send_text(chat_id, f"❌ Erro: {d['_error'][:200]}", thread_id=thread_id)
            return

        if d.get("session_id"):
            session.session_id = d["session_id"]
            self._save_sessions()

        answer = d.get("answer", "Sem resposta.")
        conf = int((d.get("confidence", 0)) * 100)
        sources = d.get("sources", [])

        if d.get("blocked"):
            self.send_text(
                chat_id, f"🛡️ <b>QUERY BLOQUEADA</b>\n\n{answer[:500]}", thread_id=thread_id
            )
            return

        conf_emoji = "🟢" if conf >= 80 else "🟡" if conf >= 60 else "🔴"
        src_text = self._format_sources(sources)
        safe = (
            answer.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("**", "")
        )
        fund_tag = f" • Fundo: <b>{fund_id}</b>" if fund_id != "default" else ""

        self.send_text(
            chat_id,
            f"{safe}\n\n"
            f"{conf_emoji} <b>Confiança:</b> {conf}%{fund_tag} "
            f"{src_text}",
            thread_id=thread_id,
        )

    def _format_sources(self, sources: list) -> str:
        if not sources:
            return ""
        names = []
        for s in sources[:3]:
            n = s.get("source", "doc") if isinstance(s, dict) else str(s)
            n = n.split("/")[-1].replace(".md", "")
            n = re.sub(r"#U([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), n)
            names.append(f"📄 {n}")
        return "\n\n<b>Fontes:</b> " + " · ".join(names)

    # ── Poll Loop ─────────────────────────────────────────────────────────────

    def poll(self) -> None:
        """Long-polling loop — handles messages and callback queries."""
        me = self._tg("getMe")
        self._bot_username = me.get("result", {}).get("username", "bot")
        log.info("Bot @%s started (enhanced client)", self._bot_username)
        print(f"🎻 Paganini Enhanced Telegram Client → @{self._bot_username}")
        print(f"   API: {self.api_base}")
        print(f"   Multi-fund Topics: {'enabled' if self._topic_fund_map else 'auto-detect'}")

        while True:
            try:
                updates = self._tg("getUpdates", {"offset": self.offset, "timeout": 30})
                for u in updates.get("result", []):
                    self.offset = u["update_id"] + 1
                    try:
                        if "message" in u:
                            self.handle(u["message"])
                        elif "callback_query" in u:
                            self.handle_callback_query(u["callback_query"])
                    except Exception as exc:
                        log.error("Update handling error: %s", exc)
            except KeyboardInterrupt:
                print("\nBot stopped.")
                self._save_sessions()
                break
            except Exception as exc:
                log.error("Poll error: %s", exc)
                time.sleep(5)


# ── Factory ───────────────────────────────────────────────────────────────────


def build_client(
    token: str = None,
    api_base: str = None,
    api_key: str = None,
    topic_fund_map: Optional[dict[int, str]] = None,
) -> TelegramClientChannel:
    """Build an enhanced Telegram client from config."""
    try:
        from core.config.engine import load_config
        config = load_config()
    except Exception:
        config = {}

    tg_cfg = config.get("telegram", {})
    token = token or tg_cfg.get("bot_token") or os.environ.get("TELEGRAM_BOT_TOKEN", "")
    api_base = api_base or tg_cfg.get("api_base") or os.environ.get(
        "PAGANINI_API_BASE", "http://localhost:8000"
    )
    api_key = api_key or tg_cfg.get("api_key") or ""

    if not api_key:
        key_file = Path("runtime/state/api_key.txt")
        if key_file.exists():
            api_key = key_file.read_text().strip()

    # Load topic→fund map from config
    configured_topics: dict[int, str] = {}
    for item in tg_cfg.get("topics", []):
        if isinstance(item, dict) and "thread_id" in item and "fund_id" in item:
            configured_topics[int(item["thread_id"])] = item["fund_id"]
    configured_topics.update(topic_fund_map or {})

    return TelegramClientChannel(token, api_base, api_key, configured_topics)


def run_enhanced_bot(**kwargs) -> None:
    """Entry point for the enhanced Telegram client."""
    import logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

    client = build_client(**kwargs)
    if not client.token:
        print("❌ No bot token. Set telegram.bot_token in config.yaml or TELEGRAM_BOT_TOKEN env.")
        return

    # Wire up HITL approval callbacks
    try:
        from core.hitl.telegram_approval import TelegramApprovalInterface
        approval = TelegramApprovalInterface(client)
        approval.register(client)
        print("   HITL: ✅ approval interface registered")
    except ImportError:
        print("   HITL: ⚠️ not available")

    client.poll()
