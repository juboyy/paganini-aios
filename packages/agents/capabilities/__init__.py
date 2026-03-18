"""Paganini Agent Capabilities — executable financial intelligence."""
from .orchestrator import OrchestratorAgent
from .administrador import AdministradorAgent
from .compliance import ComplianceAgent
from .custodia import CustodiaAgent
from .due_diligence import DueDiligenceAgent
from .gestor import GestorAgent
from .pricing import PricingAgent

__all__ = [
    "OrchestratorAgent",
    "AdministradorAgent",
    "ComplianceAgent",
    "CustodiaAgent",
    "DueDiligenceAgent",
    "GestorAgent",
    "PricingAgent",
]
