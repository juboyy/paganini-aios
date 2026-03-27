"""AgentService — facade for packages.agents.framework.

Higher layers import from here instead of packages.agents directly.
"""

from __future__ import annotations

from typing import Any


class AgentService:
    """Wraps AgentRegistry and agent dispatch for upper layers."""

    def __init__(self, config: dict | None = None) -> None:
        self._config = config or {}
        self._registry = None

    def _get_registry(self) -> Any:
        if self._registry is None:
            from packages.agents.framework import AgentRegistry
            self._registry = AgentRegistry()
        return self._registry

    def list_agents(self) -> list[Any]:
        """Return all registered agents."""
        return self._get_registry().list()

    def get_agent(self, slug: str) -> Any:
        """Return a single agent by slug, or None."""
        for agent in self.list_agents():
            if getattr(agent, "slug", None) == slug:
                return agent
        return None
