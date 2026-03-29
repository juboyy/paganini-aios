"""Paganini AIOS — Dialectic User Modeling.

Tracks per-user interaction patterns and builds evolving profiles
to personalize agent responses (technical vs simplified, verbose vs concise).

Each interaction refines the model dialectically — reconciling new data
with existing beliefs rather than replacing them wholesale.

Persistence:
    runtime/users/{user_id}.json — one file per user
"""

from __future__ import annotations

import json
import logging
import math
import re
import threading
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger("paganini.learning.user_model")

# Expertise classification thresholds
EXPERTISE_THRESHOLDS = {
    "novice": 0.2,
    "intermediate": 0.5,
    "advanced": 0.75,
    "expert": 1.0,
}

# How much a single interaction updates expertise_score (EMA weight)
EXPERTISE_EMA_ALPHA = 0.1

# Response style constants
STYLES = {"brief", "detailed", "technical", "narrative", "structured"}

# Typical business hours (UTC) for Brazilian ops (UTC-3)
_BR_BUSINESS_START = 9   # 09:00 BRT = 12:00 UTC
_BR_BUSINESS_END = 21    # 21:00 BRT = 00:00 UTC


# ── UserProfile Dataclass ──────────────────────────────────────────────────────


@dataclass
class UserProfile:
    """Evolving model of a Telegram user's interaction patterns.

    Attributes:
        user_id:              Telegram user ID (string key)
        username:             Telegram @username (if available)
        first_name:           Telegram display name
        preferred_language:   "pt-BR" | "en" | auto-detected
        expertise_level:      "novice" | "intermediate" | "advanced" | "expert"
        expertise_score:      Continuous score 0.0–1.0 (drives expertise_level)
        common_queries:       Top query terms (Counter serialized)
        interaction_style:    Preferred response style
        funds_accessed:       Set of fund_ids this user has queried
        typical_hours:        UTC hours when user is active (list of ints)
        response_preferences: Dict of misc preferences
        interaction_count:    Total number of interactions
        positive_feedback:    Positive reaction count
        negative_feedback:    Negative reaction count
        created_at:           First seen timestamp
        updated_at:           Last update timestamp
    """

    user_id: str
    username: str = ""
    first_name: str = ""
    preferred_language: str = "pt-BR"
    expertise_level: str = "novice"
    expertise_score: float = 0.3  # start slightly above zero (they found this product)
    common_queries: dict[str, int] = field(default_factory=dict)
    interaction_style: str = "detailed"
    funds_accessed: list[str] = field(default_factory=list)
    typical_hours: list[int] = field(default_factory=list)
    response_preferences: dict[str, Any] = field(default_factory=dict)
    interaction_count: int = 0
    positive_feedback: int = 0
    negative_feedback: int = 0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "first_name": self.first_name,
            "preferred_language": self.preferred_language,
            "expertise_level": self.expertise_level,
            "expertise_score": self.expertise_score,
            "common_queries": self.common_queries,
            "interaction_style": self.interaction_style,
            "funds_accessed": sorted(set(self.funds_accessed)),
            "typical_hours": sorted(set(self.typical_hours)),
            "response_preferences": self.response_preferences,
            "interaction_count": self.interaction_count,
            "positive_feedback": self.positive_feedback,
            "negative_feedback": self.negative_feedback,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "UserProfile":
        return cls(
            user_id=str(d["user_id"]),
            username=d.get("username", ""),
            first_name=d.get("first_name", ""),
            preferred_language=d.get("preferred_language", "pt-BR"),
            expertise_level=d.get("expertise_level", "novice"),
            expertise_score=d.get("expertise_score", 0.3),
            common_queries=d.get("common_queries", {}),
            interaction_style=d.get("interaction_style", "detailed"),
            funds_accessed=d.get("funds_accessed", []),
            typical_hours=d.get("typical_hours", []),
            response_preferences=d.get("response_preferences", {}),
            interaction_count=d.get("interaction_count", 0),
            positive_feedback=d.get("positive_feedback", 0),
            negative_feedback=d.get("negative_feedback", 0),
            created_at=d.get("created_at", time.time()),
            updated_at=d.get("updated_at", time.time()),
        )


# ── Expertise Classifier ───────────────────────────────────────────────────────

