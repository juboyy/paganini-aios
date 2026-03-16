"""Tests for runtime handler utilities."""
from __future__ import annotations

import json

from core.runtime import handlers


def test_market_data_sync_appends_history(tmp_dir, monkeypatch):
    """Market sync writes both the latest snapshot and the history stream."""

    def fake_fetch(series_id: int, last_n: int = 5) -> list[dict]:
        return [
            {"data": "14/03/2026", "valor": "10.00"},
            {"data": "15/03/2026", "valor": "10.10"},
        ]

    monkeypatch.setattr(handlers, "_fetch_bcb_series", fake_fetch)

    result = handlers.market_data_sync({"base_path": str(tmp_dir)})

    history_path = tmp_dir / "runtime" / "data" / "market" / "history.jsonl"
    assert result["status"] == "ok"
    assert history_path.exists()

    lines = history_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    payload = json.loads(lines[0])
    assert "timestamp" in payload
    assert "cdi" in payload["indicators"]


def test_fetch_bacen_normativos_extracts_unique_items(monkeypatch):
    """BACEN normative fetch extracts unique titles from the HTML page."""
    html = """
    <html><body>
      Resolução BCB nº 123/2026
      Circular nº 456/2026
      Resolução BCB nº 123/2026
    </body></html>
    """

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def read(self) -> bytes:
            return html.encode("utf-8")

    monkeypatch.setattr(handlers.urllib.request, "urlopen", lambda *args, **kwargs: FakeResponse())

    items = handlers._fetch_bacen_normativos()

    assert len(items) == 2
    assert items[0]["title"] == "Resolução BCB nº 123/2026"
    assert items[1]["title"] == "Circular nº 456/2026"
