"""Paganini AIOS — Ingestion module.

Exports:
    IngestDocument  — ingest a document into the vector store
    IngestResult    — result dataclass
    IngestionPipeline — full pipeline class
"""

from core.ingestion.pipeline import (  # noqa: F401
    IngestDocument,
    IngestResult,
    IngestionPipeline,
)

__all__ = ["IngestDocument", "IngestResult", "IngestionPipeline"]
