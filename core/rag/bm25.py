"""BM25 sparse retrieval engine for PAGANINI RAG.

Pure Python implementation of BM25Okapi with Portuguese-aware tokenization
and JSON persistence.
"""

import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Optional


# ── Portuguese (Brazilian) stopwords ──────────────────────────────────────────
_PT_STOPWORDS = frozenset({
    "a", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles", "aquilo",
    "as", "até", "com", "como", "da", "das", "de", "dela", "delas", "dele",
    "deles", "depois", "do", "dos", "e", "ela", "elas", "ele", "eles", "em",
    "entre", "era", "essa", "essas", "esse", "esses", "esta", "estas", "este",
    "estes", "eu", "foi", "for", "foram", "há", "isso", "isto", "já", "lhe",
    "lhes", "mais", "mas", "me", "mesmo", "meu", "meus", "minha", "minhas",
    "muito", "na", "nas", "nem", "no", "nos", "nós", "não", "num", "numa",
    "o", "os", "ou", "outro", "para", "pelo", "pela", "pelos", "pelas",
    "por", "qual", "quando", "que", "quem", "que", "se", "sem", "seu",
    "seus", "sua", "suas", "são", "também", "te", "tem", "tendo", "ter",
    "toda", "todas", "todo", "todos", "tua", "tuas", "teu", "teus", "uma",
    "umas", "um", "uns", "você", "vocês", "vos", "à", "às", "nele", "nela",
    "neles", "nelas", "deste", "desta", "desses", "dessas", "aquele",
    "daquele", "daquela", "daqueles", "daquelas", "isso", "nesse", "nessa",
    "nisso", "nisto", "aqui", "ali", "lá", "aí", "onde", "quando", "como",
    "porque", "pois", "então", "portanto", "porém", "contudo", "todavia",
    "entretanto", "ainda", "já", "logo", "depois", "antes", "agora",
    "ser", "estar", "ter", "haver", "ir", "vir", "fazer", "poder", "querer",
    "saber", "dever", "precisar", "sobre", "entre", "contra", "durante",
    "desde", "até", "após", "ante", "perante", "conforme", "segundo",
    "mediante", "exceto", "salvo", "inclusive", "além",
})


