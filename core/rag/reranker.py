"""Post-Retrieval Reranker — re-score retrieved chunks after RRF fusion.

Three-tier ranking strategy (from best to fallback):

1. **Cross-encoder** — ``sentence-transformers`` cross-encoder model gives the
   most accurate passage-query relevance scores (requires the optional
   ``sentence-transformers`` package and a downloaded model).
2. **Keyword overlap + position** — fast rule-based fallback combining:
   - TF-IDF-inspired query-term coverage in the passage
   - Exact-match bonus for key financial terms
   - Positional bias toward earlier passages
3. **Abstract interface** — ``BaseReranker`` ABC allows plugging in
   ColBERT, PyLate, or any future reranker without changing the pipeline.

The reranker runs *after* RRF fusion and *before* context assembly, so
retrieval diversity is preserved while final ordering is optimised for quality.

Config expected in ``config["rag"]["reranker"]``::

    rag:
      reranker:
        enabled: true
        model: "cross-encoder/ms-marco-MiniLM-L-6-v2"
        top_k: 5

Usage::

    from core.rag.reranker import get_reranker

    reranker = get_reranker(config)
    reranked_chunks = reranker.rerank(query, chunks)
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import Optional

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
    """Abstract base class for all rerankers.

    Subclass this to integrate ColBERT, PyLate, or any custom scorer.
    The only required method is :meth:`rerank`.
    """

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

# Financial domain key terms that receive a bonus when they appear in both
# query and chunk (boosts precision for domain-specific results).
_DOMAIN_BOOST_TERMS: frozenset[str] = frozenset({
    "subordinação", "sênior", "mezanino", "fidc", "fundo",
    "regulamento", "cvm", "anbima", "cedente", "sacado",
    "recebível", "securitização", "inadimplência", "provisão",
    "patrimônio", "cotista", "gestor", "administrador", "custodiante",
    "rating", "spread", "duration", "yield", "taxa", "cota",
})


def _content_tokens(text: str) -> list[str]:
    """Lowercase alphabetic tokens, minus stopwords."""
    raw = re.findall(r"[a-záéíóúâêîôûãõçàèìòùñ]+", text.lower())
    return [t for t in raw if len(t) > 2 and t not in _STOPWORDS_PT]


def _keyword_score(query: str, text: str, position: int = 0, n_total: int = 1) -> float:
    """Compute a composite keyword relevance score.

    Components:
    - **Term coverage**: fraction of unique query terms present in the chunk.
    - **Domain boost**: +0.15 per shared domain term.
    - **Exact phrase bonus**: +0.20 if any 3-gram from query appears verbatim.
    - **Positional bias**: small negative bias for later chunks (earlier = better).
    """
    query_tokens = set(_content_tokens(query))
    if not query_tokens:
        return 0.0

    chunk_tokens = set(_content_tokens(text))

    # Term coverage
    overlap = query_tokens & chunk_tokens
    coverage = len(overlap) / len(query_tokens)

    # Domain boost
    domain_matches = (query_tokens & chunk_tokens) & _DOMAIN_BOOST_TERMS
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
    if n_total > 1:
        pos_penalty = 0.05 * (position / (n_total - 1))
    else:
        pos_penalty = 0.0

    return coverage + domain_bonus + phrase_bonus - pos_penalty


class KeywordReranker(BaseReranker):
    """Fast, dependency-free reranker using keyword overlap + domain signals.

    Suitable as a drop-in fallback when ``sentence-transformers`` is not
    available or when latency must be minimised.

    Args:
        top_k: Maximum number of chunks to return after reranking.
        blend_original_score: Weight (0–1) given to the original retrieval
                              score vs. the new keyword score. ``0.0`` means
                              pure keyword scoring; ``1.0`` keeps original
                              scores unchanged.
    """

    def __init__(self, top_k: int = 5, blend_original_score: float = 0.3):
        super().__init__(top_k=top_k)
        self.blend = blend_original_score

    def rerank(self, query: str, chunks: list) -> list:
        if not chunks:
            return chunks

        n = len(chunks)
        for i, chunk in enumerate(chunks):
            kw_score = _keyword_score(query, chunk.text, position=i, n_total=n)
            # Blend with original (normalised) retrieval score
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

    Loads a cross-encoder model once and caches it for the lifetime of the
    process.  Falls back to :class:`KeywordReranker` if the package is not
    installed or the model fails to load.

    Args:
        model_name: HuggingFace model id.
                    Default: ``"cross-encoder/ms-marco-MiniLM-L-6-v2"``.
        top_k: Number of chunks to return after reranking.
        device: PyTorch device string (``"cpu"``, ``"cuda"``, …).
                ``None`` lets sentence-transformers auto-detect.
        max_length: Maximum token length for the cross-encoder (truncation).
    """

    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_k: int = 5,
        device: Optional[str] = None,
        max_length: int = 512,
    ):
        super().__init__(top_k=top_k)
        self.model_name = model_name
        self.device = device
        self.max_length = max_length
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
            self._fallback = KeywordReranker(top_k=self.top_k)
        except Exception:
            self._fallback = KeywordReranker(top_k=self.top_k)

    def rerank(self, query: str, chunks: list) -> list:
        if self._fallback is not None:
            return self._fallback.rerank(query, chunks)

        if not chunks or self._model is None:
            return self._truncate(chunks)

        pairs = [(query, chunk.text[:1000]) for chunk in chunks]

        try:
            scores = self._model.predict(pairs)
        except Exception:
            # Model inference failed at runtime — degrade gracefully
            self._fallback = KeywordReranker(top_k=self.top_k)
            return self._fallback.rerank(query, chunks)

        for chunk, score in zip(chunks, scores):
            chunk.score = float(score)

        chunks.sort(key=lambda c: c.score, reverse=True)

        # Re-normalise cross-encoder raw logits to 0-1
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

def get_reranker(config: dict) -> BaseReranker:
    """Instantiate the appropriate reranker from the pipeline config dict.

    Reads ``config["rag"]["reranker"]``::

        rag:
          reranker:
            enabled: true
            model: "cross-encoder/ms-marco-MiniLM-L-6-v2"
            top_k: 5
            blend_original_score: 0.3   # only for keyword fallback

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
        # Disabled — return a no-op keyword reranker (blend=1.0 keeps original scores)
        return KeywordReranker(top_k=top_k, blend_original_score=1.0)

    model_name = reranker_cfg.get("model", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    device = reranker_cfg.get("device", None)
    max_length = reranker_cfg.get("max_length", 512)
    blend = reranker_cfg.get("blend_original_score", 0.3)

    # Try cross-encoder first; it self-degrades if sentence-transformers is missing
    reranker: BaseReranker = CrossEncoderReranker(
        model_name=model_name,
        top_k=top_k,
        device=device,
        max_length=max_length,
    )

    # If the cross-encoder fell back internally, patch its top_k anyway
    if hasattr(reranker, "_fallback") and reranker._fallback is not None:
        reranker._fallback.blend = blend

    return reranker
