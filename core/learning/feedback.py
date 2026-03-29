"""Paganini AIOS — Closed Learning Loop: Feedback & Skill Scoring.

Components:
    FeedbackCollector — stores 👍/👎 reactions from Telegram interactions
    SkillScorer       — EMA-based quality scores per MetaClaw skill
    LearningReport    — generates summary reports (best/worst skills, failures)

Persistence:
    runtime/learning/feedback.jsonl   — append-only feedback log
    runtime/learning/skill_scores.json — current EMA scores per skill
"""

from __future__ import annotations

import json
import logging
import math
import re
import threading
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger("paganini.learning.feedback")

# EMA smoothing factor α — higher = more responsive to recent feedback
EMA_ALPHA = 0.15

# Skill score threshold below which a skill is flagged for review
SKILL_REVIEW_THRESHOLD = 0.4


# ── Dataclasses ────────────────────────────────────────────────────────────────


@dataclass
class FeedbackEntry:
    """A single feedback record from a Telegram user reaction.

    Attributes:
        query:       The original user query
        response:    The system's response text
        feedback:    "positive" (👍) or "negative" (👎)
        agent_id:    Which agent generated the response
        fund_id:     Fund context
        timestamp:   Unix timestamp
        model_used:  LLM model identifier
        skills_used: List of MetaClaw skill IDs that were injected
        session_id:  Conversation session identifier
        user_id:     Telegram user ID
    """

    query: str
    response: str
    feedback: str  # "positive" | "negative"
    agent_id: str
    fund_id: str
    timestamp: float = field(default_factory=time.time)
    model_used: str = ""
    skills_used: list[str] = field(default_factory=list)
    session_id: str = ""
    user_id: str = ""

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "response": self.response,
            "feedback": self.feedback,
            "agent_id": self.agent_id,
            "fund_id": self.fund_id,
            "timestamp": self.timestamp,
            "model_used": self.model_used,
            "skills_used": self.skills_used,
            "session_id": self.session_id,
            "user_id": self.user_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "FeedbackEntry":
        return cls(
            query=d.get("query", ""),
            response=d.get("response", ""),
            feedback=d.get("feedback", "unknown"),
            agent_id=d.get("agent_id", ""),
            fund_id=d.get("fund_id", ""),
            timestamp=d.get("timestamp", 0.0),
            model_used=d.get("model_used", ""),
            skills_used=d.get("skills_used", []),
            session_id=d.get("session_id", ""),
            user_id=d.get("user_id", ""),
        )


# ── Feedback Collector ────────────────────────────────────────────────────────


class FeedbackCollector:
    """Collects and persists user feedback (👍/👎) from Telegram reactions.

    Thread-safe. Feedback is appended to feedback.jsonl for durability.

    Args:
        runtime_dir: Base runtime directory.
    """

    def __init__(self, runtime_dir: str = "runtime"):
        self._dir = Path(runtime_dir) / "learning"
        self._dir.mkdir(parents=True, exist_ok=True)
        self._feedback_file = self._dir / "feedback.jsonl"
        self._lock = threading.Lock()

    def collect(self, entry: FeedbackEntry) -> None:
        """Append a feedback entry to the log.

        Args:
            entry: FeedbackEntry to persist.
        """
        with self._lock:
            try:
                with self._feedback_file.open("a", encoding="utf-8") as fh:
                    fh.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")
                log.debug(
                    "Feedback recorded: %s for agent=%s query=%.40s",
                    entry.feedback, entry.agent_id, entry.query
                )
            except Exception as exc:
                log.error("FeedbackCollector: write error: %s", exc)

    def collect_from_telegram_reaction(
        self,
        emoji: str,
        original_query: str,
        original_response: str,
        agent_id: str,
        fund_id: str,
        user_id: str,
        skills_used: Optional[list[str]] = None,
        model_used: str = "",
        session_id: str = "",
    ) -> Optional[FeedbackEntry]:
        """Record feedback from a Telegram message reaction emoji.

        Supported positive: 👍 🎉 🔥 ❤️ 🏆
        Supported negative: 👎 😢 😡 🤮

        Args:
            emoji: The reaction emoji string.

        Returns:
            FeedbackEntry if emoji was recognized, else None.
        """
        positive_emojis = {"👍", "🎉", "🔥", "❤️", "🏆", "💯", "🙌"}
        negative_emojis = {"👎", "😢", "😡", "🤮", "💔", "🗑"}

        if emoji in positive_emojis:
            feedback = "positive"
        elif emoji in negative_emojis:
            feedback = "negative"
        else:
            return None

        entry = FeedbackEntry(
            query=original_query,
            response=original_response,
            feedback=feedback,
            agent_id=agent_id,
            fund_id=fund_id,
            user_id=user_id,
            skills_used=skills_used or [],
            model_used=model_used,
            session_id=session_id,
        )
        self.collect(entry)
        return entry

    def load_all(self) -> list[FeedbackEntry]:
        """Load all feedback entries from disk."""
        if not self._feedback_file.exists():
            return []
        entries = []
        with self._lock:
            try:
                for line in self._feedback_file.read_text(encoding="utf-8").splitlines():
                    if line.strip():
                        try:
                            entries.append(FeedbackEntry.from_dict(json.loads(line)))
                        except json.JSONDecodeError:
                            continue
            except Exception as exc:
                log.error("FeedbackCollector: load error: %s", exc)
        return entries

    def count_by_agent(self) -> dict[str, dict[str, int]]:
        """Return {agent_id: {"positive": N, "negative": N}} counts."""
        counts: dict[str, dict[str, int]] = defaultdict(lambda: {"positive": 0, "negative": 0})
        for e in self.load_all():
            counts[e.agent_id][e.feedback] = counts[e.agent_id].get(e.feedback, 0) + 1
        return dict(counts)


