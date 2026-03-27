"""PAGANINI AIOS — Services Layer (order=3).

This layer sits between agents (order=2) and integrations/dashboard (order=3+).
It provides facade services that wrap kernel and agent internals, so that
higher layers (dashboard, integrations) never import kernel or agents directly.

Public exports:
    EngineService     — wraps engine, pipeline, router, moltis
    AgentService      — wraps agents/framework
    RiskService       — wraps bayesian_risk, guardrails
    DaemonService     — wraps daemons
    MemoryService     — wraps memory, metaclaw
"""

from packages.services.engine_service import EngineService
from packages.services.agent_service import AgentService
from packages.services.risk_service import RiskService
from packages.services.daemon_service import DaemonService
from packages.services.memory_service import MemoryService

__all__ = [
    "EngineService",
    "AgentService",
    "RiskService",
    "DaemonService",
    "MemoryService",
]
