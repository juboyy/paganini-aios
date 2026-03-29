"""Paganini AIOS — Cross-Session Full-Text Search.

Implements BM25-style TF-IDF ranking over past conversation history,
allowing agents to recall previous interactions:
    "O que discutimos sobre o fundo Alpha na semana passada?"

Storage:
    runtime/sessions/conversations.jsonl — append-only conversation log

Each entry:
    {session_id, timestamp, query, response, agent_id, fund_id, tokens_used}
"""

from __future__ import annotations

import json
import logging
import math
import re
import threading
import time
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

log = logging.getLogger("paganini.learning.session_search")

# ── Portuguese stopwords ───────────────────────────────────────────────────────
_STOPWORDS = frozenset({
    "a", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles", "aquilo",
    "as", "até", "com", "como", "da", "das", "de", "dela", "delas", "dele",
    "deles", "depois", "do", "dos", "e", "ela", "elas", "ele", "eles", "em",
    "entre", "era", "eram", "essa", "essas", "esse", "esses", "esta", "estas",
    "este", "estes", "eu", "foi", "for", "foram", "há", "isso", "já", "lhe",
    "lhes", "mais", "mas", "me", "mesmo", "meu", "minha", "muito", "na", "nas",
    "não", "no", "nos", "nós", "nossa", "nossas", "nosso", "nossos", "num",
    "numa", "o", "os", "ou", "para", "pela", "pelas", "pelo", "pelos", "por",
    "qual", "quando", "que", "quem", "são", "se", "seja", "ser", "seu", "seus",
    "só", "sua", "suas", "também", "te", "tem", "tendo", "ter", "todo", "todos",
    "uma", "umas", "um", "uns", "você", "vocês",
})

# BM25 parameters
BM25_K1 = 1.5
BM25_B = 0.75


# ── Entry Dataclass ────────────────────────────────────────────────────────────


@dataclass
class ConversationEntry:
    """A stored conversation turn for FTS search.

    Attributes:
        session_id:   Unique session identifier
        timestamp:    Unix timestamp
        query:        User's original query
        response:     System response text
        agent_id:     Responding agent
        fund_id:      Fund context
        tokens_used:  Total tokens consumed
    """

    session_id: str
    timestamp: float
    query: str
    response: str
    agent_id: str = ""
    fund_id: str = ""
    tokens_used: int = 0

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "query": self.query,
            "response": self.response,
            "agent_id": self.agent_id,
            "fund_id": self.fund_id,
            "tokens_used": self.tokens_used,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ConversationEntry":
        return cls(
            session_id=d.get("session_id", ""),
            timestamp=d.get("timestamp", 0.0),
            query=d.get("query", ""),
            response=d.get("response", ""),
            agent_id=d.get("agent_id", ""),
            fund_id=d.get("fund_id", ""),
            tokens_used=d.get("tokens_used", 0),
        )


@dataclass
class SessionHit:
    """A search result with relevance score and snippet.

    Attributes:
        entry:    The matched ConversationEntry
        score:    BM25 relevance score
        snippet:  Relevant excerpt from the query/response
    """

    entry: ConversationEntry
    score: float
    snippet: str = ""

    def to_dict(self) -> dict:
        return {
            "session_id": self.entry.session_id,
            "timestamp": self.entry.timestamp,
            "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.entry.timestamp)),
            "query": self.entry.query,
            "agent_id": self.entry.agent_id,
            "fund_id": self.entry.fund_id,
            "score": round(self.score, 4),
            "snippet": self.snippet,
        }


# ── Tokenizer ─────────────────────────────────────────────────────────────────


def _normalize(text: str) -> str:
    """Normalize text: lowercase, remove accents, strip punctuation."""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")  # strip accents
    text = re.sub(r"[^\w\s]", " ", text)
    return text


def _tokenize(text: str) -> list[str]:
    """Tokenize and filter stopwords."""
    return [
        w for w in _normalize(text).split()
        if len(w) >= 3 and w not in _STOPWORDS
    ]


