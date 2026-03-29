"""Paganini AIOS — Human-in-the-Loop (HITL) module.

Exports:
    ApprovalRequest  — dataclass describing a pending approval
    ApprovalResult   — dataclass with the outcome of an approval
    HITLWorkflow     — orchestrates the approval lifecycle
    OperationType    — enum of operation types with risk levels
"""

from core.hitl.workflow import (  # noqa: F401
    ApprovalRequest,
    ApprovalResult,
    HITLWorkflow,
    OperationType,
    RiskLevel,
)

__all__ = [
    "ApprovalRequest",
    "ApprovalResult",
    "HITLWorkflow",
    "OperationType",
    "RiskLevel",
]
