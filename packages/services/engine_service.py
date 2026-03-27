"""EngineService — facade for kernel engine, pipeline, router, and moltis.

Higher layers (dashboard, integrations) import from here instead of directly
from packages.kernel.*.
"""

from __future__ import annotations

from typing import Any


class EngineService:
    """Wraps engine, moltis, router, pipeline for consumption by upper layers."""

    def __init__(self, config: dict) -> None:
        self._config = config
        self._llm_fn = None
        self._router = None

    # ------------------------------------------------------------------
    # LLM
    # ------------------------------------------------------------------

    def get_llm_fn(self):
        """Return the configured LLM callable (cached)."""
        if self._llm_fn is None:
            from packages.kernel.moltis import get_llm_fn
            self._llm_fn = get_llm_fn(self._config)
        return self._llm_fn

    # ------------------------------------------------------------------
    # Config / engine helpers
    # ------------------------------------------------------------------

    def load_config(self) -> dict:
        """Load and return the persisted config."""
        from packages.kernel.engine import load_config
        return load_config()

    def save_config(self, config: dict) -> None:
        """Persist config to disk."""
        from packages.kernel.engine import save_config
        save_config(config)

    def load_funds(self) -> list[dict]:
        """Return all onboarded fund profiles."""
        from packages.kernel.engine import load_funds
        return load_funds(self._config)

    # ------------------------------------------------------------------
    # Cognitive router
    # ------------------------------------------------------------------

    def route(self, question: str) -> Any:
        """Route a question through the CognitiveRouter and return routing result."""
        if self._router is None:
            from packages.kernel.router import CognitiveRouter
            self._router = CognitiveRouter(self._config)
        return self._router.route(question)

    # ------------------------------------------------------------------
    # Pipeline engine
    # ------------------------------------------------------------------

    def load_pipeline(self, pipeline_yaml_path: Any) -> Any:
        """Load a pipeline definition from a YAML path."""
        from packages.kernel.pipeline import load_pipeline
        return load_pipeline(pipeline_yaml_path)

    def create_pipeline_engine(self, cfg: Any) -> Any:
        """Instantiate a PipelineEngine for the given config."""
        from packages.kernel.pipeline import PipelineEngine
        return PipelineEngine(cfg)

    def wire_pipeline_handlers(self, engine: Any) -> Any:
        """Wire real handlers into a PipelineEngine."""
        from packages.kernel.pipeline_handlers import wire_handlers
        return wire_handlers(engine)
