"""MemoryService — facade for packages.kernel.memory and packages.kernel.metaclaw.

Higher layers import from here instead of from the kernel directly.
"""

from __future__ import annotations

from typing import Any


class MemoryService:
    """Wraps MemoryManager and MetaClawProxy for upper layers."""

    def __init__(self, config: dict) -> None:
        self._config = config
        self._memory = None
        self._metaclaw = None

    # ------------------------------------------------------------------
    # Memory
    # ------------------------------------------------------------------

    def _get_memory(self) -> Any:
        if self._memory is None:
            from packages.kernel.memory import MemoryManager
            self._memory = MemoryManager(self._config)
        return self._memory

    def stats(self) -> dict:
        """Return memory statistics."""
        return self._get_memory().stats()

    def recall(self, query: str, limit: int = 3) -> dict:
        """Recall semantic memory relevant to query."""
        return self._get_memory().recall(query, limit=limit)

    def record_interaction(
        self,
        query: str,
        response: str,
        confidence: float = 0.0,
        agent: str = "dashboard",
        chunks: list | None = None,
    ) -> None:
        """Persist an interaction to memory."""
        mem = self._get_memory()
        # MemoryManager.record_interaction has varying signatures; try both
        try:
            mem.record_interaction(
                query=query,
                response=response,
                confidence=confidence,
                agent=agent,
            )
        except TypeError:
            mem.record_interaction(
                query,
                response,
                chunks or [],
                confidence,
                agent,
            )

    def store(self, data: dict) -> None:
        """Store arbitrary data dict into memory."""
        self._get_memory().store(data)

    # ------------------------------------------------------------------
    # MetaClaw
    # ------------------------------------------------------------------

    def _get_metaclaw(self) -> Any:
        if self._metaclaw is None:
            from packages.kernel.metaclaw import MetaClawProxy
            self._metaclaw = MetaClawProxy(self._config)
        return self._metaclaw

    def init_metaclaw(self) -> Any:
        """Initialise MetaClaw (for side-effects) and return the proxy."""
        return self._get_metaclaw()
