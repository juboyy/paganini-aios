"""
Paganini AIOS — Agent Capability Modules
=========================================

Seven specialised capability modules for the Paganini FIDC platform:

  risk               — Quantitative risk analysis (VaR, stress, EL, HHI)
  knowledge_graph    — NER, entity graph, relationship inference
  treasury           — Cash management, liquidity, reconciliation
  auditor            — Cross-agent QA, anomaly detection, audit reports
  reporting          — CVM-compliant reports, investor letters, BRL formatting
  investor_relations — Performance metrics, Sharpe, factsheets, IR queries
  regulatory_watch   — CVM/BACEN feed monitoring, impact assessment, calendar

All modules:
  - Are self-contained (stdlib + dataclasses only)
  - Use real Brazilian-market financial formulas
  - Include demo data and CLI entry points
  - Implement execute(task, context, chunks) as main dispatch

Brazilian market constants used across modules:
  CDI ≈ 13.75% a.a. (Selic target, early 2026)
  Benchmark: CDI
  Currency: BRL (R$)
  Regulation: CVM Resolução 175/2022, BACEN 3.978, BACEN 4.966, CMN 4.557
"""

from .risk               import RiskAgent, VaRResult, StressResult, ScenarioImpact
from .knowledge_graph    import KnowledgeGraphAgent, Entity, Relationship, IngestResult
from .treasury           import TreasuryAgent, CashFlowProjection, ReconciliationResult, DailyBalance
from .auditor            import AuditorAgent, AuditResult, AuditFinding
from .reporting          import ReportingAgent
from .investor_relations import InvestorRelationsAgent, PerformanceReport
from .regulatory_watch   import RegulatoryWatchAgent, Publication, ImpactAssessment

__all__ = [
    # Agents
    "RiskAgent",
    "KnowledgeGraphAgent",
    "TreasuryAgent",
    "AuditorAgent",
    "ReportingAgent",
    "InvestorRelationsAgent",
    "RegulatoryWatchAgent",
    # Result types
    "VaRResult",
    "StressResult",
    "ScenarioImpact",
    "Entity",
    "Relationship",
    "IngestResult",
    "CashFlowProjection",
    "DailyBalance",
    "ReconciliationResult",
    "AuditResult",
    "AuditFinding",
    "PerformanceReport",
    "Publication",
    "ImpactAssessment",
]
