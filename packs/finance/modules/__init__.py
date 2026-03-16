"""PAGANINI Modules — Pre-configured vertical solutions.

Modules combine agents + skills + guardrails for specific use cases.
Each module is a YAML config that wires existing components together.

Available modules:
- covenant-monitor: Automated covenant tracking and breach detection
- due-diligence: End-to-end KYC/KYB pipeline for cedentes
- regulatory-watch: CVM/ANBIMA/BACEN regulatory scanner
- risk-scanner: Periodic credit risk assessment (IFRS 9 PDD)
- pld-aml: Anti-money laundering and suspicious activity detection
"""

from pathlib import Path
from typing import Optional

import yaml


MODULES_DIR = Path(__file__).parent


def list_modules() -> list[dict]:
    """List all available module configs."""
    modules = []
    for f in sorted(MODULES_DIR.glob("*.yaml")):
        with open(f) as fh:
            data = yaml.safe_load(fh) or {}
        modules.append({
            "name": data.get("name", f.stem),
            "version": data.get("version", "0.0.0"),
            "description": (data.get("description", "") or "").strip().split("\n")[0],
            "file": str(f.name),
        })
    return modules


def load_module(name: str) -> Optional[dict]:
    """Load a module config by name."""
    # Try exact filename first
    path = MODULES_DIR / f"{name}.yaml"
    if not path.exists():
        # Try matching by module name field
        for f in MODULES_DIR.glob("*.yaml"):
            with open(f) as fh:
                data = yaml.safe_load(fh) or {}
            if data.get("name") == name:
                path = f
                break
        else:
            return None

    with open(path) as fh:
        return yaml.safe_load(fh)


def get_module_agents(name: str) -> list[str]:
    """Get the agent list (primary + secondary) for a module."""
    mod = load_module(name)
    if not mod:
        return []
    agents_cfg = mod.get("agents", {})
    result = []
    if agents_cfg.get("primary"):
        result.append(agents_cfg["primary"])
    result.extend(agents_cfg.get("secondary", []))
    return result


def get_module_guardrails(name: str) -> list[str]:
    """Get the required guardrail gates for a module."""
    mod = load_module(name)
    if not mod:
        return []
    return mod.get("guardrails", {}).get("required", [])
