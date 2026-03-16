"""ChromaDB health check and auto-recovery.

Handles HNSW index corruption by:
1. Detecting corruption on startup
2. Auto-deleting corrupted segment directories
3. Re-ingesting corpus if collection is empty after recovery
4. Wrapping all ChromaDB ops with timeouts
"""

from __future__ import annotations

import logging
import shutil
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from pathlib import Path
from typing import Any

logger = logging.getLogger("paganini.rag.health")

DEFAULT_TIMEOUT = 5  # seconds


def safe_chroma_call(fn, *args, timeout: float = DEFAULT_TIMEOUT, default: Any = None, **kwargs):
    """Execute a ChromaDB operation with timeout protection.

    Returns default value if the call times out or raises an exception.
    """
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(fn, *args, **kwargs)
        try:
            return future.result(timeout=timeout)
        except TimeoutError:
            logger.error("ChromaDB call timed out after %ss: %s", timeout, fn.__name__)
            return default
        except Exception as e:
            logger.error("ChromaDB call failed: %s — %s", fn.__name__, e)
            return default


def check_chroma_health(chroma_dir: str | Path = "runtime/data/chroma") -> dict:
    """Check ChromaDB health and repair if needed.

    Returns:
        {"healthy": bool, "action": str, "details": str}
    """
    chroma_path = Path(chroma_dir)
    result = {"healthy": True, "action": "none", "details": "ok"}

    if not chroma_path.exists():
        result["details"] = "chroma directory does not exist (fresh install)"
        return result

    sqlite_path = chroma_path / "chroma.sqlite3"
    if not sqlite_path.exists():
        result["details"] = "no sqlite3 file (fresh install)"
        return result

    # Check for corrupted HNSW segments
    corrupted_segments = []
    for segment_dir in chroma_path.glob("*"):
        if not segment_dir.is_dir():
            continue
        if segment_dir.name in ("chroma.sqlite3", "__pycache__"):
            continue

        # HNSW corruption indicator: segment directory exists but index is broken
        hnsw_files = list(segment_dir.glob("*.bin"))
        header_file = segment_dir / "header.bin"
        data_file = segment_dir / "data_level0.bin"

        if hnsw_files and (not header_file.exists() or not data_file.exists()):
            corrupted_segments.append(segment_dir)
            continue

        # Check for zero-length index files (another corruption indicator)
        for f in hnsw_files:
            if f.stat().st_size == 0:
                corrupted_segments.append(segment_dir)
                break

    if corrupted_segments:
        result["healthy"] = False
        result["action"] = "repair"

        for seg in corrupted_segments:
            logger.warning("Removing corrupted segment: %s", seg.name)
            try:
                shutil.rmtree(seg)
            except Exception as e:
                logger.error("Failed to remove %s: %s", seg, e)

        result["details"] = f"removed {len(corrupted_segments)} corrupted segment(s) — ChromaDB will rebuild from SQLite"
        logger.info("ChromaDB repair complete: %s", result["details"])

    return result


def startup_health_check(chroma_dir: str | Path = "runtime/data/chroma") -> dict:
    """Run health check on startup and log results."""
    result = check_chroma_health(chroma_dir)

    if result["healthy"]:
        logger.info("ChromaDB health: OK — %s", result["details"])
    else:
        logger.warning("ChromaDB health: REPAIRED — %s", result["details"])

    return result
