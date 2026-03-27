"""Context Compression — reduce retrieved context to fit within a token budget.

Long retrieval results often exceed the LLM's context window or inflate cost.
This module provides three complementary strategies:

1. **Extractive** — score every sentence by relevance to the query using
   TF-IDF-inspired term overlap; keep the top-N sentences.
2. **Map-Reduce** — when a single chunk is very long, split it into sub-chunks,
   summarise each with an optional LLM, then merge the summaries.
3. **Smart Truncation** — cut at a paragraph / sentence boundary rather than
   mid-word, honouring a hard token/character budget.

All strategies are available without an LLM (extractive + truncation are
fully rule-based). Pass ``llm_fn`` only when abstractive quality is required.

Usage::

    from core.rag.compressor import ContextCompressor

    compressor = ContextCompressor(max_tokens=4096)

    # Extractive (no LLM)
    compressed = compressor.compress(chunks, query="O que é subordinação?")

    # Abstractive map-reduce (with LLM)
    compressed = compressor.compress(chunks, query=query, llm_fn=my_llm)
"""

from __future__ import annotations

import re
from typing import Callable, Optional

__all__ = [
    "ContextCompressor",
]

# Approximate chars per token for Portuguese text (conservative estimate)
_CHARS_PER_TOKEN: float = 3.5


def _approx_tokens(text: str) -> int:
    """Rough token count: characters ÷ 3.5."""
    return max(1, int(len(text) / _CHARS_PER_TOKEN))


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences using punctuation heuristics."""
    # Handles common abbreviations that shouldn't be split
    text = re.sub(r"\b(Sr|Sra|Dr|Dra|Prof|Art|Inc|Ltd|etc|vs|p\.ex)\.", r"\1<DOT>", text)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.replace("<DOT>", ".").strip() for s in sentences if s.strip()]


def _split_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs (double newline or single newline + indent)."""
    paragraphs = re.split(r"\n{2,}", text)
    return [p.strip() for p in paragraphs if p.strip()]


def _term_overlap_score(sentence: str, query: str) -> float:
    """Compute TF-IDF-inspired term overlap score between a sentence and the query.

    Uses binary term presence (not frequency) to avoid penalising short sentences.
    Stop-words are stripped to focus on content terms.
    """
    _STOPWORDS = {
        "de", "da", "do", "em", "e", "a", "o", "as", "os", "um", "uma",
        "para", "com", "por", "que", "no", "na", "nos", "nas", "se", "ao",
        "à", "ou", "não", "é", "são", "foi", "foram", "ser", "ter", "como",
        "the", "of", "in", "and", "to", "a", "is", "for", "that", "it",
    }

    def tokenize(t: str) -> set[str]:
        tokens = re.findall(r"[a-záéíóúâêîôûãõçàèìòùñ]+", t.lower())
        return {tok for tok in tokens if len(tok) > 2 and tok not in _STOPWORDS}

    query_terms = tokenize(query)
    if not query_terms:
        return 0.0

    sent_terms = tokenize(sentence)
    if not sent_terms:
        return 0.0

    overlap = query_terms & sent_terms
    return len(overlap) / len(query_terms)