def _make_snippet(text: str, query_tokens: list[str], window: int = 150) -> str:
    """Extract a snippet containing the most query tokens."""
    text_lower = text.lower()
    best_pos = 0
    best_hits = 0
    for i in range(len(text)):
        hits = sum(1 for t in query_tokens if text_lower[i:i + len(t)] == t)
        if hits > best_hits:
            best_hits = hits
            best_pos = i

    start = max(0, best_pos - 20)
    end = min(len(text), start + window)
    snippet = text[start:end].strip()
    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet = snippet + "…"
    return snippet


# ── BM25 Index ────────────────────────────────────────────────────────────────


class _BM25Index:
    """Lightweight in-memory BM25 index over ConversationEntry objects."""

    def __init__(self, entries: list[ConversationEntry]):
        self._entries = entries
        self._n = len(entries)
        self._avgdl = 0.0
        self._df: dict[str, int] = Counter()
        self._tf: list[dict[str, int]] = []
        self._dl: list[int] = []
        self._build()

    def _build(self) -> None:
        """Build TF and DF structures."""
        for entry in self._entries:
            # Concatenate query + response for full-text search
            doc_text = f"{entry.query} {entry.response}"
            tokens = _tokenize(doc_text)
            tf = Counter(tokens)
            self._tf.append(dict(tf))
            self._dl.append(len(tokens))
            for term in tf:
                self._df[term] += 1

        self._avgdl = sum(self._dl) / max(self._n, 1)

    def score(self, query_tokens: list[str], doc_idx: int) -> float:
        """Compute BM25 score for a document."""
        score = 0.0
        tf_doc = self._tf[doc_idx]
        dl = self._dl[doc_idx]

        for term in query_tokens:
            if term not in tf_doc:
                continue
            tf = tf_doc[term]
            df = self._df.get(term, 0)
            if df == 0:
                continue
            idf = math.log((self._n - df + 0.5) / (df + 0.5) + 1.0)
            tf_norm = (tf * (BM25_K1 + 1)) / (
                tf + BM25_K1 * (1 - BM25_B + BM25_B * dl / max(self._avgdl, 1))
            )
            score += idf * tf_norm

        return score

    def search(
        self,
        query: str,
        fund_id: Optional[str] = None,
        limit: int = 10,
    ) -> list[SessionHit]:
        """Search the index and return ranked results.

        Args:
            query:   Full-text search query.
            fund_id: Optional fund filter.
            limit:   Max results to return.

        Returns:
            List of SessionHit sorted by BM25 score descending.
        """
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        results: list[SessionHit] = []
        for idx, entry in enumerate(self._entries):
            if fund_id and entry.fund_id and entry.fund_id != fund_id:
                continue
            s = self.score(query_tokens, idx)
            if s > 0:
                doc_text = f"{entry.query} {entry.response}"
                snippet = _make_snippet(doc_text, query_tokens)
                results.append(SessionHit(entry=entry, score=s, snippet=snippet))

        results.sort(key=lambda h: h.score, reverse=True)
        return results[:limit]


# ── Session Store ─────────────────────────────────────────────────────────────


