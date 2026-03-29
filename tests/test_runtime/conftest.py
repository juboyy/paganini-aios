"""conftest.py for test_runtime — shared fixtures."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Ensure project root is importable
ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ["PAGANINI_TEST"] = "1"
os.environ["PAGANINI_BASE"] = str(ROOT)
# Disable debug event logging during tests unless explicitly enabled
os.environ.setdefault("PAGANINI_DEBUG_EVENTS", "0")


@pytest.fixture
def tmp_checkpoint_dir(tmp_path: Path) -> Path:
    """Isolated checkpoint directory for each test."""
    d = tmp_path / "checkpoints"
    d.mkdir()
    return d


@pytest.fixture
def tmp_escalation_dir(tmp_path: Path) -> Path:
    """Isolated escalation directory for each test."""
    d = tmp_path / "escalations"
    d.mkdir()
    return d


@pytest.fixture
def tmp_evolution_dir(tmp_path: Path) -> Path:
    """Isolated evolution log directory for each test."""
    d = tmp_path / "evolutions"
    d.mkdir()
    return d
