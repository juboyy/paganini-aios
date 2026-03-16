"""Paganini AIOS — Shared API Client.

All interfaces (TUI, Telegram, Slack) connect through this client
to the running dashboard server. Enables multi-client concurrent access.

Usage:
    from packages.kernel.api_client import PaganiniClient
    client = PaganiniClient("http://localhost:8000", api_key="...")
    result = client.query("Quais as obrigações do custodiante?")
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from typing import Optional


class PaganiniClient:
    """HTTP client for Paganini dashboard API."""

    def __init__(self, base_url: str = "http://localhost:8000", api_key: str = ""):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or self._load_api_key()
        self.session_id: Optional[str] = None

    def _load_api_key(self) -> str:
        """Try to load API key from runtime state."""
        key_file = Path("runtime/state/api_key.txt")
        if key_file.exists():
            return key_file.read_text().strip()
        return ""

    def _request(self, path: str, params: dict = None, timeout: int = 60) -> dict:
        """Make API request."""
        url = f"{self.base_url}{path}"
        if params:
            url += "?" + urlencode(params)

        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        req = Request(url, headers=headers)
        try:
            with urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            return {"_error": str(e)}

    def health(self) -> dict:
        """Check server health."""
        return self._request("/api/health")

    def status(self) -> dict:
        """Get system status."""
        return self._request("/api/status")

    def query(self, question: str, session_id: str = None) -> dict:
        """Query the fund AI."""
        params = {"q": question}
        sid = session_id or self.session_id
        if sid:
            params["session_id"] = sid

        result = self._request("/api/query", params, timeout=60)

        # Track session
        if result.get("session_id"):
            self.session_id = result["session_id"]

        return result

    def agents(self) -> list:
        """List agents."""
        result = self._request("/api/agents")
        return result if isinstance(result, list) else result.get("agents", [])

    def market(self) -> dict:
        """Get market indicators."""
        return self._request("/api/market")

    def market_history(self) -> dict:
        """Get market history."""
        return self._request("/api/market/history")

    def daemons(self) -> dict:
        """Get daemon status."""
        return self._request("/api/daemons")

    def alerts(self) -> dict:
        """Get alerts."""
        return self._request("/api/alerts")

    def is_alive(self) -> bool:
        """Check if dashboard server is running."""
        try:
            h = self.health()
            return h.get("ok", False)
        except Exception:
            return False