# Technical vocabulary signals advanced expertise
_TECHNICAL_TERMS = frozenset({
    "fidc", "cessão", "subordinação", "cota", "covenant", "tir", "duration",
    "convexidade", "spread", "debenture", "securitização", "patrimônio líquido",
    "nav", "cdi", "selic", "ipca", "duration", "risco crédito", "pld", "aml",
    "cvm", "bacen", "anbima", "custodiante", "administrador", "gestora",
    "cedente", "sacado", "haircut", "subordinação júnior", "sênior",
    "razão de garantia", "índice de cobertura", "prazo médio ponderado",
    "taxa interna de retorno", "mark to market", "mtm", "stress test",
    "inadimplência", "provisão", "fpu", "cotas seniores", "cotas subordinadas",
})

_NOVICE_PATTERNS = re.compile(
    r"\b(o que é|como funciona|me explica|o que são|qual a diferença|"
    r"quero entender|não entendo|pode me dizer)\b",
    re.IGNORECASE,
)


def _score_expertise_signal(query: str) -> float:
    """Return expertise signal for a query: 0=novice, 1=expert."""
    query_lower = query.lower()
    words = set(re.findall(r"\b\w+\b", query_lower))

    # Technical vocabulary hits
    tech_hits = len(words & _TECHNICAL_TERMS)

    # Novice pattern (asking for explanation)
    is_novice = bool(_NOVICE_PATTERNS.search(query))

    # Score: tech density - novice penalty
    signal = min(1.0, tech_hits / 3.0) - (0.2 if is_novice else 0.0)
    return max(0.0, signal)


def _level_from_score(score: float) -> str:
    """Map expertise score to level label."""
    if score < 0.2:
        return "novice"
    elif score < 0.5:
        return "intermediate"
    elif score < 0.75:
        return "advanced"
    else:
        return "expert"


# ── Language Detector ─────────────────────────────────────────────────────────


def _detect_language(text: str) -> str:
    """Rudimentary language detection: pt-BR vs en."""
    pt_markers = re.findall(r"\b(de|da|do|em|para|com|não|que|uma|isso)\b", text.lower())
    en_markers = re.findall(r"\b(the|is|are|what|how|where|when|fund|risk)\b", text.lower())
    if len(en_markers) > len(pt_markers):
        return "en"
    return "pt-BR"


# ── User Model Manager ────────────────────────────────────────────────────────


