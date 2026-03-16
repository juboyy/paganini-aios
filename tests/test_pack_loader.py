"""Tests for the pack loader system."""


from core.packs.loader import PackLoader


def test_discover_finds_finance_pack():
    loader = PackLoader("packs")
    found = loader.discover()
    assert "finance" in found


def test_load_finance_pack():
    loader = PackLoader("packs")
    info = loader.load("finance")
    assert info is not None
    assert info.name == "finance"
    assert info.version == "2.0.0"
    assert info.domain == "financial-markets"
    assert len(info.agents) == 9
    assert len(info.guardrails.get("gates", [])) == 6


def test_load_all():
    loader = PackLoader("packs")
    loaded = loader.load_all()
    assert "finance" in loaded
    assert loader.agent_souls  # at least some SOULs registered


def test_load_nonexistent_pack():
    loader = PackLoader("packs")
    info = loader.load("nonexistent")
    assert info is None


def test_no_packs_dir():
    loader = PackLoader("/tmp/nonexistent-packs-dir")
    found = loader.discover()
    assert found == []


def test_summary():
    loader = PackLoader("packs")
    loader.load_all()
    s = loader.summary()
    assert s["packs_loaded"] >= 1
    assert "finance" in s["packs"]
    assert s["packs"]["finance"]["agents"] == 9


def test_dashboard_panels_registered():
    loader = PackLoader("packs")
    loader.load_all()
    panels = loader.dashboard_panels
    panel_ids = [p["id"] for p in panels]
    assert "funds" in panel_ids
    assert "onboard" in panel_ids
    assert "market" in panel_ids


def test_core_works_without_packs():
    """Core should start cleanly with no packs at all."""
    loader = PackLoader("/tmp/empty-packs-dir-test")
    loaded = loader.load_all()
    assert loaded == {}
    assert loader.agent_souls == []
    assert loader.dashboard_panels == []
    assert loader.summary()["packs_loaded"] == 0
