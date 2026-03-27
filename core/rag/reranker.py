"""Post-Retrieval Reranker — re-score retrieved chunks after RRF fusion.

Three-tier ranking strategy (from best to fallback):

1. **Cross-encoder** — ``sentence-transformers`` cross-encoder model gives the
   most accurate passage-query relevance scores (requires the optional
   ``sentence-transformers`` package and a downloaded model).
2. **Keyword overlap + position** — fast rule-based fallback combining:
   - TF-IDF-inspired query-term coverage in the passage
   - Exact-match bonus for domain terms (loaded from :class:`~core.rag.domain.DomainConfig`)
   - Positional bias toward earlier passages
3. **Abstract interface** — ``BaseReranker`` ABC allows plugging in
   ColBERT, PyLate, or any future reranker without changing the pipeline.

Domain knowledge (domain_terms) is loaded from a ``DomainConfig`` pack.
Pass ``domain=None`` to skip domain boost — pure keyword overlap is still applied.

Config expected in ``config["rag"]["reranker"]``::

    rag:
      reranker:
        enabled: true
        model: "cross-encoder/ms-marco-MiniLM-L-6-v2"
        top_k: 5

Usage::

    from core.rag.reranker import get_reranker
    from core.rag.domain import load_domain

    domain = load_domain(pack_name="finance")
    reranker = get_reranker(config, domain=domain)
    reranked_chunks = reranker.rerank(query, chunks)
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import Optional

from core.rag.domain import DomainConfig, GENERIC_DOMAIN

__all__ = [
    "BaseReranker",
    "KeywordReranker",
    "CrossEncoderReranker",
    "get_reranker",
]


# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------

class BaseReranker(ABC):
    """Abstract base class for all rerankers."""

    def __init__(self, top_k: int = 5):
        self.top_k = top_k

    @abstractmethod
    def rerank(self, query: str, chunks: list) -> list:
        """Rerank *chunks* for relevance to *query*.

        Args:
            query: User query string.
            chunks: Retrieved :class:`~core.rag.pipeline.Chunk` objects.

        Returns:
            New list sorted by relevance, truncated to :attr:`top_k` items.
            Chunk ``.score`` attributes are updated in-place.
        """

    def _truncate(self, chunks: list) -> list:
        return chunks[: self.top_k]


# ---------------------------------------------------------------------------
# Keyword overlap reranker (no dependencies)
# ---------------------------------------------------------------------------

_STOPWORDS_PT = frozenset({
    "de", "da", "do", "em", "e", "a", "o", "as", "os", "um", "uma",
    "para", "com", "por", "que", "no", "na", "nos", "nas", "se", "ao",
    "à", "ou", "não", "é", "são", "foi", "foram", "ser", "ter", "como",
    "que", "mais", "mas", "quando", "então", "já", "ainda", "mesmo",
})

_STOPWORDS_EN = frozenset({
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "this", "that", "these",
    "those", "it", "its", "not", "no",
})


def _content_tokens(text: str, stopwords: frozenset[str] = _STOPWORDS_PT) -> list[str]:
    """Lowercase alphabetic tokens, minus stopwords."""
    raw = re.findall(r"[a-záéíóúâêîôûãõçàèìòùñ]+", text.lower())
    return [t for t in raw if len(t) > 2 and t not in stopwords]


def _keyword_score(
    query: str,
    text: str,
    domain_terms: frozenset[str],
    position: int = 0,
    n_total: int = 1,
    stopwords: frozenset[str] = _STOPWORDS_PT,
) -> float:
    """Compute a composite keyword relevance score.

    Components:
    - **Term coverage**: fraction of unique query terms present in the chunk.
    - **Domain boost**: +0.08 per shared domain term (capped at 0.30).
    - **Exact phrase bonus**: +0.20 if any 3-gram from query appears verbatim.
    - **Positional bias**: small negative bias for later chunks.
    """
    query_tokens = set(_content_tokens(query, stopwords))
    if not query_tokens:
        return 0.0

    chunk_tokens = set(_content_tokens(text, stopwords))

    # Term coverage
    overlap = query_tokens & chunk_tokens
    coverage = len(overlap) / len(query_tokens)

    # Domain boost (only when domain terms are configured)
    domain_bonus = 0.0
    if domain_terms:
        domain_matches = (query_tokens & chunk_tokens) & domain_terms
        domain_bonus = min(len(domain_matches) * 0.08, 0.30)

    # Exact phrase bonus (3-grams from query in chunk text)
    phrase_bonus = 0.0
    q_words = query.lower().split()
    for i in range(len(q_words) - 2):
        phrase = " ".join(q_words[i : i + 3])
        if phrase in text.lower():
            phrase_bonus = 0.20
            break

    # Positional bias: items retrieved earlier are slightly preferred
    pos_penalty = 0.05 * (position / (n_total - 1)) if n_total > 1 else 0.0

    return coverage + domain_bonus + phrase_bonus - pos_penalty


class KeywordReranker(BaseReranker):
    """Fast, dependency-free reranker using keyword overlap + domain signals.

    Args:
        top_k: Maximum number of chunks to return after reranking.
        blend_original_score: Weight (0–1) given to the original retrieval
                              score vs. the new keyword score. ``0.0`` means
                              pure keyword scoring; ``1.0`` keeps original
                              scores unchanged.
        domain: Optional :class:`~core.rag.domain.DomainConfig` whose
                ``domain_terms`` receive a bonus when they overlap between
                query and chunk.  When ``None``, domain boost is disabled.
    """

    def __init__(
        self,
        top_k: int = 5,
        blend_original_score: float = 0.3,
        domain: Optional[DomainConfig] = None,
    ):
        super().__init__(top_k=top_k)
        self.blend = blend_original_score
        d = domain or GENERIC_DOMAIN
        self._domain_terms: frozenset[str] = frozenset(
            t.lower() for t in d.domain_terms
        )
        # Pick stopword set based on language
        if d.language.lower().startswith("pt"):
            self._stopwords = _STOPWORDS_PT
        else:
            self._stopwords = _STOPWORDS_EN

    def rerank(self, query: str, chunks: list) -> list:
        if not chunks:
            return chunks

        n = len(chunks)
        for i, chunk in enumerate(chunks):
            kw_score = _keyword_score(
                query,
                chunk.text,
                self._domain_terms,
                position=i,
                n_total=n,
                stopwords=self._stopwords,
            )
            chunk.score = (1 - self.blend) * kw_score + self.blend * chunk.score

        chunks.sort(key=lambda c: c.score, reverse=True)

        # Re-normalise scores to 0-1 range
        if chunks:
            max_s = max(c.score for c in chunks)
            min_s = min(c.score for c in chunks)
            rng = max_s - min_s if max_s > min_s else 1.0
            for c in chunks:
                c.score = (c.score - min_s) / rng

        return self._truncate(chunks)


# ---------------------------------------------------------------------------
# Cross-encoder reranker (sentence-transformers, optional)
# ---------------------------------------------------------------------------

class CrossEncoderReranker(BaseReranker):
    """Cross-encoder reranker using ``sentence-transformers``.

    Falls back to :class:`KeywordReranker` if the package is not installed
    or the model fails to load.

    Args:
        model_name: HuggingFace model id.
        top_k: Number of chunks to return after reranking.
        device: PyTorch device string.  ``None`` auto-detects.
        max_length: Maximum token length for the cross-encoder.
        domain: Passed to the :class:`KeywordReranker` fallback.
    """

    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_k: int = 5,
        device: Optional[str] = None,
        max_length: int = 512,
        domain: Optional[DomainConfig] = None,
    ):
        super().__init__(top_k=top_k)
        self.model_name = model_name
        self.device = device
        self.max_length = max_length
        self._domain = domain
        self._model = None
        self._fallback: Optional[KeywordReranker] = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            from sentence_transformers import CrossEncoder  # type: ignore
            kwargs: dict = {"max_length": self.max_length}
            if self.device:
                kwargs["device"] = self.device
            self._model = CrossEncoder(self.model_name, **kwargs)
        except ImportError:
            self._fallback = KeywordReranker(top_k=self.top_k, domain=self._domain)
        except Exception:
            self._fallback = KeywordReranker(top_k=self.top_k, domain=self._domain)

    def rerank(self, query: str, chunks: list) -> list:
        if self._fallback is not None:
            return self._fallback.rerank(query, chunks)

        if not chunks or self._model is None:
            return self._truncate(chunks)

        pairs = [(query, chunk.text[:1000]) for chunk in chunks]

        try:
            scores = self._model.predict(pairs)
        except Exception:
            self._fallback = KeywordReranker(top_k=self.top_k, domain=self._domain)
            return self._fallback.rerank(query, chunks)

        for chunk, score in zip(chunks, scores):
            chunk.score = float(score)

        chunks.sort(key=lambda c: c.score, reverse=True)

        if chunks:
            max_s = max(c.score for c in chunks)
            min_s = min(c.score for c in chunks)
            rng = max_s - min_s if max_s > min_s else 1.0
            for c in chunks:
                c.score = (c.score - min_s) / rng

        return self._truncate(chunks)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_reranker(
    config: dict,
    domain: Optional[DomainConfig] = None,
) -> BaseReranker:
    """Instantiate the appropriate reranker from the pipeline config dict.

    Reads ``config["rag"]["reranker"]``::

        rag:
          reranker:
            enabled: true
            model: "cross-encoder/ms-marco-MiniLM-L-6-v2"
            top_k: 5
            blend_original_score: 0.3

    Args:
        config: Pipeline configuration dict.
        domain: Optional :class:`~core.rag.domain.DomainConfig` forwarded to
                the keyword reranker for domain-term boosting.

    Returns:
        A :class:`KeywordReranker` when reranking is disabled or when
        ``sentence-transformers`` is unavailable; a
        :class:`CrossEncoderReranker` otherwise.
    """
    rag_cfg = config.get("rag", {})
    reranker_cfg = rag_cfg.get("reranker", {})

    enabled = reranker_cfg.get("enabled", False)
    top_k = reranker_cfg.get("top_k", rag_cfg.get("top_k", 5))

    if not enabled:
        return KeywordReranker(top_k=top_k, blend_original_score=1.0, domain=domain)

    model_name = reranker_cfg.get("model", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    device = reranker_cfg.get("device", None)
    max_length = reranker_cfg.get("max_length", 512)
    blend = reranker_cfg.get("blend_original_score", 0.3)

    reranker: BaseReranker = CrossEncoderReranker(
        model_name=model_name,
        top_k=top_k,
        device=device,
        max_length=max_length,
        domain=domain,
    )

    if hasattr(reranker, "_fallback") and reranker._fallback is not None:
        reranker._fallback.blend = blend

    return reranker