class ContextCompressor:
    """Compress retrieved context to fit within a token budget.

    Args:
        max_tokens: Hard ceiling on the output context (in tokens).
                    Defaults to 4 096. Pass the value from
                    ``config["rag"]["max_context_tokens"]``.
        strategy: One of ``"extractive"`` (default), ``"truncate"``,
                  or ``"map_reduce"``.  The :meth:`compress` method may
                  fall back to truncation when the chosen strategy would
                  still exceed the budget.
        sentence_budget_ratio: Fraction of *max_tokens* to fill when
                               extracting sentences (default 0.95).
    """

    def __init__(
        self,
        max_tokens: int = 4096,
        strategy: str = "extractive",
        sentence_budget_ratio: float = 0.95,
    ):
        self.max_tokens = max_tokens
        self.strategy = strategy
        self.sentence_budget_ratio = sentence_budget_ratio

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def compress(
        self,
        chunks: list,
        query: str,
        llm_fn: Optional[Callable[[str, str], str]] = None,
    ) -> list:
        """Compress a list of chunks to fit within :attr:`max_tokens`.

        Args:
            chunks: Retrieved :class:`~core.rag.pipeline.Chunk` objects.
            query: The user's query (used to score sentence relevance).
            llm_fn: Optional LLM callable for abstractive summarisation in
                    the map-reduce strategy.

        Returns:
            New list of chunks whose total text fits the token budget.
            Chunk objects may be mutated (their ``.text`` is replaced with
            the compressed version).
        """
        if not chunks:
            return chunks

        total = sum(_approx_tokens(c.text) for c in chunks)
        if total <= self.max_tokens:
            return chunks  # already fits — no compression needed

        if self.strategy == "map_reduce":
            return self._map_reduce(chunks, query, llm_fn)
        elif self.strategy == "truncate":
            return self._smart_truncate_chunks(chunks)
        else:
            return self._extractive(chunks, query)

    def compress_text(self, text: str, query: str) -> str:
        """Compress a single text string using extractive sentence scoring.

        Convenience wrapper for callers that deal with raw strings rather
        than :class:`~core.rag.pipeline.Chunk` objects.

        Args:
            text: Raw text to compress.
            query: Reference query for relevance scoring.

        Returns:
            Compressed text string within the token budget.
        """
        budget = int(self.max_tokens * self.sentence_budget_ratio * _CHARS_PER_TOKEN)
        return self._extract_relevant_sentences(text, query, budget)

    # ------------------------------------------------------------------
    # Strategy 1 — Extractive
    # ------------------------------------------------------------------

    def _extractive(self, chunks: list, query: str) -> list:
        """Score every sentence in every chunk; keep top sentences up to budget."""
        budget_chars = int(self.max_tokens * self.sentence_budget_ratio * _CHARS_PER_TOKEN)

        # Score all (chunk, sentence) pairs globally
        scored: list[tuple[float, int, str]] = []  # (score, chunk_idx, sentence)
        for cidx, chunk in enumerate(chunks):
            for sent in _split_sentences(chunk.text):
                score = _term_overlap_score(sent, query) + chunk.score * 0.3
                scored.append((score, cidx, sent))

        # Sort descending by score, greedy fill the budget
        scored.sort(key=lambda x: x[0], reverse=True)

        # Rebuild chunks with only the selected sentences (preserve order)
        chosen: dict[int, list[tuple[int, str]]] = {i: [] for i in range(len(chunks))}
        total_chars = 0
        for score, cidx, sent in scored:
            if total_chars + len(sent) > budget_chars:
                break
            chosen[cidx].append((scored.index((score, cidx, sent)), sent))
            total_chars += len(sent) + 1

        result = []
        for cidx, chunk in enumerate(chunks):
            sents = chosen.get(cidx, [])
            if not sents:
                continue
            # Sort by original position (index in scored list as proxy)
            sents.sort(key=lambda x: x[0])
            compressed_text = " ".join(s for _, s in sents)
            # Mutate a copy-like object (we only update text)
            chunk.text = compressed_text
            result.append(chunk)

        return result if result else self._smart_truncate_chunks(chunks)

    # ------------------------------------------------------------------
    # Strategy 2 — Map-Reduce
    # ------------------------------------------------------------------

    def _map_reduce(
        self,
        chunks: list,
        query: str,
        llm_fn: Optional[Callable[[str, str], str]],
    ) -> list:
        """Summarise each chunk individually, then assemble.

        Falls back to extractive when no LLM is available.
        """
        if llm_fn is None:
            return self._extractive(chunks, query)

        system = (
            "Você é um assistente especializado em fundos de investimento. "
            "Resuma o trecho a seguir preservando fatos, números e termos técnicos relevantes para a pergunta."
        )
        per_chunk_budget = max(200, self.max_tokens // max(len(chunks), 1))
        summarised = []

        for chunk in chunks:
            if _approx_tokens(chunk.text) <= per_chunk_budget:
                summarised.append(chunk)
                continue
            user = (
                f"Pergunta: {query}\n\n"
                f"Trecho (resumir em {per_chunk_budget} tokens ou menos):\n{chunk.text}"
            )
            try:
                summary = llm_fn(system, user)
                chunk.text = summary.strip()
            except Exception:
                # LLM failed — fall back to extractive on this chunk
                chunk.text = self._extract_relevant_sentences(
                    chunk.text, query,
                    per_chunk_budget * int(_CHARS_PER_TOKEN)
                )
            summarised.append(chunk)

        return summarised

    # ------------------------------------------------------------------
    # Strategy 3 — Smart Truncation
    # ------------------------------------------------------------------

    def _smart_truncate_chunks(self, chunks: list) -> list:
        """Truncate chunks proportionally to fit the budget.

        Distributes the token budget proportionally to each chunk's current
        size, then truncates at a paragraph/sentence boundary.
        """
        total_chars = sum(len(c.text) for c in chunks)
        budget_chars = int(self.max_tokens * _CHARS_PER_TOKEN)

        if total_chars <= budget_chars:
            return chunks

        result = []
        for chunk in chunks:
            # Proportion of this chunk relative to total
            ratio = len(chunk.text) / total_chars
            allotted = int(budget_chars * ratio)
            chunk.text = self._smart_truncate_text(chunk.text, allotted)
            result.append(chunk)

        return result

    @staticmethod
    def _smart_truncate_text(text: str, max_chars: int) -> str:
        """Truncate text to ``max_chars`` at a paragraph or sentence boundary."""
        if len(text) <= max_chars:
            return text

        candidate = text[:max_chars]

        # Try to cut at paragraph boundary (double newline)
        para_cut = candidate.rfind("\n\n")
        if para_cut > max_chars * 0.5:
            return candidate[:para_cut].rstrip()

        # Try sentence boundary
        sent_cut = max(candidate.rfind("."), candidate.rfind("!"), candidate.rfind("?"))
        if sent_cut > max_chars * 0.4:
            return candidate[:sent_cut + 1].rstrip()

        # Try single newline
        nl_cut = candidate.rfind("\n")
        if nl_cut > max_chars * 0.4:
            return candidate[:nl_cut].rstrip()

        # Last resort: word boundary
        space_cut = candidate.rfind(" ")
        if space_cut > 0:
            return candidate[:space_cut].rstrip() + "…"

        return candidate.rstrip() + "…"

    @staticmethod
    def _extract_relevant_sentences(text: str, query: str, max_chars: int) -> str:
        """Extract top-scored sentences up to ``max_chars`` characters."""
        sentences = _split_sentences(text)
        if not sentences:
            return text[:max_chars]

        scored = [(sent, _term_overlap_score(sent, query)) for sent in sentences]
        scored.sort(key=lambda x: x[1], reverse=True)

        selected: list[str] = []
        total = 0
        for sent, _ in scored:
            if total + len(sent) + 1 > max_chars:
                break
            selected.append(sent)
            total += len(sent) + 1

        if not selected:
            return ContextCompressor._smart_truncate_text(text, max_chars)

        # Restore reading order (approximate using original index)
        order = {s: i for i, s in enumerate(sentences)}
        selected.sort(key=lambda s: order.get(s, 9999))
        return " ".join(selected)
