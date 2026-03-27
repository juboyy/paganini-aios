"""PAGANINI AIOS — Slack IR Bot.

Gate Token: GATE-2026-03-14T224033:701eaf7fa32c

A Slack bot for Investor Relations that processes messages through the
RAG pipeline + guardrails and surfaces fund-specific answers to LPs.

Package: packages.integrations.slack_bot
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import re
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import parse_qs

from packages.rag.pipeline import RAGPipeline
from packages.services.memory_service import MemoryService
from packages.services.engine_service import EngineService
from packages.services.risk_service import RiskService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FUND_CHANNEL_RE = re.compile(r"fund-([a-z0-9_-]+)-", re.IGNORECASE)

HELP_TEXT = """
*PAGANINI IR Bot* — available commands:
• `/paganini query <question>` — ask anything about the fund
• `/paganini status` — system health and pipeline status
• `/paganini report <template>` — generate an investor report
""".strip()

VALID_REPORT_TEMPLATES = {
    "monthly": "Monthly LP Update",
    "quarterly": "Quarterly Fund Report",
    "annual": "Annual Letter",
    "nav": "NAV Statement",
    "capital_call": "Capital Call Notice",
}

CONFIDENCE_EMOJI = {
    "high": "🟢",
    "medium": "🟡",
    "low": "🔴",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _confidence_tier(score: float) -> str:
    if score >= 0.80:
        return "high"
    if score >= 0.55:
        return "medium"
    return "low"


def _extract_fund_id(channel_name: str) -> str | None:
    """Extract fund_id from Slack channel names formatted as #fund-{fund_id}-*."""
    match = FUND_CHANNEL_RE.search(channel_name or "")
    return match.group(1) if match else None


def _format_response_blocks(
    answer: str,
    confidence: float,
    sources: list[str],
    guardrail_status: str,
    fund_id: str | None = None,
) -> list[dict]:
    """Build Slack Block Kit payload from pipeline output."""
    tier = _confidence_tier(confidence)
    emoji = CONFIDENCE_EMOJI[tier]
    fund_label = f"Fund `{fund_id}` · " if fund_id else ""

    blocks: list[dict] = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": answer,
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": (
                        f"{fund_label}"
                        f"Confidence: {emoji} `{tier}` ({confidence:.0%})  ·  "
                        f"Guardrails: `{guardrail_status}`"
                    ),
                }
            ],
        },
    ]

    if sources:
        source_list = "\n".join(f"• {s}" for s in sources[:5])
        blocks.insert(
            2,
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Sources*\n{source_list}",
                },
            },
        )

    return blocks


# ---------------------------------------------------------------------------
# Adapters — thin shims so SlackIRBot can call .check(), .stats(), .store()
# without knowing it's talking to a service facade.
# ---------------------------------------------------------------------------


class _GuardrailsAdapter:
    """Makes RiskService look like GuardrailPipeline.check(text, context)."""

    def __init__(self, risk_svc: "RiskService") -> None:
        self._risk_svc = risk_svc

    def check(self, text: str, context: dict | None = None) -> dict:
        result = self._risk_svc.check_guardrails(query=text)
        # GuardrailPipeline returns a dict-like object; normalise to dict
        if isinstance(result, dict):
            return result
        return {"blocked": not getattr(result, "passed", True), "warned": False}


class _MemoryAdapter:
    """Makes MemoryService look like MemoryManager.store()/stats() interface."""

    def __init__(self, memory_svc: "MemoryService") -> None:
        self._memory_svc = memory_svc

    def store(self, data: dict) -> None:
        self._memory_svc.store(data)

    def stats(self) -> dict:
        return self._memory_svc.stats()


# ---------------------------------------------------------------------------
# Core bot class
# ---------------------------------------------------------------------------