def _strip_accents(text: str) -> str:
    """Remove diacritics from text."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _tokenize(text: str) -> list[str]:
    """Lowercase, strip accents, split on non-alphanumeric, remove stopwords."""
    text = text.lower()
    text = _strip_accents(text)
    tokens = re.findall(r"[a-z0-9]+", text)
    return [t for t in tokens if t not in _PT_STOPWORDS and len(t) > 1]


# ── BM25 Index ─────────────────────────────────────────────────────────────────

class BM25Index:
    """BM25Okapi sparse retrieval index with Portuguese-aware tokenization.

    Parameters
    ----------
    index_path : str | Path
        Path to the JSON persistence file. Pass ``None`` to disable persistence.
    k1 : float
        Term-frequency saturation parameter (default 1.5).
    b : float
        Length normalisation parameter (default 0.75).
    """

    def __init__(
        self,
        index_path: Optional[str | Path] = None,
        k1: float = 1.5,
        b: float = 0.75,
    ):
        self.index_path = Path(index_path) if index_path else None
        self.k1 = k1
        self.b = b

        # Core data structures
        self._ids: list[str] = []
        self._metadatas: list[dict] = []
        self._doc_lengths: list[int] = []          # token counts per doc
        self._avg_dl: float = 0.0
        self._df: dict[str, int] = {}              # term → doc-frequency
        self._tf: list[dict[str, int]] = []        # per-doc term frequencies

        self._loaded = False

        if self.index_path and self.index_path.exists():
            self._load()

    # ── Public API ─────────────────────────────────────────────────────────────

    def index(
        self,
        documents: list[str],
        ids: list[str],
        metadatas: list[dict],
    ) -> None:
        """Add (or replace) documents in the index.

        Existing documents with the same id are replaced; new ones are appended.
        After indexing, the updated index is persisted to disk.
        """
        if not (len(documents) == len(ids) == len(metadatas)):
            raise ValueError("documents, ids, and metadatas must have the same length")

        # Build an id → position map for fast duplicate detection
        existing_id_map: dict[str, int] = {doc_id: i for i, doc_id in enumerate(self._ids)}

        for doc, doc_id, meta in zip(documents, ids, metadatas):
            tokens = _tokenize(doc)
            tf: dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1

            if doc_id in existing_id_map:
                # Replace in-place — undo old DF contributions first
                pos = existing_id_map[doc_id]
                old_tf = self._tf[pos]
                for term in old_tf:
                    self._df[term] = self._df.get(term, 1) - 1
                    if self._df[term] <= 0:
                        del self._df[term]

                self._tf[pos] = tf
                self._doc_lengths[pos] = len(tokens)
                self._metadatas[pos] = meta
            else:
                pos = len(self._ids)
                self._ids.append(doc_id)
                self._tf.append(tf)
                self._doc_lengths.append(len(tokens))
                self._metadatas.append(meta)
                existing_id_map[doc_id] = pos

            for term in tf:
                self._df[term] = self._df.get(term, 0) + 1

        n = len(self._ids)
        self._avg_dl = sum(self._doc_lengths) / n if n else 0.0

        if self.index_path:
            self._save()

    def search(self, query: str, top_k: int = 10) -> list[dict]:
        """Return top-k results for *query*.

        Each result is a dict with keys: ``id``, ``score``, ``metadata``.
        """
        if not self._ids:
            if self.index_path and self.index_path.exists() and not self._loaded:
                self._load()
            if not self._ids:
                return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        n = len(self._ids)
        scores = [0.0] * n

        for term in set(query_tokens):
            df = self._df.get(term, 0)
            if df == 0:
                continue

            # IDF — Robertson / Sparck Jones variant (no negatives)
            idf = math.log((n - df + 0.5) / (df + 0.5) + 1.0)

            for i, tf_map in enumerate(self._tf):
                tf = tf_map.get(term, 0)
                if tf == 0:
                    continue
                dl = self._doc_lengths[i]
                norm = self.k1 * (1 - self.b + self.b * dl / self._avg_dl) if self._avg_dl else 1.0
                scores[i] += idf * (tf * (self.k1 + 1)) / (tf + norm)

        # Gather non-zero and sort
        ranked = sorted(
            ((i, s) for i, s in enumerate(scores) if s > 0),
            key=lambda x: x[1],
            reverse=True,
        )

        results = []
        for i, score in ranked[:top_k]:
            results.append({
                "id": self._ids[i],
                "score": score,
                "metadata": self._metadatas[i],
            })
        return results

    def __len__(self) -> int:
        return len(self._ids)

    # ── Persistence ────────────────────────────────────────────────────────────

    def _save(self) -> None:
        assert self.index_path is not None
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "k1": self.k1,
            "b": self.b,
            "ids": self._ids,
            "metadatas": self._metadatas,
            "doc_lengths": self._doc_lengths,
            "avg_dl": self._avg_dl,
            "df": self._df,
            "tf": self._tf,
        }
        tmp = self.index_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.index_path)

    def _load(self) -> None:
        assert self.index_path is not None
        try:
            payload = json.loads(self.index_path.read_text(encoding="utf-8"))
            self.k1 = payload.get("k1", self.k1)
            self.b = payload.get("b", self.b)
            self._ids = payload.get("ids", [])
            self._metadatas = payload.get("metadatas", [])
            self._doc_lengths = payload.get("doc_lengths", [])
            self._avg_dl = payload.get("avg_dl", 0.0)
            self._df = payload.get("df", {})
            self._tf = payload.get("tf", [])
            self._loaded = True
        except Exception as exc:
            # Corrupt or missing — start fresh
            self._loaded = False
            raise RuntimeError(f"Failed to load BM25 index from {self.index_path}: {exc}") from exc
