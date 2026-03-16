"""Paganini AIOS — Telegram Bot Interface (API Client mode).

Connects to the running dashboard server via HTTP API.
Multiple bots/clients can run simultaneously.

Usage:
    paganini telegram              # uses token from config.yaml
    paganini telegram --token BOT_TOKEN
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Optional
from urllib.request import Request, urlopen

log = logging.getLogger("paganini.telegram")


class TelegramBot:
    """Telegram bot that connects to Paganini dashboard API."""

    def __init__(self, token: str, api_base: str = "http://localhost:8000",
                 api_key: str = ""):
        self.token = token
        self.tg_api = f"https://api.telegram.org/bot{token}"
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key
        self.offset = 0
        self._sessions: dict[int, str] = {}  # chat_id → session_id

    def _tg_call(self, method: str, data: dict = None) -> dict:
        """Call Telegram Bot API."""
        url = f"{self.tg_api}/{method}"
        if data:
            payload = json.dumps(data).encode("utf-8")
            req = Request(url, data=payload,
                          headers={"Content-Type": "application/json"})
        else:
            req = Request(url)
        try:
            with urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except Exception as e:
            log.error(f"Telegram API {method}: {e}")
            return {"ok": False}

    def _api_call(self, path: str, timeout: int = 60) -> dict:
        """Call Paganini dashboard API."""
        url = f"{self.api_base}{path}"
        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        req = Request(url, headers=headers)
        try:
            with urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            return {"_error": str(e)}

    def send(self, chat_id: int, text: str, parse_mode: str = "HTML"):
        """Send message, auto-split if >4000 chars."""
        for i in range(0, len(text), 4000):
            self._tg_call("sendMessage", {
                "chat_id": chat_id,
                "text": text[i:i+4000],
                "parse_mode": parse_mode,
            })

    def typing(self, chat_id: int):
        self._tg_call("sendChatAction", {"chat_id": chat_id, "action": "typing"})

    def handle(self, msg: dict):
        """Process incoming message."""
        chat_id = msg["chat"]["id"]
        text = (msg.get("text") or "").strip()
        if not text:
            return

        # Commands
        if text == "/start":
            self.send(chat_id,
                "🎻 <b>Paganini AIOS</b>\n\n"
                "Sistema de IA para fundos de investimento.\n\n"
                "Pergunte qualquer coisa sobre regulação, "
                "covenants, custodia, compliance, ou operações.\n\n"
                "<b>Comandos:</b>\n"
                "/market — Indicadores BCB\n"
                "/agents — Agentes disponíveis\n"
                "/status — Status do sistema\n\n"
                "Ou simplesmente digite sua pergunta."
            )
            return

        if text in ("/help", "/start@" + self._bot_username):
            return self.handle({"chat": {"id": chat_id}, "text": "/start"})

        if text == "/market":
            self.typing(chat_id)
            d = self._api_call("/api/market")
            if "_error" in d:
                self.send(chat_id, f"❌ {d['_error'][:200]}")
                return
            indicators = d.get("indicators", {})
            labels = {"cdi": "CDI", "selic": "SELIC", "ipca": "IPCA",
                      "igpm": "IGP-M", "cambio_usd": "USD/BRL",
                      "inad_pf": "Inad. PF", "inad_pj": "Inad. PJ"}
            lines = ["📊 <b>Indicadores BCB</b>\n"]
            for k, label in labels.items():
                ind = indicators.get(k, {})
                v = ind.get("latest_value", "—")
                dt = ind.get("latest_date", "")
                unit = "" if k == "cambio_usd" else "%"
                lines.append(f"  <b>{label}:</b> {v}{unit}  <i>({dt})</i>")
            self.send(chat_id, "\n".join(lines))
            return

        if text == "/status":
            self.typing(chat_id)
            d = self._api_call("/api/status")
            if "_error" in d:
                self.send(chat_id, f"❌ {d['_error'][:200]}")
                return
            self.send(chat_id,
                "🎻 <b>Paganini AIOS</b>\n\n"
                f"  <b>Status:</b> {'🟢 online' if d.get('ok') else '🔴 offline'}\n"
                f"  <b>Agentes:</b> {d.get('agents', '?')}\n"
                f"  <b>Chunks:</b> {d.get('chunks', '?')}\n"
                f"  <b>Modelo:</b> {d.get('model', '?')}\n"
            )
            return

        if text == "/agents":
            self.typing(chat_id)
            agents = self._api_call("/api/agents")
            if isinstance(agents, dict) and "_error" in agents:
                self.send(chat_id, f"❌ {agents['_error'][:200]}")
                return
            if isinstance(agents, dict):
                agents = agents.get("agents", [])
            icons = {"administrador": "📋", "compliance": "🛡️",
                     "custodiante": "🏦", "due_diligence": "🔍",
                     "gestor": "💼", "investor_relations": "📊",
                     "pricing": "💰", "regulatory_watch": "📡",
                     "reporting": "📝"}
            lines = ["🤖 <b>Agentes</b>\n"]
            for a in agents:
                name = a.get("name", str(a)) if isinstance(a, dict) else str(a)
                key = name.lower().replace(" ", "_").replace("agent:", "").strip()
                icon = icons.get(key, "🤖")
                lines.append(f"  {icon} {name}")
            self.send(chat_id, "\n".join(lines))
            return

        # Strip /query prefix
        if text.startswith("/query"):
            text = text[6:].strip()
        if not text:
            return

        # Guardrail — client-side adversarial check
        if re.search(
            r"coaf|lavagem|fraude|burlar|evadir|bypass|fracionar.*evitar|"
            r"ocultar.*origem|simular|fraudar|driblar", text, re.IGNORECASE
        ):
            self.send(chat_id,
                "🛡️ <b>QUERY BLOQUEADA</b>\n\n"
                "Guardrail PLD/AML detectou tentativa de obter "
                "orientações que violam regulação.\n\n"
                "<b>Base legal:</b> CVM 175 Art. 23 · Lei 9.613/98"
            )
            return

        # Query via API
        self.typing(chat_id)
        from urllib.parse import urlencode
        params = urlencode({"q": text})
        sid = self._sessions.get(chat_id)
        if sid:
            params += f"&session_id={sid}"

        d = self._api_call(f"/api/query?{params}", timeout=60)

        if "_error" in d:
            self.send(chat_id, f"❌ Erro: {d['_error'][:200]}")
            return

        # Track session
        if d.get("session_id"):
            self._sessions[chat_id] = d["session_id"]

        answer = d.get("answer", "Sem resposta.")
        conf = int((d.get("confidence", 0)) * 100)
        sources = d.get("sources", [])
        blocked = d.get("blocked", False)

        if blocked:
            self.send(chat_id,
                "🛡️ <b>QUERY BLOQUEADA</b>\n\n"
                f"{answer[:500]}"
            )
            return

        conf_emoji = "🟢" if conf >= 80 else "🟡" if conf >= 60 else "🔴"

        # Format sources
        src_text = ""
        if sources:
            names = []
            for s in sources[:3]:
                n = s.get("source", "doc") if isinstance(s, dict) else str(s)
                n = n.split("/")[-1].replace(".md", "")
                n = re.sub(r"#U([0-9a-fA-F]{4})",
                           lambda m: chr(int(m.group(1), 16)), n)
                names.append(f"📄 {n}")
            src_text = "\n\n<b>Fontes:</b> " + " · ".join(names)

        # Escape HTML in answer
        safe = (answer
                .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("**", ""))

        self.send(chat_id,
            f"{safe}\n\n"
            f"{conf_emoji} <b>Confiança:</b> {conf}% "
            f"{src_text}"
        )

    def poll(self):
        """Long polling loop."""
        me = self._tg_call("getMe")
        self._bot_username = me.get("result", {}).get("username", "bot")
        log.info(f"Bot @{self._bot_username} started")
        print(f"🎻 Paganini Telegram Bot → @{self._bot_username}")
        print(f"   API: {self.api_base}")

        # Check API
        h = self._api_call("/api/health")
        if h.get("ok"):
            print("   Server: 🟢 connected")
        else:
            print("   Server: 🔴 not reachable — start with: paganini dashboard")

        while True:
            try:
                updates = self._tg_call("getUpdates", {
                    "offset": self.offset, "timeout": 30
                })
                for u in updates.get("result", []):
                    self.offset = u["update_id"] + 1
                    if "message" in u:
                        try:
                            self.handle(u["message"])
                        except Exception as e:
                            log.error(f"Handle error: {e}")
            except KeyboardInterrupt:
                print("\nBot stopped.")
                break
            except Exception as e:
                log.error(f"Poll: {e}")
                time.sleep(5)


def run_bot(token: str = None, api_base: str = None, api_key: str = None):
    """Start the Telegram bot."""
    from packages.kernel.engine import load_config
    config = load_config()

    token = (token
             or config.get("telegram", {}).get("bot_token", "")
             or os.environ.get("TELEGRAM_BOT_TOKEN", ""))
    api_base = (api_base
                or config.get("telegram", {}).get("api_base", "")
                or os.environ.get("PAGANINI_API_BASE", "http://localhost:8000"))
    api_key = (api_key
               or config.get("telegram", {}).get("api_key", "")
               or "")

    # Try to load API key from runtime
    if not api_key:
        key_file = Path("runtime/state/api_key.txt")
        if key_file.exists():
            api_key = key_file.read_text().strip()

    if not token:
        print("❌ No bot token.")
        print("   Set in config.yaml: telegram.bot_token")
        print("   Or: TELEGRAM_BOT_TOKEN=... paganini telegram")
        return

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(message)s")
    bot = TelegramBot(token, api_base, api_key)
    bot.poll()
