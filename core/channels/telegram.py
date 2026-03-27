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
        """Process incoming message — dispatches to sub-handlers."""
        chat_id = msg["chat"]["id"]
        text = (msg.get("text") or "").strip()
        if not text:
            return

        # Built-in command dispatch
        if self._handle_command(chat_id, text):
            return

        # Casual & short query guards
        if self._handle_casual(chat_id, text):
            return

        # Strip /query prefix
        if text.startswith("/query"):
            text = text[6:].strip()
        if not text:
            return

        # Client-side adversarial guardrail
        if self._check_pld_guardrail(chat_id, text):
            return

        # RAG query via dashboard API
        self._handle_rag_query(chat_id, text)

    # ------------------------------------------------------------------
    # handle() sub-handlers
    # ------------------------------------------------------------------

    def _handle_command(self, chat_id: int, text: str) -> bool:
        """Handle /start, /help, /market, /status, /agents. Returns True if handled."""
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
            return True

        if text in ("/help", "/start@" + self._bot_username):
            self.handle({"chat": {"id": chat_id}, "text": "/start"})
            return True

        if text == "/market":
            self._cmd_market(chat_id)
            return True

        if text == "/status":
            self._cmd_status(chat_id)
            return True

        if text == "/agents":
            self._cmd_agents(chat_id)
            return True

        return False

    def _cmd_market(self, chat_id: int) -> None:
        """Handle /market command — fetch and display BCB indicators."""
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

    def _cmd_status(self, chat_id: int) -> None:
        """Handle /status command."""
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

    def _cmd_agents(self, chat_id: int) -> None:
        """Handle /agents command."""
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
            lines.append(f"  {icons.get(key, '🤖')} {name}")
        self.send(chat_id, "\n".join(lines))

    def _handle_casual(self, chat_id: int, text: str) -> bool:
        """Handle greetings and short queries. Returns True if handled."""
        greetings = ["oi", "olá", "ola", "hey", "hi", "hello", "bom dia",
                     "boa tarde", "boa noite", "e aí", "e ai", "fala",
                     "salve", "eae", "yo", "tudo bem", "como vai"]
        if text.lower().strip("!?.") in greetings:
            self.send(chat_id,
                "🎻 Olá! Sou o assistente Paganini.\n\n"
                "Pergunte sobre regulação de fundos, covenants, "
                "custodia, compliance, stress test, PLD/AML...\n\n"
                "<b>Exemplos:</b>\n"
                "• Quais as obrigações do custodiante?\n"
                "• O que é subordinação de cotas?\n"
                "• Como funciona o stress test?\n"
                "• /market — indicadores BCB"
            )
            return True

        if len(text) < 10 and not text.startswith("/"):
            self.send(chat_id,
                "Pode elaborar? Preciso de uma pergunta mais específica "
                "sobre fundos de investimento para consultar os agentes.\n\n"
                "<i>Ex: \"Quais as obrigações do custodiante?\"</i>"
            )
            return True

        return False

    def _check_pld_guardrail(self, chat_id: int, text: str) -> bool:
        """Block adversarial PLD/AML attempts. Returns True if blocked."""
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
            return True
        return False

    def _handle_rag_query(self, chat_id: int, text: str) -> None:
        """Send query to dashboard API and format the response."""
        from urllib.parse import urlencode
        self.typing(chat_id)
        params = urlencode({"q": text})
        sid = self._sessions.get(chat_id)
        if sid:
            params += f"&session_id={sid}"

        d = self._api_call(f"/api/query?{params}", timeout=60)
        if "_error" in d:
            self.send(chat_id, f"❌ Erro: {d['_error'][:200]}")
            return

        if d.get("session_id"):
            self._sessions[chat_id] = d["session_id"]

        answer = d.get("answer", "Sem resposta.")
        conf = int((d.get("confidence", 0)) * 100)
        sources = d.get("sources", [])

        if d.get("blocked"):
            self.send(chat_id, f"🛡️ <b>QUERY BLOQUEADA</b>\n\n{answer[:500]}")
            return

        conf_emoji = "🟢" if conf >= 80 else "🟡" if conf >= 60 else "🔴"
        src_text = self._format_sources(sources)
        safe = (answer
                .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("**", ""))
        self.send(chat_id,
            f"{safe}\n\n"
            f"{conf_emoji} <b>Confiança:</b> {conf}% "
            f"{src_text}"
        )

    def _format_sources(self, sources: list) -> str:
        """Format source list into HTML string."""
        if not sources:
            return ""
        names = []
        for s in sources[:3]:
            n = s.get("source", "doc") if isinstance(s, dict) else str(s)
            n = n.split("/")[-1].replace(".md", "")
            n = re.sub(r"#U([0-9a-fA-F]{4})",
                       lambda m: chr(int(m.group(1), 16)), n)
            names.append(f"📄 {n}")
        return "\n\n<b>Fontes:</b> " + " · ".join(names)

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
    from core.config.engine import load_config
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
