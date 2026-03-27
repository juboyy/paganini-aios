"""DaemonService — facade for packages.kernel.daemons.

Higher layers import from here instead of packages.kernel.daemons directly.
"""

from __future__ import annotations

from typing import Any


class DaemonService:
    """Wraps DaemonManager/DaemonRunner for upper layers."""

    def __init__(self, config: dict) -> None:
        self._config = config
        self._manager = None

    def _get_manager(self) -> Any:
        if self._manager is None:
            from packages.kernel.daemons import DaemonManager
            self._manager = DaemonManager(self._config)
        return self._manager

    def list_daemons(self) -> list[dict]:
        """Return daemon status list."""
        return self._get_manager().list()

    def get_manager(self) -> Any:
        """Return the underlying DaemonManager (for advanced use)."""
        return self._get_manager()
