"""PAGANINI Pack System — Domain pack management.

A 'pack' is a domain knowledge bundle containing:
- Corpus files (markdown documents)
- Agent SOULs (agent identity files)
- Skills (MetaClaw skill files)
- Guardrail rules
- Report templates
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Optional

# Available packs (would be fetched from aios.finance in production)
PACK_REGISTRY = {
    "fidc-starter": {
        "name": "FIDC Starter",
        "description": "Core FIDC operations — 3 agents, basic skills",
        "agents": ["administrador", "custodiante", "gestor"],
        "price": "R$2K/month",
        "tier": "starter",
    },
    "fidc-professional": {
        "name": "FIDC Professional",
        "description": "Full regulatory coverage — 9 agents, 12 skills, reporting",
        "agents": ["administrador", "custodiante", "gestor", "compliance", "reporting", "due_diligence", "regulatory_watch", "investor_relations", "pricing"],
        "price": "R$8K/month",
        "tier": "professional",
    },
    "fidc-enterprise": {
        "name": "FIDC Enterprise",
        "description": "Everything + SLA + custom agents and skills",
        "agents": ["administrador", "custodiante", "gestor", "compliance", "reporting", "due_diligence", "regulatory_watch", "investor_relations", "pricing"],
        "price": "R$25K/month",
        "tier": "enterprise",
    },
}


class PackManager:
    def __init__(self, config: dict):
        self.config = config
        self.data_dir = Path(config.get("data_dir", "runtime/data"))
        self.packs_dir = self.data_dir / "packs"
        self.packs_dir.mkdir(parents=True, exist_ok=True)
        self.installed_file = self.packs_dir / "installed.json"

    def list_available(self) -> list[dict]:
        return [{"id": k, **v} for k, v in PACK_REGISTRY.items()]

    def list_installed(self) -> list[dict]:
        if self.installed_file.exists():
            return json.loads(self.installed_file.read_text())
        return []

    def install(self, pack_id: str) -> dict:
        if pack_id not in PACK_REGISTRY:
            return {"status": "error", "message": f"Pack '{pack_id}' not found. Available: {', '.join(PACK_REGISTRY.keys())}"}

        pack = PACK_REGISTRY[pack_id]

        # Check if already installed
        installed = self.list_installed()
        if any(p["id"] == pack_id for p in installed):
            return {"status": "already_installed", "message": f"Pack '{pack_id}' already installed"}

        # "Install" = register the pack and activate its agents
        installed.append({"id": pack_id, **pack})
        self.installed_file.write_text(json.dumps(installed, indent=2, ensure_ascii=False))

        return {
            "status": "ok",
            "message": f"Pack '{pack['name']}' installed successfully",
            "agents": pack["agents"],
            "tier": pack["tier"],
        }

    def uninstall(self, pack_id: str) -> dict:
        installed = self.list_installed()
        new_installed = [p for p in installed if p["id"] != pack_id]
        if len(new_installed) == len(installed):
            return {"status": "error", "message": f"Pack '{pack_id}' not installed"}
        self.installed_file.write_text(json.dumps(new_installed, indent=2, ensure_ascii=False))
        return {"status": "ok", "message": f"Pack '{pack_id}' uninstalled"}

    def info(self, pack_id: str) -> Optional[dict]:
        return PACK_REGISTRY.get(pack_id)
