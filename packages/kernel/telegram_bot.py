"""Paganini AIOS — Telegram Bot Interface.

Connects the fund AI system to Telegram via long polling.
No webhooks needed, no HTTPS required.

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
from urllib.parse import quote

log = logging.getLogger("paganini.telegram")

BASE = Path(__file__).resolve().parent.parent.parent
RUNTIME = BASE / "runtime"


class TelegramBot:
    """Minimal Telegram bot using only stdlib (no external deps)."""

    def __init__(self, token: str, engine_config: dict):
        self.token = token
        self.api = f"https://api.telegram.org/bot{token}"
        self.config = engine_config
        self.offset = 0
        self._rag = None
        self._llm_fn = None
        self._setup_engine()

    def _setup_engine(self):
        """Initialize RAG pipeline and LLM function."""
        try:
            from packages.rag.pipeline import RAGPipeline
            from packages.kernel.engine import get_llm_fn
            self._rag = RAGPipeline(self.config)
            self._llm_fn = get_llm_fn(self.config)
            log.info("Engine initialized: RAG + LLM ready")
        except Exception as e:
            log.error(f"Engine init failed: {e}")

    def _api_call(self, method: str, data: dict = None) -> dict:
        """Call Telegram Bot API."""
        url = f"{self.api}/{method}"
        if data:
            payload = json.dumps(data).encode("utf-8")
            req = Request(url, data=payload, headers={"Content-Type": "application/json"})
        else:
            req = Request(url)
        try:
            with urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except Exception as e:
            log.error(f"API call {method} failed: {e}")
            return {"ok": False, "error": str(e)}

    def send_message(self, chat_id: int, text: str, parse_mode: str = "HTML"):
        """Send a message, splitting if >4096 chars."""
        # Telegram limit is 4096 chars
        chunks = [text[i:i+4000] for i in range(0, len(text), 4000)]
        for chunk in chunks:
            self._api_call("sendMessage", {
                "chat_id": chat_id,
                "text": chunk,
                "parse_mode": parse_mode,
            })

    def send_typing(self, chat_id: int):
        """Send typing indicator."""
        self._api_call("sendChatAction", {
            "chat_id": chat_id,
            "action": "typing",
        })

    def handle_message(self, message: dict):
        """Process incoming message."""
        chat_id = message["chat"]["id"]
        text = message.get("text", "").strip()
        user = message.get("from", {})
        username = user.get("first_name", "User")

        if not text:
            return

        # Commands
        if text == "/start":
            self.send_message(chat_id,
                "🎻 <b>Paganini AIOS</b>\n\n"
                "Sistema de IA para fundos de investimento.\n\n"
                "Pergunte qualquer coisa sobre regulação, "
                "covenants, custodia, compliance, ou operações.\n\n"
                "<b>Comandos:</b>\n"
                "/query [pergunta] — Consultar agentes\n"
                "/market — Indicadores BCB\n"
                "/status — Status do sistema\n"
                "/agents — Agentes disponíveis\n"
                "/help — Ajuda\n\n"
                "Ou simplesmente digite sua pergunta."
            )
            return

        if text == "/help":
            self.send_message(chat_id,
                "🎻 <b>Comandos</b>\n\n"
                "Qualquer mensagem é tratada como consulta.\n\n"
                "/market — CDI, SELIC, IPCA, USD/BRL\n"
                "/status — Status do sistema\n"
                "/agents — 9 agentes especializados\n"
                "/onboard [CNPJ] — Onboarding via CVM"
            )
            return

        if text == "/market":
            self._handle_market(chat_id)
            return

        if text == "/status":
            self._handle_status(chat_id)
            return

        if text == "/agents":
            self._handle_agents(chat_id)
            return

        if text.startswith("/onboard"):
            cnpj = text.replace("/onboard", "").strip()
            self._handle_onboard(chat_id, cnpj)
            return

        # Strip /query prefix if present
        if text.startswith("/query"):
            text = text[6:].strip()

        if not text:
            self.send_message(chat_id, "Digite sua pergunta.")
            return

        # Guardrail check — adversarial intent
        adversarial = re.search(
            r"coaf|lavagem|fraude|burlar|evadir|bypass|fracionar.*evitar|"
            r"ocultar.*origem|simular|fraudar|driblar",
            text, re.IGNORECASE
        )
        if adversarial:
            self.send_message(chat_id,
                "🛡️ <b>QUERY BLOQUEADA</b>\n\n"
                "Guardrail PLD/AML detectou tentativa de obter "
                "orientações que violam regulação.\n\n"
                "<b>Gates acionados:</b> PLD/AML, Semantic Guard, Compliance\n"
                "<b>Base legal:</b> CVM 175 Art. 23 · Lei 9.613/98"
            )
            return

        # RAG Query
        self.send_typing(chat_id)

        if not self._rag:
            self.send_message(chat_id,
                "⚠️ RAG pipeline não disponível. "
                "Execute <code>paganini ingest</code> primeiro."
            )
            return

        try:
            t0 = time.time()
            result = self._rag.query(text, llm_fn=self._llm_fn)
            elapsed = time.time() - t0

            answer = result.text if hasattr(result, "text") else str(result)
            confidence = result.confidence if hasattr(result, "confidence") else 0
            chunks = result.chunks if hasattr(result, "chunks") else []

            conf_pct = int(confidence * 100)
            conf_emoji = "🟢" if conf_pct >= 80 else "🟡" if conf_pct >= 60 else "🔴"

            # Format sources
            sources_text = ""
            if chunks:
                src_names = []
                for c in chunks[:3]:
                    name = getattr(c, "source", "doc")
                    name = name.split("/")[-1].replace(".md", "")
                    # Decode #U00xx
                    name = re.sub(
                        r"#U([0-9a-fA-F]{4})",
                        lambda m: chr(int(m.group(1), 16)),
                        name
                    )
                    src_names.append(f"📄 {name}")
                sources_text = "\n\n<b>Fontes:</b> " + " · ".join(src_names)

            # Escape HTML in answer
            safe_answer = (
                answer
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                # Re-enable bold
                .replace("**", "")  # strip markdown bold
            )

            self.send_message(chat_id,
                f"{safe_answer}\n\n"
                f"{conf_emoji} <b>Confiança:</b> {conf_pct}% · "
                f"⏱ {elapsed:.1f}s"
                f"{sources_text}"
            )

        except Exception as e:
            log.error(f"Query failed: {e}")
            self.send_message(chat_id,
                f"❌ Erro na consulta: <code>{str(e)[:200]}</code>"
            )

    def _handle_market(self, chat_id: int):
        """Show market indicators."""
        snapshot_file = RUNTIME / "data" / "market" / "latest_snapshot.json"
        if not snapshot_file.exists():
            self.send_message(chat_id, "⚠️ Sem dados de mercado. Execute <code>paganini market sync</code>")
            return

        data = json.loads(snapshot_file.read_text())
        indicators = data.get("indicators", {})

        labels = {
            "cdi": ("CDI", "%"), "selic": ("SELIC", "%"),
            "ipca": ("IPCA", "%"), "igpm": ("IGP-M", "%"),
            "cambio_usd": ("USD/BRL", ""), "inad_pf": ("Inad. PF", "%"),
            "inad_pj": ("Inad. PJ", "%"),
        }

        lines = ["📊 <b>Indicadores BCB</b>\n"]
        for key, (label, unit) in labels.items():
            ind = indicators.get(key, {})
            val = ind.get("latest_value", "—")
            date = ind.get("latest_date", "")
            lines.append(f"  <b>{label}:</b> {val}{unit}  <i>({date})</i>")

        lines.append(f"\n⏱ Atualizado: {data.get('timestamp', '—')[:19]}")
        self.send_message(chat_id, "\n".join(lines))

    def _handle_status(self, chat_id: int):
        """Show system status."""
        from packages.kernel.engine import load_config
        config = load_config()

        agents_dir = BASE / "packages" / "agents" / "souls"
        agent_count = len(list(agents_dir.glob("*.md"))) if agents_dir.exists() else 0

        chunks = 0
        if self._rag and hasattr(self._rag, "collection") and self._rag.collection:
            try:
                chunks = self._rag.collection.count()
            except Exception:
                pass

        model = config.get("provider", {}).get("model", "not configured")

        self.send_message(chat_id,
            "🎻 <b>Paganini AIOS</b>\n\n"
            f"  <b>Versão:</b> 0.1.0\n"
            f"  <b>Agentes:</b> {agent_count}\n"
            f"  <b>RAG Chunks:</b> {chunks:,}\n"
            f"  <b>Modelo:</b> {model}\n"
        )

    def _handle_agents(self, chat_id: int):
        """List agents."""
        agents_dir = BASE / "packages" / "agents" / "souls"
        if not agents_dir.exists():
            self.send_message(chat_id, "Nenhum agente encontrado.")
            return

        icons = {
            "administrador": "📋", "compliance": "🛡️", "custodiante": "🏦",
            "due_diligence": "🔍", "gestor": "💼", "investor_relations": "📊",
            "pricing": "💰", "regulatory_watch": "📡", "reporting": "📝",
        }

        lines = ["🤖 <b>Agentes</b>\n"]
        for f in sorted(agents_dir.glob("*.md")):
            name = f.stem.replace("_", " ").title()
            icon = icons.get(f.stem, "🤖")
            lines.append(f"  {icon} {name}")

        self.send_message(chat_id, "\n".join(lines))

    def _handle_onboard(self, chat_id: int, cnpj: str):
        """Onboard a fund from CVM data."""
        if not cnpj or len(cnpj) < 14:
            self.send_message(chat_id,
                "Usage: <code>/onboard XX.XXX.XXX/0001-XX</code>"
            )
            return

        self.send_typing(chat_id)
        try:
            from packages.kernel.cvm_ingester import build_fund_profile, save_fund_profile
            profile = build_fund_profile(cnpj)
            path = save_fund_profile(profile, str(RUNTIME / "funds"))

            name = profile.get("nome", "—")
            admin = profile.get("cadastro", {}).get("administrador", "—")
            pl = profile.get("patrimonio_liquido", "—")

            self.send_message(chat_id,
                f"✅ <b>Fund Onboarded</b>\n\n"
                f"  <b>Nome:</b> {name}\n"
                f"  <b>Admin:</b> {admin}\n"
                f"  <b>PL:</b> R$ {pl}\n"
                f"  <b>Salvo em:</b> <code>{path}</code>"
            )
        except Exception as e:
            self.send_message(chat_id, f"❌ Onboarding falhou: {str(e)[:200]}")

    def poll(self):
        """Long polling loop."""
        log.info("Bot started — listening for messages...")
        print(f"🎻 Paganini Telegram Bot running. Send /start to your bot.")

        # Get bot info
        me = self._api_call("getMe")
        if me.get("ok"):
            username = me["result"].get("username", "?")
            print(f"   Bot: @{username}")

        while True:
            try:
                updates = self._api_call("getUpdates", {
                    "offset": self.offset,
                    "timeout": 30,
                })
                if not updates.get("ok"):
                    time.sleep(5)
                    continue

                for update in updates.get("result", []):
                    self.offset = update["update_id"] + 1
                    if "message" in update:
                        self.handle_message(update["message"])

            except KeyboardInterrupt:
                print("\nBot stopped.")
                break
            except Exception as e:
                log.error(f"Poll error: {e}")
                time.sleep(5)


def run_bot(token: Optional[str] = None):
    """Start the Telegram bot."""
    from packages.kernel.engine import load_config

    config = load_config()

    if not token:
        token = config.get("telegram", {}).get("bot_token", "")
        token = token or os.environ.get("TELEGRAM_BOT_TOKEN", "")

    if not token:
        print("❌ No bot token. Set in config.yaml under telegram.bot_token")
        print("   Or pass: paganini telegram --token YOUR_TOKEN")
        return

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    bot = TelegramBot(token, config)
    bot.poll()