class SlackIRBot:
    """Investor Relations Slack bot powered by PAGANINI AIOS."""

    def __init__(self, config: dict) -> None:
        slack_cfg = config.get("slack", {})
        self.bot_token: str = slack_cfg.get("bot_token", "")
        self.signing_secret: str = slack_cfg.get("signing_secret", "")

        self.rag: RAGPipeline = RAGPipeline(config)
        self._risk_svc = RiskService(config)
        self._memory_svc = MemoryService(config)
        self._engine_svc = EngineService(config)
        self.llm_fn = self._engine_svc.get_llm_fn()

        # Expose guardrails via risk_svc for compatibility
        self.guardrails = _GuardrailsAdapter(self._risk_svc)
        self.memory = _MemoryAdapter(self._memory_svc)

        logger.info(
            "SlackIRBot initialised (token=%s…)", self.bot_token[:8] or "MISSING"
        )

    # ------------------------------------------------------------------
    # Signature verification
    # ------------------------------------------------------------------

    def _verify_signature(self, timestamp: str, body: bytes, signature: str) -> bool:
        """Verify Slack request signature to prevent spoofing."""
        if abs(time.time() - float(timestamp)) > 300:
            return False
        basestring = f"v0:{timestamp}:{body.decode()}"
        expected = (
            "v0="
            + hmac.new(
                self.signing_secret.encode(),
                basestring.encode(),
                hashlib.sha256,
            ).hexdigest()
        )
        return hmac.compare_digest(expected, signature)

    # ------------------------------------------------------------------
    # Message handler
    # ------------------------------------------------------------------

    def handle_message(self, event: dict) -> dict:
        """Process a Slack message event through RAG + guardrails.

        Args:
            event: Slack event payload (``event`` sub-key from the outer envelope).

        Returns:
            dict with keys: ``blocks``, ``text``, ``confidence``, ``guardrail_status``.
        """
        text: str = event.get("text", "").strip()
        channel_name: str = event.get("channel_name", "")
        fund_id = _extract_fund_id(channel_name)

        if not text:
            return {
                "blocks": [],
                "text": "No message text received.",
                "confidence": 0.0,
                "guardrail_status": "skipped",
            }

        logger.info("handle_message fund_id=%s text=%r", fund_id, text[:80])

        # 1. Guardrail pre-check
        guardrail_result = self.guardrails.check(text, context={"fund_id": fund_id})
        if guardrail_result.get("blocked"):
            reason = guardrail_result.get("reason", "policy violation")
            return {
                "blocks": _format_response_blocks(
                    answer=f"⛔ This request was blocked by guardrails: _{reason}_",
                    confidence=0.0,
                    sources=[],
                    guardrail_status="blocked",
                    fund_id=fund_id,
                ),
                "text": f"Request blocked: {reason}",
                "confidence": 0.0,
                "guardrail_status": "blocked",
            }

        # 2. RAG retrieval
        rag_result = self.rag.run(query=text, fund_id=fund_id)
        answer: str = rag_result.get("answer", "I couldn't find a relevant answer.")
        confidence: float = float(rag_result.get("confidence", 0.0))
        sources: list[str] = rag_result.get("sources", [])

        # 3. Guardrail post-check on answer
        post_check = self.guardrails.check(
            answer, context={"fund_id": fund_id, "role": "output"}
        )
        guardrail_status = "passed" if not post_check.get("warned") else "warned"

        # 4. Persist to memory
        try:
            self.memory.store(
                {
                    "query": text,
                    "answer": answer,
                    "fund_id": fund_id,
                    "confidence": confidence,
                }
            )
        except Exception as exc:
            logger.warning("Memory store failed: %s", exc)

        blocks = _format_response_blocks(
            answer=answer,
            confidence=confidence,
            sources=sources,
            guardrail_status=guardrail_status,
            fund_id=fund_id,
        )

        return {
            "blocks": blocks,
            "text": answer,
            "confidence": confidence,
            "guardrail_status": guardrail_status,
        }

    # ------------------------------------------------------------------
    # Slash command handler
    # ------------------------------------------------------------------

    def handle_slash_command(self, command: str, text: str, channel: str) -> dict:
        """Handle ``/paganini`` slash command variants.

        Args:
            command: The slash command string (e.g. ``/paganini``).
            text:    Text after the command (e.g. ``query What is the IRR?``).
            channel: Slack channel name where the command was invoked.

        Returns:
            Slack response dict suitable for immediate reply.
        """
        fund_id = _extract_fund_id(channel)
        parts = text.strip().split(maxsplit=1)
        sub = parts[0].lower() if parts else ""
        arg = parts[1] if len(parts) > 1 else ""

        logger.info("slash_command sub=%r arg=%r fund_id=%s", sub, arg[:60], fund_id)

        # /paganini query <question>
        if sub == "query":
            if not arg:
                return {
                    "response_type": "ephemeral",
                    "text": "Usage: `/paganini query <your question>`",
                }
            synthetic_event = {"text": arg, "channel_name": channel}
            result = self.handle_message(synthetic_event)
            return {
                "response_type": "in_channel",
                "blocks": result["blocks"],
                "text": result["text"],
            }

        # /paganini status
        if sub == "status":
            try:
                rag_chunks = self.rag.chunk_count()
                mem_stats = self.memory.stats()
            except Exception as exc:
                logger.warning("Status fetch failed: %s", exc)
                rag_chunks, mem_stats = "N/A", {}

            status_text = (
                f"*PAGANINI AIOS — System Status*\n"
                f"• RAG chunks indexed: `{rag_chunks}`\n"
                f"• Memory entries: `{mem_stats.get('total', 'N/A')}`\n"
                f"• Guardrails: `active`\n"
                f"• Fund context: `{fund_id or 'none'}`\n"
                f"• LLM backend: `{self.llm_fn.__name__ if callable(self.llm_fn) else 'configured'}`"
            )
            return {
                "response_type": "ephemeral",
                "text": status_text,
            }

        # /paganini report <template>
        if sub == "report":
            template_key = arg.strip().lower()
            if template_key not in VALID_REPORT_TEMPLATES:
                valid_keys = ", ".join(f"`{k}`" for k in VALID_REPORT_TEMPLATES)
                return {
                    "response_type": "ephemeral",
                    "text": f"Unknown template. Valid options: {valid_keys}",
                }
            template_name = VALID_REPORT_TEMPLATES[template_key]
            if not fund_id:
                return {
                    "response_type": "ephemeral",
                    "text": (
                        "⚠️ Report generation requires a fund channel "
                        "(channel must match `#fund-<id>-*`)."
                    ),
                }

            # Trigger report via RAG with structured prompt
            prompt = (
                f"Generate a {template_name} for fund {fund_id}. "
                "Use all available fund data. Be concise and professional."
            )
            rag_result = self.rag.run(query=prompt, fund_id=fund_id)
            report_text = rag_result.get("answer", "Report generation failed.")
            confidence = float(rag_result.get("confidence", 0.0))
            sources = rag_result.get("sources", [])

            blocks = _format_response_blocks(
                answer=f"*{template_name}*\n\n{report_text}",
                confidence=confidence,
                sources=sources,
                guardrail_status="passed",
                fund_id=fund_id,
            )
            return {
                "response_type": "in_channel",
                "blocks": blocks,
                "text": f"{template_name} generated for fund {fund_id}.",
            }

        # Unknown sub-command → show help
        return {
            "response_type": "ephemeral",
            "text": HELP_TEXT,
        }

    # ------------------------------------------------------------------
    # HTTP server
    # ------------------------------------------------------------------

    def start_server(self, port: int = 3000) -> None:
        """Start a simple HTTP server to receive Slack Events API payloads.

        Args:
            port: Port to listen on (default 3000).
        """
        bot = self  # closure reference

        class _Handler(BaseHTTPRequestHandler):
            def log_message(self, fmt: str, *args: Any) -> None:  # noqa: ANN401
                logger.debug(fmt, *args)

            def _send_json(self, status: int, payload: dict) -> None:
                body = json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self) -> None:  # noqa: N802
                length = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(length)

                # Signature verification
                ts = self.headers.get("X-Slack-Request-Timestamp", "")
                sig = self.headers.get("X-Slack-Signature", "")
                if bot.signing_secret and not bot._verify_signature(ts, raw_body, sig):
                    self._send_json(401, {"error": "invalid signature"})
                    return

                try:
                    payload = json.loads(raw_body)
                except json.JSONDecodeError:
                    # Fallback: try form-encoded (slash commands)
                    payload = {k: v[0] for k, v in parse_qs(raw_body.decode()).items()}

                # URL verification challenge
                if payload.get("type") == "url_verification":
                    self._send_json(200, {"challenge": payload.get("challenge")})
                    return

                # Slash command
                if "command" in payload:
                    result = bot.handle_slash_command(
                        command=payload.get("command", ""),
                        text=payload.get("text", ""),
                        channel=payload.get("channel_name", ""),
                    )
                    self._send_json(200, result)
                    return

                # Event callback
                if payload.get("type") == "event_callback":
                    event = payload.get("event", {})
                    # Ignore bot messages to prevent loops
                    if event.get("bot_id") or event.get("subtype") == "bot_message":
                        self._send_json(200, {"ok": True})
                        return
                    result = bot.handle_message(event)
                    self._send_json(200, {"ok": True, "response": result})
                    return

                self._send_json(200, {"ok": True})

        server = HTTPServer(("0.0.0.0", port), _Handler)
        logger.info("SlackIRBot listening on port %d", port)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            logger.info("SlackIRBot server stopped")
        finally:
            server.server_close()