# ── Skill Scorer ──────────────────────────────────────────────────────────────


class SkillScorer:
    """Tracks per-skill quality scores using Exponential Moving Average.

    Skills are ranked by the ratio of positive to total feedback.
    EMA smoothing reduces noise from individual data points.
    Skills below SKILL_REVIEW_THRESHOLD are flagged for review.

    Persistence: runtime/learning/skill_scores.json

    Args:
        runtime_dir: Base runtime directory.
        alpha:       EMA smoothing factor (0–1). Higher = more responsive.
    """

    def __init__(self, runtime_dir: str = "runtime", alpha: float = EMA_ALPHA):
        self._dir = Path(runtime_dir) / "learning"
        self._dir.mkdir(parents=True, exist_ok=True)
        self._scores_file = self._dir / "skill_scores.json"
        self._alpha = alpha
        self._lock = threading.Lock()

        # skill_id → {"score": float, "count": int, "positive": int, "negative": int}
        self._scores: dict[str, dict[str, Any]] = {}
        self._load_scores()

    def _load_scores(self) -> None:
        if not self._scores_file.exists():
            return
        try:
            self._scores = json.loads(self._scores_file.read_text(encoding="utf-8"))
        except Exception as exc:
            log.warning("SkillScorer: load error: %s", exc)

    def _save_scores(self) -> None:
        try:
            self._scores_file.write_text(
                json.dumps(self._scores, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception as exc:
            log.error("SkillScorer: save error: %s", exc)

    def update(self, skill_id: str, positive: bool) -> float:
        """Update EMA score for a skill after receiving feedback.

        Args:
            skill_id: MetaClaw skill identifier.
            positive: True for 👍, False for 👎.

        Returns:
            New EMA score (0.0–1.0).
        """
        signal = 1.0 if positive else 0.0
        with self._lock:
            if skill_id not in self._scores:
                self._scores[skill_id] = {
                    "score": 0.5,  # neutral prior
                    "count": 0,
                    "positive": 0,
                    "negative": 0,
                }
            s = self._scores[skill_id]
            # EMA update
            s["score"] = self._alpha * signal + (1 - self._alpha) * s["score"]
            s["count"] += 1
            if positive:
                s["positive"] += 1
            else:
                s["negative"] += 1
            self._save_scores()
            return s["score"]

    def update_from_feedback(self, entry: FeedbackEntry) -> None:
        """Update scores for all skills used in a feedback entry."""
        positive = entry.feedback == "positive"
        for skill_id in entry.skills_used:
            new_score = self.update(skill_id, positive)
            if new_score < SKILL_REVIEW_THRESHOLD:
                log.warning(
                    "SkillScorer: skill '%s' score=%.2f — flagged for review", skill_id, new_score
                )

    def rebuild_from_feedback(self, entries: list[FeedbackEntry]) -> None:
        """Recompute scores from scratch from a list of FeedbackEntry objects."""
        with self._lock:
            self._scores = {}
        for entry in entries:
            positive = entry.feedback == "positive"
            for skill_id in entry.skills_used:
                if skill_id not in self._scores:
                    self._scores[skill_id] = {"score": 0.5, "count": 0, "positive": 0, "negative": 0}
                s = self._scores[skill_id]
                signal = 1.0 if positive else 0.0
                s["score"] = self._alpha * signal + (1 - self._alpha) * s["score"]
                s["count"] += 1
                if positive:
                    s["positive"] += 1
                else:
                    s["negative"] += 1
        with self._lock:
            self._save_scores()

    def get_score(self, skill_id: str) -> float:
        """Return current EMA score for a skill (0.5 if unknown)."""
        return self._scores.get(skill_id, {}).get("score", 0.5)

    def get_all_scores(self) -> dict[str, dict[str, Any]]:
        """Return all skill scores."""
        with self._lock:
            return dict(self._scores)

    def flagged_for_review(self) -> list[str]:
        """Return skill IDs with score below SKILL_REVIEW_THRESHOLD."""
        with self._lock:
            return [
                sid for sid, s in self._scores.items()
                if s["score"] < SKILL_REVIEW_THRESHOLD
            ]

    def top_skills(self, n: int = 5) -> list[tuple[str, float]]:
        """Return top N skills by EMA score."""
        with self._lock:
            ranked = sorted(self._scores.items(), key=lambda x: x[1]["score"], reverse=True)
        return [(sid, s["score"]) for sid, s in ranked[:n]]

    def worst_skills(self, n: int = 5) -> list[tuple[str, float]]:
        """Return bottom N skills by EMA score (min 1 use)."""
        with self._lock:
            ranked = sorted(
                [(sid, s) for sid, s in self._scores.items() if s["count"] >= 1],
                key=lambda x: x[1]["score"],
            )
        return [(sid, s["score"]) for sid, s in ranked[:n]]


# ── Learning Report ────────────────────────────────────────────────────────────


def LearningReport(
    feedback_collector: Optional[FeedbackCollector] = None,
    skill_scorer: Optional[SkillScorer] = None,
    runtime_dir: str = "runtime",
    days: int = 30,
) -> dict[str, Any]:
    """Generate a learning summary report.

    Args:
        feedback_collector: FeedbackCollector instance (or creates one).
        skill_scorer:       SkillScorer instance (or creates one).
        runtime_dir:        Base runtime dir.
        days:               How many days of history to analyze.

    Returns:
        Dict with keys:
            total_feedback, positive_count, negative_count,
            satisfaction_rate, best_skills, worst_skills,
            flagged_skills, top_agents, common_queries,
            common_failures, generated_at
    """
    if feedback_collector is None:
        feedback_collector = FeedbackCollector(runtime_dir)
    if skill_scorer is None:
        skill_scorer = SkillScorer(runtime_dir)

    cutoff = time.time() - days * 86400
    all_entries = [e for e in feedback_collector.load_all() if e.timestamp >= cutoff]

    total = len(all_entries)
    positive = sum(1 for e in all_entries if e.feedback == "positive")
    negative = total - positive
    satisfaction = round(positive / total, 3) if total > 0 else 0.0

    # Top agents by positive rate
    agent_counts: dict[str, dict[str, int]] = defaultdict(lambda: {"pos": 0, "total": 0})
    for e in all_entries:
        agent_counts[e.agent_id]["total"] += 1
        if e.feedback == "positive":
            agent_counts[e.agent_id]["pos"] += 1

    top_agents = sorted(
        [
            (aid, round(c["pos"] / c["total"], 2), c["total"])
            for aid, c in agent_counts.items()
            if c["total"] >= 3
        ],
        key=lambda x: x[1],
        reverse=True,
    )[:5]

    # Common query topics (simple word frequency)
    word_counter: Counter = Counter()
    fail_word_counter: Counter = Counter()
    stop_words = {"de", "do", "da", "o", "a", "que", "e", "em", "no", "na", "com", "por", "para", "um", "uma", "os", "as"}

    for e in all_entries:
        words = [w.lower() for w in re.findall(r"\b\w{4,}\b", e.query) if w.lower() not in stop_words]
        word_counter.update(words)
        if e.feedback == "negative":
            fail_word_counter.update(words)

    return {
        "total_feedback": total,
        "positive_count": positive,
        "negative_count": negative,
        "satisfaction_rate": satisfaction,
        "period_days": days,
        "best_skills": skill_scorer.top_skills(5),
        "worst_skills": skill_scorer.worst_skills(5),
        "flagged_skills": skill_scorer.flagged_for_review(),
        "top_agents": top_agents,
        "common_queries": word_counter.most_common(10),
        "common_failures": fail_word_counter.most_common(10),
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
