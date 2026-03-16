"""Paganini Pack Loader — discovers and registers domain packs.

Scans packs/*/manifest.yaml on startup. Each pack registers:
- Agents (SOULs) into the agent framework
- Guardrails into the guardrail pipeline
- Integrations into the service registry
- Dashboard panels into the UI registry
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger("paganini.packs")


@dataclass
class PackInfo:
    """Metadata about a loaded pack."""
    name: str
    version: str
    domain: str
    description: str = ""
    license: str = "open"
    path: Path = field(default_factory=lambda: Path("."))
    agents: list[dict] = field(default_factory=list)
    guardrails: dict = field(default_factory=dict)
    integrations: list[dict] = field(default_factory=list)
    dashboard_panels: list[dict] = field(default_factory=list)
    manifest: dict = field(default_factory=dict)


class PackLoader:
    """Discovers and loads packs from packs/ directory."""

    def __init__(self, packs_dir: str | Path = "packs"):
        self.packs_dir = Path(packs_dir)
        self.loaded: dict[str, PackInfo] = {}
        self._agent_souls: list[Path] = []
        self._guardrail_modules: list[str] = []
        self._dashboard_panels: list[dict] = []

    def discover(self) -> list[str]:
        """Scan for packs with manifest.yaml. Returns list of pack names."""
        found = []
        if not self.packs_dir.exists():
            logger.info("No packs directory found at %s", self.packs_dir)
            return found

        for manifest_path in sorted(self.packs_dir.glob("*/manifest.yaml")):
            try:
                with open(manifest_path) as f:
                    manifest = yaml.safe_load(f)
                name = manifest.get("name", manifest_path.parent.name)
                found.append(name)
                logger.info("Discovered pack: %s v%s", name, manifest.get("version", "?"))
            except Exception as e:
                logger.warning("Failed to read %s: %s", manifest_path, e)

        return found

    def load(self, name: str) -> PackInfo | None:
        """Load a specific pack by name."""
        manifest_path = self.packs_dir / name / "manifest.yaml"
        if not manifest_path.exists():
            logger.error("Pack '%s' not found (no manifest.yaml)", name)
            return None

        try:
            with open(manifest_path) as f:
                manifest = yaml.safe_load(f)
        except Exception as e:
            logger.error("Failed to parse manifest for '%s': %s", name, e)
            return None

        pack_path = manifest_path.parent
        info = PackInfo(
            name=manifest.get("name", name),
            version=manifest.get("version", "0.0.0"),
            domain=manifest.get("domain", "unknown"),
            description=manifest.get("description", ""),
            license=manifest.get("license", "open"),
            path=pack_path,
            agents=manifest.get("agents", []),
            guardrails=manifest.get("guardrails", {}),
            integrations=manifest.get("integrations", []),
            dashboard_panels=manifest.get("dashboard_panels", []),
            manifest=manifest,
        )

        # Register agent SOULs
        for agent_def in info.agents:
            soul_path = pack_path / agent_def.get("soul", "")
            if soul_path.exists():
                self._agent_souls.append(soul_path)
                logger.debug("Registered agent SOUL: %s", soul_path.name)

        # Register guardrails
        guardrail_module = info.guardrails.get("pipeline", "")
        if guardrail_module:
            self._guardrail_modules.append(
                f"packs.{name}.{guardrail_module.replace('/', '.').replace('.py', '')}"
            )

        # Register dashboard panels
        self._dashboard_panels.extend(info.dashboard_panels)

        self.loaded[name] = info
        logger.info(
            "Loaded pack '%s': %d agents, %d guardrail gates, %d integrations, %d panels",
            name,
            len(info.agents),
            len(info.guardrails.get("gates", [])),
            len(info.integrations),
            len(info.dashboard_panels),
        )
        return info

    def load_all(self) -> dict[str, PackInfo]:
        """Discover and load all available packs."""
        for name in self.discover():
            self.load(name)
        return self.loaded

    @property
    def agent_souls(self) -> list[Path]:
        """All registered agent SOUL paths across loaded packs."""
        return self._agent_souls

    @property
    def guardrail_modules(self) -> list[str]:
        """All registered guardrail module paths."""
        return self._guardrail_modules

    @property
    def dashboard_panels(self) -> list[dict]:
        """All registered dashboard panels."""
        return self._dashboard_panels

    def get_pack(self, name: str) -> PackInfo | None:
        """Get a loaded pack by name."""
        return self.loaded.get(name)

    def summary(self) -> dict[str, Any]:
        """Summary of all loaded packs for API/dashboard."""
        return {
            "packs_loaded": len(self.loaded),
            "total_agents": len(self._agent_souls),
            "total_panels": len(self._dashboard_panels),
            "packs": {
                name: {
                    "version": info.version,
                    "domain": info.domain,
                    "agents": len(info.agents),
                    "guardrails": len(info.guardrails.get("gates", [])),
                    "panels": len(info.dashboard_panels),
                }
                for name, info in self.loaded.items()
            },
        }