class SessionStore:
    """Append-only conversation log with BM25 search.

    Args:
        runtime_dir: Base runtime directory.
    """

    def __init__(self, runtime_dir: str = "runtime"):
        self._dir = Path(runtime_dir) / "sessions"
        self._dir.mkdir(parents=True, exist_ok=True)
        self._log_file = self._dir / "conversations.jsonl"
        self._lock = threading.Lock()
        self._entries: list[ConversationEntry] = []
        self._index: Optional[_BM25Index] = None
        self._dirty = True

        self._load()

    def _load(self) -> None:
        """Load conversation log from disk."""
        if not self._log_file.exists():
            return
        entries = []
        try:
            for line in self._log_file.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    try:
                        entries.append(ConversationEntry.from_dict(json.loads(line)))
                    except json.JSONDecodeError:
                        continue
        except Exception as exc:
            log.warning("SessionStore: load error: %s", exc)
        self._entries = entries
        self._dirty = True
        log.info("SessionStore: loaded %d conversations", len(entries))

    def append(self, entry: ConversationEntry) -> None:
        """Append a conversation turn to the log.

        Args:
            entry: ConversationEntry to persist.
        """
        with self._lock:
            try:
                with self._log_file.open("a", encoding="utf-8") as fh:
                    fh.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")
                self._entries.append(entry)
                self._dirty = True
            except Exception as exc:
                log.error("SessionStore: append error: %s", exc)

    def _get_index(self) -> _BM25Index:
        """Return (possibly rebuilt) BM25 index."""
        if self._dirty or self._index is None:
            self._index = _BM25Index(list(self._entries))
            self._dirty = False
        return self._index

    def search(
        self,
        query: str,
        fund_id: Optional[str] = None,
        limit: int = 10,
    ) -> list[SessionHit]:
        """Full-text search over stored conversations.

        Args:
            query:   Search query in Portuguese (handles stopwords/accents).
            fund_id: Optional fund filter.
            limit:   Maximum number of results.

        Returns:
            List of SessionHit objects ranked by BM25 score.
        """
        with self._lock:
            index = self._get_index()
        return index.search(query, fund_id=fund_id, limit=limit)

    def recent(
        self,
        n: int = 20,
        fund_id: Optional[str] = None,
        agent_id: Optional[str] = None,
    ) -> list[ConversationEntry]:
        """Return the N most recent conversation entries.

        Args:
            n:        Max entries.
            fund_id:  Optional fund filter.
            agent_id: Optional agent filter.
        """
        with self._lock:
            entries = list(self._entries)

        if fund_id:
            entries = [e for e in entries if e.fund_id == fund_id]
        if agent_id:
            entries = [e for e in entries if e.agent_id == agent_id]

        return sorted(entries, key=lambda e: e.timestamp, reverse=True)[:n]

    def stats(self) -> dict:
        """Return summary statistics about the conversation store."""
        with self._lock:
            entries = list(self._entries)

        if not entries:
            return {"total": 0}

        funds: Counter = Counter(e.fund_id for e in entries if e.fund_id)
        agents: Counter = Counter(e.agent_id for e in entries if e.agent_id)
        total_tokens = sum(e.tokens_used for e in entries)
        oldest = min(e.timestamp for e in entries)
        newest = max(e.timestamp for e in entries)

        return {
            "total": len(entries),
            "total_tokens": total_tokens,
            "unique_sessions": len({e.session_id for e in entries}),
            "top_funds": funds.most_common(5),
            "top_agents": agents.most_common(5),
            "oldest": time.strftime("%Y-%m-%d", time.gmtime(oldest)),
            "newest": time.strftime("%Y-%m-%d", time.gmtime(newest)),
        }


# ── Public API ─────────────────────────────────────────────────────────────────

_default_store: Optional[SessionStore] = None
_store_lock = threading.Lock()


def _get_store(runtime_dir: str = "runtime") -> SessionStore:
    """Return (or create) the module-level SessionStore singleton."""
    global _default_store
    with _store_lock:
        if _default_store is None:
            _default_store = SessionStore(runtime_dir)
    return _default_store


def store_conversation(
    session_id: str,
    query: str,
    response: str,
    agent_id: str = "",
    fund_id: str = "",
    tokens_used: int = 0,
    runtime_dir: str = "runtime",
) -> None:
    """Convenience function: store a conversation turn.

    Args:
        session_id:  Unique conversation session ID.
        query:       User's query.
        response:    System response.
        agent_id:    Responding agent ID.
        fund_id:     Fund context.
        tokens_used: Tokens consumed by this turn.
        runtime_dir: Base runtime directory.
    """
    entry = ConversationEntry(
        session_id=session_id,
        timestamp=time.time(),
        query=query,
        response=response,
        agent_id=agent_id,
        fund_id=fund_id,
        tokens_used=tokens_used,
    )
    _get_store(runtime_dir).append(entry)


def search_sessions(
    query: str,
    fund_id: Optional[str] = None,
    limit: int = 10,
    runtime_dir: str = "runtime",
) -> list[SessionHit]:
    """Full-text search over past conversations.

    Used by agents to recall past interactions:
        hits = search_sessions("cessão fidc alpha", fund_id="alpha")

    Args:
        query:   Search query string (Portuguese-aware).
        fund_id: Optional fund_id filter.
        limit:   Max results.
        runtime_dir: Base runtime directory.

    Returns:
        List of SessionHit objects ranked by BM25 relevance.
    """
    return _get_store(runtime_dir).search(query, fund_id=fund_id, limit=limit)
