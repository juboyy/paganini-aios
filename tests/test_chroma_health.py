"""Tests for ChromaDB health check and recovery."""

import tempfile
from pathlib import Path

from core.rag.health import check_chroma_health, safe_chroma_call, startup_health_check


def test_health_check_fresh_install():
    """Fresh install (no chroma dir) should be healthy."""
    result = check_chroma_health("/tmp/nonexistent-chroma-test")
    assert result["healthy"] is True


def test_health_check_empty_dir():
    with tempfile.TemporaryDirectory() as d:
        result = check_chroma_health(d)
        assert result["healthy"] is True


def test_health_check_detects_corruption():
    """Simulate corrupted segment (missing header.bin)."""
    with tempfile.TemporaryDirectory() as d:
        # Create sqlite file
        (Path(d) / "chroma.sqlite3").touch()
        # Create a corrupted segment
        seg = Path(d) / "corrupted-segment"
        seg.mkdir()
        # Has .bin files but missing header.bin
        (seg / "data_level0.bin").write_bytes(b"fake")
        (seg / "index.bin").write_bytes(b"fake")
        # No header.bin → corrupted

        result = check_chroma_health(d)
        assert result["healthy"] is False
        assert result["action"] == "repair"
        assert not seg.exists()  # should have been deleted


def test_health_check_healthy_segment():
    """Segment with all files should be healthy."""
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "chroma.sqlite3").touch()
        seg = Path(d) / "valid-segment"
        seg.mkdir()
        (seg / "header.bin").write_bytes(b"header")
        (seg / "data_level0.bin").write_bytes(b"data")

        result = check_chroma_health(d)
        assert result["healthy"] is True
        assert seg.exists()


def test_safe_chroma_call_success():
    """Normal function call should work."""
    result = safe_chroma_call(lambda: 42)
    assert result == 42


def test_safe_chroma_call_timeout():
    """Hanging function should return default."""
    import time
    result = safe_chroma_call(lambda: time.sleep(10), timeout=0.1, default=-1)
    assert result == -1


def test_safe_chroma_call_exception():
    """Failing function should return default."""
    def boom():
        raise RuntimeError("explosion")
    result = safe_chroma_call(boom, default="fallback")
    assert result == "fallback"


def test_startup_health_check():
    result = startup_health_check("/tmp/nonexistent-startup-test")
    assert result["healthy"] is True