class UserModelManager:
    """Manages per-user profile persistence and dialectic updates.

    Args:
        runtime_dir: Base runtime directory (profiles stored in {dir}/users/).
    """

    def __init__(self, runtime_dir: str = "runtime"):
        self._dir = Path(runtime_dir) / "users"
        self._dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        # In-memory cache to avoid repeated disk reads
        self._cache: dict[str, UserProfile] = {}

    def _path(self, user_id: str) -> Path:
        return self._dir / f"{user_id}.json"

    def load(self, user_id: str) -> UserProfile:
        """Load profile from cache or disk; create new if first time.

        Args:
            user_id: Telegram user ID (as string).

        Returns:
            UserProfile (new or existing).
        """
        uid = str(user_id)
        with self._lock:
            if uid in self._cache:
                return self._cache[uid]

        p = self._path(uid)
        if p.exists():
            try:
                profile = UserProfile.from_dict(json.loads(p.read_text(encoding="utf-8")))
                with self._lock:
                    self._cache[uid] = profile
                return profile
            except Exception as exc:
                log.warning("UserModel: load error for %s: %s", uid, exc)

        # New user
        profile = UserProfile(user_id=uid)
        with self._lock:
            self._cache[uid] = profile
        return profile

    def save(self, profile: UserProfile) -> None:
        """Persist a profile to disk.

        Args:
            profile: The UserProfile to save.
        """
        profile.updated_at = time.time()
        p = self._path(profile.user_id)
        try:
            p.write_text(
                json.dumps(profile.to_dict(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            with self._lock:
                self._cache[profile.user_id] = profile
        except Exception as exc:
            log.error("UserModel: save error for %s: %s", profile.user_id, exc)

    def update_from_interaction(
        self,
        user_id: str,
        query: str,
        response: str,
        fund_id: str = "",
        username: str = "",
        first_name: str = "",
    ) -> UserProfile:
        """Dialectically update a user's profile from a new interaction.

        Updates:
        - expertise_score (EMA from query complexity signal)
        - expertise_level (derived from score)
        - common_queries (query term frequency)
        - preferred_language (auto-detected)
        - funds_accessed (add if new)
        - typical_hours (current UTC hour)
        - interaction_count

        Args:
            user_id:    Telegram user ID.
            query:      User's query text.
            response:   System's response.
            fund_id:    Fund context.
            username:   Telegram @username.
            first_name: Display name.

        Returns:
            Updated UserProfile.
        """
        profile = self.load(str(user_id))

        # Basic metadata
        if username:
            profile.username = username
        if first_name:
            profile.first_name = first_name

        # Expertise: EMA update
        signal = _score_expertise_signal(query)
        profile.expertise_score = (
            EXPERTISE_EMA_ALPHA * signal
            + (1 - EXPERTISE_EMA_ALPHA) * profile.expertise_score
        )
        profile.expertise_level = _level_from_score(profile.expertise_score)

        # Language detection
        lang = _detect_language(query)
        if lang != profile.preferred_language:
            # Soft update: only switch if consistently different
            prefs = profile.response_preferences
            prefs["lang_signals"] = prefs.get("lang_signals", {})
            prefs["lang_signals"][lang] = prefs["lang_signals"].get(lang, 0) + 1
            if prefs["lang_signals"].get(lang, 0) >= 3:
                profile.preferred_language = lang

        # Query term frequency
        words = [
            w.lower() for w in re.findall(r"\b\w{4,}\b", query)
            if w.lower() not in {"como", "qual", "quando", "onde", "quem"}
        ]
        for w in words:
            profile.common_queries[w] = profile.common_queries.get(w, 0) + 1

        # Prune to top 100 terms
        if len(profile.common_queries) > 100:
            top = sorted(profile.common_queries.items(), key=lambda x: x[1], reverse=True)[:100]
            profile.common_queries = dict(top)

        # Fund access
        if fund_id and fund_id not in profile.funds_accessed:
            profile.funds_accessed.append(fund_id)

        # Active hour tracking
        hour = time.gmtime().tm_hour
        if hour not in profile.typical_hours:
            profile.typical_hours.append(hour)
            if len(profile.typical_hours) > 48:
                # Keep most recent 48 hour samples
                profile.typical_hours = profile.typical_hours[-48:]

        # Interaction style inference
        # Experts prefer structured/technical responses; novices prefer detailed explanations
        style_map = {
            "novice": "detailed",
            "intermediate": "detailed",
            "advanced": "structured",
            "expert": "technical",
        }
        profile.interaction_style = style_map.get(profile.expertise_level, "detailed")

        # Count
        profile.interaction_count += 1

        self.save(profile)
        log.debug(
            "UserModel: updated %s → expertise=%s (%.2f), lang=%s",
            user_id, profile.expertise_level, profile.expertise_score, profile.preferred_language,
        )
        return profile

    def record_feedback(self, user_id: str, positive: bool) -> UserProfile:
        """Update feedback counters for a user.

        Args:
            user_id:  Telegram user ID.
            positive: True for 👍, False for 👎.
        """
        profile = self.load(str(user_id))
        if positive:
            profile.positive_feedback += 1
        else:
            profile.negative_feedback += 1
        self.save(profile)
        return profile

    def get_response_hint(self, user_id: str) -> dict[str, Any]:
        """Return response personalization hints for an agent.

        Used by agents to adapt verbosity, terminology level, and language.

        Returns:
            Dict with: language, style, expertise, use_jargon, max_length
        """
        profile = self.load(str(user_id))
        level = profile.expertise_level

        use_jargon = level in ("advanced", "expert")
        max_length = {
            "novice": 800,
            "intermediate": 1200,
            "advanced": 2000,
            "expert": 4000,
        }.get(level, 1200)

        return {
            "language": profile.preferred_language,
            "style": profile.interaction_style,
            "expertise": level,
            "expertise_score": round(profile.expertise_score, 2),
            "use_jargon": use_jargon,
            "max_length": max_length,
            "top_interests": sorted(
                profile.common_queries.items(), key=lambda x: x[1], reverse=True
            )[:5],
        }

    def list_all(self) -> list[UserProfile]:
        """Return all persisted user profiles."""
        profiles = []
        for p in self._dir.glob("*.json"):
            try:
                profiles.append(UserProfile.from_dict(json.loads(p.read_text(encoding="utf-8"))))
            except Exception:
                continue
        return profiles

    def is_active_hours(self, user_id: str) -> bool:
        """Heuristic: is the user likely currently active based on history?"""
        profile = self.load(str(user_id))
        current_hour = time.gmtime().tm_hour
        if not profile.typical_hours:
            return True  # unknown — assume active
        recent_hours = profile.typical_hours[-24:]
        return current_hour in recent_hours
