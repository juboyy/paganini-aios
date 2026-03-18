from __future__ import annotations

import hashlib
import json
import time
import uuid
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _keyword_match(text: str, query: str) -> bool:
    """Simple case-insensitive keyword matching."""
    q = query.lower()
    t = text.lower()
    return any(word in t for word in q.split())


def _score(text: str, query: str) -> int:
    """Count how many query words appear in text (for ranking)."""
    q = query.lower()
    t = text.lower()
    return sum(1 for word in q.split() if word in t)


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# 1. EpisodicMemory — Short-term, per-session interaction history
# ---------------------------------------------------------------------------


class EpisodicMemory:
    """Short-term interaction history (in-memory + JSONL file)."""

    def __init__(self, state_dir: Path) -> None:
        self._dir = state_dir
        _ensure_dir(self._dir)
        self._file = self._dir / "episodic.jsonl"
        self._records: list[dict] = []
        self._load()

    def _load(self) -> None:
        if self._file.exists():
            with open(self._file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            self._records.append(json.loads(line))
                        except json.JSONDecodeError:
                            pass

    def add(
        self,
        query: str,
        response: str,
        chunks: list[str] | None = None,
        confidence: float = 1.0,
        agent: str = "unknown",
        timestamp: float | None = None,
    ) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "query": query,
            "response": response,
            "chunks": [
                str(c) if not isinstance(c, (str, dict)) else c for c in (chunks or [])
            ],
            "confidence": confidence,
            "agent": agent,
            "timestamp": timestamp if timestamp is not None else time.time(),
        }
        self._records.append(record)
        with open(self._file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        return record

    def get_recent(self, n: int = 10) -> list[dict]:
        return self._records[-n:]

    def search(self, query: str, limit: int = 5) -> list[dict]:
        scored = [
            (r, _score(r["query"] + " " + r["response"], query))
            for r in self._records
            if _keyword_match(r["query"] + " " + r["response"], query)
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [r for r, _ in scored[:limit]]

    def count(self) -> int:
        return len(self._records)


# ---------------------------------------------------------------------------
# 2. SemanticMemory — Long-term factual knowledge
# ---------------------------------------------------------------------------


class SemanticMemory:
    """Long-term factual knowledge extracted from interactions."""

    def __init__(self, state_dir: Path) -> None:
        self._dir = state_dir
        _ensure_dir(self._dir)
        self._file = self._dir / "semantic.json"
        self._facts: dict[str, dict] = {}  # hash -> fact record
        self._load()

    def _load(self) -> None:
        if self._file.exists():
            with open(self._file, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    self._facts = data if isinstance(data, dict) else {}
                except json.JSONDecodeError:
                    self._facts = {}

    def _save(self) -> None:
        with open(self._file, "w", encoding="utf-8") as f:
            json.dump(self._facts, f, ensure_ascii=False, indent=2)

    def add(
        self,
        fact: str,
        source: str = "unknown",
        confidence: float = 1.0,
        category: str = "general",
    ) -> dict:
        h = _content_hash(fact)
        if h in self._facts:
            # already exists — update confidence if higher
            if confidence > self._facts[h]["confidence"]:
                self._facts[h]["confidence"] = confidence
                self._save()
            return self._facts[h]

        record = {
            "id": str(uuid.uuid4()),
            "hash": h,
            "fact": fact,
            "source": source,
            "confidence": confidence,
            "category": category,
            "timestamp": time.time(),
        }
        self._facts[h] = record
        self._save()
        return record

    def search(self, query: str, limit: int = 5) -> list[dict]:
        scored = [
            (r, _score(r["fact"], query))
            for r in self._facts.values()
            if _keyword_match(r["fact"], query)
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [r for r, _ in scored[:limit]]

    def get_by_category(self, category: str) -> list[dict]:
        return [r for r in self._facts.values() if r["category"] == category]

    def count(self) -> int:
        return len(self._facts)


# ---------------------------------------------------------------------------
# 3. ProceduralMemory — Learned procedures/patterns
# ---------------------------------------------------------------------------


class ProceduralMemory:
    """Learned procedures and patterns (links to MetaClaw skills)."""

    def __init__(self, state_dir: Path) -> None:
        self._dir = state_dir
        _ensure_dir(self._dir)
        self._file = self._dir / "procedural.json"
        self._procedures: dict[str, dict] = {}  # id -> procedure record
        self._load()

    def _load(self) -> None:
        if self._file.exists():
            with open(self._file, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    self._procedures = data if isinstance(data, dict) else {}
                except json.JSONDecodeError:
                    self._procedures = {}

    def _save(self) -> None:
        with open(self._file, "w", encoding="utf-8") as f:
            json.dump(self._procedures, f, ensure_ascii=False, indent=2)

    def add(
        self,
        pattern: str,
        procedure: str,
        success_rate: float = 1.0,
        uses: int = 0,
    ) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "pattern": pattern,
            "procedure": procedure,
            "success_rate": success_rate,
            "uses": uses,
            "timestamp": time.time(),
        }
        self._procedures[record["id"]] = record
        self._save()
        return record

    def match(self, query: str) -> Optional[dict]:
        """Find the best matching procedure for a query."""
        scored = [
            (r, _score(r["pattern"], query))
            for r in self._procedures.values()
            if _keyword_match(r["pattern"], query)
        ]
        if not scored:
            return None
        scored.sort(key=lambda x: (x[1], x[0]["success_rate"]), reverse=True)
        return scored[0][0]

    def update_success(self, pattern_id: str, success: bool) -> bool:
        """Update the success rate for a procedure using exponential moving avg."""
        if pattern_id not in self._procedures:
            return False
        rec = self._procedures[pattern_id]
        rec["uses"] += 1
        alpha = 0.1  # learning rate
        rec["success_rate"] = (1 - alpha) * rec["success_rate"] + alpha * (
            1.0 if success else 0.0
        )
        self._save()
        return True

    def count(self) -> int:
        return len(self._procedures)


# ---------------------------------------------------------------------------
# 4. RelationalMemory — Entity relationships (links to Knowledge Graph)
# ---------------------------------------------------------------------------


class RelationalMemory:
    """Entity relationships — links to the Knowledge Graph."""

    def __init__(self, state_dir: Path) -> None:
        self._dir = state_dir
        _ensure_dir(self._dir)
        self._file = self._dir / "relational.json"
        self._relations: list[dict] = []
        self._load()

    def _load(self) -> None:
        if self._file.exists():
            with open(self._file, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    self._relations = data if isinstance(data, list) else []
                except json.JSONDecodeError:
                    self._relations = []

    def _save(self) -> None:
        with open(self._file, "w", encoding="utf-8") as f:
            json.dump(self._relations, f, ensure_ascii=False, indent=2)

    def add(
        self,
        entity_a: str,
        relation: str,
        entity_b: str,
        confidence: float = 1.0,
    ) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "entity_a": entity_a,
            "relation": relation,
            "entity_b": entity_b,
            "confidence": confidence,
            "timestamp": time.time(),
        }
        self._relations.append(record)
        self._save()
        return record

    def get_relations(
        self, entity: str, relation_type: Optional[str] = None
    ) -> list[dict]:
        results = [
            r
            for r in self._relations
            if r["entity_a"].lower() == entity.lower()
            or r["entity_b"].lower() == entity.lower()
        ]
        if relation_type:
            results = [r for r in results if r["relation"] == relation_type]
        return results

    def search(self, query: str) -> list[dict]:
        return [
            r
            for r in self._relations
            if _keyword_match(f"{r['entity_a']} {r['relation']} {r['entity_b']}", query)
        ]

    def count(self) -> int:
        return len(self._relations)


# ---------------------------------------------------------------------------
# 5. MemoryManager — Unified interface
# ---------------------------------------------------------------------------


class MemoryManager:
    """
    Unified memory interface across all 4 layers.

    Config keys:
        state_dir  (str): base directory for persistence files.
                          Defaults to "runtime/state".
        fund_id    (str): partition key for Chinese walls (each fund gets
                          its own subdirectory).  Defaults to "default".
    """

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        cfg = config or {}
        base = Path(cfg.get("state_dir", "runtime/state"))
        fund_id = cfg.get("fund_id", "default")
        self._state_dir = base / fund_id

        self._episodic = EpisodicMemory(self._state_dir)
        self._semantic = SemanticMemory(self._state_dir)
        self._procedural = ProceduralMemory(self._state_dir)
        self._relational = RelationalMemory(self._state_dir)

    # ------------------------------------------------------------------
    # Layer accessors
    # ------------------------------------------------------------------

    @property
    def episodic(self) -> EpisodicMemory:
        return self._episodic

    @property
    def semantic(self) -> SemanticMemory:
        return self._semantic

    @property
    def procedural(self) -> ProceduralMemory:
        return self._procedural

    @property
    def relational(self) -> RelationalMemory:
        return self._relational

    # ------------------------------------------------------------------
    # High-level operations
    # ------------------------------------------------------------------

    def record_interaction(
        self,
        query: str,
        response: str,
        chunks: list[str] | None = None,
        confidence: float = 1.0,
        agent: str = "unknown",
    ) -> dict:
        """
        Store interaction in episodic memory and auto-extract facts to semantic.
        Returns the episodic record.
        """
        record = self._episodic.add(
            query=query,
            response=response,
            chunks=chunks,
            confidence=confidence,
            agent=agent,
        )
        # Simple extraction: treat the response as a fact if confidence >= 0.7
        if confidence >= 0.7 and response.strip():
            self._semantic.add(
                fact=response.strip()[:500],  # cap to 500 chars
                source=f"interaction:{record['id']}",
                confidence=confidence,
                category="interaction",
            )
        return record

    def recall(self, query: str, limit: int = 10) -> dict[str, list[dict]]:
        """Search ALL memory layers and return results keyed by layer name."""
        return {
            "episodic": self._episodic.search(query, limit=limit),
            "semantic": self._semantic.search(query, limit=limit),
            "procedural": (
                [self._procedural.match(query)] if self._procedural.match(query) else []
            ),
            "relational": self._relational.search(query)[:limit],
        }

    def promote_episodic_to_semantic(self) -> int:
        """
        Daemon-callable: review episodic records and promote high-confidence
        responses as semantic facts.  Returns number of facts promoted.
        """
        promoted = 0
        for record in self._episodic.get_recent(n=50):
            if record.get("confidence", 0) >= 0.8 and record.get("response"):
                result = self._semantic.add(
                    fact=record["response"].strip()[:500],
                    source=f"episodic:{record['id']}",
                    confidence=record["confidence"],
                    category="promoted",
                )
                # count only newly added (not updated existing)
                if result.get("source", "").startswith("episodic:"):
                    promoted += 1
        return promoted

    def stats(self) -> dict[str, int]:
        """Return record counts per layer."""
        return {
            "episodic": self._episodic.count(),
            "semantic": self._semantic.count(),
            "procedural": self._procedural.count(),
            "relational": self._relational.count(),
        }

    def status(self) -> dict[str, Any]:
        """Health check — verifies state directory and layer file accessibility."""
        checks: dict[str, Any] = {
            "state_dir": str(self._state_dir),
            "state_dir_exists": self._state_dir.exists(),
            "layers": {},
        }
        for name, path in [
            ("episodic", self._state_dir / "episodic.jsonl"),
            ("semantic", self._state_dir / "semantic.json"),
            ("procedural", self._state_dir / "procedural.json"),
            ("relational", self._state_dir / "relational.json"),
        ]:
            checks["layers"][name] = {
                "file": str(path),
                "exists": path.exists(),
                "size_bytes": path.stat().st_size if path.exists() else 0,
            }
        checks["counts"] = self.stats()
        checks["healthy"] = checks["state_dir_exists"]
        return checks
